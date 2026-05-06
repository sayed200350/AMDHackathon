// Demo content for Junior — Use Case 1: 11pm M&A rush review.
// Acme Corp (target) being acquired by Buyer LLC. Maria Chen, Esq. is the reviewing associate.

window.JuniorData = {
  matter: {
    name: "Acme Corp / Buyer LLC",
    subtitle: "Stock Purchase Agreement — review",
    associate: "Maria Chen, Esq.",
    received: "Tonight, 9:04 PM",
    pages: 247,
    words: 84612,
    docs: 8,
  },

  recentMatters: [
    { name: "Riverbend Capital / Helix Bio — Series C side letters", date: "Apr 28, 2026", status: "Memo delivered" },
    { name: "Westwood Partners — vendor MSA, 2024 renewal", date: "Apr 22, 2026", status: "Memo delivered" },
    { name: "Estate of Theodore Vance — codicil review", date: "Apr 15, 2026", status: "Memo delivered" },
  ],

  documents: [
    { id: "spa", name: "Stock Purchase Agreement.pdf", short: "SPA", pages: 187, words: 64210, kind: "Principal agreement" },
    { id: "sl1", name: "Side Letter 1 — Founders.pdf", short: "SL1", pages: 6, words: 1840, kind: "Side letter" },
    { id: "sl3", name: "Side Letter 3 — Indemnity carve-outs.pdf", short: "SL3", pages: 9, words: 2710, kind: "Side letter" },
    { id: "sl4", name: "Side Letter 4 — Earnout mechanics.pdf", short: "SL4", pages: 11, words: 3402, kind: "Side letter" },
    { id: "discl", name: "Disclosure Schedules.docx", short: "DS", pages: 24, words: 7980, kind: "Schedule" },
    { id: "esa", name: "Employment & Severance Annex.pdf", short: "ESA", pages: 7, words: 2100, kind: "Annex" },
    { id: "ipa", name: "IP Assignment & License.pdf", short: "IPA", pages: 4, words: 1380, kind: "Annex" },
    { id: "emails", name: "Negotiation correspondence (47 msgs).eml", short: "EML", pages: 9, words: 1990, kind: "Correspondence" },
  ],

  // Streaming narration — written in Junior's voice. Each line appears with a typewriter effect.
  narration: [
    { t: 0,    text: "Reading the Stock Purchase Agreement — 187 pages, sixty-four thousand words." },
    { t: 1800, text: "Indexing definitions. There are 142 defined terms; \"Material Adverse Effect\" is referenced 31 times." },
    { t: 3700, text: "Cross-referencing the four side letters against the principal agreement." },
    { t: 5400, text: "Side Letter 3, §2(b) modifies the indemnity cap. Noted." },
    { t: 7100, text: "The definition of \"Material Adverse Effect\" in §1.1 appears to conflict with the carve-out language in Side Letter 3 — flagging for your review." },
    { t: 9200, text: "Reading the Disclosure Schedules. Schedule 3.12(a) lists 14 pending IP matters; cross-checking against §3.12 of the agreement." },
    { t: 11400, text: "The IP Assignment Annex, §2, assigns rights \"as of Closing.\" The SPA, §3.12(c), warrants ownership \"as of the date hereof.\" There is a gap." },
    { t: 13800, text: "Termination fee in §9.2(c) is set at 4.5% of deal value. NVCA median for transactions of this size is 3.5%. Noted as non-standard." },
    { t: 15900, text: "Reviewing the negotiation correspondence — 47 messages over six weeks." },
    { t: 17600, text: "An email from opposing counsel dated April 19 references a \"verbal agreement\" on the earnout cap. The cap does not appear in Side Letter 4. Flagging." },
    { t: 19400, text: "Compiling the findings. Three high-severity, two medium, four obligations." },
    { t: 21000, text: "Done. Ready when you are." },
  ],

  // The findings, ordered by severity.
  findings: [
    {
      id: "f1",
      type: "Cross-document conflict",
      severity: "high",
      summary: "The definition of \"Material Adverse Effect\" in §1.1 of the SPA conflicts with the carve-out in Side Letter 3, §2(b).",
      reasoning: "The SPA defines MAE broadly to include \"any change in industry conditions.\" Side Letter 3 §2(b) carves out \"changes in industry or market conditions generally affecting comparable companies\" from the indemnity. Read together, the seller could be on the hook for an MAE that the indemnity expressly excludes — a meaningful asymmetry. You may wish to either conform the SPA definition to the side letter carve-out or strike one of them.",
      citation: "§1.1 ↔ SL3 §2(b)",
      primary: { doc: "spa", anchor: "spa-mae" },
      secondary: { doc: "sl3", anchor: "sl3-carve" },
    },
    {
      id: "f2",
      type: "Off-record obligation",
      severity: "high",
      summary: "Email of Apr 19 references a verbal earnout cap that is not memorialized in Side Letter 4.",
      reasoning: "Counsel for Buyer (M. Garrison) writes: \"…confirming our verbal agreement that the earnout cap is the lesser of $40M or 1.5x base.\" Side Letter 4 contains the formula but no dollar cap. If the verbal agreement is intended, it should be reduced to writing before signing. If not, you may wish to reply on the record clarifying that no such cap exists.",
      citation: "EML 04-19 ↔ SL4 §3",
      primary: { doc: "emails", anchor: "eml-19" },
      secondary: { doc: "sl4", anchor: "sl4-cap" },
    },
    {
      id: "f3",
      type: "Date-of-warranty gap",
      severity: "high",
      summary: "IP ownership warranted as of \"the date hereof\"; assigned as of \"Closing.\" Six-week gap.",
      reasoning: "§3.12(c) of the SPA warrants that the company owns its IP \"as of the date hereof.\" The IP Assignment Annex, §2, transfers rights \"effective as of the Closing Date.\" If any IP is created or acquired between signing and closing, ownership at signing is asserted but not legally transferred. Recommend either bring-down at closing or a covenant to assign interim IP.",
      citation: "§3.12(c) ↔ IPA §2",
      primary: { doc: "spa", anchor: "spa-312c" },
      secondary: { doc: "ipa", anchor: "ipa-2" },
    },
    {
      id: "f4",
      type: "Non-standard clause",
      severity: "medium",
      summary: "Termination fee of 4.5% exceeds NVCA median (3.5%) for deals of this size.",
      reasoning: "The termination fee in §9.2(c) is 4.5% of the equity purchase price. The NVCA Q1 2026 deal-points study reports a median of 3.5% and a 75th-percentile of 4.0% for stock purchase transactions in the $250M–$1B range. Not unreasonable, but worth a conversation with the client about negotiating room.",
      citation: "§9.2(c)",
      primary: { doc: "spa", anchor: "spa-92c" },
    },
    {
      id: "f5",
      type: "Disclosure inconsistency",
      severity: "medium",
      summary: "Schedule 3.12(a) lists 14 pending IP matters; §3.12(b) of the SPA represents \"no material pending claims.\"",
      reasoning: "The agreement contains a knowledge-qualified rep that there are no \"material pending\" IP claims, but the disclosure schedule lists fourteen matters without indicating which, if any, are material. Recommend either materiality designation on the schedule, or adding a knowledge qualifier consistent with how \"material\" is defined elsewhere.",
      citation: "§3.12(b) ↔ Sched. 3.12(a)",
      primary: { doc: "spa", anchor: "spa-312b" },
      secondary: { doc: "discl", anchor: "ds-312a" },
    },
    {
      id: "f6",
      type: "Obligation — deadline",
      severity: "low",
      summary: "Buyer must deliver officer's certificate no later than 5 business days before Closing.",
      reasoning: "§7.1(a) requires Buyer to deliver an officer's certificate certifying performance of covenants. This is informational; flagging for your closing checklist.",
      citation: "§7.1(a)",
      primary: { doc: "spa", anchor: "spa-71a" },
    },
    {
      id: "f7",
      type: "Obligation — covenant",
      severity: "low",
      summary: "Seller must use commercially reasonable efforts to obtain landlord consents within 30 days.",
      reasoning: "§5.4 — pre-closing covenant. Three leased premises are listed; landlord consents are required for assignment.",
      citation: "§5.4",
      primary: { doc: "spa", anchor: "spa-54" },
    },
    {
      id: "f8",
      type: "Obligation — notice",
      severity: "low",
      summary: "Antitrust filing (HSR) must be made within 10 business days of signing.",
      reasoning: "§6.2 — pre-closing covenant. Standard timing.",
      citation: "§6.2",
      primary: { doc: "spa", anchor: "spa-62" },
    },
    {
      id: "f9",
      type: "Obligation — payment",
      severity: "low",
      summary: "Escrow of 10% of purchase price for 18 months post-closing.",
      reasoning: "§2.4(b) — survives indemnification period. Mechanics in Schedule 2.4.",
      citation: "§2.4(b)",
      primary: { doc: "spa", anchor: "spa-24b" },
    },
  ],

  // Document body excerpts. We render a few "pages" with anchored passages.
  docBodies: {
    spa: {
      title: "Stock Purchase Agreement",
      header: "between Acme Corp., a Delaware corporation (the \"Company\"), and Buyer LLC, a Delaware limited liability company (\"Buyer\"), dated as of May 1, 2026.",
      sections: [
        {
          num: "ARTICLE I",
          heading: "Definitions",
          body: [
            { kind: "p", text: "1.1  Defined Terms.  As used in this Agreement, the following terms shall have the meanings set forth below:" },
            { kind: "p", text: "\"Affiliate\" means, with respect to any specified Person, any other Person that directly or indirectly controls, is controlled by, or is under common control with such Person." },
            { kind: "p", anchor: "spa-mae", flag: "high", text: "\"Material Adverse Effect\" means any event, change, occurrence, or circumstance that, individually or in the aggregate, has had or would reasonably be expected to have a material adverse effect on the business, results of operations, or financial condition of the Company, taken as a whole, including any change in industry conditions, regulatory environment, or general economic conditions." },
            { kind: "p", text: "\"Knowledge\" means the actual knowledge of any officer of the Company after reasonable inquiry of such officer's direct reports." },
          ],
        },
        {
          num: "ARTICLE II",
          heading: "Purchase and Sale",
          body: [
            { kind: "p", text: "2.1  Purchase and Sale of Shares.  At the Closing, on the terms and subject to the conditions set forth herein, the Company shall sell, transfer, and deliver to Buyer, and Buyer shall purchase from the Company, all of the issued and outstanding Shares." },
            { kind: "p", anchor: "spa-24b", text: "2.4(b)  Escrow.  An amount equal to ten percent (10%) of the Purchase Price (the \"Escrow Amount\") shall be deposited at Closing with the Escrow Agent and held for a period of eighteen (18) months following the Closing Date in accordance with Schedule 2.4." },
          ],
        },
        {
          num: "ARTICLE III",
          heading: "Representations and Warranties of the Company",
          body: [
            { kind: "p", text: "3.1  Organization.  The Company is duly organized, validly existing, and in good standing under the laws of the State of Delaware." },
            { kind: "p", anchor: "spa-312b", flag: "med", text: "3.12(b)  No Material IP Claims.  Except as set forth on Schedule 3.12(a), to the Knowledge of the Company, there are no material pending or threatened claims, actions, or proceedings against the Company alleging infringement, misappropriation, or violation of any Intellectual Property of any third party." },
            { kind: "p", anchor: "spa-312c", flag: "high", text: "3.12(c)  Ownership of IP.  The Company owns, free and clear of all Liens, all right, title, and interest in and to the Company Intellectual Property, as of the date hereof." },
          ],
        },
        {
          num: "ARTICLE V",
          heading: "Pre-Closing Covenants",
          body: [
            { kind: "p", anchor: "spa-54", text: "5.4  Landlord Consents.  Seller shall use commercially reasonable efforts to obtain, within thirty (30) days of the date hereof, the consent of each landlord under the Real Property Leases listed on Schedule 5.4 to the assignment of such leases to Buyer at Closing." },
          ],
        },
        {
          num: "ARTICLE VI",
          heading: "Regulatory Filings",
          body: [
            { kind: "p", anchor: "spa-62", text: "6.2  HSR Filing.  The parties shall, within ten (10) Business Days of the date hereof, file all notifications required under the Hart-Scott-Rodino Antitrust Improvements Act and use commercially reasonable efforts to obtain early termination of the waiting period." },
          ],
        },
        {
          num: "ARTICLE VII",
          heading: "Closing Conditions",
          body: [
            { kind: "p", anchor: "spa-71a", text: "7.1(a)  Officer's Certificate.  Buyer shall have delivered to Seller, no later than five (5) Business Days prior to the Closing Date, a certificate executed by an officer of Buyer certifying as to the matters set forth in Sections 6.1 and 6.2." },
          ],
        },
        {
          num: "ARTICLE IX",
          heading: "Termination",
          body: [
            { kind: "p", anchor: "spa-92c", flag: "med", text: "9.2(c)  Termination Fee.  In the event this Agreement is terminated by Buyer pursuant to Section 9.1(d), Seller shall pay to Buyer a termination fee equal to four and one-half percent (4.5%) of the Equity Purchase Price (the \"Termination Fee\"), payable in immediately available funds within three Business Days of such termination." },
          ],
        },
      ],
    },
    sl3: {
      title: "Side Letter 3 — Indemnity Carve-Outs",
      header: "Reference is made to that certain Stock Purchase Agreement dated as of May 1, 2026.",
      sections: [
        {
          num: "§1",
          heading: "Reference",
          body: [
            { kind: "p", text: "Capitalized terms used herein and not otherwise defined have the meanings ascribed to them in the Stock Purchase Agreement." },
          ],
        },
        {
          num: "§2",
          heading: "Indemnification Carve-Outs",
          body: [
            { kind: "p", text: "Notwithstanding anything to the contrary in Article VIII of the Agreement, the Indemnifying Party shall not be liable for, and \"Losses\" shall not include:" },
            { kind: "p", anchor: "sl3-carve", flag: "high", text: "2(b)  any Losses arising from changes in industry or market conditions generally affecting comparable companies operating in the Company's sector, including any change in commodity prices, interest rates, or currency exchange rates, except to the extent such changes disproportionately affect the Company." },
            { kind: "p", text: "2(c)  any Losses arising from changes in applicable Law or GAAP after the date hereof." },
          ],
        },
      ],
    },
    sl4: {
      title: "Side Letter 4 — Earnout Mechanics",
      header: "Reference is made to that certain Stock Purchase Agreement dated as of May 1, 2026.",
      sections: [
        {
          num: "§3",
          heading: "Earnout Calculation",
          body: [
            { kind: "p", anchor: "sl4-cap", flag: "high", text: "3.1  Earnout Amount.  The Earnout Amount shall be calculated as the product of (i) the Earnout Multiplier, and (ii) the Excess Revenue, in each case as determined in accordance with Schedule A. For the avoidance of doubt, no maximum or cap on the Earnout Amount is set forth in this Agreement." },
            { kind: "p", text: "3.2  Payment.  The Earnout Amount, if any, shall be paid by wire transfer of immediately available funds within thirty (30) days following delivery of the Earnout Statement." },
          ],
        },
      ],
    },
    ipa: {
      title: "IP Assignment & License",
      header: "Made and entered into as of May 1, 2026, by and between Acme Corp. (\"Assignor\") and Buyer LLC (\"Assignee\").",
      sections: [
        {
          num: "§2",
          heading: "Assignment",
          body: [
            { kind: "p", anchor: "ipa-2", flag: "high", text: "2.  Assignment.  Effective as of the Closing Date, Assignor hereby assigns, transfers, and conveys to Assignee all of Assignor's right, title, and interest in and to the Assigned Intellectual Property, together with all associated goodwill and the right to sue for past, present, and future infringements." },
          ],
        },
      ],
    },
    discl: {
      title: "Disclosure Schedules",
      header: "Delivered in connection with the Stock Purchase Agreement dated May 1, 2026.",
      sections: [
        {
          num: "Sch. 3.12(a)",
          heading: "Pending Intellectual Property Matters",
          body: [
            { kind: "p", anchor: "ds-312a", flag: "med", text: "The following matters are pending as of the date hereof. No designation of materiality is made except as expressly indicated." },
            { kind: "list", items: [
              "USPTO Office Action — Application No. 18/441,209 (filed Mar 2024).",
              "Cease-and-desist letter from Northwind Software, dated Jan 14, 2026, alleging trademark confusion in the \"Acme Pulse\" mark.",
              "Pending opposition before the TTAB — Acme Corp. v. Sentinel Labs, Opposition No. 91-2024-1438.",
              "Twelve (12) additional matters of varying status, listed on the attached supplemental schedule.",
            ] },
          ],
        },
      ],
    },
    emails: {
      title: "Negotiation Correspondence",
      header: "47 messages between counsel of record, March 12 – April 28, 2026.",
      sections: [
        {
          num: "04-19",
          heading: "From: M. Garrison · To: Maria Chen · Subject: Re: Earnout",
          body: [
            { kind: "meta", text: "Sent Apr 19, 2026 · 4:48 PM" },
            { kind: "p", text: "Maria —" },
            { kind: "p", anchor: "eml-19", flag: "high", text: "Quick note while it's fresh — this is just confirming our verbal agreement from yesterday's call that the earnout cap is the lesser of $40M or 1.5× base. I'll have Marcus draft the language into Side Letter 4 over the weekend. Let me know if I'm misremembering." },
            { kind: "p", text: "— Mark" },
          ],
        },
      ],
    },
  },
};
