import * as path from 'path';
import * as fs from 'fs';
import { FileTraversal, FileInfo, readFileContent } from './traversal';
import { SecurityScanResult, scanForSensitiveFiles } from './security';
import { TreeGenerator, TreeNode, generateProjectTree } from './tree';

export interface BundlerOptions {
  includeExtensions?: string[];
  excludeExtensions?: string[];
  maxFileSize?: number;
  includeHidden?: boolean;
  skipSensitive?: boolean;
  skipLarge?: boolean;
  maxLargeSize?: number;
}

export interface BundledFile {
  relativePath: string;
  absolutePath: string;
  content: string;
  language: string;
  size: number;
  lineCount: number;
  isSensitive: boolean;
}

export interface BundlerResult {
  files: BundledFile[];
  tree: string;
  compactTree: string;
  treeStats: {
    fileCount: number;
    dirCount: number;
    totalSize: number;
  };
  securityScan: SecurityScanResult;
  summary: {
    totalFiles: number;
    totalDirs: number;
    totalLines: number;
    totalSize: number;
    sensitiveFiles: number;
  };
}

export class Bundler {
  private workspaceRoot: string;
  private traversal: FileTraversal;
  private options: BundlerOptions;

  constructor(workspaceRoot: string, options: BundlerOptions = {}) {
    this.workspaceRoot = workspaceRoot;
    this.traversal = new FileTraversal(workspaceRoot);
    this.options = {
      skipSensitive: true,
      skipLarge: false,
      maxLargeSize: 512 * 1024,
      maxFileSize: 1024 * 1024,
      ...options,
    };
  }

  public async bundle(onProgress?: (progress: number, message: string) => void): Promise<BundlerResult> {
    onProgress?.(0, 'Scanning workspace...');

    const files = await this.traversal.findFiles({
      maxFileSize: this.options.maxFileSize,
      includeExtensions: this.options.includeExtensions,
      excludeExtensions: this.options.excludeExtensions,
    });

    const filePaths = files.map(f => f.path);
    const securityScan = scanForSensitiveFiles(filePaths, this.workspaceRoot);
    const sensitivePaths = new Set(securityScan.sensitiveFiles.map(f => f.path));

    onProgress?.(10, `Found ${files.length} files...`);

    const treeGenerator = new TreeGenerator({ showCounts: true });
    const tree = treeGenerator.buildTree(
      files.map(f => ({
        path: f.path,
        relativePath: f.relativePath,
        isDirectory: f.isDirectory,
        size: f.size,
      }))
    );
    const treeStats = treeGenerator.getStats(tree);

    const compactTree = treeGenerator.generateCompact(
      files.map(f => ({
        relativePath: f.relativePath,
        isDirectory: f.isDirectory,
      }))
    );

    onProgress?.(20, 'Reading file contents...');

    const bundledFiles: BundledFile[] = [];
    let processedFiles = 0;
    const totalFiles = files.filter(f => !f.isDirectory).length;

    for (const file of files) {
      if (file.isDirectory) {
        continue;
      }

      processedFiles++;
      const progress = 20 + Math.floor((processedFiles / totalFiles) * 60);
      onProgress?.(progress, `Processing ${file.relativePath}...`);

      const isSensitive = sensitivePaths.has(file.path);

      if (isSensitive && this.options.skipSensitive) {
        continue;
      }

      const maxSize = this.options.maxLargeSize ?? 512 * 1024;
      const content = readFileContent(file.path, maxSize);

      bundledFiles.push({
        relativePath: file.relativePath,
        absolutePath: file.path,
        content,
        language: this.detectLanguage(file.relativePath),
        size: file.size,
        lineCount: content.split('\n').length,
        isSensitive,
      });
    }

    onProgress?.(90, 'Finalizing bundle...');

    const summary = {
      totalFiles: bundledFiles.length,
      totalDirs: treeStats.dirCount,
      totalLines: bundledFiles.reduce((sum, f) => sum + f.lineCount, 0),
      totalSize: bundledFiles.reduce((sum, f) => sum + f.size, 0),
      sensitiveFiles: securityScan.sensitiveFiles.length,
    };

    onProgress?.(100, 'Bundle complete!');

    return {
      files: bundledFiles,
      tree: this.generateTreeString(files),
      compactTree,
      treeStats: {
        fileCount: treeStats.fileCount,
        dirCount: treeStats.dirCount,
        totalSize: treeStats.totalSize,
      },
      securityScan,
      summary,
    };
  }

  private generateTreeString(files: FileInfo[]): string {
    const treeFiles = files.map(f => ({
      path: f.path,
      relativePath: f.relativePath,
      isDirectory: false,
      size: f.size,
    }));

    return generateProjectTree(treeFiles, { showSizes: true });
  }

  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const basename = path.basename(filePath).toLowerCase();

    const languageMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.json': 'json',
      '.md': 'markdown',
      '.html': 'html',
      '.htm': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.sass': 'sass',
      '.less': 'less',
      '.py': 'python',
      '.rb': 'ruby',
      '.go': 'go',
      '.rs': 'rust',
      '.java': 'java',
      '.kt': 'kotlin',
      '.swift': 'swift',
      '.c': 'c',
      '.cpp': 'cpp',
      '.h': 'c',
      '.hpp': 'cpp',
      '.cs': 'csharp',
      '.php': 'php',
      '.r': 'r',
      '.scala': 'scala',
      '.sh': 'bash',
      '.bash': 'bash',
      '.zsh': 'bash',
      '.fish': 'bash',
      '.sql': 'sql',
      '.graphql': 'graphql',
      '.gql': 'graphql',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.xml': 'xml',
      '.toml': 'toml',
      '.ini': 'ini',
      '.cfg': 'ini',
      '.env': 'bash',
      '.dockerfile': 'dockerfile',
      '.gitignore': 'gitignore',
      '.gitattributes': 'gitattributes',
      '.lua': 'lua',
      '.pl': 'perl',
      '.pm': 'perl',
      '.ex': 'elixir',
      '.exs': 'elixir',
      '.erl': 'erlang',
      '.clj': 'clojure',
      '.hs': 'haskell',
      '.elm': 'elm',
      '.vue': 'vue',
      '.svelte': 'svelte',
    };

    if (languageMap[ext]) {
      return languageMap[ext];
    }

    if (basename === 'dockerfile') {
      return 'dockerfile';
    }
    if (basename === 'makefile' || basename === 'gnumakefile') {
      return 'makefile';
    }
    if (basename === 'cmakelists.txt' || basename === 'cmake.txt') {
      return 'cmake';
    }
    if (basename.startsWith('.env')) {
      return 'bash';
    }

    return 'text';
  }

  public getSecurityScan(): SecurityScanResult {
    return {
      sensitiveFiles: [],
      isClean: true,
      warnings: [],
    };
  }

  public static estimateTokens(text: string): number {
    const words = text.split(/\s+/).length;
    return Math.ceil(words * 1.3);
  }

  public static shouldChunk(tokens: number, threshold: number = 100000): boolean {
    return tokens > threshold;
  }

  public static chunkContent(
    content: string,
    maxTokens: number = 50000
  ): string[] {
    const chunks: string[] = [];
    const lines = content.split('\n');
    let currentChunk = '';
    let currentTokens = 0;

    for (const line of lines) {
      const lineTokens = Math.ceil(line.split(/\s+/).length * 1.3);

      if (currentTokens + lineTokens > maxTokens && currentChunk) {
        chunks.push(currentChunk);
        currentChunk = '';
        currentTokens = 0;
      }

      currentChunk += line + '\n';
      currentTokens += lineTokens;
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }
}

export async function bundleWorkspace(
  workspaceRoot: string,
  options: BundlerOptions = {},
  onProgress?: (progress: number, message: string) => void
): Promise<BundlerResult> {
  const bundler = new Bundler(workspaceRoot, options);
  return bundler.bundle(onProgress);
}