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
exports.FileTraversal = void 0;
exports.fileExists = fileExists;
exports.readFileContent = readFileContent;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const DEFAULT_IGNORE_PATTERNS = [
    'node_modules',
    '.git',
    '.svn',
    '.hg',
    'dist',
    'build',
    '.next',
    '.nuxt',
    'out',
    'coverage',
    '.nyc_output',
    '.cache',
    '__pycache__',
    '*.pyc',
    '*.pyo',
    '*.tsbuildinfo',
    '.DS_Store',
    'Thumbs.db',
    '*.log',
    'npm-debug.log*',
    'yarn-debug.log*',
    'yarn-error.log*',
    'pnpm-debug.log*',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'bun.lockb',
    '*.snap',
    '.env.local',
    '.env.*.local',
];
const SENSITIVE_PATTERNS = [
    '.env',
    '.env.*',
    '*.pem',
    '*.key',
    'id_rsa',
    'id_ed25519',
    'credentials.json',
    'secrets.yaml',
    'secrets.yml',
    'secrets.json',
    'key.json',
    'service-account.json',
    '*.p12',
    '*.pfx',
    'api-key*',
    'apikey*',
];
class IgnorePattern {
    patterns = [];
    negatedPatterns = [];
    constructor() {
        this.patterns = [...DEFAULT_IGNORE_PATTERNS];
    }
    add(patterns) {
        const addList = Array.isArray(patterns) ? patterns : [patterns];
        for (const p of addList) {
            if (typeof p === 'string') {
                if (p.startsWith('!')) {
                    this.negatedPatterns.push(p.slice(1));
                }
                else {
                    this.patterns.push(p);
                }
            }
            else if (p instanceof IgnorePattern) {
                this.patterns.push(...p.patterns);
                this.negatedPatterns.push(...p.negatedPatterns);
            }
        }
    }
    ignores(relativePath) {
        const normalizedPath = relativePath.replace(/\\/g, '/');
        const basename = path.basename(normalizedPath);
        for (const pattern of this.negatedPatterns) {
            if (this.matchPattern(normalizedPath, basename, pattern)) {
                return false;
            }
        }
        for (const pattern of this.patterns) {
            if (this.matchPattern(normalizedPath, basename, pattern)) {
                return true;
            }
        }
        return false;
    }
    matchPattern(relativePath, basename, pattern) {
        if (pattern.startsWith('**/')) {
            const suffix = pattern.slice(3);
            return relativePath.endsWith(suffix) || basename.endsWith(suffix);
        }
        if (pattern.endsWith('/')) {
            const dir = pattern.slice(0, -1);
            return relativePath.startsWith(dir + '/') || relativePath.includes('/' + dir + '/');
        }
        if (pattern.includes('*')) {
            const regex = new RegExp('^' + pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*').replace(/\?/g, '.') + '$');
            return regex.test(basename) || regex.test(relativePath);
        }
        return basename === pattern || relativePath.includes(pattern);
    }
}
class FileTraversal {
    ig;
    workspaceRoot;
    constructor(workspaceRoot) {
        this.workspaceRoot = workspaceRoot;
        this.ig = new IgnorePattern();
        this.initIgnorePatterns();
    }
    initIgnorePatterns() {
        const gitignorePath = path.join(this.workspaceRoot, '.gitignore');
        if (fs.existsSync(gitignorePath)) {
            try {
                const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
                const patterns = gitignoreContent
                    .split('\n')
                    .map(line => line.trim())
                    .filter(line => line && !line.startsWith('#'));
                this.ig.add(patterns);
            }
            catch (error) {
                console.error('Error reading .gitignore:', error);
            }
        }
    }
    async findFiles(options = {}) {
        const allFiles = [];
        const workspaceUri = vscode.workspace.workspaceFolders?.[0]?.uri;
        if (!workspaceUri) {
            throw new Error('No workspace folder found');
        }
        const files = await vscode.workspace.findFiles(new vscode.RelativePattern(workspaceUri, '**/*'), undefined, 10000);
        const maxSize = options.maxFileSize ?? 1024 * 1024;
        for (const file of files) {
            if (file.scheme !== 'file')
                continue;
            const filePath = file.fsPath;
            const relativePath = path.relative(this.workspaceRoot, filePath);
            if (this.ig.ignores(relativePath)) {
                continue;
            }
            if (options.includeExtensions && options.includeExtensions.length > 0) {
                const ext = path.extname(filePath).toLowerCase();
                if (!options.includeExtensions.includes(ext)) {
                    continue;
                }
            }
            if (options.excludeExtensions && options.excludeExtensions.length > 0) {
                const ext = path.extname(filePath).toLowerCase();
                if (options.excludeExtensions.includes(ext)) {
                    continue;
                }
            }
            try {
                const stats = fs.statSync(filePath);
                if (stats.size > maxSize) {
                    continue;
                }
                allFiles.push({
                    path: filePath,
                    relativePath,
                    size: stats.size,
                    isDirectory: stats.isDirectory(),
                });
            }
            catch (error) {
                console.error(`Error stating file ${filePath}:`, error);
            }
        }
        return allFiles.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
    }
    getIgnorePatterns() {
        return this.ig['patterns'] ?? [];
    }
    checkSensitiveFile(filePath) {
        const relativePath = path.relative(this.workspaceRoot, filePath);
        const basename = path.basename(filePath);
        for (const pattern of SENSITIVE_PATTERNS) {
            const cleanPattern = pattern.replace(/\*/g, '');
            if (relativePath.includes(cleanPattern) ||
                basename.includes(cleanPattern.replace('.', ''))) {
                if (pattern.startsWith('*.')) {
                    const ext = pattern.slice(1);
                    if (relativePath.endsWith(ext)) {
                        return true;
                    }
                }
                else if (pattern.includes('*')) {
                    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
                    if (regex.test(basename)) {
                        return true;
                    }
                }
                else {
                    if (basename === pattern || relativePath.includes(pattern)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
}
exports.FileTraversal = FileTraversal;
function fileExists(filePath) {
    try {
        return fs.existsSync(filePath);
    }
    catch {
        return false;
    }
}
function readFileContent(filePath, maxSize = 1024 * 512) {
    try {
        const stats = fs.statSync(filePath);
        if (stats.size > maxSize) {
            const buffer = Buffer.alloc(maxSize);
            const fd = fs.openSync(filePath, 'r');
            fs.readSync(fd, buffer, 0, maxSize, 0);
            fs.closeSync(fd);
            return buffer.toString('utf-8') + `\n\n[Truncated file - original size: ${stats.size} bytes]`;
        }
        return fs.readFileSync(filePath, 'utf-8');
    }
    catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        return `[Error reading file: ${error}]`;
    }
}
//# sourceMappingURL=traversal.js.map