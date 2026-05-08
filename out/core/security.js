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
exports.scanForSensitiveFiles = scanForSensitiveFiles;
exports.isSensitivePath = isSensitivePath;
exports.getSensitiveFileDetails = getSensitiveFileDetails;
const path = __importStar(require("path"));
const SENSITIVE_FILE_PATTERNS = [
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
function scanForSensitiveFiles(files, workspaceRoot) {
    const sensitiveFiles = [];
    const warnings = [];
    for (const filePath of files) {
        const relativePath = path.relative(workspaceRoot, filePath);
        const basename = path.basename(filePath);
        for (const { pattern, reason, severity } of SENSITIVE_FILE_PATTERNS) {
            let isMatch = false;
            if (pattern instanceof RegExp) {
                isMatch = pattern.test(basename) || pattern.test(relativePath);
            }
            else if (typeof pattern === 'string') {
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
                    warnings.push(`HIGH: Found sensitive file: ${relativePath} (${reason})`);
                }
                break;
            }
        }
    }
    const isClean = sensitiveFiles.length === 0;
    if (!isClean) {
        const highSeverity = sensitiveFiles.filter(f => f.severity === 'high').length;
        if (highSeverity > 0) {
            warnings.unshift(`Security Warning: Found ${highSeverity} high-severity sensitive file(s). These files should be excluded from the bundle.`);
        }
    }
    return {
        sensitiveFiles,
        isClean,
        warnings,
    };
}
function isSensitivePath(filePath) {
    const basename = path.basename(filePath);
    for (const { pattern } of SENSITIVE_FILE_PATTERNS) {
        if (pattern instanceof RegExp) {
            if (pattern.test(basename)) {
                return true;
            }
        }
        else if (typeof pattern === 'string') {
            if (basename === pattern) {
                return true;
            }
        }
    }
    return false;
}
function getSensitiveFileDetails(filePath) {
    const basename = path.basename(filePath);
    for (const { pattern, reason, severity } of SENSITIVE_FILE_PATTERNS) {
        let isMatch = false;
        if (pattern instanceof RegExp) {
            isMatch = pattern.test(basename);
        }
        else if (typeof pattern === 'string') {
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
//# sourceMappingURL=security.js.map