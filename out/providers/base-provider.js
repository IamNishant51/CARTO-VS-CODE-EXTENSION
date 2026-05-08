"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseProvider = void 0;
class BaseProvider {
    config;
    name;
    constructor(name, config = {}) {
        this.name = name;
        this.config = {
            model: 'default',
            temperature: 0.7,
            maxTokens: 2000,
            ...config,
        };
    }
    getSystemPrompt() {
        return `You are an expert software architect AI. Your task is to analyze a codebase and provide a concise 3-paragraph executive summary that helps other AIs understand the project's purpose, architecture, and key components.

Your summary should cover:
1. **Project Purpose**: What does this project do? What problem does it solve?
2. **Architecture**: How is the project structured? What are the main components?
3. **Key Features**: What are the most important features, patterns, or technologies used?

Be concise but informative. Focus on high-level understanding.`;
    }
    getUserPrompt(request) {
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

${request.files.length > 50
            ? `_... and ${request.files.length - 50} more files_`
            : ''}

---

Please provide a 3-paragraph executive summary of this project.`;
    }
    getName() {
        return this.name;
    }
    getModel() {
        return this.config.model ?? 'default';
    }
    isConfigured() {
        return !!this.config.apiKey;
    }
}
exports.BaseProvider = BaseProvider;
//# sourceMappingURL=base-provider.js.map