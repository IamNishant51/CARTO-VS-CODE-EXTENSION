import * as path from 'path';
import * as fs from 'fs';
import { glob } from 'fast-glob';

export interface FileEntry {
  path: string;
  relativePath: string;
  name: string;
  extension: string;
  isDirectory: boolean;
  size: number;
}

export interface GlobOptions {
  cwd?: string;
  absolute?: boolean;
  onlyFiles?: boolean;
  onlyDirectories?: boolean;
  ignore?: string[];
  followSymlinks?: boolean;
  deep?: number;
  absoluteBase?: string;
}

export async function findFiles(
  patterns: string | string[],
  options: GlobOptions = {}
): Promise<FileEntry[]> {
  const globOptions = {
    cwd: options.cwd,
    absolute: options.absolute ?? true,
    onlyFiles: options.onlyFiles ?? true,
    onlyDirectories: options.onlyDirectories ?? false,
    ignore: options.ignore ?? [],
    deep: options.deep,
  };

  const files = await glob(patterns, globOptions);

  const entries: FileEntry[] = [];

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
    } catch (error) {
      console.error(`Error stating file ${filePath}:`, error);
    }
  }

  return entries;
}

export function readFile(
  filePath: string,
  encoding: BufferEncoding = 'utf-8'
): string {
  return fs.readFileSync(filePath, encoding);
}

export function readFileBuffer(filePath: string): Buffer {
  return fs.readFileSync(filePath);
}

export function writeFile(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content, 'utf-8');
}

export function copyFile(source: string, destination: string): void {
  fs.copyFileSync(source, destination);
}

export function deleteFile(filePath: string): void {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

export function ensureDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function isFile(filePath: string): boolean {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

export function isDirectory(dirPath: string): boolean {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

export function getFileSize(filePath: string): number {
  try {
    return fs.statSync(filePath).size;
  } catch {
    return 0;
  }
}

export function getFileModifiedTime(filePath: string): Date | null {
  try {
    return fs.statSync(filePath).mtime;
  } catch {
    return null;
  }
}

export function getExtension(filePath: string): string {
  return path.extname(filePath);
}

export function getBasename(filePath: string): string {
  return path.basename(filePath);
}

export function getDirname(filePath: string): string {
  return path.dirname(filePath);
}

export function resolvePath(...paths: string[]): string {
  return path.resolve(...paths);
}

export function joinPath(...paths: string[]): string {
  return path.join(...paths);
}

export const DEFAULT_IGNORE_PATTERNS = [
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

export const CODE_EXTENSIONS = [
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