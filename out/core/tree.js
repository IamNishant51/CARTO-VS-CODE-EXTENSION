"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreeGenerator = void 0;
exports.generateProjectTree = generateProjectTree;
exports.generateCompactTree = generateCompactTree;
const ASCII_CHARS = {
    branch: '|--',
    corner: '`--',
    vertical: '|  ',
    space: '   ',
};
const UNICODE_CHARS = {
    branch: '├──',
    corner: '└──',
    vertical: '│  ',
    space: '    ',
};
class TreeGenerator {
    chars;
    options;
    constructor(options = {}) {
        this.options = {
            useUnicode: true,
            maxDepth: 10,
            showSizes: false,
            showCounts: true,
            sorted: true,
            ...options,
        };
        this.chars = this.options.useUnicode ? UNICODE_CHARS : ASCII_CHARS;
    }
    buildTree(files) {
        const root = {
            name: 'root',
            path: '',
            relativePath: '',
            isDirectory: true,
            children: [],
        };
        const sortedFiles = this.options.sorted
            ? [...files].sort((a, b) => a.relativePath.localeCompare(b.relativePath))
            : files;
        let fileCount = 0;
        let dirCount = 0;
        for (const file of sortedFiles) {
            const parts = file.relativePath.split(/[/\\]/).filter(Boolean);
            let currentNode = root;
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                const isLast = i === parts.length - 1;
                const isDir = !file.relativePath.endsWith(part) || file.isDirectory;
                let child = currentNode.children?.find(c => c.name === part);
                if (!child) {
                    child = {
                        name: part,
                        path: file.path,
                        relativePath: parts.slice(0, i + 1).join('/'),
                        isDirectory: isDir,
                        children: isDir ? [] : undefined,
                        size: isDir ? undefined : file.size,
                    };
                    if (isDir) {
                        dirCount++;
                    }
                    else {
                        fileCount++;
                    }
                    if (!currentNode.children) {
                        currentNode.children = [];
                    }
                    currentNode.children.push(child);
                }
                if (child.isDirectory) {
                    currentNode = child;
                }
            }
        }
        root.fileCount = fileCount;
        root.dirCount = dirCount - 1;
        return root;
    }
    sortTree(node) {
        if (!node.children)
            return;
        node.children.sort((a, b) => {
            if (a.isDirectory !== b.isDirectory) {
                return a.isDirectory ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        });
        for (const child of node.children) {
            if (child.isDirectory) {
                this.sortTree(child);
            }
        }
    }
    generate(files, options) {
        const treeOptions = { ...this.options, ...options };
        const generator = new TreeGenerator(treeOptions);
        let tree = generator.buildTree(files);
        if (treeOptions.sorted !== false) {
            generator.sortTree(tree);
        }
        return this.renderTree(tree, treeOptions.maxDepth ?? 10);
    }
    renderTree(node, maxDepth, prefix = '', isLast = true, depth = 0) {
        let output = '';
        if (depth > 0) {
            const connector = isLast ? this.chars.corner : this.chars.branch;
            let line = `${prefix}${connector} ${node.name}`;
            if (node.isDirectory && this.options.showCounts) {
                if (node.fileCount !== undefined) {
                    line += ` (${node.fileCount} files, ${node.dirCount ?? 0} dirs)`;
                }
            }
            else if (!node.isDirectory && this.options.showSizes && node.size) {
                line += ` (${this.formatSize(node.size)})`;
            }
            output += line + '\n';
        }
        if (!node.children || depth >= maxDepth) {
            return output;
        }
        const children = [...node.children].sort((a, b) => {
            if (a.isDirectory !== b.isDirectory) {
                return a.isDirectory ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        });
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            const isLastChild = i === children.length - 1;
            const newPrefix = prefix + (isLast ? this.chars.space : this.chars.vertical);
            output += this.renderTree(child, maxDepth, newPrefix, isLastChild, depth + 1);
        }
        return output;
    }
    generatePlain(files) {
        const sortedFiles = [...files].sort((a, b) => a.relativePath.localeCompare(b.relativePath));
        let output = '';
        let lastDir = '';
        for (const file of sortedFiles) {
            if (file.isDirectory) {
                if (!lastDir.startsWith(file.relativePath)) {
                    output += `${file.relativePath}/\n`;
                    lastDir = file.relativePath;
                }
            }
            else {
                output += `${file.relativePath}\n`;
            }
        }
        return output;
    }
    generateCompact(files) {
        const dirs = new Set();
        const regFiles = [];
        for (const file of files) {
            if (file.isDirectory) {
                dirs.add(file.relativePath);
            }
            else {
                regFiles.push(file.relativePath);
            }
        }
        const sortedDirs = [...dirs].sort();
        const sortedFiles = regFiles.sort();
        let output = '';
        for (const dir of sortedDirs) {
            output += `${dir}/\n`;
        }
        for (const file of sortedFiles) {
            output += `${file}\n`;
        }
        return output;
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
    getStats(tree) {
        let fileCount = 0;
        let dirCount = 0;
        let totalSize = 0;
        const countNode = (node) => {
            if (node.isDirectory) {
                dirCount++;
                if (node.children) {
                    for (const child of node.children) {
                        countNode(child);
                    }
                }
            }
            else {
                fileCount++;
                totalSize += node.size || 0;
            }
        };
        countNode(tree);
        return { fileCount, dirCount, totalSize };
    }
}
exports.TreeGenerator = TreeGenerator;
function generateProjectTree(files, options) {
    const generator = new TreeGenerator(options);
    return generator.generate(files, options);
}
function generateCompactTree(files) {
    const generator = new TreeGenerator();
    return generator.generateCompact(files);
}
//# sourceMappingURL=tree.js.map