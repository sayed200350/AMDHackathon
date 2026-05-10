// Screen 1 — Empty state / drop zone.
// First impression. Maria opens the app, sees the masthead, drops the deal package.

const DropScreen = ({ onContinue, showRecent, backendAvailable, setLiveMatterId }) => {
  const [hover, setHover] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [staged, setStaged] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const fileInputRef = useRef(null);
  const data = window.JuniorData;

  const onDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = (e) => { e.preventDefault(); setDragOver(false); };

  const handleLiveUpload = (files) => {
    if (!files || !files.length) return;
    setUploading(true);
    setUploadError(null);
    setUploadedFiles(Array.from(files).map(function (f) { return f.name; }));
    var name = files[0].name.replace(/\.\w+$/, "");
    window.JuniorAPI.createMatter(name, files).then(function (matter) {
      setLiveMatterId(matter.id);
      setUploading(false);
      onContinue();
    }).catch(function (err) {
      setUploading(false);
      setUploadError("Upload failed: " + (err.message || "Could not reach backend"));
    });
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) {
      handleLiveUpload(e.dataTransfer.files);
    }
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
                 onChange={(e) => {
                   if (e.target.files.length) {
                     handleLiveUpload(e.target.files);
                   }
                 }} />
          <div className="dropzone-corner tl"></div>
          <div className="dropzone-corner tr"></div>
          <div className="dropzone-corner bl"></div>
          <div className="dropzone-corner br"></div>

          {uploading ? (
            <div style={{ textAlign: "center", padding: "2rem 0" }}>
              <div style={{ fontSize: 18, fontFamily: "var(--j-font-display)", marginBottom: 12 }}>
                Uploading to MI300X\u2026
              </div>
              <div style={{ fontFamily: "var(--j-font-mono)", fontSize: 11, color: "var(--j-ink-mute)", marginBottom: 16 }}>
                {uploadedFiles.map(function (f, i) { return React.createElement("div", { key: i }, f); })}
              </div>
              <div className="reading-dot" style={{ margin: "0 auto" }}></div>
            </div>
          ) : uploadError ? (
            <div style={{ textAlign: "center", padding: "2rem 0" }}>
              <div style={{ fontSize: 14, color: "#dc2626", marginBottom: 12 }}>{uploadError}</div>
              <button className="btn-ghost" onClick={(e) => { e.stopPropagation(); setUploadError(null); }}>
                try again
              </button>
            </div>
          ) : !staged.length ? (
            <React.Fragment>
              <div className="dropzone-instruction">
                {dragOver ? (
                  <em>Junior is ready.</em>
                ) : (
                  <em>Drop the deal package here.<br/>PDFs, Word docs, emails.</em>
                )}
              </div>
              <div className="dropzone-or">\u2014 or \u2014</div>
              <button className="dropzone-browse" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                browse files
              </button>
              <div className="dropzone-hint">
                {dragOver ? "release to begin" : "MI300X online \u2014 drop files for live review"}
              </div>
              <div style={{ marginTop: 16, display: "flex", gap: 12, justifyContent: "center" }}>
                <span style={{ fontFamily: "var(--j-font-mono)", fontSize: 9, letterSpacing: "0.1em", color: "var(--j-forest)", textTransform: "uppercase", alignSelf: "center" }}>
                  \u25cf live \u2014 MI300X
                </span>
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
