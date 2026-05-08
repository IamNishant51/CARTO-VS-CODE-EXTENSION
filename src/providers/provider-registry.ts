import { BaseProvider, ProviderConfig, SummaryRequest, SummaryResponse, AIProvider } from './base-provider';
import { OpenAIProvider } from './openai';
import { GeminiProvider } from './gemini';
import { GroqProvider } from './groq';
import { OllamaProvider } from './ollama';

export type ProviderType = 'openai' | 'gemini' | 'groq' | 'ollama';

export interface ProviderInfo {
  type: ProviderType;
  name: string;
  description: string;
  requiresApiKey: boolean;
  isLocal: boolean;
  requiresRunningService: boolean;
}

export const PROVIDER_INFO: Record<ProviderType, ProviderInfo> = {
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

export class ProviderRegistry {
  private providers: Map<ProviderType, AIProvider>;
  private defaultProvider: ProviderType;

  constructor() {
    this.providers = new Map();
    this.defaultProvider = 'openai';

    this.registerProvider('openai', new OpenAIProvider());
    this.registerProvider('gemini', new GeminiProvider());
    this.registerProvider('groq', new GroqProvider());
    this.registerProvider('ollama', new OllamaProvider());
  }

  public registerProvider(type: ProviderType, provider: AIProvider): void {
    this.providers.set(type, provider);
  }

  public getProvider(type: ProviderType): AIProvider | undefined {
    return this.providers.get(type);
  }

  public getDefaultProvider(): AIProvider {
    const provider = this.providers.get(this.defaultProvider);
    if (!provider) {
      throw new Error(`Default provider ${this.defaultProvider} not registered`);
    }
    return provider;
  }

  public setDefaultProvider(type: ProviderType): void {
    if (!this.providers.has(type)) {
      throw new Error(`Provider ${type} not registered`);
    }
    this.defaultProvider = type;
  }

  public getAvailableProviders(): ProviderType[] {
    return Array.from(this.providers.keys());
  }

  public getProviderInfo(type: ProviderType): ProviderInfo | undefined {
    return PROVIDER_INFO[type];
  }

  public getAllProviderInfo(): ProviderInfo[] {
    return Object.values(PROVIDER_INFO);
  }

  public async generateSummary(
    type: ProviderType,
    request: SummaryRequest
  ): Promise<SummaryResponse> {
    const provider = this.providers.get(type);
    if (!provider) {
      throw new Error(`Provider ${type} not found`);
    }

    return provider.generateSummary(request);
  }

  public async testConnection(type: ProviderType): Promise<boolean> {
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

const globalRegistry = new ProviderRegistry();

export function getProviderRegistry(): ProviderRegistry {
  return globalRegistry;
}

export function createProvider(type: ProviderType, config?: ProviderConfig): AIProvider {
  switch (type) {
    case 'openai':
      return new OpenAIProvider(config);
    case 'gemini':
      return new GeminiProvider(config);
    case 'groq':
      return new GroqProvider(config);
    case 'ollama':
      return new OllamaProvider(config as any);
    default:
      throw new Error(`Unknown provider type: ${type}`);
  }
}