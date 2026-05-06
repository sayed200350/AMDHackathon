// Screen 4 — The memo. The output. What Maria delivers tomorrow morning.
// Subtle "paper coming out of the printer" effect when freshly generated.

const MemoScreen = ({ freshlyGenerated, onPrintConsumed, onBenchmark }) => {
  const data = window.JuniorData;
  const [editing, setEditing] = useState(false);
  const [exported, setExported] = useState(null); // 'docx' | 'pdf' | 'copy'
  const [printing, setPrinting] = useState(freshlyGenerated);

  useEffect(() => {
    if (printing) {
      const t = setTimeout(() => {
        setPrinting(false);
        onPrintConsumed && onPrintConsumed();
      }, 1400);
      return () => clearTimeout(t);
    }
  }, [printing, onPrintConsumed]);

  const triggerExport = (kind) => {
    setExported(kind);
    setTimeout(() => setExported(null), 1800);
  };

  return (
    <section className="memo-screen fade-in" data-screen-label="04 Memo">
      <div className="memo-toolbar">
        <div className="memo-toolbar-left">
          <span className="label">Output</span>
          <span className="memo-toolbar-title">Memorandum — Acme / Buyer</span>
        </div>
        <div className="memo-toolbar-right">
          <button className="btn-ghost" onClick={() => setEditing(!editing)}>
            {editing ? "done editing" : "edit memo"}
          </button>
          <button className="btn-secondary" onClick={() => triggerExport("docx")}>Export .DOCX</button>
          <button className="btn-secondary" onClick={() => triggerExport("pdf")}>Export .PDF</button>
          <button className="btn-secondary" onClick={() => triggerExport("copy")}>Copy</button>
        </div>
      </div>

      {exported && (
        <div className="export-toast">
          <span className="cite">{exported === "copy" ? "copied" : `${exported}.exported`}</span>
          <span><em>{
            exported === "docx" ? "memo_acme_buyer_2026-05-06.docx — saved to Downloads." :
            exported === "pdf"  ? "memo_acme_buyer_2026-05-06.pdf — saved to Downloads." :
                                  "Memo copied to clipboard."
          }</em></span>
        </div>
      )}

      <div className={`memo-paper-wrap ${printing ? "printing" : ""}`}>
        <div className="memo-paper" contentEditable={editing} suppressContentEditableWarning>
          <header className="memo-letterhead">
            <div className="memo-letterhead-top">
              <div className="memo-firmname">
                <div className="monogram med">J</div>
                <div>
                  <div className="memo-firm">Junior · Counsel-in-a-Box</div>
                  <div className="memo-firm-sub">Internal work product · attorney-client privileged</div>
                </div>
              </div>
              <div className="memo-letterhead-meta">
                <div>File 2026-05-ACME</div>
                <div>{new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
              </div>
            </div>
            <div className="memo-rule"></div>
            <h1 className="memo-title-large">MEMORANDUM</h1>
            <div className="memo-rule thin"></div>
          </header>

          <div className="memo-fields">
            <div className="memo-field"><span className="memo-field-key">TO</span><span className="memo-field-val">{data.matter.associate}</span></div>
            <div className="memo-field"><span className="memo-field-key">FROM</span><span className="memo-field-val">Junior <span className="memo-field-mute">— reviewed {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span></span></div>
            <div className="memo-field"><span className="memo-field-key">RE</span><span className="memo-field-val">{data.matter.name} — Stock Purchase Agreement Review</span></div>
            <div className="memo-field"><span className="memo-field-key">RE</span><span className="memo-field-val">8 documents · {data.matter.pages} pages · {data.matter.words.toLocaleString()} words</span></div>
          </div>

          <div className="memo-body">

            <section className="memo-section">
              <h2 className="memo-h2">I. <span>Executive Summary</span></h2>
              <p>
                Junior reviewed the Stock Purchase Agreement (the "<strong>SPA</strong>") between Acme Corp.
                ("<strong>Seller</strong>") and Buyer LLC ("<strong>Buyer</strong>"), together with four side
                letters, the disclosure schedules, the IP assignment annex, and the negotiation correspondence
                of record. <strong>Three issues warrant attention before signing</strong>; two additional issues
                are non-standard but workable; four are routine pre-closing obligations for the closing checklist.
              </p>
              <p>
                The two issues most likely to produce post-signing disputes are (i) the asymmetric treatment of
                <em> Material Adverse Effect</em> as between the SPA and Side Letter 3, and (ii) the off-record
                earnout cap referenced in counsel's email of April 19 but not papered. <strong>Both are addressable
                in a single round of redlines.</strong>
              </p>
            </section>

            <section className="memo-section">
              <h2 className="memo-h2">II. <span>High-Severity Findings</span></h2>

              <ol className="memo-list">
                <li>
                  <p><strong>MAE definition / indemnity carve-out asymmetry.</strong> The SPA defines
                  Material Adverse Effect to <em>include</em> "any change in industry conditions" (<span className="cite">§1.1</span>),
                  while Side Letter 3, §2(b), <em>excludes</em> from indemnifiable Losses "changes in industry or
                  market conditions generally affecting comparable companies" (<span className="cite">SL3 §2(b)</span>).
                  Read together, Seller could be on the hook for an MAE that the indemnity expressly excludes —
                  a meaningful asymmetry. <em>Recommended:</em> conform the §1.1 definition to the side-letter
                  carve-out, or strike the inclusive language in §1.1.</p>
                </li>
                <li>
                  <p><strong>Earnout cap referenced but not papered.</strong> Opposing counsel's email of
                  April 19 references "our verbal agreement that the earnout cap is the lesser of $40M or 1.5×
                  base" (<span className="cite">EML 04-19</span>). Side Letter 4 contains no such cap
                  (<span className="cite">SL4 §3</span>). <em>Recommended:</em> if the verbal agreement is
                  intended, reduce it to writing in Side Letter 4 before signing; if not, reply on the record
                  to disclaim it.</p>
                </li>
                <li>
                  <p><strong>IP ownership timing gap.</strong> Section 3.12(c) warrants ownership of the Company
                  IP "as of the date hereof" (<span className="cite">§3.12(c)</span>); the IP Assignment
                  Annex transfers rights "effective as of the Closing Date" (<span className="cite">IPA §2</span>).
                  Any IP created or acquired between signing and closing is warranted but not legally transferred.
                  <em>Recommended:</em> add a bring-down at closing or a covenant to assign interim IP.</p>
                </li>
              </ol>
            </section>

            <section className="memo-section">
              <h2 className="memo-h2">III. <span>Medium-Severity Findings</span></h2>
              <ol className="memo-list" start="4">
                <li>
                  <p><strong>Termination fee above NVCA median.</strong> Section 9.2(c) sets the termination
                  fee at 4.5% of the Equity Purchase Price; the NVCA Q1 2026 median for stock purchase
                  transactions in this size range is 3.5%. Worth a conversation with the client about
                  negotiating room. <span className="cite">§9.2(c)</span></p>
                </li>
                <li>
                  <p><strong>Disclosure inconsistency on IP claims.</strong> Schedule 3.12(a) lists 14 pending
                  IP matters without materiality designation; §3.12(b) of the SPA represents "no material
                  pending claims" subject only to a knowledge qualifier. <em>Recommended:</em> add materiality
                  designations on the schedule, or conform the rep. <span className="cite">§3.12(b) ↔ Sched. 3.12(a)</span></p>
                </li>
              </ol>
            </section>

            <section className="memo-section">
              <h2 className="memo-h2">IV. <span>Pre-Closing Obligations</span></h2>
              <p className="memo-mute"><em>For the closing checklist:</em></p>
              <ul className="memo-checklist">
                <li><strong>Buyer:</strong> deliver officer's certificate ≤ 5 business days before Closing. <span className="cite">§7.1(a)</span></li>
                <li><strong>Seller:</strong> use commercially reasonable efforts to obtain landlord consents within 30 days. <span className="cite">§5.4</span></li>
                <li><strong>Both:</strong> HSR notification within 10 business days of signing. <span className="cite">§6.2</span></li>
                <li><strong>Both:</strong> 10% escrow at Closing, held 18 months. <span className="cite">§2.4(b)</span></li>
              </ul>
            </section>

            <section className="memo-section">
              <h2 className="memo-h2">V. <span>What Junior Did Not Do</span></h2>
              <p className="memo-mute"><em>
                Junior reviewed the documents identified above and the negotiation correspondence of record.
                Junior did <strong>not</strong> review (a) the data room contents beyond what was packaged,
                (b) prior drafts of the agreement (none were provided), or (c) the financial model.
                Junior is an associate, not partner — please verify the high-severity findings against the
                source before relying on this memo.
              </em></p>
            </section>
          </div>

          <footer className="memo-signature">
            <div className="memo-sign-rule"></div>
            <div className="memo-sign-row">
              <div>
                <div className="memo-sign-label">Reviewed and prepared by</div>
                <div className="memo-sign-name">Junior</div>
                <div className="memo-sign-meta">tonight, 11:54 PM · 90 seconds end-to-end</div>
              </div>
              <div className="monogram lg signed">J</div>
            </div>
          </footer>

          {printing && <div className="memo-print-line"></div>}
        </div>
      </div>

      <div className="memo-after">
        <div className="memo-after-rule"></div>
        <div className="memo-after-row">
          <span className="label">Curious how this was possible?</span>
          <button className="btn-ghost" onClick={onBenchmark}>See the benchmark →</button>
        </div>
      </div>
    </section>
  );
};

window.MemoScreen = MemoScreen;
