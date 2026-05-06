// Screen 5 — Benchmark / comparison. The H100 OOM moment.
// Two columns, same input, both run live. Left side errors out; right side completes.

const BenchmarkScreen = ({ onRestart }) => {
  const [running, setRunning] = useState(false);
  const [t, setT] = useState(0); // ms
  const data = window.JuniorData;
  const rafRef = useRef(null);

  // Total benchmark duration (sped up for demo): MI300X completes at 90s ⇒ here 12s.
  // H100 errors at 10s real ⇒ here ~2.4s.
  const SCALE = 0.13;
  const H100_OOM_AT = 10000 * SCALE * 1.2; // ~1.6s scaled
  const MI300X_DONE_AT = 90000 * SCALE;    // ~11.7s scaled

  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    const step = (now) => {
      const dt = now - last; last = now;
      setT((x) => Math.min(x + dt, MI300X_DONE_AT + 1500));
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running]);

  const start = () => { setT(0); setRunning(true); };
  const reset = () => { setRunning(false); setT(0); };

  const h100Errored = t >= H100_OOM_AT;
  const miDone = t >= MI300X_DONE_AT;

  // H100 logs (chunked RAG approach).
  const h100Steps = [
    { t: 0,   text: "$ docker run --gpus 1 -e MODEL=llama-70b junior:rag" },
    { t: 80,  text: "[INFO] Loading model weights to HBM…", kind: "info" },
    { t: 240, text: "[INFO] 70B Q4 → 38.4 GB / 80 GB used.", kind: "info" },
    { t: 380, text: "[INFO] Chunking corpus: 247 pages → 1,948 chunks @ 512 tok.", kind: "info" },
    { t: 540, text: "[INFO] Building FAISS index over 1,948 chunks…", kind: "info" },
    { t: 720, text: "[INFO] Index built. Loading 16k context window.", kind: "info" },
    { t: 900, text: "[INFO] Query 1/9 — top-K retrieval k=20, building prompt.", kind: "info" },
    { t: 1080, text: "[INFO] KV-cache 14.2 GB. HBM at 67.4 / 80 GB.", kind: "info" },
    { t: 1240, text: "[WARN] Query 4/9 requires cross-document reasoning. Expanding k=40.", kind: "warn" },
    { t: 1400, text: "[INFO] KV-cache 22.8 GB. HBM at 75.1 / 80 GB.", kind: "info" },
    { t: 1520, text: "[WARN] Query 4/9 — chunk boundary splits §1.1 from SL3 §2(b). Re-issuing with k=80.", kind: "warn" },
    { t: 1610, text: "torch.cuda.OutOfMemoryError: CUDA out of memory.", kind: "err" },
    { t: 1640, text: "Tried to allocate 14.06 GiB. GPU 0 has a total capacity of 79.15 GiB", kind: "err-cont" },
    { t: 1670, text: "of which 0.87 GiB is free. Process 1 has 78.28 GiB memory in use.", kind: "err-cont" },
    { t: 1700, text: "Of the allocated memory 73.91 GiB is allocated by PyTorch, and 4.37 GiB", kind: "err-cont" },
    { t: 1730, text: "is reserved by PyTorch but unallocated.", kind: "err-cont" },
    { t: 1780, text: "[FATAL] container exited with code 1.", kind: "err" },
    { t: 1820, text: "Cross-document reasoning failed. The conflict between §1.1 and SL3 §2(b)", kind: "err-quiet" },
    { t: 1840, text: "spans a chunk boundary; full-context comparison is not possible.", kind: "err-quiet" },
  ];

  // MI300X side: streaming narration + findings. Reuse some narration lines.
  const miSteps = [
    { t: 0,   text: "$ docker run --gpus 1 -e MODEL=llama-70b junior:full-ctx", kind: "cmd" },
    { t: 60,  text: "[INFO] Loading model weights to HBM…", kind: "info" },
    { t: 220, text: "[INFO] 70B Q8 → 76.4 GB / 192 GB used.", kind: "info" },
    { t: 360, text: "[INFO] Loading full corpus into context: 247 pp · 84,612 words · 112,400 tokens.", kind: "info" },
    { t: 540, text: "[INFO] Context window 200k tokens. HBM at 142.7 / 192 GB. Headroom: 49.3 GB.", kind: "info" },
    { t: 720, text: "Reading the Stock Purchase Agreement — all of it, in one pass.", kind: "narrate" },
    { t: 1400, text: "Cross-referencing the four side letters.", kind: "narrate" },
    { t: 2200, text: "§1.1 ↔ SL3 §2(b) — definition of MAE conflicts with the indemnity carve-out.", kind: "find-high", finding: "f1" },
    { t: 3200, text: "Reading the negotiation correspondence — 47 messages.", kind: "narrate" },
    { t: 4400, text: "EML 04-19 references a verbal earnout cap not memorialized in SL4.", kind: "find-high", finding: "f2" },
    { t: 5400, text: "§3.12(c) ↔ IPA §2 — IP ownership warranted at signing, transferred at closing.", kind: "find-high", finding: "f3" },
    { t: 6600, text: "§9.2(c) — termination fee 4.5%, above NVCA median.", kind: "find-med", finding: "f4" },
    { t: 7600, text: "§3.12(b) ↔ Sched. 3.12(a) — disclosure inconsistency on materiality.", kind: "find-med", finding: "f5" },
    { t: 8800, text: "Compiling four pre-closing obligations for the checklist.", kind: "narrate" },
    { t: 10200, text: "Drafting the memo.", kind: "narrate" },
    { t: 11400, text: "Done. Three high-severity, two medium, four obligations.", kind: "narrate-done" },
  ];

  const visibleH100 = h100Steps.filter((s) => s.t <= t);
  const visibleMI = miSteps.filter((s) => s.t <= t);
  const miFindings = visibleMI.filter((s) => s.kind?.startsWith("find-")).length;

  return (
    <section className="bench-screen fade-in" data-screen-label="05 Benchmark">
      <div className="bench-header">
        <div>
          <div className="label">Same input · same model family · two GPUs</div>
          <h2 className="bench-h2">Why the deal package fits on MI300X.</h2>
          <p className="bench-sub"><em>
            Acme Corp. / Buyer LLC — 8 documents, 247 pages, 84,612 words, 112,400 tokens.
            Llama-70B on the left; Llama-70B on the right. Only the GPU changes.
          </em></p>
        </div>
        <div className="bench-controls">
          {!running && t === 0 && <button className="btn-primary" onClick={start}>▸ Run benchmark</button>}
          {(running || t > 0) && (
            <React.Fragment>
              <span className="bench-clock">{(t / 1000).toFixed(2)}s</span>
              <button className="btn-secondary" onClick={reset}>Reset</button>
            </React.Fragment>
          )}
        </div>
      </div>

      <div className="bench-grid">
        {/* Left: H100 */}
        <div className={`bench-col h100 ${h100Errored ? "errored" : ""}`}>
          <div className="bench-col-head">
            <div className="bench-col-tag">
              <span className="cite">Side A</span>
              <span className="bench-gpu-name">1× H100 · 80 GB HBM</span>
            </div>
            <div className="bench-col-status">
              {!running && t === 0 && <span className="bench-status idle">idle</span>}
              {running && !h100Errored && <span className="bench-status running"><span className="reading-dot"></span>chunked RAG</span>}
              {h100Errored && <span className="bench-status fail">CUDA OOM · exited</span>}
            </div>
          </div>

          <BenchMeter
            label="HBM"
            used={h100Errored ? 79 : Math.min(79, 38 + (t / 1700) * 41)}
            total={80}
            danger={h100Errored}
            color="oxblood"
          />

          <div className="bench-terminal h100-term">
            {visibleH100.map((s, i) => (
              <div key={i} className={`term-line term-${s.kind || ""}`}>
                {s.text}
              </div>
            ))}
            {running && !h100Errored && <div className="term-line term-cursor">▍</div>}
          </div>
        </div>

        {/* Right: MI300X */}
        <div className={`bench-col mi300x ${miDone ? "succeeded" : ""}`}>
          <div className="bench-col-head">
            <div className="bench-col-tag">
              <span className="cite">Side B</span>
              <span className="bench-gpu-name">1× MI300X · 192 GB HBM</span>
            </div>
            <div className="bench-col-status">
              {!running && t === 0 && <span className="bench-status idle">idle</span>}
              {running && !miDone && <span className="bench-status running"><span className="reading-dot"></span>full context</span>}
              {miDone && <span className="bench-status ok">complete · {miFindings} findings</span>}
            </div>
          </div>

          <BenchMeter
            label="HBM"
            used={miDone ? 142.7 : Math.min(142.7, 76 + (t / 11700) * 67)}
            total={192}
            color="forest"
          />

          <div className="bench-terminal mi-term">
            {visibleMI.map((s, i) => {
              if (s.kind === "narrate" || s.kind === "narrate-done") {
                return <div key={i} className="term-line term-narrate"><em>{s.text}</em></div>;
              }
              if (s.kind?.startsWith("find-")) {
                const sev = s.kind.split("-")[1];
                return (
                  <div key={i} className={`term-line term-find sev-${sev}`}>
                    <span className={`severity-badge badge-${sev}`}>{sev}</span>
                    <span><em>{s.text}</em></span>
                  </div>
                );
              }
              return <div key={i} className={`term-line term-${s.kind || ""}`}>{s.text}</div>;
            })}
            {running && !miDone && <div className="term-line term-cursor">▍</div>}
          </div>
        </div>
      </div>

      {/* Comparison table */}
      <div className="bench-compare">
        <div className="bench-compare-rule"></div>
        <table className="compare-table">
          <thead>
            <tr>
              <th></th>
              <th>1× H100 (80 GB)</th>
              <th>1× MI300X (192 GB)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Approach</td>
              <td>Chunked RAG, k=20–80, 1,948 chunks</td>
              <td>Full corpus in context, single pass</td>
            </tr>
            <tr className={h100Errored ? "row-fail" : ""}>
              <td>Outcome on this corpus</td>
              <td className={h100Errored ? "fail-cell" : ""}>{h100Errored ? "OOM at query 4 · exited" : "—"}</td>
              <td className={miDone ? "ok-cell" : ""}>{miDone ? "Completed · 9 findings · 1 memo" : "—"}</td>
            </tr>
            <tr>
              <td>Cross-document conflicts caught</td>
              <td className={h100Errored ? "fail-cell" : ""}>0 of 3 (chunk boundary splits the conflict)</td>
              <td className={miDone ? "ok-cell" : ""}>{miDone ? "3 of 3" : "—"}</td>
            </tr>
            <tr>
              <td>Wall-clock (real)</td>
              <td>~10 s before failure</td>
              <td>~90 s end-to-end</td>
            </tr>
            <tr>
              <td>Cost per memo (lambda pricing)</td>
              <td>n/a</td>
              <td>$0.31</td>
            </tr>
          </tbody>
        </table>

        <div className="bench-quote">
          <em>
            "The conflict between the MAE definition and the indemnity carve-out spans 184 pages. RAG can't see it.
            We didn't fix RAG — we made the corpus fit."
          </em>
        </div>

        <div className="bench-after">
          <button className="btn-ghost" onClick={onRestart}>← Back to drop zone</button>
        </div>
      </div>
    </section>
  );
};

const BenchMeter = ({ label, used, total, color, danger }) => {
  const pct = Math.min(100, (used / total) * 100);
  return (
    <div className="bench-meter">
      <div className="bench-meter-row">
        <span className="label">{label}</span>
        <span className="bench-meter-num">
          <span className={danger ? "bench-meter-danger" : ""}>{used.toFixed(1)}</span>
          <span className="bench-meter-of"> / {total} GB</span>
        </span>
      </div>
      <div className="bench-meter-bar">
        <div className={`bench-meter-fill ${danger ? "danger" : ""}`}
             style={{ width: `${pct}%`, background: danger ? "var(--j-oxblood)" : color === "forest" ? "var(--j-forest)" : "var(--j-oxblood)" }}>
        </div>
        {danger && <div className="bench-meter-tick"></div>}
      </div>
    </div>
  );
};

window.BenchmarkScreen = BenchmarkScreen;
