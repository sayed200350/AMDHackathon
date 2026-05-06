// Screen 1 — Empty state / drop zone.
// First impression. Maria opens the app, sees the masthead, drops the deal package.

const DropScreen = ({ onContinue, showRecent }) => {
  const [hover, setHover] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [staged, setStaged] = useState([]);
  const fileInputRef = useRef(null);
  const data = window.JuniorData;

  const onDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = (e) => { e.preventDefault(); setDragOver(false); };
  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    // Real demo: pretend the user dropped the matter package. Stage all 8 docs.
    setStaged(data.documents);
    setTimeout(onContinue, 700);
  };
  const onPick = () => {
    setStaged(data.documents);
    setTimeout(onContinue, 700);
  };

  return (
    <section className="drop-screen fade-in" data-screen-label="01 Drop zone">
      <div className="drop-stage">
        <div className="drop-hero">
          <h1 className="drop-headline">Counsel-in-a-box.</h1>
          <p className="drop-sub">
            <em>Drop tonight's deal package. Junior reads every page, every footnote,
            every side letter — and tells you what matters before morning.</em>
          </p>
        </div>

        <div
          className={`dropzone ${dragOver ? "dragging" : ""} ${hover ? "hovered" : ""} ${staged.length ? "staged" : ""}`}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => !staged.length && fileInputRef.current?.click()}
        >
          <input ref={fileInputRef} type="file" multiple style={{ display: "none" }}
                 onChange={() => { setStaged(data.documents); setTimeout(onContinue, 700); }} />
          <div className="dropzone-corner tl"></div>
          <div className="dropzone-corner tr"></div>
          <div className="dropzone-corner bl"></div>
          <div className="dropzone-corner br"></div>

          {!staged.length ? (
            <React.Fragment>
              <div className="dropzone-instruction">
                {dragOver ? (
                  <em>Junior is ready.</em>
                ) : (
                  <em>Drop the deal package here.<br/>PDFs, Word docs, emails.</em>
                )}
              </div>
              <div className="dropzone-or">— or —</div>
              <button className="dropzone-browse" onClick={(e) => { e.stopPropagation(); onPick(); }}>
                browse files
              </button>
              <div className="dropzone-hint">
                {dragOver ? "release to begin" : "Junior accepts up to 250 MB · stays on your machine"}
              </div>
            </React.Fragment>
          ) : (
            <div className="dropzone-staged">
              <div className="dropzone-staged-label">Receiving the package…</div>
              <div className="dropzone-staged-list">
                {staged.slice(0, 4).map((d, i) => (
                  <div key={d.id} className="dropzone-staged-row" style={{ animationDelay: `${i * 80}ms` }}>
                    <span className="cite">{d.short}</span>
                    <span className="dropzone-staged-name">{d.name}</span>
                  </div>
                ))}
                <div className="dropzone-staged-row" style={{ animationDelay: "320ms", color: "var(--j-ink-mute)", fontStyle: "italic" }}>
                  + {staged.length - 4} more
                </div>
              </div>
            </div>
          )}
        </div>

        {showRecent && (
          <div className="recent">
            <div className="recent-head">
              <span className="label">Recent matters</span>
              <span className="recent-meta">last 30 days</span>
            </div>
            <div className="recent-table">
              {data.recentMatters.map((m, i) => (
                <div key={i} className="recent-row">
                  <div className="recent-name">{m.name}</div>
                  <div className="recent-date">{m.date}</div>
                  <div className="recent-status"><span className="recent-dot"></span>{m.status}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

window.DropScreen = DropScreen;
