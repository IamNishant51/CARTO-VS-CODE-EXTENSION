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
exports.Bundler = void 0;
exports.bundleWorkspace = bundleWorkspace;
const path = __importStar(require("path"));
const traversal_1 = require("./traversal");
const security_1 = require("./security");
const tree_1 = require("./tree");
class Bundler {
    workspaceRoot;
    traversal;
    options;
    constructor(workspaceRoot, options = {}) {
        this.workspaceRoot = workspaceRoot;
        this.traversal = new traversal_1.FileTraversal(workspaceRoot);
        this.options = {
            skipSensitive: true,
            skipLarge: false,
            maxLargeSize: 512 * 1024,
            maxFileSize: 1024 * 1024,
            ...options,
        };
    }
    async bundle(onProgress) {
        onProgress?.(0, 'Scanning workspace...');
        const files = await this.traversal.findFiles({
            maxFileSize: this.options.maxFileSize,
            includeExtensions: this.options.includeExtensions,
            excludeExtensions: this.options.excludeExtensions,
        });
        const filePaths = files.map(f => f.path);
        const securityScan = (0, security_1.scanForSensitiveFiles)(filePaths, this.workspaceRoot);
        const sensitivePaths = new Set(securityScan.sensitiveFiles.map(f => f.path));
        onProgress?.(10, `Found ${files.length} files...`);
        const treeGenerator = new tree_1.TreeGenerator({ showCounts: true });
        const tree = treeGenerator.buildTree(files.map(f => ({
            path: f.path,
            relativePath: f.relativePath,
            isDirectory: f.isDirectory,
            size: f.size,
        })));
        const treeStats = treeGenerator.getStats(tree);
        const compactTree = treeGenerator.generateCompact(files.map(f => ({
            relativePath: f.relativePath,
            isDirectory: f.isDirectory,
        })));
        onProgress?.(20, 'Reading file contents...');
        const bundledFiles = [];
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
            const content = (0, traversal_1.readFileContent)(file.path, maxSize);
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
    generateTreeString(files) {
        const treeFiles = files.map(f => ({
            path: f.path,
            relativePath: f.relativePath,
            isDirectory: false,
            size: f.size,
        }));
        return (0, tree_1.generateProjectTree)(treeFiles, { showSizes: true });
    }
    detectLanguage(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const basename = path.basename(filePath).toLowerCase();
        const languageMap = {
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
    getSecurityScan() {
        return {
            sensitiveFiles: [],
            isClean: true,
            warnings: [],
        };
    }
    static estimateTokens(text) {
        const words = text.split(/\s+/).length;
        return Math.ceil(words * 1.3);
    }
    static shouldChunk(tokens, threshold = 100000) {
        return tokens > threshold;
    }
    static chunkContent(content, maxTokens = 50000) {
        const chunks = [];
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
exports.Bundler = Bundler;
async function bundleWorkspace(workspaceRoot, options = {}, onProgress) {
    const bundler = new Bundler(workspaceRoot, options);
    return bundler.bundle(onProgress);
}
//# sourceMappingURL=bundler.js.map