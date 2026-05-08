"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderRegistry = exports.PROVIDER_INFO = void 0;
exports.getProviderRegistry = getProviderRegistry;
exports.createProvider = createProvider;
const openai_1 = require("./openai");
const gemini_1 = require("./gemini");
const groq_1 = require("./groq");
const ollama_1 = require("./ollama");
exports.PROVIDER_INFO = {
    openai: {
        type: 'openai',
        name: 'OpenAI',
        description: 'GPT-4o powered summarization',
        requiresApiKey: true,
        isLocal: false,
        requiresRunningService: false,
    },
    gemini: {
        type: 'gemini',
        name: 'Google Gemini',
        description: 'Gemini 2.0 Flash - Fast and capable',
        requiresApiKey: true,
        isLocal: false,
        requiresRunningService: false,
    },
    groq: {
        type: 'groq',
        name: 'Groq',
        description: 'Ultra-fast AI inference with Mixtral',
        requiresApiKey: true,
        isLocal: false,
        requiresRunningService: false,
    },
    ollama: {
        type: 'ollama',
        name: 'Ollama',
        description: 'Local privacy-focused AI (requires Ollama app)',
        requiresApiKey: false,
        isLocal: true,
        requiresRunningService: true,
    },
};
class ProviderRegistry {
    providers;
    defaultProvider;
    constructor() {
        this.providers = new Map();
        this.defaultProvider = 'openai';
        this.registerProvider('openai', new openai_1.OpenAIProvider());
        this.registerProvider('gemini', new gemini_1.GeminiProvider());
        this.registerProvider('groq', new groq_1.GroqProvider());
        this.registerProvider('ollama', new ollama_1.OllamaProvider());
    }
    registerProvider(type, provider) {
        this.providers.set(type, provider);
    }
    getProvider(type) {
        return this.providers.get(type);
    }
    getDefaultProvider() {
        const provider = this.providers.get(this.defaultProvider);
        if (!provider) {
            throw new Error(`Default provider ${this.defaultProvider} not registered`);
        }
        return provider;
    }
    setDefaultProvider(type) {
        if (!this.providers.has(type)) {
            throw new Error(`Provider ${type} not registered`);
        }
        this.defaultProvider = type;
    }
    getAvailableProviders() {
        return Array.from(this.providers.keys());
    }
    getProviderInfo(type) {
        return exports.PROVIDER_INFO[type];
    }
    getAllProviderInfo() {
        return Object.values(exports.PROVIDER_INFO);
    }
    async generateSummary(type, request) {
        const provider = this.providers.get(type);
        if (!provider) {
            throw new Error(`Provider ${type} not found`);
        }
        return provider.generateSummary(request);
    }
    async testConnection(type) {
        const provider = this.providers.get(type);
        if (!provider) {
            return false;
        }
        if ('testConnection' in provider && typeof provider.testConnection === 'function') {
            return provider.testConnection();
        }
        if ('checkOllamaRunning' in provider && typeof provider.checkOllamaRunning === 'function') {
            return provider.checkOllamaRunning();
        }
        return provider.isConfigured();
    }
}
exports.ProviderRegistry = ProviderRegistry;
const globalRegistry = new ProviderRegistry();
function getProviderRegistry() {
    return globalRegistry;
}
function createProvider(type, config) {
    switch (type) {
        case 'openai':
            return new openai_1.OpenAIProvider(config);
        case 'gemini':
            return new gemini_1.GeminiProvider(config);
        case 'groq':
            return new groq_1.GroqProvider(config);
        case 'ollama':
            return new ollama_1.OllamaProvider(config);
        default:
            throw new Error(`Unknown provider type: ${type}`);
    }
}
//# sourceMappingURL=provider-registry.js.map