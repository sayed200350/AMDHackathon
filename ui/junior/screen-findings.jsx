// Screen 3 — Findings dashboard. The main workspace.
// Asymmetric two-column: 35% findings, 65% document viewer.
// Memorable moment: clicking a cross-document conflict splits the right pane and draws the connecting line.

const FindingsScreen = ({ active, setActive, onMemo }) => {
  const data = window.JuniorData;
  const [filter, setFilter] = useState("all"); // all | high | medium | low | obligation
  const [expandedId, setExpandedId] = useState(null);
  const [activeDoc, setActiveDoc] = useState("spa");
  const [flashAnchor, setFlashAnchor] = useState(null);
  const [splitMode, setSplitMode] = useState(null); // {finding} or null
  const [linePath, setLinePath] = useState(null);
  const docViewerRef = useRef(null);
  const splitTopRef = useRef(null);
  const splitBotRef = useRef(null);

  const findings = data.findings;
  const filtered = useMemo(() => {
    if (filter === "all") return findings;
    if (filter === "obligation") return findings.filter((f) => f.type.startsWith("Obligation"));
    return findings.filter((f) => f.severity === filter);
  }, [filter, findings]);

  const counts = {
    all: findings.length,
    high: findings.filter((f) => f.severity === "high").length,
    medium: findings.filter((f) => f.severity === "medium").length,
    low: findings.filter((f) => f.severity === "low").length,
    obligation: findings.filter((f) => f.type.startsWith("Obligation")).length,
  };

  // Click a finding: if it has secondary, split. Otherwise scroll & flash.
  const handleClick = (f) => {
    setExpandedId(expandedId === f.id ? null : f.id);
    setActive(f.id);
    if (f.secondary) {
      setSplitMode(f);
      setActiveDoc(null);
      // wait for layout then draw the line
      setTimeout(() => drawConnector(f), 220);
    } else {
      setSplitMode(null);
      setLinePath(null);
      setActiveDoc(f.primary.doc);
      setTimeout(() => {
        const el = document.querySelector(`[data-anchor="${f.primary.anchor}"]`);
        if (el && docViewerRef.current) {
          docViewerRef.current.scrollTo({ top: el.offsetTop - 60, behavior: "smooth" });
          setFlashAnchor(f.primary.anchor);
          setTimeout(() => setFlashAnchor(null), 1400);
        }
      }, 60);
    }
  };

  const drawConnector = (f) => {
    const top = splitTopRef.current?.querySelector(`[data-anchor="${f.primary.anchor}"]`);
    const bot = splitBotRef.current?.querySelector(`[data-anchor="${f.secondary.anchor}"]`);
    const wrap = document.querySelector(".split-wrap");
    if (!top || !bot || !wrap) return;
    // Scroll each pane to its anchor first.
    splitTopRef.current.scrollTo({ top: top.offsetTop - 30, behavior: "smooth" });
    splitBotRef.current.scrollTo({ top: bot.offsetTop - 30, behavior: "smooth" });
    setTimeout(() => {
      const wrapRect = wrap.getBoundingClientRect();
      const topRect = top.getBoundingClientRect();
      const botRect = bot.getBoundingClientRect();
      const x1 = topRect.right - wrapRect.left;
      const y1 = topRect.top + topRect.height / 2 - wrapRect.top;
      const x2 = botRect.right - wrapRect.left;
      const y2 = botRect.top + botRect.height / 2 - wrapRect.top;
      const midX = Math.max(x1, x2) + 36;
      setLinePath({
        d: `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`,
        x1, y1, x2, y2, midX,
      });
      setFlashAnchor("__split__");
      setTimeout(() => setFlashAnchor(null), 1800);
    }, 360);
  };

  const closeSplit = () => {
    setSplitMode(null);
    setLinePath(null);
    setActiveDoc("spa");
  };

  return (
    <section className="findings-screen fade-in" data-screen-label="03 Findings">
      <div className="findings-grid">

        {/* Left column: notes */}
        <aside className="findings-left">
          <div className="findings-header">
            <div className="findings-meta-line">
              <span className="label">Junior's notes</span>
              <span className="findings-time">{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })} {"\u00b7"} {(data.matter.docs || 0) + " docs"}</span>
            </div>
            <h2 className="findings-title">{data.matter.name}</h2>
            <p className="findings-summary"><em>{(() => {
              var high = findings.filter(function(f){ return f.severity === "high"; }).length;
              var cross = findings.filter(function(f){ return f.type.indexOf("Cross-document") === 0; }).length;
              var ob = findings.filter(function(f){ return f.type.indexOf("Obligation") === 0; }).length;
              var parts = [];
              if (high > 0) parts.push(high + " high-severity issue" + (high > 1 ? "s" : ""));
              if (cross > 0) parts.push(cross + " cross-document conflict" + (cross > 1 ? "s" : ""));
              if (ob > 0) parts.push(ob + " obligation" + (ob > 1 ? "s" : ""));
              if (parts.length === 0) return "Review complete. No critical issues found.";
              return "I found " + parts.join(", ") + ". I\u2019d start with the high-severity items.";
            })()}</em></p>
          </div>

          <div className="filter-row">
            <FilterPill label="All" value="all" count={counts.all} active={filter} onClick={setFilter} />
            <FilterPill label="High" value="high" count={counts.high} active={filter} onClick={setFilter} severity="high" />
            <FilterPill label="Medium" value="medium" count={counts.medium} active={filter} onClick={setFilter} severity="medium" />
            <FilterPill label="Low" value="low" count={counts.low} active={filter} onClick={setFilter} severity="low" />
            <FilterPill label="Obligations" value="obligation" count={counts.obligation} active={filter} onClick={setFilter} />
          </div>

          <div className="findings-list">
            {filtered.map((f) => (
              <FindingCard key={f.id}
                f={f}
                expanded={expandedId === f.id}
                active={active === f.id}
                onClick={() => handleClick(f)}
              />
            ))}
          </div>

          <div className="findings-cta">
            <button className="btn-primary" onClick={onMemo}>Generate memo →</button>
            <span className="findings-cta-hint">Junior will draft a memo from these findings.</span>
          </div>
        </aside>

        {/* Right column: document viewer */}
        <div className="findings-right">
          {!splitMode ? (
            <SingleDocViewer
              activeDoc={activeDoc}
              setActiveDoc={(id) => { setActiveDoc(id); setActive(null); setExpandedId(null); }}
              flashAnchor={flashAnchor}
              docViewerRef={docViewerRef}
            />
          ) : (
            <SplitDocViewer
              finding={splitMode}
              flashAnchor={flashAnchor}
              splitTopRef={splitTopRef}
              splitBotRef={splitBotRef}
              linePath={linePath}
              onClose={closeSplit}
            />
          )}
        </div>
      </div>
    </section>
  );
};

const FilterPill = ({ label, value, count, active, onClick, severity }) => (
  <button
    className={`filter-pill ${active === value ? "on" : ""} ${severity ? `sev-${severity}` : ""}`}
    onClick={() => onClick(value)}>
    <span>{label}</span>
    <span className="filter-count">{count}</span>
  </button>
);

const FindingCard = ({ f, expanded, active, onClick }) => (
  <article
    className={`finding-card sev-${f.severity} ${active ? "active" : ""} ${expanded ? "expanded" : ""}`}
    onClick={onClick}
  >
    <div className="finding-head">
      <div className="finding-type">{f.type}</div>
      <div className="monogram tiny">J</div>
    </div>
    <p className="finding-summary"><em>{f.summary}</em></p>
    <div className="finding-foot">
      <span className="cite">{f.citation}</span>
      <SeverityBadge severity={f.severity} />
    </div>
    {expanded && (
      <div className="finding-reasoning">
        <div className="reasoning-rule"></div>
        <div className="reasoning-label">Junior's reasoning</div>
        <p>{f.reasoning}</p>
        <div className="reasoning-action">
          <span className="reasoning-action-hint">{f.secondary ? "Showing both passages →" : "Jumped to citation →"}</span>
        </div>
      </div>
    )}
  </article>
);

const SeverityBadge = ({ severity }) => {
  const map = {
    critical: { label: "Critical", cls: "badge-high" },
    high: { label: "High", cls: "badge-high" },
    medium: { label: "Medium", cls: "badge-medium" },
    low: { label: "Low", cls: "badge-low" },
    info: { label: "Info", cls: "badge-low" },
  };
  const m = map[severity] || { label: severity || "Unknown", cls: "badge-low" };
  return <span className={`severity-badge ${m.cls}`}>{m.label}</span>;
};

const SingleDocViewer = ({ activeDoc, setActiveDoc, flashAnchor, docViewerRef }) => {
  const data = window.JuniorData;
  const doc = data.docBodies && data.docBodies[activeDoc] ? data.docBodies[activeDoc] : (data.docBodies ? data.docBodies.spa : null);
  return (
    <div className="doc-viewer">
      <DocTabs activeDoc={activeDoc} setActiveDoc={setActiveDoc} />
      <div className="doc-page" ref={docViewerRef}>
        {doc ? (
          <DocPage doc={doc} flashAnchor={flashAnchor} />
        ) : (
          <div style={{ padding: "3rem 2rem", textAlign: "center", color: "var(--j-ink-mute)", fontFamily: "var(--j-font-display)", fontSize: 16 }}>
            <p>Document viewer not available in live mode.</p>
            <p style={{ fontSize: 12, marginTop: 8, fontFamily: "var(--j-font-mono)" }}>Click findings on the left to see details.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const SplitDocViewer = ({ finding, flashAnchor, splitTopRef, splitBotRef, linePath, onClose }) => {
  const data = window.JuniorData;
  const top = data.docBodies[finding.primary.doc];
  const bot = data.docBodies[finding.secondary.doc];
  const flash = flashAnchor === "__split__";
  return (
    <div className="split-wrap">
      <div className="split-banner">
        <span className="label" style={{ color: "var(--j-oxblood)" }}>Cross-document conflict</span>
        <span className="split-cite cite">{finding.citation}</span>
        <button className="split-close" onClick={onClose}>close ×</button>
      </div>

      <div className="split-pane top" ref={splitTopRef}>
        <div className="split-pane-tag">
          <span className="cite">{finding.primary.doc.toUpperCase()}</span>
          <span className="split-pane-name">{top.title}</span>
        </div>
        <DocPage doc={top} flashAnchor={flash ? finding.primary.anchor : null} forceFlash />
      </div>

      <div className="split-pane bot" ref={splitBotRef}>
        <div className="split-pane-tag">
          <span className="cite">{finding.secondary.doc.toUpperCase()}</span>
          <span className="split-pane-name">{bot.title}</span>
        </div>
        <DocPage doc={bot} flashAnchor={flash ? finding.secondary.anchor : null} forceFlash />
      </div>

      {linePath && (
        <svg className="connector" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <marker id="dot" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
              <circle cx="4" cy="4" r="3" fill="var(--j-oxblood)" />
            </marker>
          </defs>
          <path d={linePath.d} fill="none" stroke="var(--j-oxblood)" strokeWidth="1"
                strokeDasharray="4 3" markerStart="url(#dot)" markerEnd="url(#dot)"
                className="connector-path" />
          <text x={linePath.midX + 8} y={(linePath.y1 + linePath.y2) / 2} className="connector-label">
            ↑ ↓ conflict
          </text>
        </svg>
      )}
    </div>
  );
};

const DocTabs = ({ activeDoc, setActiveDoc }) => {
  const data = window.JuniorData;
  return (
    <div className="doc-tabs">
      {data.documents.map((d) => (
        <button key={d.id}
          className={`doc-tab ${activeDoc === d.id ? "on" : ""}`}
          onClick={() => setActiveDoc(d.id)}>
          <span className="doc-tab-short">{d.short}</span>
          <span className="doc-tab-pages">{d.pages}p</span>
        </button>
      ))}
    </div>
  );
};

const DocPage = ({ doc, flashAnchor, forceFlash }) => {
  if (!doc) return null;
  return (
    <article className="doc-body">
      <header className="doc-header">
        <h1 className="doc-title">{doc.title}</h1>
        <p className="doc-sub"><em>{doc.header}</em></p>
      </header>
      {doc.sections.map((s, i) => (
        <section key={i} className="doc-section">
          <div className="doc-section-head">
            <span className="doc-section-num">{s.num}</span>
            <span className="doc-section-heading">{s.heading}</span>
          </div>
          {s.body.map((p, j) => {
            const isFlash = flashAnchor && p.anchor === flashAnchor;
            const cls = `doc-p ${p.flag ? `flag-${p.flag}` : ""} ${isFlash ? "flash" : ""}`;
            if (p.kind === "list") {
              return (
                <ul key={j} className="doc-list" data-anchor={p.anchor || undefined}>
                  {p.items.map((it, k) => <li key={k}>{it}</li>)}
                </ul>
              );
            }
            if (p.kind === "meta") {
              return <div key={j} className="doc-meta">{p.text}</div>;
            }
            return (
              <p key={j} className={cls} data-anchor={p.anchor || undefined}>
                {p.text}
              </p>
            );
          })}
        </section>
      ))}
      <footer className="doc-footer">
        <span className="cite">end of excerpt</span>
      </footer>
    </article>
  );
};

window.FindingsScreen = FindingsScreen;
