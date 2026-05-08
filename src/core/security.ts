import * as path from 'path';
import * as fs from 'fs';

export interface SensitiveFile {
  path: string;
  relativePath: string;
  reason: string;
  severity: 'high' | 'medium' | 'low';
}

export interface SecurityScanResult {
  sensitiveFiles: SensitiveFile[];
  isClean: boolean;
  warnings: string[];
}

const SENSITIVE_FILE_PATTERNS: Array<{
  pattern: string | RegExp;
  reason: string;
  severity: 'high' | 'medium' | 'low';
}> = [
  {
    pattern: /^\.env$/,
    reason: 'Environment file with potential secrets',
    severity: 'high',
  },
  {
    pattern: /^\.env\.[a-zA-Z0-9_-]+$/,
    reason: 'Environment file with environment-specific secrets',
    severity: 'high',
  },
  {
    pattern: /\.pem$/,
    reason: 'Private key/certificate file',
    severity: 'high',
  },
  {
    pattern: /(^|\/|\\)id_rsa($|\/)/,
    reason: 'SSH private key',
    severity: 'high',
  },
  {
    pattern: /(^|\/|\\)id_ed25519($|\/)/,
    reason: 'Ed25519 SSH private key',
    severity: 'high',
  },
  {
    pattern: /credentials\.json$/,
    reason: 'Credentials file',
    severity: 'high',
  },
  {
    pattern: /secrets\.ya?ml$/,
    reason: 'Secrets configuration file',
    severity: 'high',
  },
  {
    pattern: /secrets\.json$/,
    reason: 'Secrets data file',
    severity: 'high',
  },
  {
    pattern: /key\.json$/,
    reason: 'API key file',
    severity: 'high',
  },
  {
    pattern: /service-account\.json$/,
    reason: 'Google Cloud service account file',
    severity: 'high',
  },
  {
    pattern: /\.p12$/,
    reason: 'PKCS#12 certificate bundle',
    severity: 'high',
  },
  {
    pattern: /\.pfx$/,
    reason: 'PKCS#12 certificate bundle',
    severity: 'high',
  },
  {
    pattern: /api-?key.*\.(json|yaml|yml|txt|env)$/i,
    reason: 'API key file',
    severity: 'high',
  },
  {
    pattern: /apikey.*\.(json|yaml|yml|txt|env)$/i,
    reason: 'API key file',
    severity: 'high',
  },
  {
    pattern: /\.htpasswd$/,
    reason: 'Apache password file',
    severity: 'medium',
  },
  {
    pattern: /\.(git|github)token$/i,
    reason: 'Git token file',
    severity: 'high',
  },
  {
    pattern: /aws_credentials$/,
    reason: 'AWS credentials file',
    severity: 'high',
  },
  {
    pattern: /\.npmrc$/,
    reason: 'NPM configuration possibly containing auth tokens',
    severity: 'medium',
  },
  {
    pattern: /\.pypirc$/,
    reason: 'PyPI configuration possibly containing auth tokens',
    severity: 'medium',
  },
];

export function scanForSensitiveFiles(
  files: string[],
  workspaceRoot: string
): SecurityScanResult {
  const sensitiveFiles: SensitiveFile[] = [];
  const warnings: string[] = [];

  for (const filePath of files) {
    const relativePath = path.relative(workspaceRoot, filePath);
    const basename = path.basename(filePath);

    for (const { pattern, reason, severity } of SENSITIVE_FILE_PATTERNS) {
      let isMatch = false;

      if (pattern instanceof RegExp) {
        isMatch = pattern.test(basename) || pattern.test(relativePath);
      } else if (typeof pattern === 'string') {
        isMatch =
          basename === pattern || relativePath.includes(pattern);
      }

      if (isMatch) {
        sensitiveFiles.push({
          path: filePath,
          relativePath,
          reason,
          severity,
        });

        if (severity === 'high') {
          warnings.push(
            `HIGH: Found sensitive file: ${relativePath} (${reason})`
          );
        }
        break;
      }
    }
  }

  const isClean = sensitiveFiles.length === 0;

  if (!isClean) {
    const highSeverity = sensitiveFiles.filter(
      f => f.severity === 'high'
    ).length;
    if (highSeverity > 0) {
      warnings.unshift(
        `Security Warning: Found ${highSeverity} high-severity sensitive file(s). These files should be excluded from the bundle.`
      );
    }
  }

  return {
    sensitiveFiles,
    isClean,
    warnings,
  };
}

export function isSensitivePath(filePath: string): boolean {
  const basename = path.basename(filePath);

  for (const { pattern } of SENSITIVE_FILE_PATTERNS) {
    if (pattern instanceof RegExp) {
      if (pattern.test(basename)) {
        return true;
      }
    } else if (typeof pattern === 'string') {
      if (basename === pattern) {
        return true;
      }
    }
  }

  return false;
}

export function getSensitiveFileDetails(
  filePath: string
): SensitiveFile | null {
  const basename = path.basename(filePath);

  for (const { pattern, reason, severity } of SENSITIVE_FILE_PATTERNS) {
    let isMatch = false;

    if (pattern instanceof RegExp) {
      isMatch = pattern.test(basename);
    } else if (typeof pattern === 'string') {
      isMatch = basename === pattern;
    }

    if (isMatch) {
      return {
        path: filePath,
        relativePath: filePath,
        reason,
        severity,
      };
    }
  }

  return null;
}