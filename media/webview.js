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
  var aiEnabled = false;
  var aiThinking = false;

  var vscodeApi = acquireVsCodeApi();

  function showView(name) {
    document.getElementById("v0").className = (name === "v0") ? "" : "h";
    document.getElementById("v1").className = (name === "v1") ? "" : "h";
    document.getElementById("v2").className = (name === "v2") ? "" : "h";
    document.getElementById("v3").className = (name === "v3") ? "" : "h";
    var v4 = document.getElementById("v4");
    if (v4) v4.className = (name === "v4") ? "" : "h";
  }

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

  function setup() {
    var btn = document.getElementById("gn");
    if (btn) {
      btn.onclick = function() {
        showView("v1");
        vscodeApi.postMessage({type: "generate", fileFilters: filters});
      };
    }

    document.getElementById("cp").onclick = function() {
      vscodeApi.postMessage({type: "copy", content: markdownContent});
    };

    document.getElementById("sv").onclick = function() {
      vscodeApi.postMessage({type: "save", content: markdownContent});
    };

    document.getElementById("rt").onclick = function() {
      showView("v0");
    };

    var gearBtn = document.getElementById("gear");
    if (gearBtn) {
      gearBtn.onclick = function() { showView("v4"); };
    }

    var btnCloseSettings = document.getElementById("bk-settings");
    if (btnCloseSettings) {
      btnCloseSettings.onclick = function() { showView("v0"); };
    }

    // Enter key in settings panel saves settings
    var settingsInputs = ["set-gemini", "set-openai", "set-groq", "set-ollama"];
    settingsInputs.forEach(function(id) {
      var el = document.getElementById(id);
      if (el) {
        el.addEventListener("keydown", function(e) {
          if (e.key === "Enter") {
            e.preventDefault();
            document.getElementById("sv-settings").click();
          }
        });
      }
    });

    var btnSaveSettings = document.getElementById("sv-settings");
    if (btnSaveSettings) {
      btnSaveSettings.onclick = function() {
        var geminiVal = document.getElementById("set-gemini").value;
        var openaiVal = document.getElementById("set-openai").value;
        var groqVal = document.getElementById("set-groq").value;
        var ollamaVal = document.getElementById("set-ollama").value;
        // Only send a key if the user actually typed something; empty = keep existing
        vscodeApi.postMessage({
          type: "save_settings",
          data: {
            provider: document.getElementById("set-provider").value,
            gemini: geminiVal || null,
            openai: openaiVal || null,
            groq: groqVal || null,
            ollama: ollamaVal
          }
        });
        showView("v0");
      };
    }

    // Use AI toggle
    var aiToggle = document.getElementById("ai-toggle");
    if (aiToggle) {
      aiToggle.onclick = function() {
        if (aiThinking) return; // don't allow toggling while AI is running
        setAIToggle(!aiEnabled);

        if (aiEnabled && markdownContent) {
          // AI was just turned ON and we have content — trigger AI analysis
          var statusEl = document.getElementById("ai-status");
          if (statusEl) { statusEl.style.display = "block"; }
          aiThinking = true;
          vscodeApi.postMessage({
            type: "use_ai",
            context: markdownContent
          });
        } else if (!aiEnabled) {
          // AI toggled OFF — strip any previously appended AI section from the content
          var sep = "\n\n---\n## AI Analysis\n";
          var idx = markdownContent.indexOf(sep);
          if (idx !== -1) {
            markdownContent = markdownContent.substring(0, idx);
          }
        }
      };
    }

    // Filter toggle logic
    filters.forEach(function(f, i) {
      var el = document.getElementById("fi" + i);
      if (el) {
        el.onclick = function() {
          f.enabled = !f.enabled;
          el.className = f.enabled ? "fi on glass" : "fi glass";
        };
      }
    });

    window.onmessage = function(event) {
      var data = event.data;
      if (data.type === "showView") {
        if (data.view === "loading") showView("v1");
        if (data.view === "results") {
          markdownContent = data.data.markdown;
          // If AI toggle is on, immediately trigger AI analysis on new results
          if (aiEnabled) {
            var statusEl = document.getElementById("ai-status");
            if (statusEl) { statusEl.style.display = "block"; }
            aiThinking = true;
            vscodeApi.postMessage({ type: "use_ai", context: markdownContent });
          }
          showView("v2");
          document.getElementById("sf").textContent = data.data.summary.totalFiles;
          document.getElementById("sl").textContent = data.data.summary.totalLines;
          var sizeMB = data.data.summary.totalSize / 1024 / 1024;
          document.getElementById("ss").textContent = (sizeMB < 1) ? (data.data.summary.totalSize / 1024).toFixed(1) + "K" : sizeMB.toFixed(1) + "M";
          document.getElementById("st").textContent = Math.ceil(data.data.summary.totalLines * 1.3);
          var bar = document.getElementById("ba");
          if (data.data.security.sensitiveFiles && data.data.security.sensitiveFiles.length > 0) {
            bar.className = "ba err glass";
            bar.innerHTML = "<span>" + data.data.security.sensitiveFiles.length + " sensitive</span>";
          } else {
            bar.className = "ba suc glass";
            bar.innerHTML = "<span>✓ No sensitive files</span>";
          }
          document.getElementById("tv").textContent = data.data.tree.split("\\n").slice(0, 30).join("\\n");
        }
        if (data.view === "error") {
          showView("v3");
          document.getElementById("er").innerHTML = "<span>" + data.error + "</span>";
        }
      } else if (data.type === "ai_thinking") {
        // Already showing status, nothing extra needed
      } else if (data.type === "ai_appended") {
        aiThinking = false;
        var statusEl = document.getElementById("ai-status");
        if (statusEl) { statusEl.style.display = "none"; }
        // Append AI analysis to markdown content
        markdownContent = markdownContent + "\n\n---\n## AI Analysis\n" + data.text;
      } else if (data.type === "ai_error") {
        aiThinking = false;
        var statusEl = document.getElementById("ai-status");
        if (statusEl) {
          statusEl.style.display = "block";
          statusEl.style.color = "var(--danger)";
          statusEl.textContent = "AI error: " + data.error;
          statusEl.style.animation = "none";
          setTimeout(function() { statusEl.style.display = "none"; statusEl.style.color = "var(--textdim)"; statusEl.style.animation = "pulse 2s infinite"; }, 4000);
        }
        // Turn off toggle on error
        setAIToggle(false);
      }
    };
  }

  setup();
})();