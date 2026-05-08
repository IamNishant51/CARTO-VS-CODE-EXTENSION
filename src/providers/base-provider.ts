export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface SummaryRequest {
  projectName: string;
  techStack?: string;
  files: Array<{
    relativePath: string;
    content: string;
    language: string;
  }>;
  summaryStats: {
    totalFiles: number;
    totalLines: number;
    totalSize: number;
  };
}

export interface SummaryResponse {
  summary: string;
  metadata: {
    model: string;
    tokensUsed?: number;
    duration?: number;
  };
}

export abstract class BaseProvider {
  protected config: ProviderConfig;
  protected name: string;

  constructor(name: string, config: ProviderConfig = {}) {
    this.name = name;
    this.config = {
      model: 'default',
      temperature: 0.7,
      maxTokens: 2000,
      ...config,
    };
  }

  abstract generateSummary(request: SummaryRequest): Promise<SummaryResponse>;

  protected getSystemPrompt(): string {
    return `You are an expert software architect AI. Your task is to analyze a codebase and provide a concise 3-paragraph executive summary that helps other AIs understand the project's purpose, architecture, and key components.

Your summary should cover:
1. **Project Purpose**: What does this project do? What problem does it solve?
2. **Architecture**: How is the project structured? What are the main components?
3. **Key Features**: What are the most important features, patterns, or technologies used?

Be concise but informative. Focus on high-level understanding.`;
  }

  protected getUserPrompt(request: SummaryRequest): string {
    const fileList = request.files
      .slice(0, 50)
      .map(f => `## ${f.relativePath}\n\`\`\`${f.language}\n${f.content.slice(0, 2000)}\n\`\`\``)
      .join('\n\n');

    return `# Codebase Analysis Request

## Project: ${request.projectName}

**Stats**: ${request.summaryStats.totalFiles} files, ${request.summaryStats.totalLines.toLocaleString()} lines, ${(request.summaryStats.totalSize / 1024 / 1024).toFixed(2)} MB

${request.techStack ? `**Tech Stack**: ${request.techStack}\n` : ''}

## Key Files

${fileList}

${
  request.files.length > 50
    ? `_... and ${request.files.length - 50} more files_`
    : ''
}

---

Please provide a 3-paragraph executive summary of this project.`;
  }

  public getName(): string {
    return this.name;
  }

  public getModel(): string {
    return this.config.model ?? 'default';
  }

  public isConfigured(): boolean {
    return !!this.config.apiKey;
  }
}

export interface AIProvider {
  generateSummary(request: SummaryRequest): Promise<SummaryResponse>;
  getName(): string;
  getModel(): string;
  isConfigured(): boolean;
}