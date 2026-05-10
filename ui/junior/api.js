// Junior — API client for Counsel-in-a-Box FastAPI backend.
// Attaches to window.JuniorAPI (matches window.JuniorData pattern).

(function () {
  var DEFAULT_BASE = "http://129.212.186.87:8080";

  function getBaseUrl() {
    var params = new URLSearchParams(window.location.search);
    return params.get("api") || DEFAULT_BASE;
  }

  function checkBackendHealth(timeout) {
    timeout = timeout || 3000;
    var controller = new AbortController();
    var id = setTimeout(function () { controller.abort(); }, timeout);
    return fetch(getBaseUrl() + "/api/health", { signal: controller.signal })
      .then(function (resp) { clearTimeout(id); return resp.ok; })
      .catch(function () { return false; });
  }

  function createMatter(name, files) {
    var formData = new FormData();
    for (var i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }
    return fetch(
      getBaseUrl() + "/api/matters?name=" + encodeURIComponent(name),
      { method: "POST", body: formData }
    ).then(function (resp) {
      if (!resp.ok) throw new Error("Upload failed: " + resp.status);
      return resp.json();
    });
  }

  function pollMatter(matterId) {
    return fetch(getBaseUrl() + "/api/matters/" + matterId)
      .then(function (resp) {
        if (!resp.ok) throw new Error("Poll failed: " + resp.status);
        return resp.json();
      });
  }

  function downloadDocx(matterId) {
    return fetch(getBaseUrl() + "/api/matters/" + matterId + "/memo/docx")
      .then(function (resp) {
        if (!resp.ok) throw new Error("DOCX download failed: " + resp.status);
        return resp.blob();
      })
      .then(function (blob) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "review_memo.docx";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
  }

  function mapSeverityToType(severity) {
    if (severity === "critical" || severity === "high") return "Non-standard clause";
    if (severity === "medium") return "Disclosure inconsistency";
    return "Observation";
  }

  function mapMatterToFindings(matter) {
    var findings = [];
    var id = 1;

    (matter.risks || []).forEach(function (r) {
      findings.push({
        id: "f" + id++,
        type: mapSeverityToType(r.severity),
        severity: r.severity === "critical" ? "high" : r.severity,
        summary: r.deviation || "",
        reasoning: (r.market_standard || "") + " " + (r.recommendation || ""),
        citation: (r.section_ref || "") + " (" + (r.document_name || "") + ")",
        primary: { doc: r.document_name || "", anchor: "" },
      });
    });

    (matter.crossrefs || []).forEach(function (c) {
      findings.push({
        id: "f" + id++,
        type: "Cross-document " + (c.finding_type || "conflict"),
        severity: c.severity === "critical" ? "high" : c.severity || "medium",
        summary: c.explanation || "",
        reasoning:
          "Document A (" + (c.document_a || "") + " " + (c.section_a || "") + "): \"" +
          (c.text_a || "") + "\"\n\nDocument B (" + (c.document_b || "") + " " +
          (c.section_b || "") + "): \"" + (c.text_b || "") + "\"",
        citation: (c.section_a || "") + " \u2194 " + (c.section_b || ""),
        primary: { doc: c.document_a || "", anchor: "" },
        secondary: { doc: c.document_b || "", anchor: "" },
      });
    });

    (matter.obligations || []).forEach(function (o) {
      findings.push({
        id: "f" + id++,
        type: "Obligation \u2014 " + (o.priority || "deadline"),
        severity: o.priority === "critical" ? "high" : "low",
        summary: o.obligation || "",
        reasoning:
          "Obligor: " + (o.obligor || "N/A") + ". Due: " + (o.due_date || "N/A") +
          ". Condition: " + (o.condition || "unconditional") + ".",
        citation: (o.section_ref || "") + " (" + (o.document_name || "") + ")",
        primary: { doc: o.document_name || "", anchor: "" },
      });
    });

    var order = { high: 0, medium: 1, low: 2, info: 3 };
    findings.sort(function (a, b) {
      return (order[a.severity] || 3) - (order[b.severity] || 3);
    });

    return findings;
  }

  function generateLiveNarration(matter) {
    var lines = [];
    var t = 0;

    lines.push({ t: t, text: "Reading " + (matter.document_names || []).length + " documents\u2026" });
    t += 2000;

    if (matter.clauses && matter.clauses.length > 0) {
      lines.push({ t: t, text: "Extracted " + matter.clauses.length + " clauses across all documents." });
      t += 2000;
    }
    if (matter.risks && matter.risks.length > 0) {
      var critical = matter.risks.filter(function (r) { return r.severity === "critical" || r.severity === "high"; }).length;
      lines.push({ t: t, text: "Risk analysis complete. " + matter.risks.length + " findings \u2014 " + critical + " high severity." });
      t += 2000;
    }
    if (matter.obligations && matter.obligations.length > 0) {
      lines.push({ t: t, text: "Tracked " + matter.obligations.length + " obligations and deadlines." });
      t += 2000;
    }
    if (matter.crossrefs && matter.crossrefs.length > 0) {
      lines.push({ t: t, text: "Cross-reference audit found " + matter.crossrefs.length + " issues across documents." });
      t += 2000;
    }
    if (matter.memo_markdown) {
      lines.push({ t: t, text: "Done. Memo is ready." });
    }

    return lines;
  }

  function mapMatterToJuniorData(matter) {
    return {
      matter: {
        name: matter.name || "Uploaded Deal",
        subtitle: "Live review",
        associate: "AI Review",
        received: "Just now",
        pages: "\u2014",
        words: "\u2014",
        docs: (matter.document_names || []).length,
      },
      documents: (matter.document_names || []).map(function (name, i) {
        return {
          id: "doc" + i,
          name: name,
          short: name.split(".")[0].substring(0, 6).toUpperCase(),
          pages: "\u2014",
          words: "\u2014",
          kind: "Uploaded document",
        };
      }),
      findings: mapMatterToFindings(matter),
      memo: matter.memo_markdown || "",
      narration: generateLiveNarration(matter),
      docBodies: {},
    };
  }

  window.JuniorAPI = {
    getBaseUrl: getBaseUrl,
    checkBackendHealth: checkBackendHealth,
    createMatter: createMatter,
    pollMatter: pollMatter,
    downloadDocx: downloadDocx,
    mapMatterToFindings: mapMatterToFindings,
    mapMatterToJuniorData: mapMatterToJuniorData,
    generateLiveNarration: generateLiveNarration,
  };
})();
