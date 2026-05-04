# Counsel-in-a-Box

**A long-context legal contract review swarm running on a single AMD Instinct MI300X.**

Drop a folder of contracts, get a senior-associate-grade memo in 90 seconds.
The whole deal package fits in one prompt — no chunking, no retrieval gymnastics, no context loss.

---

## Submission

| Field | Detail |
|-------|--------|
| **Event** | AMD Developer Hackathon 2026 |
| **Track** | Track 1 — AI Agents & Agentic Workflows (cross-track: long-context inference on MI300X) |
| **Sponsor Model** | Qwen3 (Qwen3.6-A3B for orchestration, Qwen3-32B for legal reasoning) |
| **Deployment** | vLLM on AMD MI300X via AMD Developer Cloud + Hugging Face Space front-end |
| **Team** | Two builders working with AMD's reference playbooks and the ROCm vLLM container |

---

## The Problem

A small-firm attorney, in-house counsel at a 50-person company, or a public-defender's office reviewing a contract dispute does the same thing every week: read 200-800 pages of contracts, side letters, amendments, and emails, then write a memo identifying risks, obligations, deadlines, and recommended changes.

Today this takes **4-12 hours per matter** and is the single biggest bottleneck for under-resourced legal teams. BigLaw fixes it with an army of junior associates. Everyone else just absorbs the cost.

Existing AI tools (Harvey, Spellbook, generic Copilots) chunk the documents through RAG, which means the model never sees the whole picture. A clause on page 12 that contradicts a definition on page 187 gets missed. Cross-references between documents in a deal package get lost. The output is a summary of fragments, not an analysis of the deal.

---

## The Solution

A multi-agent system where the **entire document set** is loaded into the context window of a long-context LLM running on a single MI300X. Specialist agents read the same full corpus and produce coordinated outputs:

| Agent | Role |
|-------|------|
| **Clause Extractor** | Identifies all clauses by type (indemnification, MAC, change-of-control, governing law, termination, confidentiality, etc.) with page/section citations |
| **Risk Scorer** | Flags clauses that deviate from market-standard language, ranks by severity, links each finding to the source clause |
| **Obligation Tracker** | Extracts every deadline, deliverable, and conditional obligation across all documents, builds a timeline |
| **Cross-Reference Auditor** | Finds contradictions, undefined terms, and broken references across documents (the thing RAG cannot do) |
| **Memo Drafter** | Synthesizes the four agents' outputs into a structured legal memo matching standard firm format |

All five run against the **same in-memory context** — no re-loading, no re-tokenization, no hand-offs through a vector database. This is only possible because the MI300X holds the full corpus and a 32B-class reasoning model in HBM simultaneously.

---

## Why This Needs an MI300X

| Requirement | Memory Cost | What MI300X Enables |
|-------------|-------------|---------------------|
| 200-page deal package | ~250K tokens of context | Fits, with room for outputs |
| Qwen3-32B at BF16 | ~64 GB weights | Resident, no swap |
| Qwen3.6-A3B for orchestration | ~70 GB weights | Co-resident with the 32B |
| KV cache for 5 concurrent agent calls over 250K context | ~40 GB | Headroom for batch |
| **Total working set** | **~190+ GB** | **Fits one MI300X. OOMs an H100 (80 GB).** |

---

## Architecture

```
[Web UI: HF Space]
       |
       v
[FastAPI orchestrator] -- [PostgreSQL: matter state]
       |
       v
[CrewAI agent coordinator]
       |
       +--> Clause Extractor    --+
       +--> Risk Scorer            +--> [vLLM endpoint on MI300X]
       +--> Obligation Tracker     |     - Qwen3-32B (legal reasoning)
       +--> Cross-Ref Auditor   --+      - Qwen3.6-A3B (orchestration)
       |                                  - Shared 250K context
       v
[Memo Drafter] --> [Markdown / DOCX export]
```

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| **Inference** | vLLM 0.11+ on ROCm 7, AMD's reference Docker image (`rocm/vllm-dev:nightly`) |
| **Models** | Qwen3-32B (BF16) for legal reasoning; Qwen3.6-A3B for orchestration / structured output |
| **Agent Framework** | CrewAI |
| **Backend** | FastAPI + PostgreSQL for matter persistence |
| **Front-end** | Streamlit deployed as a Hugging Face Space |
| **Compute** | AMD Developer Cloud — single MI300X droplet, $1.99/hr |
| **Evaluation** | Custom test set built from SEC EDGAR M&A filings (free, public, real) |

---

## Data

- **Training**: None — this is an inference-time orchestration project, no fine-tuning needed for the core demo
- **Test corpus**: 50 deal packages from SEC EDGAR (recent M&A filings, credit agreements, severance disputes from public 8-K filings)
- **Evaluation set**: 20 hand-annotated cross-document conflicts created by the team

---

## Demo Script (3 minutes)

| Time | Beat |
|------|------|
| **0:00** | **The setup.** "Maria is a solo employment lawyer. A new client shows up with a 340-page severance dispute." |
| **0:20** | **The drop.** Drag-and-drop 12 documents into our web UI. ~340 pages, ~280K tokens. |
| **0:30** | **The split screen.** Left: H100 baseline throws OOM. Right: MI300X starts streaming. |
| **0:45** | **Agents working live.** Four specialist agents stream findings in parallel. |
| **1:30** | **The cross-reference moment.** A definition in document 3 contradicts a clause in document 11. |
| **2:00** | **The memo.** Final structured memo appears. Cite-checked. Ready to edit. |
| **2:30** | **The benchmark slide.** 1x MI300X: 90s. 1x H100: OOM. RAG baseline misses 23% of cross-doc conflicts. |
| **2:50** | **The pitch close.** "Maria gets her evening back. This is the lawyer's MI300X." |

---

## 8-Day Build Plan (May 11-19)

| Day | Focus | Deliverables |
|-----|-------|-------------|
| **1** (Sun May 11) | Infra & data | MI300X droplet, vLLM deployed, 10 test deals from EDGAR, hello-world round-trip |
| **2** (Mon May 12) | Core agents | Clause Extractor + Risk Scorer in CrewAI, structured JSON output |
| **3** (Tue May 13) | More agents | Obligation Tracker + Cross-Reference Auditor, 5 test cases |
| **4** (Wed May 14) | Memo drafter & glue | Memo Drafter, Postgres persistence, FastAPI orchestrator |
| **5** (Thu May 15) | Benchmarks & UI | H100 OOM comparison, Streamlit front-end, end-to-end timing |
| **6** (Fri May 16) | Polish & build-in-public | HF Space deployment, blog post, tweet threads |
| **7** (Sat May 17) | Demo recording | Demo video, 3 dry runs, fix demo-condition bugs |
| **8** (Sun May 18) | Submission | Final submission, on-site prep |
| **9** (Mon May 19) | Demo day | Live presentation at AI & Big Data Expo North America |

---

## Repo Structure

```
counsel-in-a-box/
├── README.md
├── infra/
│   ├── vllm-launch.sh          # vLLM startup with MI300X tuning flags
│   └── docker-compose.yml      # Local dev mirror
├── agents/
│   ├── clause_extractor.py
│   ├── risk_scorer.py
│   ├── obligation_tracker.py
│   ├── crossref_auditor.py
│   └── memo_drafter.py
├── orchestrator/
│   ├── crew.py                 # CrewAI coordination
│   └── api.py                  # FastAPI endpoints
├── ui/
│   └── app.py                  # Streamlit / HF Space
├── eval/
│   ├── test_deals/             # EDGAR-sourced test corpus
│   ├── annotations.jsonl       # Hand-labeled cross-doc conflicts
│   └── run_eval.py
├── benchmarks/
│   ├── mi300x_vs_h100.md       # The OOM story, with numbers
│   └── throughput.csv
└── blog/
    ├── building-in-public.md
    └── rocm-experience.md
```

---

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| 250K context too slow for live demo | Medium | Pre-warm cache on test deal; recorded video as fallback |
| vLLM ROCm bug mid-build | Medium | AMD Discord support during hackathon; document the bug for build-in-public prize |
| Cross-reference auditor produces hallucinated citations | High | Force structured output with byte-offset citations; reject unverified spans |
| H100 baseline doesn't actually OOM | Low-Medium | Use BF16 on both sides; reframe as "without quantization-induced accuracy loss" |
| Live demo fails on stage | Medium | Pre-recorded video runs in parallel; can pivot mid-presentation |

---

## Judging Criteria Map

| Criterion | Our Answer |
|-----------|------------|
| **Model integration effectiveness** | Qwen3 as reasoning core with structured agent coordination |
| **Presentation clarity** | Three-act demo: sympathetic protagonist, visceral failure mode, clear payoff |
| **Practical impact** | Every attendee knows a lawyer drowning in this problem |
| **Uniqueness / creativity** | Cross-reference auditor over full unchunked context — structurally impossible for existing tools |

---

## Side Prizes Targeted

- **Hugging Face Spaces prize** — Front-end deployed on HF Spaces, marketed via build-in-public tweets
- **Build-in-Public prize** — 3+ technical posts during the build, honest ROCm review, benchmark thread
- **Sponsor recognition** — Open-source under MIT, technical walkthrough as AMD blog submission

---

## License

MIT

---

## Contact

*[Team handles, to be added]*
