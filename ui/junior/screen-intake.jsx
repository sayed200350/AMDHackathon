// Screen 2 — Intake / loading. Junior reads the documents and narrates.
// The narration is the demo's secret weapon. Typewriter on a scripted timeline.

const IntakeScreen = ({ progress, setProgress, onContinue, liveMatterId }) => {
  const data = window.JuniorData;
  const narration = data.narration;
  const totalDuration = narration[narration.length - 1].t + 1500;

  const [tick, setTick] = useState(progress);
  const [paused, setPaused] = useState(false);
  const [hoveredDoc, setHoveredDoc] = useState(null);
  const [liveStatus, setLiveStatus] = useState(null);
  const [liveDocs, setLiveDocs] = useState([]);
  const [liveLines, setLiveLines] = useState([]);
  const [liveCounts, setLiveCounts] = useState({ clauses: 0, risks: 0, obligations: 0, crossrefs: 0 });
  const [liveElapsed, setLiveElapsed] = useState(0);
  const startRef = useRef(null);
  const rafRef = useRef(null);
  const pollRef = useRef(null);
  const liveStartRef = useRef(null);

  // Live elapsed timer
  useEffect(() => {
    if (!liveMatterId) return;
    liveStartRef.current = Date.now();
    var id = setInterval(function () { setLiveElapsed(Date.now() - liveStartRef.current); }, 200);
    return function () { clearInterval(id); };
  }, [liveMatterId]);

  // Live mode: poll the backend for real results
  useEffect(() => {
    if (!liveMatterId) return;
    var active = true;
    var pollCount = 0;
    var agentOrder = ["Clause Extractor", "Risk Scorer", "Obligation Tracker", "Cross-Ref Auditor", "Memo Drafter"];
    var poll = function () {
      pollCount++;
      console.log("[Junior] Poll #" + pollCount + " for matter " + liveMatterId);
      window.JuniorAPI.pollMatter(liveMatterId).then(function (matter) {
        if (!active) return;
        var cl = (matter.clauses||[]).length;
        var ri = (matter.risks||[]).length;
        var ob = (matter.obligations||[]).length;
        var cr = (matter.crossrefs||[]).length;
        console.log("[Junior] Status:", matter.status, "clauses:", cl, "risks:", ri, "obligations:", ob, "crossrefs:", cr);
        setLiveStatus(matter.status);
        setLiveCounts({ clauses: cl, risks: ri, obligations: ob, crossrefs: cr });

        // Build real document list
        if (matter.document_names && matter.document_names.length && liveDocs.length === 0) {
          setLiveDocs(matter.document_names.map(function (name, i) {
            return { id: "live" + i, name: name, short: name.split(".")[0].substring(0, 6).toUpperCase(), kind: "Uploaded", pages: "\u2014", words: 0 };
          }));
        }

        // Build narration from real agent progress
        var lines = [];
        lines.push("Reading " + (matter.document_names||[]).length + " documents\u2026");
        if (cl > 0) lines.push("Extracted " + cl + " clauses across all documents.");
        if (ri > 0) { var crit = (matter.risks||[]).filter(function(r){return r.severity==="critical"||r.severity==="high"}).length; lines.push("Risk analysis: " + ri + " findings \u2014 " + crit + " high severity."); }
        if (ob > 0) lines.push("Tracked " + ob + " obligations and deadlines.");
        if (cr > 0) lines.push("Cross-reference audit found " + cr + " issues.");
        if (matter.memo_markdown) lines.push("Memo drafted. Review is ready.");
        setLiveLines(lines);

        if (matter.status === "completed" || matter.status === "failed") {
          var mapped = window.JuniorAPI.mapMatterToJuniorData(matter);
          window.JuniorData.findings = mapped.findings;
          window.JuniorData.memo = mapped.memo;
          window.JuniorData.documents = mapped.documents;
          window.JuniorData.matter = mapped.matter;
          window.JuniorData.liveNarration = mapped.narration;
          console.log("[Junior] Review complete. Findings:", mapped.findings.length);
          setTimeout(onContinue, 1500);
        } else {
          pollRef.current = setTimeout(poll, 10000);
        }
      }).catch(function (err) {
        console.error("[Junior] Poll failed:", err);
        if (active) pollRef.current = setTimeout(poll, 15000);
      });
    };
    poll();
    return function () { active = false; clearTimeout(pollRef.current); };
  }, [liveMatterId, onContinue]);

  // Drive the timeline — pause when in live mode waiting for backend
  useEffect(() => {
    if (paused || liveMatterId) return;
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

  // --- LIVE MODE RENDER ---
  if (liveMatterId) {
    var elSec = Math.floor(liveElapsed / 1000);
    var elMs = Math.floor((liveElapsed % 1000) / 10);
    var liveComplete = liveStatus === "completed" || liveStatus === "failed";
    var agentsDone = [liveCounts.clauses > 0, liveCounts.risks > 0, liveCounts.obligations > 0, liveCounts.crossrefs > 0];
    var agentNames = ["Clause Extractor", "Risk Scorer", "Obligation Tracker", "Cross-Ref Auditor", "Memo Drafter"];
    var currentAgent = agentsDone.filter(Boolean).length;

    return (
      <section className="intake-screen fade-in" data-screen-label="02 Reading">
        <div className="intake-grid">
          <aside className="intake-docs">
            <div className="intake-section-head">
              <span className="label">Library card</span>
              <span className="intake-pages">{liveDocs.length} documents</span>
            </div>
            <div className="card-catalog">
              {liveDocs.map(function (d, i) {
                return (
                  <div key={d.id} className="catalog-card state-indexed">
                    <div className="catalog-corner tl"></div>
                    <div className="catalog-corner tr"></div>
                    <div className="catalog-row catalog-top">
                      <span className="catalog-num">{String(i + 1).padStart(2, "0")}</span>
                      <span className="catalog-kind">{d.kind}</span>
                      <span className="catalog-state"><span className="check-mark">{"\u2713"}</span></span>
                    </div>
                    <div className="catalog-name">{d.name}</div>
                    <div className="catalog-row catalog-bottom">
                      <span className="catalog-pages">uploaded</span>
                      <span className="catalog-status-text">indexed</span>
                    </div>
                    <div className="catalog-progress">
                      <div className="catalog-progress-fill" style={{ width: "100%" }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          <div className="intake-narration">
            <div className="intake-section-head">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="narration-pulse" data-done={liveComplete}></span>
                <span className="label">{liveComplete ? "Junior is ready" : "Junior is reading"}</span>
              </div>
              <span className="intake-elapsed">
                {String(elSec).padStart(2, "0")}.{String(elMs).padStart(2, "0")} elapsed
              </span>
            </div>

            <div className="narration-stream">
              {liveLines.map(function (text, i) {
                return (
                  <div key={i} className="narration-line done">
                    <span className="narration-marker">{"\u2014"}</span>
                    <span className="narration-text">{text}</span>
                  </div>
                );
              })}
              {!liveComplete && (
                <div className="narration-line typing">
                  <span className="narration-marker">{"\u2014"}</span>
                  <span className="narration-text">
                    {currentAgent < 5 ? "Running " + agentNames[currentAgent] + "\u2026" : "Finalizing\u2026"}
                    <span className="caret">{"\u258d"}</span>
                  </span>
                </div>
              )}
            </div>

            <div className="intake-stats">
              <div className="stat-cell">
                <div className="stat-label">Agents</div>
                <div className="stat-value">{currentAgent + (liveComplete ? 1 : 0)}<span className="stat-of">/5</span></div>
              </div>
              <div className="stat-cell">
                <div className="stat-label">Clauses</div>
                <div className="stat-value">{liveCounts.clauses}</div>
              </div>
              <div className="stat-cell">
                <div className="stat-label" style={{ color: liveCounts.risks ? "var(--j-oxblood)" : null }}>Risks</div>
                <div className="stat-value">{liveCounts.risks}</div>
              </div>
              <div className="stat-cell">
                <div className="stat-label">Obligations</div>
                <div className="stat-value">{liveCounts.obligations}</div>
              </div>
              <div className="stat-cell">
                <div className="stat-label" style={{ color: liveCounts.crossrefs ? "var(--j-oxblood)" : null }}>Cross-refs</div>
                <div className="stat-value">{liveCounts.crossrefs}</div>
              </div>
            </div>

            <div className="intake-controls">
              <div className="intake-progress">
                <div className="intake-progress-fill" style={{ width: ((currentAgent + (liveComplete ? 1 : 0)) / 5 * 100) + "%" }}></div>
              </div>
              <div className="intake-actions">
                <div style={{ fontFamily: "var(--j-font-mono)", fontSize: 11, letterSpacing: "0.05em" }}>
                  <span className="reading-dot" style={{ display: "inline-block", marginRight: 8 }}></span>
                  {liveStatus === "completed" ? "Review complete \u2014 loading findings\u2026" :
                   liveStatus === "failed" ? "Review failed \u2014 check server logs" :
                   "MI300X is analyzing your documents\u2026 (" + (liveStatus || "connecting") + ")"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // --- DEMO MODE RENDER (unchanged) ---
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
                    skip to findings \u2192
                  </button>
                </React.Fragment>
              ) : (
                <button className="btn-primary" onClick={onContinue}>
                  Review findings \u2192
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
