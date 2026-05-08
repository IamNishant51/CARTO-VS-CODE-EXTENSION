"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ANALYSIS_PROMPT = void 0;
exports.askAI = askAI;
const vscode = __importStar(require("vscode"));
// ── Constants ──────────────────────────────────────────────────────────────
/** Max characters to send per provider — based on real token limits with safety margin */
const PROVIDER_CHAR_LIMITS = {
    gemini: 280_000, // Gemini 1.5 Pro has 1M token context; ~280K chars is safe (~70K tokens)
    openai: 96_000, // GPT-4o has 128K token context; 96K chars is safe (~24K tokens)
    groq: 32_000, // Groq llama-3.3-70b: ~8K TPM free tier; 32K chars = ~8K tokens safe
    ollama: 40_000, // Local models vary; 40K chars is a safe default
};
const REQUEST_TIMEOUT_MS = 60_000; // 60 seconds
const SYSTEM_PROMPT = `You are a principal software engineer and architecture expert. \
You are analyzing a real codebase and must produce a concise, actionable technical summary.

Rules:
- Be specific — cite file names and code patterns you observe.
- Be expert-level — skip obvious things, focus on non-trivial architecture.
- Format everything in clean, readable Markdown.
- Do not pad the response with generic filler text.`;
exports.ANALYSIS_PROMPT = `Analyze this codebase and write a technical summary covering:

1. **Architecture Overview** — high-level design patterns, layers, entry points
2. **Tech Stack** — languages, frameworks, key libraries and why they're used
3. **Key Components** — the most important files/modules and their roles
4. **Data Flow** — how data moves through the system
5. **Notable Patterns & Concerns** — anything clever, problematic, or worth knowing
6. **Getting Started** — how a new developer would run and understand this project

Keep it concise but comprehensive. Use headers, bullet points, and \`code references\`.`;
// ── Public API ─────────────────────────────────────────────────────────────
async function askAI(prompt, context, provider) {
    const config = vscode.workspace.getConfiguration('carto');
    // Resolve provider — fall back to any configured one if the selected one has no key
    const activeProvider = resolveProvider(provider, config);
    // Truncate context to provider-safe limit
    const limit = PROVIDER_CHAR_LIMITS[activeProvider] ?? 32_000;
    const safeContext = context.length > limit
        ? context.substring(0, limit) + '\n\n> [Context truncated to fit model limits]'
        : context;
    const userMessage = buildUserMessage(prompt, safeContext);
    switch (activeProvider) {
        case 'gemini':
            return callWithTimeout(askGemini(SYSTEM_PROMPT + '\n\n' + userMessage, config.get('geminiApiKey', '')), REQUEST_TIMEOUT_MS);
        case 'openai':
            return callWithTimeout(askOpenAI(SYSTEM_PROMPT, userMessage, config.get('openaiApiKey', '')), REQUEST_TIMEOUT_MS);
        case 'groq':
            return callWithTimeout(askGroq(SYSTEM_PROMPT, userMessage, config.get('groqApiKey', '')), REQUEST_TIMEOUT_MS);
        case 'ollama':
            return callWithTimeout(askOllama(SYSTEM_PROMPT, userMessage, config.get('ollamaEndpoint', 'http://localhost:11434')), REQUEST_TIMEOUT_MS);
        default:
            throw new Error(`Unknown AI provider: "${activeProvider}". Check your Carto settings.`);
    }
}
// ── Provider Resolution ────────────────────────────────────────────────────
function resolveProvider(requested, config) {
    const hasKey = (p) => {
        if (p === 'ollama')
            return true; // Ollama needs no key
        const keys = {
            gemini: 'geminiApiKey',
            openai: 'openaiApiKey',
            groq: 'groqApiKey',
        };
        const val = config.get(keys[p] ?? '', '');
        return !!val && val.trim().length > 0;
    };
    if (hasKey(requested))
        return requested;
    // Fall back to any provider that has a key configured
    for (const p of ['gemini', 'openai', 'groq', 'ollama']) {
        if (p !== requested && hasKey(p)) {
            console.warn(`[Carto] Provider "${requested}" has no API key — falling back to "${p}"`);
            return p;
        }
    }
    return requested; // Let the individual call throw a clear error
}
// ── Message Builder ────────────────────────────────────────────────────────
function buildUserMessage(prompt, context) {
    return `## Codebase Context\n\n${context}\n\n---\n\n## Task\n\n${prompt}`;
}
// ── Timeout Wrapper ────────────────────────────────────────────────────────
function callWithTimeout(promise, ms) {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error(`AI request timed out after ${ms / 1000}s. Try again or use a different provider.`)), ms));
    return Promise.race([promise, timeout]);
}
// ── Provider Implementations ───────────────────────────────────────────────
async function askGemini(fullPrompt, apiKey) {
    if (!apiKey?.trim()) {
        throw new Error('Gemini API key is not configured. Open Carto Settings to add it.');
    }
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: fullPrompt }] }],
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 2048,
            },
        }),
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const msg = err?.error?.message ?? `HTTP ${response.status}`;
        if (response.status === 429)
            throw new Error(`Gemini rate limit hit. Wait a moment and try again. (${msg})`);
        if (response.status === 400)
            throw new Error(`Gemini request rejected — context may be too large. (${msg})`);
        throw new Error(`Gemini error: ${msg}`);
    }
    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text)
        throw new Error('Gemini returned an empty response. The context may have been filtered.');
    return text;
}
async function askOpenAI(systemPrompt, userPrompt, apiKey) {
    if (!apiKey?.trim()) {
        throw new Error('OpenAI API key is not configured. Open Carto Settings to add it.');
    }
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini', // cheaper & faster than gpt-4o while still excellent
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            temperature: 0.3,
            max_tokens: 2048,
        }),
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const msg = err?.error?.message ?? `HTTP ${response.status}`;
        if (response.status === 429)
            throw new Error(`OpenAI rate limit hit. Wait a moment and try again. (${msg})`);
        if (response.status === 401)
            throw new Error('OpenAI API key is invalid. Check your Carto Settings.');
        throw new Error(`OpenAI error: ${msg}`);
    }
    const data = await response.json();
    return data?.choices?.[0]?.message?.content ?? 'No response received from OpenAI.';
}
async function askGroq(systemPrompt, userPrompt, apiKey) {
    if (!apiKey?.trim()) {
        throw new Error('Groq API key is not configured. Open Carto Settings to add it.');
    }
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            temperature: 0.3,
            max_tokens: 2048,
        }),
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const msg = err?.error?.message ?? `HTTP ${response.status}`;
        if (response.status === 429)
            throw new Error(`Groq rate limit hit. Wait 60 seconds and try again. (${msg})`);
        if (response.status === 401)
            throw new Error('Groq API key is invalid. Check your Carto Settings.');
        throw new Error(`Groq error: ${msg}`);
    }
    const data = await response.json();
    return data?.choices?.[0]?.message?.content ?? 'No response received from Groq.';
}
async function askOllama(systemPrompt, userPrompt, endpoint) {
    const baseUrl = (endpoint || 'http://localhost:11434').replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'llama3',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            stream: false,
            options: { temperature: 0.3 },
        }),
    });
    if (!response.ok) {
        if (response.status === 0 || response.type === 'error') {
            throw new Error(`Cannot connect to Ollama at ${baseUrl}. Make sure Ollama is running.`);
        }
        throw new Error(`Ollama error: HTTP ${response.status}. Ensure Ollama is running at ${baseUrl}.`);
    }
    const data = await response.json();
    return data?.message?.content ?? 'No response received from Ollama.';
}
//# sourceMappingURL=ai.js.map