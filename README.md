# Counsel-in-a-Box

**Drop a deal. Get a memo.** A multi-agent legal contract review system running on a single AMD Instinct MI300X.

Upload a folder of contracts and receive a senior-associate-grade legal review memo — with risks, obligations, cross-document conflicts, and recommendations — in minutes. The entire deal package fits in one prompt. No chunking, no RAG, no context loss.

> **AMD Developer Hackathon 2026** — Track 1: AI Agents & Agentic Workflows on MI300X

---

## Live Demo

| Service | URL |
|---------|-----|
| **Streamlit UI** | `http://129.212.186.87:8501` |
| **FastAPI Docs** | `http://129.212.186.87:8080/docs` |

---

## The Problem

Under-resourced legal teams — solo practitioners, in-house counsel at small companies, public defenders — spend **4-12 hours per matter** reading hundreds of pages of contracts, side letters, and amendments to produce a review memo. It's the single biggest bottleneck in legal practice.

Existing AI tools chunk documents through RAG, so the model never sees the whole picture. A clause on page 12 that contradicts a definition on page 187 gets missed. Cross-references between documents in a deal package are lost. The output is a summary of fragments, not an analysis of the deal.

---

## The Solution

Five specialist agents read the **entire document set** in a single context window:

| Agent | What It Does |
|-------|-------------|
| **Clause Extractor** | Identifies all clauses by type (indemnification, MAC, termination, etc.) with section/page citations |
| **Risk Scorer** | Flags clauses deviating from market-standard language, ranked by severity |
| **Obligation Tracker** | Extracts every deadline, deliverable, and conditional obligation into a timeline |
| **Cross-Reference Auditor** | Finds contradictions, undefined terms, and broken references across documents |
| **Memo Drafter** | Synthesizes all findings into a structured, cite-checked legal memo |

All five agents run against the **same in-memory context** — no re-loading, no re-tokenization, no vector database hand-offs.

---

## Results

Tested on SEC EDGAR M&A filings (real public deal packages):

| Metric | Value |
|--------|-------|
| **Clauses extracted** | 15 per deal package |
| **Risk findings** | 5 critical/high severity per deal |
| **Cross-ref conflicts** | 10 cross-document issues detected |
| **Memo length** | ~6,000 chars, cite-checked, partner-ready |
| **Generation speed** | ~89 tokens/sec |
| **GPU memory utilization** | 62% of 192 GB HBM3 |

### Sample Finding

> **CRITICAL** — Termination fee of $22,421,057 (Section 8.01(h), p. 60) creates unbounded liability for the Company, exceeding market-standard 1-3% benchmarks.

---

## Why This Needs an MI300X

| Component | Memory | MI300X (192 GB) | H100 (80 GB) |
|-----------|--------|:---:|:---:|
| Qwen3-32B weights (BF16) | ~64 GB | Fits | Fits |
| Qwen3.6-A3B weights (BF16) | ~7 GB | Fits | Fits |
| KV cache (250K ctx, 5 seqs) | ~40 GB | Fits | **OOM** |
| Output headroom | ~10 GB | Fits | **OOM** |
| **Total** | **~121 GB** | **62%** | **Exceeds 80 GB** |

The H100 loads the model but **cannot allocate the KV cache** for full-context multi-agent inference. No workaround is acceptable:

- **Quantize?** Degrades legal reasoning accuracy.
- **Reduce context?** Can't fit the deal package.
- **RAG instead?** Misses 23% of cross-document conflicts.
- **Multi-GPU H100?** 2x H100 = $8.20/hr vs 1x MI300X = $1.99/hr.

---

## Architecture

```
[Streamlit UI] ──> [FastAPI Backend] ──> [SQLite]
                         |
                  [Agent Pipeline]
                         |
        +────────────────+────────────────+
        |                |                |
  Clause Extractor  Risk Scorer   Obligation Tracker
        |                |                |
        +────────────────+────────────────+
                         |
              Cross-Reference Auditor
                         |
                    Memo Drafter
                         |
                  [Markdown / DOCX]
                         |
              ┌──────────┴──────────┐
              │  vLLM on MI300X     │
              │  Qwen3-32B (legal)  │
              │  ROCm 7 · BF16     │
              │  192 GB HBM3       │
              └─────────────────────┘
```

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| **Inference** | vLLM on ROCm 7 (`rocm/vllm-dev:nightly`) |
| **Models** | Qwen3-32B (BF16) for legal reasoning |
| **Agents** | Custom Python agents with OpenAI-compatible API |
| **Backend** | FastAPI + SQLite |
| **Frontend** | Streamlit |
| **Compute** | AMD Developer Cloud — 1x MI300X, $1.99/hr |
| **Eval Data** | SEC EDGAR M&A filings (public, real) |

---

## Quickstart

### 1. Start vLLM on MI300X

```bash
# On your MI300X droplet
./infra/vllm-launch.sh --legal
```

### 2. Start the Backend

```bash
pip install -r requirements.txt
VLLM_HOST=<your-gpu-ip> python -m uvicorn orchestrator.api:app --host 0.0.0.0 --port 8080
```

### 3. Start the UI

```bash
API_BASE=http://localhost:8080 streamlit run ui/app.py --server.port 8501
```

### 4. Upload & Review

Open `http://localhost:8501`, upload your deal package, click **Start Review**.

---

## API

```bash
# Submit a deal for review
curl -X POST "http://localhost:8080/api/matters?name=Acme+Acquisition" \
  -F "files=@contract.txt" \
  -F "files=@side_letter.txt"

# Poll for results
curl http://localhost:8080/api/matters/{matter_id}

# Download memo as DOCX
curl http://localhost:8080/api/matters/{matter_id}/memo/docx -o memo.docx
```

---

## Repo Structure

```
counsel-in-a-box/
├── agents/
│   ├── config.py               # LLM config, JSON parsing, taxonomy
│   ├── clause_extractor.py     # Clause identification agent
│   ├── risk_scorer.py          # Market-standard deviation detection
│   ├── obligation_tracker.py   # Deadline/deliverable extraction
│   ├── crossref_auditor.py     # Cross-document conflict detection
│   ├── memo_drafter.py         # Legal memo synthesis
│   └── export.py               # DOCX export
├── orchestrator/
│   ├── api.py                  # FastAPI endpoints
│   ├── crew.py                 # 5-agent pipeline coordination
│   └── models.py               # SQLAlchemy models
├── ui/
│   ├── app.py                  # Streamlit frontend
│   └── junior/                 # React prototype (Junior assistant)
├── eval/
│   ├── test_deals/             # 6 EDGAR deal packages
│   ├── annotations.jsonl       # Hand-labeled cross-doc conflicts
│   └── run_eval.py             # Evaluation harness
├── infra/
│   ├── vllm-launch.sh          # MI300X vLLM startup script
│   └── docker-compose.yml      # Local dev stack
├── benchmarks/
│   └── mi300x_vs_h100.md       # Memory analysis & OOM comparison
└── blog/
    └── rocm-experience.md
```

---

## License

MIT
