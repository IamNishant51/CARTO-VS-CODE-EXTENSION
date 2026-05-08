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
exports.askAI = askAI;
const vscode = __importStar(require("vscode"));
const SYSTEM_PROMPT = `You are an elite principal software engineer and architecture expert. You are analyzing an entire project codebase.

Your instructions:
1. Provide exceptionally clear, concise, and expert-level answers.
2. Cite specific file paths and code snippets in your response when relevant.
3. Output your response entirely in valid Markdown format.
4. Use best practices, recognize patterns, and identify potential bugs or architectural flaws.
5. Be direct and avoid generic filler.`;
async function askAI(prompt, context, provider) {
    const config = vscode.workspace.getConfiguration('carto');
    try {
        let activeProvider = provider;
        // Auto-detect provider if the active one is missing a key but another is populated
        if (activeProvider === 'gemini' && !config.get('geminiApiKey')) {
            if (config.get('groqApiKey'))
                activeProvider = 'groq';
            else if (config.get('openaiApiKey'))
                activeProvider = 'openai';
        }
        else if (activeProvider === 'openai' && !config.get('openaiApiKey')) {
            if (config.get('groqApiKey'))
                activeProvider = 'groq';
            else if (config.get('geminiApiKey'))
                activeProvider = 'gemini';
        }
        else if (activeProvider === 'groq' && !config.get('groqApiKey')) {
            if (config.get('geminiApiKey'))
                activeProvider = 'gemini';
            else if (config.get('openaiApiKey'))
                activeProvider = 'openai';
        }
        let maxContextChars = 300000; // Default (Gemini)
        if (activeProvider === 'groq')
            maxContextChars = 35000; // Safe limit for Groq's 12k TPM
        else if (activeProvider === 'openai')
            maxContextChars = 100000; // Safe limit for standard GPT-4o usage
        else if (activeProvider === 'ollama')
            maxContextChars = 40000; // Safe limit for local models
        const truncatedContext = context.length > maxContextChars
            ? context.substring(0, maxContextChars) + '\n...[Context Truncated to fit model limits]'
            : context;
        const userPrompt = `--- CODEBASE CONTEXT ---\n${truncatedContext}\n\n--- USER QUESTION ---\n${prompt}`;
        switch (activeProvider) {
            case 'gemini':
                return await askGemini(SYSTEM_PROMPT + '\n\n' + userPrompt, config.get('geminiApiKey'));
            case 'openai':
                return await askOpenAI(SYSTEM_PROMPT, userPrompt, config.get('openaiApiKey'));
            case 'groq':
                return await askGroq(SYSTEM_PROMPT, userPrompt, config.get('groqApiKey'));
            case 'ollama':
                return await askOllama(SYSTEM_PROMPT, userPrompt, config.get('ollamaEndpoint'));
            default:
                throw new Error(`Unknown AI provider: ${activeProvider}`);
        }
    }
    catch (error) {
        console.error('AI Request failed:', error);
        throw new Error(error.message || 'Failed to get response from AI');
    }
}
async function askGemini(fullPrompt, apiKey) {
    if (!apiKey)
        throw new Error("Gemini API key is not configured. Please set it in Settings.");
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: fullPrompt }] }]
        })
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response received";
}
async function askOpenAI(systemPrompt, userPrompt, apiKey) {
    if (!apiKey)
        throw new Error("OpenAI API key is not configured. Please set it in Settings.");
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ]
        })
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content || "No response received";
}
async function askGroq(systemPrompt, userPrompt, apiKey) {
    if (!apiKey)
        throw new Error("Groq API key is not configured. Please set it in Settings.");
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ]
        })
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content || "No response received";
}
async function askOllama(systemPrompt, userPrompt, endpoint) {
    const url = endpoint || 'http://localhost:11434';
    const response = await fetch(`${url}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'llama3',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            stream: false
        })
    });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}. Make sure Ollama is running and accessible.`);
    }
    const data = await response.json();
    return data.message?.content || "No response received";
}
//# sourceMappingURL=ai.js.map