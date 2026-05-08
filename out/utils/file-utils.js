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
exports.CODE_EXTENSIONS = exports.DEFAULT_IGNORE_PATTERNS = void 0;
exports.findFiles = findFiles;
exports.readFile = readFile;
exports.readFileBuffer = readFileBuffer;
exports.writeFile = writeFile;
exports.copyFile = copyFile;
exports.deleteFile = deleteFile;
exports.ensureDirectory = ensureDirectory;
exports.isFile = isFile;
exports.isDirectory = isDirectory;
exports.getFileSize = getFileSize;
exports.getFileModifiedTime = getFileModifiedTime;
exports.getExtension = getExtension;
exports.getBasename = getBasename;
exports.getDirname = getDirname;
exports.resolvePath = resolvePath;
exports.joinPath = joinPath;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const fast_glob_1 = require("fast-glob");
async function findFiles(patterns, options = {}) {
    const globOptions = {
        cwd: options.cwd,
        absolute: options.absolute ?? true,
        onlyFiles: options.onlyFiles ?? true,
        onlyDirectories: options.onlyDirectories ?? false,
        ignore: options.ignore ?? [],
        deep: options.deep,
    };
    const files = await (0, fast_glob_1.glob)(patterns, globOptions);
    const entries = [];
    for (const filePath of files) {
        try {
            const stats = fs.statSync(filePath);
            entries.push({
                path: filePath,
                relativePath: options.cwd ? path.relative(options.cwd, filePath) : filePath,
                name: path.basename(filePath),
                extension: path.extname(filePath),
                isDirectory: stats.isDirectory(),
                size: stats.size,
            });
        }
        catch (error) {
            console.error(`Error stating file ${filePath}:`, error);
        }
    }
    return entries;
}
function readFile(filePath, encoding = 'utf-8') {
    return fs.readFileSync(filePath, encoding);
}
function readFileBuffer(filePath) {
    return fs.readFileSync(filePath);
}
function writeFile(filePath, content) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf-8');
}
function copyFile(source, destination) {
    fs.copyFileSync(source, destination);
}
function deleteFile(filePath) {
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}
function ensureDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}
function isFile(filePath) {
    try {
        return fs.statSync(filePath).isFile();
    }
    catch {
        return false;
    }
}
function isDirectory(dirPath) {
    try {
        return fs.statSync(dirPath).isDirectory();
    }
    catch {
        return false;
    }
}
function getFileSize(filePath) {
    try {
        return fs.statSync(filePath).size;
    }
    catch {
        return 0;
    }
}
function getFileModifiedTime(filePath) {
    try {
        return fs.statSync(filePath).mtime;
    }
    catch {
        return null;
    }
}
function getExtension(filePath) {
    return path.extname(filePath);
}
function getBasename(filePath) {
    return path.basename(filePath);
}
function getDirname(filePath) {
    return path.dirname(filePath);
}
function resolvePath(...paths) {
    return path.resolve(...paths);
}
function joinPath(...paths) {
    return path.join(...paths);
}
exports.DEFAULT_IGNORE_PATTERNS = [
    '**/node_modules/**',
    '**/.git/**',
    '**/dist/**',
    '**/build/**',
    '**/out/**',
    '**/.next/**',
    '**/.nuxt/**',
    '**/coverage/**',
    '**/.cache/**',
    '**/__pycache__/**',
    '**/*.pyc',
    '**/.DS_Store',
    '**/Thumbs.db',
    '**/*.log',
    '**/package-lock.json',
    '**/yarn.lock',
    '**/pnpm-lock.yaml',
    '**/.env*.local',
];
exports.CODE_EXTENSIONS = [
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.json',
    '.md',
    '.html',
    '.css',
    '.scss',
    '.py',
    '.go',
    '.rs',
    '.java',
    '.cpp',
    '.c',
    '.h',
    '.cs',
    '.php',
    '.rb',
    '.swift',
    '.kt',
    '.scala',
    '.sh',
    '.bash',
    '.zsh',
    '.sql',
    '.graphql',
    '.gql',
    '.yaml',
    '.yml',
    '.xml',
    '.toml',
    '.ini',
    '.env',
    '.lua',
];
//# sourceMappingURL=file-utils.js.map