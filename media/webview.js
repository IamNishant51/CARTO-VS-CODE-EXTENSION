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
  
  // Try to acquire the API, this can only be done once per session
  var vscodeApi = acquireVsCodeApi();

  function showView(name) {
    document.getElementById("v0").className = (name === "v0") ? "" : "h";
    document.getElementById("v1").className = (name === "v1") ? "" : "h";
    document.getElementById("v2").className = (name === "v2") ? "" : "h";
    document.getElementById("v3").className = (name === "v3") ? "" : "h";
    var v4 = document.getElementById("v4");
    if (v4) v4.className = (name === "v4") ? "" : "h";
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

    var btnSaveSettings = document.getElementById("sv-settings");
    if (btnSaveSettings) {
      btnSaveSettings.onclick = function() {
        vscodeApi.postMessage({
          type: "save_settings",
          data: {
            provider: document.getElementById("set-provider").value,
            gemini: document.getElementById("set-gemini").value,
            openai: document.getElementById("set-openai").value,
            groq: document.getElementById("set-groq").value,
            ollama: document.getElementById("set-ollama").value
          }
        });
        showView("v0");
      };
    }

    var aiBtn = document.getElementById("ai-send");
    if (aiBtn) {
      aiBtn.onclick = function() {
        var prompt = document.getElementById("ai-prompt").value;
        if (!prompt || !prompt.trim()) return;
        
        document.getElementById("ai-response").style.display = "block";
        document.getElementById("ai-response").innerHTML = "<div class='lt' style='margin-top:0'>AI is thinking...</div>";
        aiBtn.disabled = true;
        aiBtn.style.opacity = "0.5";
        
        vscodeApi.postMessage({
          type: "ask_ai", 
          prompt: prompt, 
          provider: document.getElementById("set-provider").value,
          context: markdownContent 
        });
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
      } else if (data.type === "ai_response") {
        try {
          document.getElementById("ai-response").innerHTML = marked.parse(data.text);
        } catch(e) {
          document.getElementById("ai-response").textContent = data.text;
        }
        var btn = document.getElementById("ai-send");
        if (btn) { btn.disabled = false; btn.style.opacity = "1"; }
      } else if (data.type === "ai_error") {
        document.getElementById("ai-response").innerHTML = "<span style='color: var(--danger)'>" + data.error + "</span>";
        var btn = document.getElementById("ai-send");
        if (btn) { btn.disabled = false; btn.style.opacity = "1"; }
      }
    };
  }

  setup();
})();