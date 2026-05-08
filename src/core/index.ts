export { FileTraversal, fileExists, readFileContent } from './traversal';
export type { FileInfo, TraversalOptions } from './traversal';

export {
  scanForSensitiveFiles,
  isSensitivePath,
  getSensitiveFileDetails,
} from './security';
export type { SensitiveFile, SecurityScanResult } from './security';

export { TreeGenerator, generateProjectTree, generateCompactTree } from './tree';
export type { TreeNode, TreeOptions } from './tree';

export { Bundler, bundleWorkspace } from './bundler';
export type { BundlerOptions, BundledFile, BundlerResult } from './bundler';

export {
  MarkdownGenerator,
  parseTechStack,
  generateMarkdown,
} from './markdown';
export type {
  MarkdownOptions,
  MarkdownDocument,
  TechStackInfo,
} from './markdown';