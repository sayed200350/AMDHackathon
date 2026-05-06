// Junior — main app shell. Wires the 5 screens together with a stage transition.
// Each screen owns its own component file (screen-*.jsx).

const { useState, useEffect, useRef, useCallback, useMemo } = React;

const SCREENS = [
  { id: "drop",     num: "01", label: "Intake" },
  { id: "intake",   num: "02", label: "Reading" },
  { id: "findings", num: "03", label: "Findings" },
  { id: "memo",     num: "04", label: "Memo" },
  { id: "bench",    num: "05", label: "Benchmark" },
];

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "density": "comfortable",
  "accent": "oxblood",
  "displayFont": "Playfair Display",
  "showRecentMatters": true
}/*EDITMODE-END*/;

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [screen, setScreen] = useState("drop");
  const [completed, setCompleted] = useState({}); // {drop: true, intake: true, ...}
  const [intakeProgress, setIntakeProgress] = useState(0); // ms into narration
  const [activeFinding, setActiveFinding] = useState(null);
  const [memoGenerated, setMemoGenerated] = useState(false);

  const goTo = useCallback((id) => {
    setScreen(id);
    // mark previous as done
    setCompleted((c) => {
      const idx = SCREENS.findIndex((s) => s.id === id);
      const next = { ...c };
      for (let i = 0; i < idx; i++) next[SCREENS[i].id] = true;
      return next;
    });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  // accent override
  useEffect(() => {
    const root = document.documentElement;
    if (tweaks.accent === "forest") {
      root.style.setProperty("--j-oxblood", "#2C4A3A");
      root.style.setProperty("--j-oxblood-soft", "rgba(44, 74, 58, 0.08)");
      root.style.setProperty("--j-oxblood-mid", "rgba(44, 74, 58, 0.18)");
    } else if (tweaks.accent === "ink") {
      root.style.setProperty("--j-oxblood", "#1A1814");
      root.style.setProperty("--j-oxblood-soft", "rgba(26, 24, 20, 0.06)");
      root.style.setProperty("--j-oxblood-mid", "rgba(26, 24, 20, 0.16)");
    } else {
      root.style.setProperty("--j-oxblood", "#6B1F2E");
      root.style.setProperty("--j-oxblood-soft", "rgba(107, 31, 46, 0.08)");
      root.style.setProperty("--j-oxblood-mid", "rgba(107, 31, 46, 0.18)");
    }
  }, [tweaks.accent]);

  useEffect(() => {
    document.documentElement.style.setProperty("--j-font-display",
      tweaks.displayFont === "EB Garamond" ? "'EB Garamond', Georgia, serif" :
      tweaks.displayFont === "Crimson Pro" ? "'Crimson Pro', Georgia, serif" :
      "'Playfair Display', Georgia, serif"
    );
  }, [tweaks.displayFont]);

  return (
    <React.Fragment>
      <div className="app-chrome" data-density={tweaks.density}>
        <Masthead screen={screen} completed={completed} onJump={goTo} />
        <main className="app-main">
          {screen === "drop"     && <DropScreen onContinue={() => goTo("intake")} showRecent={tweaks.showRecentMatters} />}
          {screen === "intake"   && <IntakeScreen progress={intakeProgress} setProgress={setIntakeProgress} onContinue={() => goTo("findings")} />}
          {screen === "findings" && <FindingsScreen active={activeFinding} setActive={setActiveFinding} onMemo={() => { setMemoGenerated(true); goTo("memo"); }} />}
          {screen === "memo"     && <MemoScreen freshlyGenerated={memoGenerated} onPrintConsumed={() => setMemoGenerated(false)} onBenchmark={() => goTo("bench")} />}
          {screen === "bench"    && <BenchmarkScreen onRestart={() => { setCompleted({}); setIntakeProgress(0); setActiveFinding(null); goTo("drop"); }} />}
        </main>
        <Foot screen={screen} />
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection title="Demo">
          <TweakButton onClick={() => { setIntakeProgress(0); setActiveFinding(null); setCompleted({}); }} label="Reset to drop zone" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6, marginTop: 8 }}>
            {SCREENS.map((s) => (
              <button key={s.id} onClick={() => setScreen(s.id)}
                style={{
                  padding: "8px 6px",
                  fontFamily: "var(--j-font-mono)",
                  fontSize: 9,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  background: screen === s.id ? "var(--j-oxblood)" : "transparent",
                  color: screen === s.id ? "var(--j-parchment)" : "var(--j-ink)",
                  border: "0.5px solid var(--j-rule)",
                  borderRadius: 2,
                  cursor: "pointer",
                }}
              >{s.num}</button>
            ))}
          </div>
        </TweakSection>

        <TweakSection title="Display">
          <TweakRadio tweakKey="density" label="Density" value={tweaks.density} setTweak={setTweak}
            options={[{ value: "spacious", label: "Spacious" }, { value: "comfortable", label: "Comfortable" }, { value: "compact", label: "Compact" }]} />
          <TweakRadio tweakKey="accent" label="Accent" value={tweaks.accent} setTweak={setTweak}
            options={[{ value: "oxblood", label: "Oxblood" }, { value: "forest", label: "Forest" }, { value: "ink", label: "Ink" }]} />
          <TweakSelect tweakKey="displayFont" label="Display font" value={tweaks.displayFont} setTweak={setTweak}
            options={["Playfair Display", "EB Garamond", "Crimson Pro"]} />
          <TweakToggle tweakKey="showRecentMatters" label="Show recent matters" value={tweaks.showRecentMatters} setTweak={setTweak} />
        </TweakSection>
      </TweaksPanel>
    </React.Fragment>
  );
}

function Masthead({ screen, completed, onJump }) {
  const matter = window.JuniorData.matter;
  const onMatterScreen = ["intake", "findings", "memo"].includes(screen);
  return (
    <header className="masthead">
      <div className="masthead-brand">
        <div className="monogram">J</div>
        <div>
          <div className="wordmark">Junior</div>
          {!onMatterScreen && <div className="brand-tag">Your associate has read the deal.</div>}
          {onMatterScreen && <div className="brand-tag">{matter.name} · {matter.subtitle}</div>}
        </div>
      </div>
      <nav className="masthead-nav" aria-label="Workflow">
        {SCREENS.map((s) => (
          <button key={s.id}
            className={`nav-step ${screen === s.id ? "active" : ""} ${completed[s.id] ? "done" : ""}`}
            onClick={() => onJump(s.id)}>
            <span className="num">{s.num}</span>{s.label}
          </button>
        ))}
      </nav>
      <div className="masthead-meta">
        {matter.associate.split(",")[0]} · {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}
      </div>
    </header>
  );
}

function Foot({ screen }) {
  const labels = {
    drop: "Awaiting documents",
    intake: "Reading in progress",
    findings: "9 findings — 3 high · 2 medium · 4 obligations",
    memo: "Memo ready",
    bench: "Benchmark · 1× MI300X (192 GB) vs 1× H100 (80 GB)",
  };
  return (
    <footer className="foot">
      <span>Junior · v0.4 · counsel-in-a-box</span>
      <span>{labels[screen]}</span>
      <span>Local instance · No data leaves this machine</span>
    </footer>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
