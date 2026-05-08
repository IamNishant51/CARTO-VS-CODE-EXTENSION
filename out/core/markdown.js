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
exports.MarkdownGenerator = void 0;
exports.parseTechStack = parseTechStack;
exports.generateMarkdown = generateMarkdown;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const DEFAULT_MARKDOWN_OPTIONS = {
    includeExecutiveSummary: true,
    includeTechStack: true,
    includeTree: true,
    includeFileContents: true,
    includeSecurityWarnings: true,
    codeFenceStyle: 'backtick',
    maxFiles: 1000,
    chunkThreshold: 100000,
};
class MarkdownGenerator {
    options;
    constructor(options = {}) {
        this.options = { ...DEFAULT_MARKDOWN_OPTIONS, ...options };
    }
    generate(bundlerResult, techStack) {
        const sections = [];
        let content = '';
        if (this.options.includeExecutiveSummary) {
            const summary = this.generateExecutiveSummary(bundlerResult);
            sections.push('Executive Summary');
            content += summary + '\n\n';
        }
        if (this.options.includeSecurityWarnings && !bundlerResult.securityScan.isClean) {
            const securitySection = this.generateSecurityWarnings(bundlerResult.securityScan);
            sections.push('Security Warnings');
            content += securitySection + '\n\n';
        }
        if (this.options.includeTechStack) {
            const techStackSection = this.generateTechStack(techStack);
            sections.push('Tech Stack');
            content += techStackSection + '\n\n';
        }
        const projectInfo = this.generateProjectInfo(bundlerResult.summary);
        sections.push('Project Overview');
        content += projectInfo + '\n\n';
        if (this.options.includeTree) {
            const treeSection = this.generateTree(bundlerResult.tree);
            sections.push('Directory Tree');
            content += treeSection + '\n\n';
        }
        if (this.options.includeFileContents) {
            const filesSection = this.generateFileContents(bundlerResult.files);
            sections.push('File Contents');
            content += filesSection;
        }
        const tokenEstimate = this.estimateTokens(content);
        return {
            content: content.trim(),
            sections,
            stats: {
                totalFiles: bundlerResult.summary.totalFiles,
                totalLines: bundlerResult.summary.totalLines,
                totalSize: bundlerResult.summary.totalSize,
                tokenEstimate,
            },
        };
    }
    generateExecutiveSummary(bundlerResult) {
        const summary = bundlerResult.summary;
        return `\`\`\`executive-summary
## Project Summary

This project contains **${summary.totalFiles}** source files across **${summary.totalDirs}** directories, 
totaling approximately **${this.formatSize(summary.totalSize)}** and **${summary.totalLines.toLocaleString()}** lines of code.

${summary.sensitiveFiles > 0
            ? `⚠️ **Security Notice**: ${summary.sensitiveFiles} sensitive file(s) detected. Review the Security Warnings section below.`
            : '✅ No sensitive files detected in this project.'}

This document provides a complete overview of the codebase for AI-assisted analysis.
\`\`\``;
    }
    generateSecurityWarnings(scan) {
        let content = '## Security Warnings\n\n';
        content += '⚠️ **Important**: The following sensitive files were detected:\n\n';
        const highSeverity = scan.sensitiveFiles.filter(f => f.severity === 'high');
        const mediumSeverity = scan.sensitiveFiles.filter(f => f.severity === 'medium');
        if (highSeverity.length > 0) {
            content += '### High Severity\n\n';
            for (const file of highSeverity) {
                content += `- \`${file.relativePath}\` - ${file.reason}\n`;
            }
            content += '\n';
        }
        if (mediumSeverity.length > 0) {
            content += '### Medium Severity\n\n';
            for (const file of mediumSeverity) {
                content += `- \`${file.relativePath}\` - ${file.reason}\n`;
            }
            content += '\n';
        }
        content +=
            '> **Note**: These files are included in the bundle. If you plan to share this document with external AI services, review and exclude sensitive files as needed.\n';
        return content;
    }
    generateTechStack(techStack) {
        if (!techStack) {
            return '## Tech Stack\n\n_(Tech stack information not available)_\n';
        }
        let content = '## Tech Stack\n\n';
        if (techStack.name) {
            content += `- **Project**: ${techStack.name}\n`;
        }
        if (techStack.version) {
            content += `- **Version**: ${techStack.version}\n`;
        }
        if (techStack.description) {
            content += `- **Description**: ${techStack.description}\n`;
        }
        content += '\n### Dependencies\n\n';
        if (techStack.dependencies && techStack.dependencies.length > 0) {
            for (const dep of techStack.dependencies.slice(0, 20)) {
                content += `- \`${dep.name}\`@${dep.version}\n`;
            }
            if (techStack.dependencies.length > 20) {
                content += `- ... and ${techStack.dependencies.length - 20} more\n`;
            }
        }
        else {
            content += '_No dependencies found_\n';
        }
        if (techStack.devDependencies && techStack.devDependencies.length > 0) {
            content += '\n### Dev Dependencies\n\n';
            for (const dep of techStack.devDependencies.slice(0, 10)) {
                content += `- \`${dep.name}\`@${dep.version}\n`;
            }
            if (techStack.devDependencies.length > 10) {
                content += `- ... and ${techStack.devDependencies.length - 10} more\n`;
            }
        }
        return content;
    }
    generateProjectInfo(summary) {
        return `## Project Overview

| Metric | Value |
|-------|-------|
| Total Files | ${summary.totalFiles.toLocaleString()} |
| Directories | ${summary.totalDirs.toLocaleString()} |
| Total Lines | ${summary.totalLines.toLocaleString()} |
| Total Size | ${this.formatSize(summary.totalSize)} |
| Sensitive Files | ${summary.sensitiveFiles} |`;
    }
    generateTree(tree) {
        return `## Directory Tree

\`\`\`
${tree.trim()}
\`\`\``;
    }
    generateFileContents(files) {
        let content = '## File Contents\n\n';
        content +=
            '> Note: This section contains the full source code of the project.\n\n';
        for (const file of files) {
            if (file.isSensitive) {
                continue;
            }
            content += `### ${file.relativePath}\n\n`;
            content +=
                `> ${file.language} | ${file.lineCount} lines | ${this.formatSize(file.size)}\n\n`;
            if (this.options.codeFenceStyle === 'backtick') {
                content += '```' + file.language + '\n';
            }
            else {
                content += '~~~' + file.language + '\n';
            }
            const lines = file.content.split('\n');
            const maxLines = 500;
            let displayLines = lines;
            if (lines.length > maxLines) {
                displayLines = lines.slice(0, maxLines);
                content +=
                    displayLines.join('\n') +
                        '\n```\n\n';
                content +=
                    `> [File truncated - showing first ${maxLines} of ${lines.length} lines]\n\n`;
            }
            else {
                content += displayLines.join('\n') + '\n```\n\n';
            }
        }
        return content;
    }
    estimateTokens(text) {
        const words = text.split(/\s+/).length;
        return Math.ceil(words * 1.3);
    }
    formatSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }
    generatePlainTextFile(relativePath, content, language) {
        const fenceChar = this.options.codeFenceStyle === 'backtick' ? '`' : '~';
        return `### ${relativePath}\n\n> ${language}\n\n${fenceChar}${language}\n${content}\n${fenceChar}\n`;
    }
}
exports.MarkdownGenerator = MarkdownGenerator;
async function parseTechStack(workspaceRoot) {
    const packageJsonPath = path.join(workspaceRoot, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
        return undefined;
    }
    try {
        const content = fs.readFileSync(packageJsonPath, 'utf-8');
        const packageJson = JSON.parse(content);
        return {
            name: packageJson.name,
            version: packageJson.version,
            description: packageJson.description,
            dependencies: Object.entries(packageJson.dependencies ?? {}).map(([name, version]) => ({
                name,
                version: version,
            })),
            devDependencies: Object.entries(packageJson.devDependencies ?? {}).map(([name, version]) => ({
                name,
                version: version,
            })),
        };
    }
    catch (error) {
        console.error('Error parsing package.json:', error);
        return undefined;
    }
}
function generateMarkdown(bundlerResult, options, techStack) {
    const generator = new MarkdownGenerator(options);
    return generator.generate(bundlerResult, techStack);
}
//# sourceMappingURL=markdown.js.map