import * as vscode from 'vscode';
import { bundleWorkspace } from './core/bundler';
import { parseTechStack, generateMarkdown } from './core/markdown';
import * as fs from 'fs';
import * as path from 'path';
import { askAI } from './core/ai';

let provider: CartoViewProvider;

export function activate(context: vscode.ExtensionContext) {
  provider = new CartoViewProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('carto-main', provider)
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('carto.toggle', () => {
      vscode.commands.executeCommand('carto-main.focus');
    })
  );
}

class CartoViewProvider {
  constructor(private context: vscode.ExtensionContext) {}

  resolveWebviewView(webview: vscode.WebviewView) {
    webview.webview.options = { enableScripts: true };
    webview.title = 'Bundler';
    
    // Load the external JS file
    const jsPath = path.join(this.context.extensionPath, 'media', 'webview.js');
    let jsContent = '';
    try {
      jsContent = fs.readFileSync(jsPath, 'utf-8');
    } catch (e) {
      console.error('Failed to load webview.js:', e);
      jsContent = 'console.log("inline fallback");';
    }
    
    const config = vscode.workspace.getConfiguration('carto');
    const aiConfig = {
      provider: config.get('aiProvider', 'gemini'),
      gemini: config.get('geminiApiKey', ''),
      openai: config.get('openaiApiKey', ''),
      groq: config.get('groqApiKey', ''),
      ollama: config.get('ollamaEndpoint', 'http://localhost:11434')
    };
    
    const logoUri = webview.webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'logo.svg'));
    
    webview.webview.html = getHtml(jsContent, aiConfig, logoUri);

    webview.webview.onDidReceiveMessage(async (msg) => {
      if (msg.type === 'generate') {
        await this.runBundle(msg.fileFilters, webview);
      }
      if (msg.type === 'copy') {
        await vscode.env.clipboard.writeText(msg.content);
        vscode.window.showInformationMessage('Copied');
      }
      if (msg.type === 'save') {
        const uri = await vscode.window.showSaveDialog({
          defaultUri: vscode.Uri.file('project-' + new Date().toISOString().split('T')[0] + '.md'),
          filters: { Markdown: ['md'] }
        });
        if (uri) {
          await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(msg.content));
          vscode.window.showInformationMessage('Saved');
        }
      }
      if (msg.type === 'ask_ai') {
        try {
          const provider = msg.provider || vscode.workspace.getConfiguration('carto').get('aiProvider', 'gemini') as string;
          const response = await askAI(msg.prompt, msg.context, provider);
          webview.webview.postMessage({ type: 'ai_response', text: response });
        } catch (e: any) {
          webview.webview.postMessage({ type: 'ai_error', error: e.message || String(e) });
        }
      }
      if (msg.type === 'save_settings') {
        const config = vscode.workspace.getConfiguration('carto');
        await config.update('aiProvider', msg.data.provider, vscode.ConfigurationTarget.Global);
        await config.update('geminiApiKey', msg.data.gemini, vscode.ConfigurationTarget.Global);
        await config.update('openaiApiKey', msg.data.openai, vscode.ConfigurationTarget.Global);
        await config.update('groqApiKey', msg.data.groq, vscode.ConfigurationTarget.Global);
        await config.update('ollamaEndpoint', msg.data.ollama, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage('Carto AI Settings saved!');
      }
    });
  }

  async runBundle(filters: any[], webview: vscode.WebviewView) {
    const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!ws) {
      webview.webview.postMessage({ type: 'showView', view: 'error', error: 'Open a folder first' });
      return;
    }
    try {
      const exts = filters.filter((f: any) => f.enabled).flatMap((f: any) => f.extensions);
      const result = await bundleWorkspace(ws, { includeExtensions: exts.length ? exts : undefined, skipSensitive: true }, () => {});
      const mk = generateMarkdown(result, {}, await parseTechStack(ws));
      webview.webview.postMessage({
        type: 'showView',
        view: 'results',
        data: {
          markdown: mk.content,
          summary: result.summary,
          tree: result.tree,
          security: result.securityScan
        }
      });
    } catch (e) {
      webview.webview.postMessage({ type: 'showView', view: 'error', error: String(e) });
    }
  }
}

function getHtml(jsContent: string, config: any, logoUri: vscode.Uri): string {
  var filterHtml = '';
  var labels = ['TypeScript', 'JavaScript', 'JSON', 'Markdown', 'Styles', 'Python', 'Go', 'HTML'];
  for (var i = 0; i < labels.length; i++) {
    filterHtml += '<div class="fi on glass" id="fi' + i + '"><div class="fc"></div><span>' + labels[i] + '</span></div>';
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Inter', sans-serif; }
    :root {
      --bg: #0f111a;
      --surface: rgba(255, 255, 255, 0.03);
      --surfaceh: rgba(255, 255, 255, 0.08);
      --border: rgba(255, 255, 255, 0.1);
      --text: #ffffff;
      --textdim: #94a3b8;
      --accent: #6366f1;
      --accent-gradient: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
      --success: #10b981;
      --danger: #ef4444;
      --r: 12px;
    }
    body {
      background: var(--bg);
      color: var(--text);
      overflow-x: hidden;
      height: 100vh;
      display: flex;
      flex-direction: column;
      position: relative;
    }
    /* Animated Background */
    .bg-blobs {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none; overflow: hidden;
    }
    .blob {
      position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.4; animation: float 10s infinite alternate;
    }
    .blob-1 { top: -10%; left: -10%; width: 300px; height: 300px; background: #6366f1; animation-delay: 0s; }
    .blob-2 { bottom: -10%; right: -10%; width: 400px; height: 400px; background: #a855f7; animation-delay: -5s; }
    @keyframes float {
      0% { transform: translate(0, 0) scale(1); }
      100% { transform: translate(30px, 50px) scale(1.1); }
    }
    
    .z {
      position: relative; z-index: 1; padding: 24px; height: 100vh; overflow-y: auto;
    }
    h1 { font-size: 13px; font-weight: 600; color: var(--textdim); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px; }
    
    /* Glassmorphism */
    .glass {
      background: var(--surface);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid var(--border);
      border-radius: var(--r);
    }
    
    .f { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 30px; }
    .fi {
      display: flex; align-items: center; gap: 12px; padding: 14px 16px;
      cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .fi:hover { background: var(--surfaceh); transform: translateY(-2px); }
    .fi.on {
      background: rgba(99, 102, 241, 0.15);
      border-color: rgba(99, 102, 241, 0.5);
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.1);
    }
    .fc {
      width: 18px; height: 18px; border: 2px solid var(--border); border-radius: 6px;
      transition: all 0.2s; position: relative;
    }
    .fi.on .fc {
      background: var(--accent); border-color: var(--accent);
    }
    .fi.on .fc::after {
      content: ''; position: absolute; left: 5px; top: 2px; width: 4px; height: 8px;
      border: solid white; border-width: 0 2px 2px 0; transform: rotate(45deg);
    }
    span { font-size: 13px; font-weight: 500; }
    
    .b {
      width: 100%; padding: 16px 24px; background: var(--accent-gradient); color: #fff;
      border: none; border-radius: var(--r); font-size: 15px; font-weight: 600; cursor: pointer;
      transition: all 0.3s; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
      position: relative; overflow: hidden;
    }
    .b::after {
      content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
      transition: 0.5s;
    }
    .b:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4); }
    .b:hover::after { left: 100%; }
    .b:active { transform: translateY(0); }
    
    .s { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 24px; }
    .sc { padding: 20px 16px; text-align: center; display: flex; flex-direction: column; gap: 8px; }
    .sv { font-size: 24px; font-weight: 700; color: var(--text); background: var(--accent-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .sl { font-size: 11px; color: var(--textdim); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; }
    
    .ba { padding: 16px; border-radius: var(--r); font-size: 13px; margin-bottom: 24px; display: flex; align-items: center; gap: 12px; font-weight: 500; }
    .ba.suc { background: rgba(16, 185, 129, 0.1); color: var(--success); border: 1px solid rgba(16, 185, 129, 0.2); }
    .ba.err { background: rgba(239, 68, 68, 0.1); color: var(--danger); border: 1px solid rgba(239, 68, 68, 0.2); }
    
    .ai-sel { background: rgba(0,0,0,0.2); color: var(--text); border: 1px solid var(--border); border-radius: 6px; padding: 8px; outline: none; margin-bottom: 12px; }
    .ai-ta { border: 1px solid var(--border); color: var(--text); outline: none; }
    .ai-ta:focus { border-color: var(--accent); }
    
    #ai-response pre { background: rgba(0,0,0,0.3); padding: 12px; border-radius: 6px; overflow-x: auto; margin-bottom: 12px; border: 1px solid var(--border); }
    #ai-response code { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #a855f7; }
    #ai-response pre code { color: var(--text); }
    #ai-response p { margin-bottom: 12px; }
    #ai-response ul, #ai-response ol { padding-left: 20px; margin-bottom: 12px; }
    #ai-response h1, #ai-response h2, #ai-response h3 { margin-top: 16px; margin-bottom: 8px; color: var(--text); font-size: 14px; text-transform: none; }
    
    .tr {
      background: #000; border: 1px solid var(--border); border-radius: var(--r);
      padding: 16px; font-family: 'JetBrains Mono', monospace; font-size: 12px;
      max-height: 200px; overflow: auto; color: var(--textdim); white-space: pre;
      box-shadow: inset 0 2px 10px rgba(0,0,0,0.5);
    }
    
    .ac { display: flex; gap: 12px; margin-top: 24px; }
    .ac button {
      flex: 1; padding: 14px; background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--r); color: var(--text); font-size: 14px; font-weight: 600;
      cursor: pointer; transition: all 0.2s;
    }
    .ac button:hover { background: var(--surfaceh); border-color: rgba(255,255,255,0.2); }
    .ac .p { background: var(--accent); color: #fff; border-color: var(--accent); }
    .ac .p:hover { background: #4f46e5; border-color: #4f46e5; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3); }
    
    .sk {
      background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%);
      background-size: 200% 100%; animation: sh 1.5s infinite; border-radius: var(--r);
    }
    @keyframes sh { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
    
    .lt { text-align: center; color: var(--textdim); font-size: 14px; margin-top: 24px; font-weight: 500; animation: pulse 2s infinite; }
    @keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }
    .h { display: none !important; }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
</head>
<body>
  <div class="bg-blobs">
    <div class="blob blob-1"></div>
    <div class="blob blob-2"></div>
  </div>
  <div style="position: absolute; top: 20px; right: 20px; z-index: 10; cursor: pointer; opacity: 0.7; transition: opacity 0.2s;" id="gear" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.7">
    <svg width="20" height="20" fill="var(--textdim)" viewBox="0 0 24 24"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg>
  </div>
  <div class="z">
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
      <img src="${logoUri}" alt="Carto Logo" style="width: 32px; height: 32px;" />
      <span style="font-size: 16px; font-weight: 700; letter-spacing: 1px; color: var(--text);">CARTO</span>
    </div>
    <div id="v0">
      <h1>File Types</h1>
      <div class="f" id="fl">${filterHtml}</div>
      <button class="b" id="gn">Bundle Project</button>
    </div>
    <div id="v1" class="h">
      <div class="sk" style="height:60px;margin-bottom:16px"></div>
      <div class="sk" style="height:40px;margin-bottom:16px"></div>
      <div class="sk" style="height:200px;margin-bottom:16px"></div>
      <div class="sk" style="height:54px"></div>
      <div class="lt">Analyzing Codebase...</div>
    </div>
    <div id="v2" class="h">
      <div class="s">
        <div class="sc glass"><div class="sv" id="sf">0</div><div class="sl">Files</div></div>
        <div class="sc glass"><div class="sv" id="sl">0</div><div class="sl">Lines</div></div>
        <div class="sc glass"><div class="sv" id="ss">0</div><div class="sl">Size</div></div>
        <div class="sc glass"><div class="sv" id="st">0</div><div class="sl">Tokens</div></div>
      </div>
      <div class="ba suc glass" id="ba"><span>✓ No sensitive files</span></div>
      <div class="tr" id="tv"></div>
      
      <div class="glass" style="margin-top: 24px; padding: 16px; border-radius: var(--r);">
        <h2 style="font-size: 11px; margin-bottom: 12px; color: var(--textdim); text-transform: uppercase; font-weight: 600;">Ask AI about this codebase</h2>

        <textarea id="ai-prompt" class="ai-ta glass" placeholder="What does this project do?..." style="width: 100%; height: 80px; padding: 12px; resize: vertical; margin-bottom: 12px;"></textarea>
        <button class="b" id="ai-send" style="padding: 10px 16px; font-size: 13px;">Ask AI</button>
        <div id="ai-response" class="tr" style="margin-top: 12px; display: none; white-space: pre-wrap; line-height: 1.5;"></div>
      </div>

      <div class="ac">
        <button id="cp">Copy to Clipboard</button>
        <button class="p" id="sv">Save as Markdown</button>
      </div>
    </div>
    <div id="v3" class="h">
      <div class="ba err glass" id="er"><span></span></div>
      <button class="b" id="rt" style="margin-top: 20px;">Try Again</button>
    </div>
    <div id="v4" class="h">
      <div id="bk-settings" style="cursor: pointer; display: inline-flex; align-items: center; gap: 8px; color: var(--textdim); margin-bottom: 16px; font-size: 13px; font-weight: 500; transition: color 0.2s;" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='var(--textdim)'">
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M20,11H7.83l5.59-5.59L12,4l-8,8l8,8l1.41-1.41L7.83,13H20V11z"/></svg><span>Back</span>
      </div>
      <h1>AI Settings</h1>
      <div class="glass" style="padding: 16px; border-radius: var(--r);">
        <label style="display:block; margin-bottom: 4px; font-size: 11px; color: var(--textdim); text-transform: uppercase;">AI Provider</label>
        <select id="set-provider" class="ai-sel glass" style="width:100%; margin-bottom: 16px; padding: 10px;">
          <option value="gemini" ${config.provider === 'gemini' ? 'selected' : ''}>Gemini (gemini-1.5-pro)</option>
          <option value="openai" ${config.provider === 'openai' ? 'selected' : ''}>OpenAI (gpt-4o)</option>
          <option value="groq" ${config.provider === 'groq' ? 'selected' : ''}>Groq (llama-3.3-70b-versatile)</option>
          <option value="ollama" ${config.provider === 'ollama' ? 'selected' : ''}>Ollama (llama3)</option>
        </select>
        
        <label style="display:block; margin-bottom: 4px; font-size: 11px; color: var(--textdim); text-transform: uppercase;">Gemini API Key</label>
        <input type="password" id="set-gemini" value="${config.gemini}" class="ai-ta glass" style="width:100%; padding: 10px; margin-bottom: 16px; border-radius: 6px;">
        
        <label style="display:block; margin-bottom: 4px; font-size: 11px; color: var(--textdim); text-transform: uppercase;">OpenAI API Key</label>
        <input type="password" id="set-openai" value="${config.openai}" class="ai-ta glass" style="width:100%; padding: 10px; margin-bottom: 16px; border-radius: 6px;">
        
        <label style="display:block; margin-bottom: 4px; font-size: 11px; color: var(--textdim); text-transform: uppercase;">Groq API Key</label>
        <input type="password" id="set-groq" value="${config.groq}" class="ai-ta glass" style="width:100%; padding: 10px; margin-bottom: 16px; border-radius: 6px;">
        
        <label style="display:block; margin-bottom: 4px; font-size: 11px; color: var(--textdim); text-transform: uppercase;">Ollama Endpoint</label>
        <input type="text" id="set-ollama" value="${config.ollama}" class="ai-ta glass" style="width:100%; padding: 10px; margin-bottom: 24px; border-radius: 6px;" placeholder="http://localhost:11434">
        
        <button class="b" id="sv-settings" style="padding: 12px 16px; font-size: 13px;">Save Settings</button>
      </div>
    </div>
  </div>
  <script type="text/javascript">${jsContent}</script>
</body>
</html>`;
}

export function deactivate() {}