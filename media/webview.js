(function() {
  var filters = [
    {id:"ts",label:"TypeScript",extensions:[".ts",".tsx"],enabled:true},
    {id:"js",label:"JavaScript",extensions:[".js",".jsx"],enabled:true},
    {id:"json",label:"JSON",extensions:[".json"],enabled:true},
    {id:"md",label:"Markdown",extensions:[".md",".mdx"],enabled:true},
    {id:"css",label:"Styles",extensions:[".css",".scss",".less",".sass"],enabled:true},
    {id:"py",label:"Python",extensions:[".py"],enabled:true},
    {id:"go",label:"Go",extensions:[".go"],enabled:true},
    {id:"html",label:"HTML",extensions:[".html",".htm"],enabled:true}
  ];
  var markdownContent = "";
  var smartContext = "";
  var aiEnabled = false;
  var aiThinking = false;
  var previewOpen = false;

  var vscodeApi = acquireVsCodeApi();

  // ─── Preview Panel ────────────────────────────────────────────────────────

  function updatePreview() {
    var contentEl = document.getElementById("preview-content");
    var badgeEl = document.getElementById("preview-badge");
    if (!contentEl) return;
    try {
      contentEl.innerHTML = marked.parse(markdownContent);
      // Syntax-style code blocks: add language label
      contentEl.querySelectorAll("pre code").forEach(function(block) {
        var classes = block.className.match(/language-(\S+)/);
        if (classes && classes[1]) {
          var label = document.createElement("span");
          label.className = "code-lang-label";
          label.textContent = classes[1];
          block.parentElement.insertBefore(label, block);
        }
      });
    } catch(e) {
      contentEl.textContent = markdownContent;
    }
    if (badgeEl) {
      var fileCount = (markdownContent.match(/^### /gm) || []).length;
      badgeEl.textContent = fileCount + " files";
    }
  }

  function setPreviewOpen(open) {
    previewOpen = open;
    var body = document.getElementById("preview-body");
    var chevron = document.getElementById("preview-chevron");
    var header = document.getElementById("preview-toggle");
    if (body) body.className = open ? "preview-body open" : "preview-body";
    if (chevron) chevron.className = open ? "preview-chevron open" : "preview-chevron";
    if (header) header.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) updatePreview();
  }

  // ─── View Management ──────────────────────────────────────────────────────

  function showView(name) {
    ["v0","v1","v2","v3","v4"].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.className = (name === id) ? "" : "h";
    });
  }

  // ─── AI Toggle ────────────────────────────────────────────────────────────

  function setAIToggle(on) {
    aiEnabled = on;
    var toggle = document.getElementById("ai-toggle");
    var knob = document.getElementById("ai-toggle-knob");
    if (toggle && knob) {
      toggle.style.background = on ? "var(--accent)" : "var(--border)";
      knob.style.left = on ? "23px" : "3px";
      knob.style.background = on ? "#fff" : "var(--textdim)";
    }
  }

  function triggerAI() {
    var statusEl = document.getElementById("ai-status");
    if (statusEl) { statusEl.style.display = "block"; statusEl.style.color = "var(--textdim)"; statusEl.textContent = "AI is analyzing..."; statusEl.style.animation = "pulse 2s infinite"; }
    aiThinking = true;
    // Send smartContext (compact) to backend — 90% fewer tokens
    vscodeApi.postMessage({ type: "use_ai", smartContext: smartContext });
  }

  // ─── Setup ────────────────────────────────────────────────────────────────

  function setup() {
    // Bundle button
    var btn = document.getElementById("gn");
    if (btn) {
      btn.onclick = function() {
        showView("v1");
        vscodeApi.postMessage({type: "generate", fileFilters: filters});
      };
    }

    // Copy
    document.getElementById("cp").onclick = function() {
      vscodeApi.postMessage({type: "copy", content: markdownContent});
    };

    // Save
    document.getElementById("sv").onclick = function() {
      vscodeApi.postMessage({type: "save", content: markdownContent});
    };

    // Try again
    document.getElementById("rt").onclick = function() { showView("v0"); };

    // Gear → settings
    var gearBtn = document.getElementById("gear");
    if (gearBtn) gearBtn.onclick = function() { showView("v4"); };

    // Back from settings
    var btnCloseSettings = document.getElementById("bk-settings");
    if (btnCloseSettings) btnCloseSettings.onclick = function() { showView("v0"); };

    // Enter key in settings saves
    ["set-gemini","set-openai","set-groq","set-ollama"].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) {
        el.addEventListener("keydown", function(e) {
          if (e.key === "Enter") { e.preventDefault(); document.getElementById("sv-settings").click(); }
        });
      }
    });

    // Save settings
    var btnSaveSettings = document.getElementById("sv-settings");
    if (btnSaveSettings) {
      btnSaveSettings.onclick = function() {
        vscodeApi.postMessage({
          type: "save_settings",
          data: {
            provider: document.getElementById("set-provider").value,
            gemini: document.getElementById("set-gemini").value || null,
            openai: document.getElementById("set-openai").value || null,
            groq: document.getElementById("set-groq").value || null,
            ollama: document.getElementById("set-ollama").value
          }
        });
        showView("v0");
      };
    }

    // Preview panel toggle
    var previewToggleBtn = document.getElementById("preview-toggle");
    if (previewToggleBtn) previewToggleBtn.onclick = function() { setPreviewOpen(!previewOpen); };

    // Use AI toggle
    var aiToggle = document.getElementById("ai-toggle");
    if (aiToggle) {
      aiToggle.onclick = function() {
        if (aiThinking) return;
        var newState = !aiEnabled;
        setAIToggle(newState);
        if (newState && smartContext) {
          triggerAI();
        } else if (!newState) {
          // Strip AI section from markdown
          var sep = "\n\n---\n## AI Analysis\n";
          var idx = markdownContent.indexOf(sep);
          if (idx !== -1) {
            markdownContent = markdownContent.substring(0, idx);
            if (previewOpen) updatePreview();
          }
        }
      };
    }

    // Filter toggle
    filters.forEach(function(f, i) {
      var el = document.getElementById("fi" + i);
      if (el) {
        el.onclick = function() {
          f.enabled = !f.enabled;
          el.className = f.enabled ? "fi on glass" : "fi glass";
        };
      }
    });

    // ─── Message Handler ───────────────────────────────────────────────────

    window.onmessage = function(event) {
      var data = event.data;
      if (data.type === "showView") {
        if (data.view === "loading") { showView("v1"); return; }

        if (data.view === "results") {
          markdownContent = data.data.markdown;
          smartContext = data.data.smartContext || markdownContent;

          // Update stats
          document.getElementById("sf").textContent = data.data.summary.totalFiles;
          document.getElementById("sl").textContent = data.data.summary.totalLines;
          var sizeMB = data.data.summary.totalSize / 1024 / 1024;
          document.getElementById("ss").textContent = sizeMB < 1
            ? (data.data.summary.totalSize / 1024).toFixed(1) + "K"
            : sizeMB.toFixed(1) + "M";
          document.getElementById("st").textContent = Math.ceil(data.data.summary.totalLines * 1.3);

          // Security badge
          var bar = document.getElementById("ba");
          if (data.data.security.sensitiveFiles && data.data.security.sensitiveFiles.length > 0) {
            bar.className = "ba err glass";
            bar.innerHTML = "<span>⚠ " + data.data.security.sensitiveFiles.length + " sensitive file(s) detected</span>";
          } else {
            bar.className = "ba suc glass";
            bar.innerHTML = "<span>✓ No sensitive files detected</span>";
          }

          // Tree
          document.getElementById("tv").textContent = data.data.tree.split("\\n").slice(0, 30).join("\\n");

          // Refresh preview if open
          if (previewOpen) updatePreview();

          showView("v2");

          // Trigger AI if toggle is on
          if (aiEnabled && smartContext) triggerAI();
          return;
        }

        if (data.view === "error") {
          showView("v3");
          document.getElementById("er").innerHTML = "<span>" + data.error + "</span>";
        }

      } else if (data.type === "ai_thinking") {
        // status already shown

      } else if (data.type === "ai_appended") {
        aiThinking = false;
        var statusEl = document.getElementById("ai-status");
        if (statusEl) statusEl.style.display = "none";
        markdownContent = markdownContent + "\n\n---\n## AI Analysis\n" + data.text;
        if (previewOpen) updatePreview();

      } else if (data.type === "ai_error") {
        aiThinking = false;
        setAIToggle(false);
        var statusEl = document.getElementById("ai-status");
        if (statusEl) {
          statusEl.style.display = "block";
          statusEl.style.color = "var(--danger)";
          statusEl.textContent = "AI error: " + data.error;
          statusEl.style.animation = "none";
          setTimeout(function() {
            statusEl.style.display = "none";
            statusEl.style.color = "var(--textdim)";
            statusEl.style.animation = "pulse 2s infinite";
          }, 5000);
        }
      }
    };
  }

  setup();
})();