Counsel-in-a-Box
A long-context legal contract review swarm running on a single AMD Instinct MI300X.

Drop a folder of contracts, get a senior-associate-grade memo in 90 seconds.
The whole deal package fits in one prompt — no chunking, no retrieval gymnastics, no context loss.


Submission for: AMD Developer Hackathon 2026

Track: Track 1 (AI Agents & Agentic Workflows) with cross-track use of long-context inference on MI300X
Sponsor model: Qwen3 (Qwen3.6-A3B for orchestration, Qwen3-32B for legal reasoning)
Deployment: vLLM on AMD MI300X via AMD Developer Cloud + Hugging Face Space front-end
Team: Two builders working with AMD's reference playbooks and the ROCm vLLM container


The Problem
A small-firm attorney, in-house counsel at a 50-person company, or a public-defender's office reviewing a contract dispute does the same thing every week: read 200–800 pages of contracts, side letters, amendments, and emails, then write a memo identifying risks, obligations, deadlines, and recommended changes.
Today this takes 4–12 hours per matter and is the single biggest bottleneck for under-resourced legal teams. BigLaw fixes it with an army of junior associates. Everyone else just absorbs the cost.
Existing AI tools (Harvey, Spellbook, generic Copilots) chunk the documents through RAG, which means the model never sees the whole picture. A clause on page 12 that contradicts a definition on page 187 gets missed. Cross-references between documents in a deal package get lost. The output is a summary of fragments, not an analysis of the deal.
The Solution
A multi-agent system where the entire document set is loaded into the context window of a long-context LLM running on a single MI300X. Specialist agents read the same full corpus and produce coordinated outputs:

Clause Extractor — identifies all clauses by type (indemnification, MAC, change-of-control, governing law, termination, confidentiality, etc.) with page/section citations.
Risk Scorer — flags clauses that deviate from market-standard language, ranks by severity, links each finding to the source clause.
Obligation Tracker — extracts every deadline, deliverable, and conditional obligation across all documents, builds a timeline.
Cross-Reference Auditor — finds contradictions, undefined terms, and broken references across documents (the thing RAG cannot do).
Memo Drafter — synthesizes the four agents' outputs into a structured legal memo matching standard firm format.

All five run against the same in-memory context — no re-loading, no re-tokenization, no hand-offs through a vector database. This is only possible because the MI300X holds the full corpus and a 32B-class reasoning model in HBM simultaneously.
Why This Needs an MI300X
RequirementWhat it costs in memoryWhat MI300X enables200-page deal package~250K tokens of contextFits, with room for outputsQwen3-32B at BF16~64 GB weightsResident, no swapQwen3.6-A3B for orchestration~70 GB weightsCo-resident with the 32BKV cache for 5 concurrent agent calls over 250K context~40 GBHeadroom for batchTotal working set~190+ GBFits one MI300X. OOMs an H100 (80 GB).
The benchmark moment of our demo: same workload, same prompt, on a 1×H100 baseline → OOM. On 1×MI300X → 90 seconds. This is the AMD story, told in one slide.
Demo Script (3 minutes)
0:00 — The setup. "Maria is a solo employment lawyer. A new client shows up with a 340-page severance dispute — every email, every contract, every side letter. She has tonight to review it before the morning meeting."
0:20 — The drop. Drag-and-drop a folder of 12 documents into our web UI. Total: ~340 pages, ~280K tokens.
0:30 — The split screen. Left: H100 baseline running the same task. It immediately throws an OOM. Right: our system on MI300X starts streaming agent outputs.
0:45 — Agents working live. Watch the four specialist agents stream findings into the UI in parallel. Clauses appear with citations. Risks light up red/yellow/green. Obligations populate a timeline.
1:30 — The cross-reference moment. Highlight a finding only the cross-reference auditor could catch: a definition in document 3 that contradicts a clause in document 11 — the kind of error a junior associate misses on a tired Tuesday and senior partners blow up about. "This is the bug that gets associates fired."
2:00 — The memo. Final structured memo appears. Same format Maria's firm uses. Cite-checked. Ready to edit.
2:30 — The benchmark slide. "1× MI300X, 90 seconds, full document context. 1× H100, OOM. Smaller models with chunked RAG miss 23% of cross-document conflicts on our test set."
2:50 — The pitch close. "Maria gets her evening back. Counsel-in-a-Box runs on hardware her firm can actually afford. This is the lawyer's MI300X."
Architecture
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
Tech stack

Inference serving: vLLM 0.11+ on ROCm 7, using AMD's reference Docker image (rocm/vllm-dev:nightly)
Models: Qwen3-32B (BF16) for legal reasoning; Qwen3.6-A3B for orchestration / structured output
Agent framework: CrewAI (chosen for documentation density, low ramp time)
Backend: FastAPI + Postgres for matter persistence
Front-end: Streamlit deployed as a Hugging Face Space (qualifies for the HF Space prize)
Compute: AMD Developer Cloud — single MI300X droplet, $1.99/hr, ~50 hours included with credits
Eval: custom test set built from SEC EDGAR M&A filings (free, public, real)

Data

Training: none — this is an inference-time orchestration project, no fine-tuning needed for the core demo. (Stretch goal: small adapter on a 7B model for memo formatting in the firm's house style.)
Test corpus: 50 deal packages from SEC EDGAR (recent M&A filings, credit agreements, severance disputes from public 8-K filings). Free, downloadable as text, immediately usable.
Evaluation set: 20 hand-annotated cross-document conflicts created by the team. Used for the "23% missed by RAG baseline" benchmark.

8-Day Build Plan (May 11–19)
Day 1 (Sun May 11) — Infra & data

Spin up MI300X droplet on AMD Developer Cloud
Deploy vLLM with Qwen3-32B per AMD's reference playbook; verify 250K context works
Pull 10 test deal packages from EDGAR; clean and chunk-bound them
Hello-world: load full deal into context, ask "summarize," confirm round-trip works

Day 2 (Mon May 12) — Core agents

Implement Clause Extractor and Risk Scorer in CrewAI
Output schema: structured JSON with citations
First end-to-end run on one real deal

Day 3 (Tue May 13) — More agents

Implement Obligation Tracker and Cross-Reference Auditor
The Auditor is the novel piece — most effort here
Hand-build 5 test cases with known cross-doc conflicts

Day 4 (Wed May 14) — Memo drafter & glue

Memo Drafter agent synthesizes all four upstream outputs
Add Postgres persistence
Wire up FastAPI orchestrator

Day 5 (Thu May 15) — Benchmarks & UI

Run H100 OOM comparison (rent an H100 for an hour just to record the failure on video)
Build Streamlit front-end with live agent streaming
Internal demo run-through, time it end-to-end

Day 6 (Fri May 16) — Polish & build-in-public

Deploy to Hugging Face Space
Write blog post: "What we learned running 250K-token contexts on MI300X"
Tweet thread #1: throughput benchmarks with #AMDDevHackathon
Tweet thread #2: honest ROCm developer experience review

Day 7 (Sat May 17) — Demo recording & dry runs

Record demo video (the safe artifact in case live demo fails)
Three full dry runs of the live presentation
Fix whatever breaks under demo conditions

Day 8 (Sun May 18) — Submission & on-site (if invited)

Final submission with video, GitHub, deployed Space
On-site dry run if invited to San Jose
Sleep before judging

Day 9 (Mon May 19) — Demo day

Live presentation at AI & Big Data Expo North America
Stay on script, hit the OOM moment, hit the cross-reference moment, hit the memo moment

Judging-Criteria Map
The lablab judging rubric and how we hit it:

Model integration effectiveness — Qwen3 used as the reasoning core, with structured agent coordination. Sponsor model, integrated meaningfully.
Presentation clarity — three-act demo with a sympathetic protagonist (Maria), a visceral failure mode (H100 OOM), a visceral catch (cross-doc conflict), and a clear payoff (the memo).
Practical impact — every Big Data Expo attendee knows a lawyer drowning in this exact problem; the buyer is obvious.
Uniqueness / creativity — the cross-reference auditor working over full unchunked context is something existing legal-AI tools structurally cannot do.

Side Prizes Targeted

Hugging Face Spaces prize — most-liked Space in the event. Front-end deployed there, marketed via the build-in-public tweets.
Build-in-Public prize (one MI300X GPU + dedicated pool) — three+ technical posts during the build, one honest ROCm review, one benchmark thread.
Sponsor recognition — open-source the project under MIT, write the technical walkthrough as an AMD blog submission.

Risks & Mitigations
RiskLikelihoodMitigation250K context too slow for live demoMediumPre-warm cache on test deal; have recorded video as fallbackvLLM ROCm bug bites us mid-buildMediumAMD has Discord support during hackathon; document the bug for the build-in-public prize either wayCross-reference auditor produces hallucinated citationsHighForce structured output with byte-offset citations; reject any output without verified spansH100 baseline doesn't actually OOM (someone could fit it with quantization tricks)Low-MediumUse BF16 on both sides; if pushed, reframe as "without quantization-induced accuracy loss"Live demo fails on stageMediumPre-recorded video runs in parallel; we can pivot mid-presentationTwo vibe coders bite off too muchMediumStretch goals (fine-tuning, multi-tenant, etc.) explicitly cut. Core path is 5 agents + UI + benchmark.
What Vibe Coders Bring (and Don't)
We are two builders, not ML researchers. We win this hackathon by:

Riding AMD's existing playbooks rather than reinventing the inference stack
Spending our optimization budget on demo polish, not kernel tuning
Picking a problem where prompt engineering and orchestration matter more than model training
Owning the "we vibe-coded this in 8 days" framing — that is AMD's story about ROCm being approachable

What we explicitly do not attempt: custom kernels, novel attention mechanisms, training a foundation model, anything requiring CUDA-graph-level expertise. If a problem on the build path requires those, we route around it or cut scope.
Repo Structure
counsel-in-a-box/
├── README.md                    # This file
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
License
MIT. Open-sourcing is part of the Build-in-Public prize requirements and aligns with AMD's open-stack narrative.
Contact
[Team handles, to be added]

Bottom line: This is the project that lets two vibe coders win a hardware-sponsor hackathon by doing one thing exceptionally well — using the MI300X's defining advantage to do something existing tools structurally can't, then telling that story in three minutes to enterprise judges who instantly grok the buyer.