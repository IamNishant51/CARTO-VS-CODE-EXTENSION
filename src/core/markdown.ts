import * as path from 'path';
import * as fs from 'fs';
import { BundledFile, BundlerResult, BundlerOptions } from './bundler';
import { SecurityScanResult } from './security';

export interface MarkdownOptions {
  includeExecutiveSummary?: boolean;
  includeTechStack?: boolean;
  includeTree?: boolean;
  includeFileContents?: boolean;
  includeSecurityWarnings?: boolean;
  codeFenceStyle?: 'backtick' | 'tilde';
  maxFiles?: number;
  chunkThreshold?: number;
}

export interface MarkdownDocument {
  content: string;
  sections: string[];
  stats: {
    totalFiles: number;
    totalLines: number;
    totalSize: number;
    tokenEstimate: number;
  };
  chunks?: string[];
}

const DEFAULT_MARKDOWN_OPTIONS: MarkdownOptions = {
  includeExecutiveSummary: true,
  includeTechStack: true,
  includeTree: true,
  includeFileContents: true,
  includeSecurityWarnings: true,
  codeFenceStyle: 'backtick',
  maxFiles: 1000,
  chunkThreshold: 100000,
};

export class MarkdownGenerator {
  private options: MarkdownOptions;

  constructor(options: MarkdownOptions = {}) {
    this.options = { ...DEFAULT_MARKDOWN_OPTIONS, ...options };
  }

  public generate(bundlerResult: BundlerResult, techStack?: TechStackInfo): MarkdownDocument {
    const sections: string[] = [];
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

  private generateExecutiveSummary(bundlerResult: BundlerResult): string {
    const summary = bundlerResult.summary;
    
    return `\`\`\`executive-summary
## Project Summary

This project contains **${summary.totalFiles}** source files across **${summary.totalDirs}** directories, 
totaling approximately **${this.formatSize(summary.totalSize)}** and **${summary.totalLines.toLocaleString()}** lines of code.

${
  summary.sensitiveFiles > 0
    ? `⚠️ **Security Notice**: ${summary.sensitiveFiles} sensitive file(s) detected. Review the Security Warnings section below.`
    : '✅ No sensitive files detected in this project.'
}

This document provides a complete overview of the codebase for AI-assisted analysis.
\`\`\``;
  }

  private generateSecurityWarnings(scan: SecurityScanResult): string {
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

  private generateTechStack(techStack?: TechStackInfo): string {
    if (!techStack || (!techStack.ecosystem && !techStack.name)) {
      return '## Tech Stack\n\n_(Tech stack information not available for this project type)_\n';
    }

    let content = '## Tech Stack\n\n';

    if (techStack.ecosystem) {
      content += `- **Ecosystem**: ${techStack.ecosystem}\n`;
    }
    if (techStack.name) {
      content += `- **Project**: ${techStack.name}\n`;
    }
    if (techStack.version) {
      content += `- **Version**: ${techStack.version}\n`;
    }
    if (techStack.description) {
      content += `- **Description**: ${techStack.description}\n`;
    }
    if (techStack.language) {
      content += `- **Primary Language**: ${techStack.language}\n`;
    }
    if (techStack.runtimeVersion) {
      content += `- **Runtime**: ${techStack.runtimeVersion}\n`;
    }

    content += '\n### Dependencies\n\n';

    if (techStack.dependencies && techStack.dependencies.length > 0) {
      for (const dep of techStack.dependencies.slice(0, 30)) {
        content += `- \`${dep.name}\`${dep.version ? `@${dep.version}` : ''}\n`;
      }
      if (techStack.dependencies.length > 30) {
        content += `- ... and ${techStack.dependencies.length - 30} more\n`;
      }
    } else {
      content += '_No dependencies found_\n';
    }

    if (techStack.devDependencies && techStack.devDependencies.length > 0) {
      content += '\n### Dev Dependencies\n\n';
      for (const dep of techStack.devDependencies.slice(0, 15)) {
        content += `- \`${dep.name}\`${dep.version ? `@${dep.version}` : ''}\n`;
      }
      if (techStack.devDependencies.length > 15) {
        content += `- ... and ${techStack.devDependencies.length - 15} more\n`;
      }
    }

    if (techStack.scripts && Object.keys(techStack.scripts).length > 0) {
      content += '\n### Scripts\n\n';
      for (const [name, cmd] of Object.entries(techStack.scripts).slice(0, 10)) {
        content += `- \`${name}\`: \`${cmd}\`\n`;
      }
    }

    return content;
  }

  private generateProjectInfo(summary: BundlerResult['summary']): string {
    return `## Project Overview

| Metric | Value |
|-------|-------|
| Total Files | ${summary.totalFiles.toLocaleString()} |
| Directories | ${summary.totalDirs.toLocaleString()} |
| Total Lines | ${summary.totalLines.toLocaleString()} |
| Total Size | ${this.formatSize(summary.totalSize)} |
| Sensitive Files | ${summary.sensitiveFiles} |`;
  }

  private generateTree(tree: string): string {
    return `## Directory Tree

\`\`\`
${tree.trim()}
\`\`\``;
  }

  private generateFileContents(files: BundledFile[]): string {
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
      } else {
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
      } else {
        content += displayLines.join('\n') + '\n```\n\n';
      }
    }

    return content;
  }

  private estimateTokens(text: string): number {
    const words = text.split(/\s+/).length;
    return Math.ceil(words * 1.3);
  }

  private formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  public generatePlainTextFile(relativePath: string, content: string, language: string): string {
    const fenceChar = this.options.codeFenceStyle === 'backtick' ? '`' : '~';
    return `### ${relativePath}\n\n> ${language}\n\n${fenceChar}${language}\n${content}\n${fenceChar}\n`;
  }
}

export interface TechStackInfo {
  ecosystem?: string;
  language?: string;
  runtimeVersion?: string;
  name?: string;
  version?: string;
  description?: string;
  dependencies?: Array<{ name: string; version: string }>;
  devDependencies?: Array<{ name: string; version: string }>;
  scripts?: Record<string, string>;
}

export async function parseTechStack(workspaceRoot: string): Promise<TechStackInfo | undefined> {
  // --- Node.js / JavaScript / TypeScript ---
  const packageJsonPath = path.join(workspaceRoot, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const content = fs.readFileSync(packageJsonPath, 'utf-8');
      const pkg = JSON.parse(content);
      const hasTsConfig = fs.existsSync(path.join(workspaceRoot, 'tsconfig.json'));
      return {
        ecosystem: 'Node.js',
        language: hasTsConfig ? 'TypeScript' : 'JavaScript',
        name: pkg.name,
        version: pkg.version,
        description: pkg.description,
        scripts: pkg.scripts ?? {},
        dependencies: Object.entries(pkg.dependencies ?? {}).map(([name, version]) => ({ name, version: version as string })),
        devDependencies: Object.entries(pkg.devDependencies ?? {}).map(([name, version]) => ({ name, version: version as string })),
      };
    } catch {
      // fall through to other detectors
    }
  }

  // --- Python ---
  const requirementsTxtPath = path.join(workspaceRoot, 'requirements.txt');
  const pyprojectPath = path.join(workspaceRoot, 'pyproject.toml');
  const setupPyPath = path.join(workspaceRoot, 'setup.py');
  if (fs.existsSync(requirementsTxtPath) || fs.existsSync(pyprojectPath) || fs.existsSync(setupPyPath)) {
    const deps: Array<{ name: string; version: string }> = [];
    if (fs.existsSync(requirementsTxtPath)) {
      const lines = fs.readFileSync(requirementsTxtPath, 'utf-8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const match = trimmed.match(/^([a-zA-Z0-9_\-\.]+)([>=<!~^]+.+)?$/);
        if (match) deps.push({ name: match[1], version: match[2]?.trim() ?? '' });
      }
    }
    let name: string | undefined;
    let version: string | undefined;
    let description: string | undefined;
    if (fs.existsSync(pyprojectPath)) {
      const toml = fs.readFileSync(pyprojectPath, 'utf-8');
      const nameMatch = toml.match(/name\s*=\s*"([^"]+)"/);
      const versionMatch = toml.match(/version\s*=\s*"([^"]+)"/);
      const descMatch = toml.match(/description\s*=\s*"([^"]+)"/);
      name = nameMatch?.[1];
      version = versionMatch?.[1];
      description = descMatch?.[1];
    }
    return { ecosystem: 'Python', language: 'Python', name, version, description, dependencies: deps, devDependencies: [] };
  }

  // --- Go ---
  const goModPath = path.join(workspaceRoot, 'go.mod');
  if (fs.existsSync(goModPath)) {
    const content = fs.readFileSync(goModPath, 'utf-8');
    const moduleMatch = content.match(/^module\s+(\S+)/m);
    const goVersionMatch = content.match(/^go\s+([\d.]+)/m);
    const deps: Array<{ name: string; version: string }> = [];
    const requireBlock = content.match(/require\s*\(([^)]+)\)/s);
    if (requireBlock) {
      const lines = requireBlock[1].split('\n');
      for (const line of lines) {
        const m = line.trim().match(/^(\S+)\s+(\S+)/);
        if (m) deps.push({ name: m[1], version: m[2] });
      }
    }
    return {
      ecosystem: 'Go',
      language: 'Go',
      runtimeVersion: goVersionMatch?.[1] ? `Go ${goVersionMatch[1]}` : undefined,
      name: moduleMatch?.[1],
      dependencies: deps,
      devDependencies: [],
    };
  }

  // --- Rust ---
  const cargoTomlPath = path.join(workspaceRoot, 'Cargo.toml');
  if (fs.existsSync(cargoTomlPath)) {
    const content = fs.readFileSync(cargoTomlPath, 'utf-8');
    const nameMatch = content.match(/^\s*name\s*=\s*"([^"]+)"/m);
    const versionMatch = content.match(/^\s*version\s*=\s*"([^"]+)"/m);
    const descMatch = content.match(/^\s*description\s*=\s*"([^"]+)"/m);
    const deps: Array<{ name: string; version: string }> = [];
    const depSection = content.match(/\[dependencies\]([\s\S]*?)(\[|$)/);
    if (depSection) {
      for (const line of depSection[1].split('\n')) {
        const m = line.trim().match(/^(\S+)\s*=\s*"([^"]+)"/);
        if (m) deps.push({ name: m[1], version: m[2] });
      }
    }
    return {
      ecosystem: 'Rust',
      language: 'Rust',
      name: nameMatch?.[1],
      version: versionMatch?.[1],
      description: descMatch?.[1],
      dependencies: deps,
      devDependencies: [],
    };
  }

  // --- Java / Maven ---
  const pomXmlPath = path.join(workspaceRoot, 'pom.xml');
  if (fs.existsSync(pomXmlPath)) {
    const content = fs.readFileSync(pomXmlPath, 'utf-8');
    const artifactMatch = content.match(/<artifactId>([^<]+)<\/artifactId>/);
    const versionMatch = content.match(/<version>([^<]+)<\/version>/);
    return {
      ecosystem: 'Java / Maven',
      language: 'Java',
      name: artifactMatch?.[1],
      version: versionMatch?.[1],
      dependencies: [],
      devDependencies: [],
    };
  }

  // --- Java / Gradle ---
  const buildGradlePath = path.join(workspaceRoot, 'build.gradle');
  const buildGradleKtsPath = path.join(workspaceRoot, 'build.gradle.kts');
  if (fs.existsSync(buildGradlePath) || fs.existsSync(buildGradleKtsPath)) {
    return { ecosystem: 'Java / Gradle', language: 'Java/Kotlin', dependencies: [], devDependencies: [] };
  }

  // --- Ruby / Bundler ---
  const gemfilePath = path.join(workspaceRoot, 'Gemfile');
  if (fs.existsSync(gemfilePath)) {
    const content = fs.readFileSync(gemfilePath, 'utf-8');
    const deps: Array<{ name: string; version: string }> = [];
    for (const line of content.split('\n')) {
      const m = line.trim().match(/^gem\s+['"]([^'"]+)['"]/);
      if (m) deps.push({ name: m[1], version: '' });
    }
    return { ecosystem: 'Ruby', language: 'Ruby', dependencies: deps, devDependencies: [] };
  }

  // --- PHP / Composer ---
  const composerJsonPath = path.join(workspaceRoot, 'composer.json');
  if (fs.existsSync(composerJsonPath)) {
    try {
      const content = fs.readFileSync(composerJsonPath, 'utf-8');
      const pkg = JSON.parse(content);
      return {
        ecosystem: 'PHP / Composer',
        language: 'PHP',
        name: pkg.name,
        description: pkg.description,
        dependencies: Object.entries(pkg.require ?? {}).map(([n, v]) => ({ name: n, version: v as string })),
        devDependencies: Object.entries(pkg['require-dev'] ?? {}).map(([n, v]) => ({ name: n, version: v as string })),
      };
    } catch { /* fall through */ }
  }

  // --- .NET ---
  try {
    const csprojFiles = fs.readdirSync(workspaceRoot).filter(f => f.endsWith('.csproj'));
    if (csprojFiles.length > 0) {
      const content = fs.readFileSync(path.join(workspaceRoot, csprojFiles[0]), 'utf-8');
      const tfmMatch = content.match(/<TargetFramework>([^<]+)<\/TargetFramework>/);
      return {
        ecosystem: '.NET',
        language: 'C#',
        name: csprojFiles[0].replace('.csproj', ''),
        runtimeVersion: tfmMatch?.[1],
        dependencies: [],
        devDependencies: [],
      };
    }
  } catch { /* fall through */ }

  // Nothing detected
  return undefined;
}

export function generateMarkdown(
  bundlerResult: BundlerResult,
  options?: MarkdownOptions,
  techStack?: TechStackInfo
): MarkdownDocument {
  const generator = new MarkdownGenerator(options);
  return generator.generate(bundlerResult, techStack);
}

/**
 * Builds a compact "smart context" for AI analysis.
 * Sends only: tech stack, tree, stats, and up to 80 lines of each key file.
 * This reduces token usage by ~90% compared to sending the full bundle.
 */
export function buildSmartAIContext(
  bundlerResult: BundlerResult,
  techStack: TechStackInfo | undefined,
  maxTotalChars: number = 28000
): string {
  let ctx = '# Codebase Context for AI Analysis\n\n';

  // 1. Tech stack
  if (techStack) {
    ctx += `## Tech Stack\n- Ecosystem: ${techStack.ecosystem ?? 'Unknown'}\n- Language: ${techStack.language ?? 'Unknown'}\n`;
    if (techStack.name) ctx += `- Project: ${techStack.name}\n`;
    if (techStack.version) ctx += `- Version: ${techStack.version}\n`;
    if (techStack.description) ctx += `- Description: ${techStack.description}\n`;
    if (techStack.dependencies && techStack.dependencies.length > 0) {
      ctx += `- Key Dependencies: ${techStack.dependencies.slice(0, 15).map(d => d.name).join(', ')}\n`;
    }
    ctx += '\n';
  }

  // 2. Stats
  const s = bundlerResult.summary;
  ctx += `## Project Stats\n- Files: ${s.totalFiles} | Dirs: ${s.totalDirs} | Lines: ${s.totalLines.toLocaleString()} | Size: ${(s.totalSize / 1024).toFixed(0)} KB\n\n`;

  // 3. Directory tree (cap at 100 lines)
  const treeLines = bundlerResult.tree.split('\n').slice(0, 100);
  ctx += `## Directory Structure\n\`\`\`\n${treeLines.join('\n')}\n\`\`\`\n\n`;

  // 4. Key file contents — prioritize important files, cap each file at 80 lines
  const PRIORITY_PATTERNS = [
    /^(src|lib|app|core)\//i,
    /\.(ts|tsx|js|jsx|py|go|rs|java|cs|rb|php)$/i,
    /^(main|index|app|server|extension)\./i,
    /^(package|go|cargo|setup|pyproject|composer)\.(json|toml|mod|py)$/i,
  ];

  const scored = bundlerResult.files
    .filter(f => !f.isSensitive)
    .map(f => {
      let score = 0;
      if (/^(src|lib|app|core)\//i.test(f.relativePath)) score += 3;
      if (/\.(ts|tsx|js|jsx|py|go|rs|java|cs|rb|php)$/i.test(f.relativePath)) score += 2;
      if (/^(main|index|app|server|extension)\./i.test(path.basename(f.relativePath))) score += 2;
      if (/^(package|go|cargo|setup|pyproject|composer)\.(json|toml|mod|py)$/i.test(path.basename(f.relativePath))) score += 1;
      return { file: f, score };
    })
    .sort((a, b) => b.score - a.score);

  ctx += `## Key File Contents\n\n`;
  let usedChars = ctx.length;

  for (const { file } of scored) {
    if (usedChars >= maxTotalChars) break;
    const lines = file.content.split('\n').slice(0, 80);
    const snippet = lines.join('\n');
    const block = `### ${file.relativePath}\n\`\`\`${file.language}\n${snippet}\n\`\`\`\n\n`;
    if (usedChars + block.length > maxTotalChars) break;
    ctx += block;
    usedChars += block.length;
  }

  return ctx;
}