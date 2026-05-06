// Screen 2 — Intake / loading. Junior reads the documents and narrates.
// The narration is the demo's secret weapon. Typewriter on a scripted timeline.

const IntakeScreen = ({ progress, setProgress, onContinue }) => {
  const data = window.JuniorData;
  const narration = data.narration;
  const totalDuration = narration[narration.length - 1].t + 1500;

  const [tick, setTick] = useState(progress);
  const [paused, setPaused] = useState(false);
  const [hoveredDoc, setHoveredDoc] = useState(null);
  const startRef = useRef(null);
  const rafRef = useRef(null);

  // Drive the timeline.
  useEffect(() => {
    if (paused) return;
    let last = performance.now();
    const step = (now) => {
      const dt = now - last;
      last = now;
      setTick((t) => {
        const next = Math.min(t + dt, totalDuration);
        if (next >= totalDuration) return totalDuration;
        return next;
      });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [paused, totalDuration]);

  useEffect(() => { setProgress(tick); }, [tick, setProgress]);

  // Per-document state derived from progress.
  // Each of the 8 docs gets a window of indexing time.
  const docStates = useMemo(() => {
    return data.documents.map((d, i) => {
      const start = (totalDuration / data.documents.length) * i;
      const end = (totalDuration / data.documents.length) * (i + 1) - 800;
      if (tick < start) return { ...d, state: "queued", pct: 0 };
      if (tick < end) return { ...d, state: "reading", pct: Math.min(1, (tick - start) / (end - start)) };
      return { ...d, state: "indexed", pct: 1 };
    });
  }, [tick, totalDuration, data.documents]);

  // Narration lines visible so far.
  const visibleLines = narration.filter((n) => n.t <= tick);
  const currentLine = visibleLines[visibleLines.length - 1];
  const nextLine = narration[visibleLines.length];

  // Typewriter for the most recent line.
  const linesRendered = visibleLines.map((line, i) => {
    const isLast = i === visibleLines.length - 1;
    const elapsed = tick - line.t;
    const charsPerMs = line.text.length / 900; // ~900ms to type each line
    const charCount = isLast ? Math.min(line.text.length, Math.floor(elapsed * charsPerMs)) : line.text.length;
    return { text: line.text.slice(0, charCount), full: line.text, done: charCount >= line.text.length, key: i };
  });

  const done = tick >= totalDuration;
  const overallPct = Math.min(1, tick / totalDuration);

  // Counts that animate up as the narration reveals.
  const findingsFound = visibleLines.length >= 6 ? 9 :
                        visibleLines.length >= 5 ? 6 :
                        visibleLines.length >= 3 ? 3 : 0;
  const conflictsFound = visibleLines.length >= 5 ? 3 :
                         visibleLines.length >= 3 ? 1 : 0;

  return (
    <section className="intake-screen fade-in" data-screen-label="02 Reading">
      <div className="intake-grid">
        {/* Left: document list as library card catalog */}
        <aside className="intake-docs">
          <div className="intake-section-head">
            <span className="label">Library card</span>
            <span className="intake-pages">{data.matter.docs} documents · {data.matter.pages} pp.</span>
          </div>
          <div className="card-catalog">
            {docStates.map((d, i) => (
              <div key={d.id}
                   className={`catalog-card state-${d.state}`}
                   onMouseEnter={() => setHoveredDoc(d.id)}
                   onMouseLeave={() => setHoveredDoc(null)}>
                <div className="catalog-corner tl"></div>
                <div className="catalog-corner tr"></div>
                <div className="catalog-row catalog-top">
                  <span className="catalog-num">{String(i + 1).padStart(2, "0")}</span>
                  <span className="catalog-kind">{d.kind}</span>
                  <span className="catalog-state">
                    {d.state === "queued" && "·"}
                    {d.state === "reading" && <span className="reading-dot"></span>}
                    {d.state === "indexed" && <span className="check-mark">✓</span>}
                  </span>
                </div>
                <div className="catalog-name">{d.name}</div>
                <div className="catalog-row catalog-bottom">
                  <span className="catalog-pages">{d.pages} pp · {(d.words/1000).toFixed(1)}k words</span>
                  <span className="catalog-status-text">
                    {d.state === "queued"  && "queued"}
                    {d.state === "reading" && "reading…"}
                    {d.state === "indexed" && "indexed"}
                  </span>
                </div>
                <div className="catalog-progress">
                  <div className="catalog-progress-fill" style={{ width: `${d.pct * 100}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Right: narration */}
        <div className="intake-narration">
          <div className="intake-section-head">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="narration-pulse" data-done={done}></span>
              <span className="label">{done ? "Junior is ready" : "Junior is reading"}</span>
            </div>
            <span className="intake-elapsed">
              {String(Math.floor(tick/1000)).padStart(2, "0")}.{String(Math.floor((tick%1000)/10)).padStart(2,"0")} elapsed
            </span>
          </div>

          <div className="narration-stream">
            {linesRendered.map((l) => (
              <div key={l.key} className={`narration-line ${l.done ? "done" : "typing"}`}>
                <span className="narration-marker">—</span>
                <span className="narration-text">
                  {l.text}
                  {!l.done && <span className="caret">▍</span>}
                </span>
              </div>
            ))}
          </div>

          <div className="intake-stats">
            <div className="stat-cell">
              <div className="stat-label">Pages read</div>
              <div className="stat-value">{Math.floor(overallPct * data.matter.pages)}<span className="stat-of">/{data.matter.pages}</span></div>
            </div>
            <div className="stat-cell">
              <div className="stat-label">Defined terms</div>
              <div className="stat-value">{Math.floor(overallPct * 142)}<span className="stat-of">/142</span></div>
            </div>
            <div className="stat-cell">
              <div className="stat-label">Cross-refs checked</div>
              <div className="stat-value">{Math.floor(overallPct * 386)}<span className="stat-of">/386</span></div>
            </div>
            <div className="stat-cell">
              <div className="stat-label" style={{ color: findingsFound ? "var(--j-oxblood)" : null }}>Findings</div>
              <div className="stat-value">{findingsFound}</div>
            </div>
            <div className="stat-cell">
              <div className="stat-label" style={{ color: conflictsFound ? "var(--j-oxblood)" : null }}>Conflicts</div>
              <div className="stat-value">{conflictsFound}</div>
            </div>
          </div>

          <div className="intake-controls">
            <div className="intake-progress">
              <div className="intake-progress-fill" style={{ width: `${overallPct * 100}%` }}></div>
            </div>
            <div className="intake-actions">
              {!done ? (
                <React.Fragment>
                  <button className="btn-ghost" onClick={() => setPaused(!paused)}>
                    {paused ? "resume" : "pause"}
                  </button>
                  <button className="btn-ghost" onClick={() => setTick(totalDuration)}>
                    skip to findings →
                  </button>
                </React.Fragment>
              ) : (
                <button className="btn-primary" onClick={onContinue}>
                  Review findings →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

window.IntakeScreen = IntakeScreen;
