#!/usr/bin/env bash
# ============================================================================
# Counsel-in-a-Box — vLLM Launch Script for AMD MI300X
# ============================================================================
# Starts the vLLM inference server with Qwen3-32B and Qwen3.6-A3B
# tuned for long-context legal workloads on a single MI300X (192 GB HBM3).
#
# Usage:
#   ./vllm-launch.sh              # Start both models
#   ./vllm-launch.sh --legal      # Start only the legal reasoning model (Qwen3-32B)
#   ./vllm-launch.sh --orch       # Start only the orchestration model (Qwen3.6-A3B)
# ============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration (override via .env or environment variables)
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/../.env" ]; then
    set -a
    source "$SCRIPT_DIR/../.env"
    set +a
fi

# Model identifiers
LEGAL_MODEL="${LEGAL_MODEL:-Qwen/Qwen3-32B}"
ORCH_MODEL="${ORCH_MODEL:-Qwen/Qwen3.6-A3B}"

# Server ports
LEGAL_PORT="${LEGAL_PORT:-8000}"
ORCH_PORT="${ORCH_PORT:-8001}"

# Context and performance tuning
MAX_MODEL_LEN="${MAX_MODEL_LEN:-262144}"        # 256K tokens — full deal package
GPU_MEMORY_UTILIZATION="${GPU_MEMORY_UTILIZATION:-0.92}"
MAX_NUM_SEQS="${MAX_NUM_SEQS:-8}"               # concurrent sequences
DTYPE="${DTYPE:-bfloat16}"
TENSOR_PARALLEL_SIZE="${TENSOR_PARALLEL_SIZE:-1}" # single MI300X

# ROCm-specific
export HIP_VISIBLE_DEVICES="${HIP_VISIBLE_DEVICES:-0}"
export VLLM_USE_TRITON_FLASH_ATTN="${VLLM_USE_TRITON_FLASH_ATTN:-1}"

# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------
log() { echo "[$(date '+%H:%M:%S')] $*"; }

wait_for_server() {
    local port="$1"
    local name="$2"
    local max_wait=300
    local elapsed=0

    log "Waiting for $name on port $port..."
    while ! curl -sf "http://localhost:${port}/health" > /dev/null 2>&1; do
        sleep 5
        elapsed=$((elapsed + 5))
        if [ "$elapsed" -ge "$max_wait" ]; then
            log "ERROR: $name did not start within ${max_wait}s"
            exit 1
        fi
    done
    log "$name is ready on port $port (${elapsed}s)"
}

start_legal_model() {
    log "Starting legal reasoning model: $LEGAL_MODEL"
    python -m vllm.entrypoints.openai.api_server \
        --model "$LEGAL_MODEL" \
        --port "$LEGAL_PORT" \
        --dtype "$DTYPE" \
        --max-model-len "$MAX_MODEL_LEN" \
        --gpu-memory-utilization "$GPU_MEMORY_UTILIZATION" \
        --max-num-seqs "$MAX_NUM_SEQS" \
        --tensor-parallel-size "$TENSOR_PARALLEL_SIZE" \
        --trust-remote-code \
        --enable-chunked-prefill \
        --max-num-batched-tokens "$MAX_MODEL_LEN" \
        --served-model-name "qwen3-32b-legal" \
        --disable-log-requests &
    LEGAL_PID=$!
    log "Legal model PID: $LEGAL_PID"
}

start_orch_model() {
    log "Starting orchestration model: $ORCH_MODEL"
    python -m vllm.entrypoints.openai.api_server \
        --model "$ORCH_MODEL" \
        --port "$ORCH_PORT" \
        --dtype "$DTYPE" \
        --max-model-len 32768 \
        --gpu-memory-utilization 0.08 \
        --max-num-seqs 16 \
        --tensor-parallel-size "$TENSOR_PARALLEL_SIZE" \
        --trust-remote-code \
        --served-model-name "qwen3-a3b-orch" \
        --disable-log-requests &
    ORCH_PID=$!
    log "Orchestration model PID: $ORCH_PID"
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
MODE="${1:-all}"

case "$MODE" in
    --legal)
        start_legal_model
        wait_for_server "$LEGAL_PORT" "Legal model"
        wait "$LEGAL_PID"
        ;;
    --orch)
        start_orch_model
        wait_for_server "$ORCH_PORT" "Orchestration model"
        wait "$ORCH_PID"
        ;;
    *)
        start_legal_model
        start_orch_model
        wait_for_server "$LEGAL_PORT" "Legal model"
        wait_for_server "$ORCH_PORT" "Orchestration model"
        log "Both models running. Press Ctrl+C to stop."
        trap 'kill $LEGAL_PID $ORCH_PID 2>/dev/null; exit 0' INT TERM
        wait
        ;;
esac
