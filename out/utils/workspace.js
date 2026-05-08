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
exports.getWorkspaceRoot = getWorkspaceRoot;
exports.getWorkspaceName = getWorkspaceName;
exports.showProgress = showProgress;
exports.showInformationMessage = showInformationMessage;
exports.showWarningMessage = showWarningMessage;
exports.showErrorMessage = showErrorMessage;
exports.createStatusBarItem = createStatusBarItem;
exports.openDocument = openDocument;
exports.showDocument = showDocument;
exports.saveToFile = saveToFile;
exports.copyToClipboard = copyToClipboard;
exports.getConfiguration = getConfiguration;
exports.setConfiguration = setConfiguration;
exports.getVscodeThemeKind = getVscodeThemeKind;
exports.getGlobalState = getGlobalState;
exports.setGlobalState = setGlobalState;
const vscode = __importStar(require("vscode"));
function getWorkspaceRoot() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        return undefined;
    }
    return workspaceFolders[0].uri.fsPath;
}
function getWorkspaceName() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        return undefined;
    }
    return workspaceFolders[0].name;
}
async function showProgress(title, task) {
    return vscode.window.withProgress({
        location: vscode.ProgressLocation.Window,
        title,
        cancellable: false,
    }, (progress) => task(progress));
}
async function showInformationMessage(message, ...items) {
    return vscode.window.showInformationMessage(message, ...items);
}
async function showWarningMessage(message, ...items) {
    return vscode.window.showWarningMessage(message, ...items);
}
async function showErrorMessage(message, ...items) {
    return vscode.window.showErrorMessage(message, ...items);
}
function createStatusBarItem(command, text, tooltip) {
    const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    if (command)
        item.command = command;
    if (text)
        item.text = text;
    if (tooltip)
        item.tooltip = tooltip;
    return item;
}
async function openDocument(content, language = 'markdown') {
    const document = await vscode.workspace.openTextDocument({
        content,
        language,
    });
    return document;
}
async function showDocument(content, language = 'markdown', title = 'Untitled') {
    const document = await openDocument(content, language);
    return vscode.window.showTextDocument(document, {
        viewColumn: vscode.ViewColumn.One,
        preserveFocus: true,
    });
}
async function saveToFile(content, defaultUri) {
    const uri = await vscode.window.showSaveDialog({
        defaultUri,
        filters: {
            'Markdown': ['md'],
            'All Files': ['*'],
        },
    });
    if (!uri) {
        return undefined;
    }
    const encoder = new TextEncoder();
    await vscode.workspace.fs.writeFile(uri, encoder.encode(content));
    return uri;
}
async function copyToClipboard(text) {
    await vscode.env.clipboard.writeText(text);
}
function getConfiguration(key, defaultValue) {
    const config = vscode.workspace.getConfiguration('carto');
    return config.get(key) ?? defaultValue;
}
function setConfiguration(key, value) {
    const config = vscode.workspace.getConfiguration('carto');
    config.update(key, value, vscode.ConfigurationTarget.Global);
}
function getVscodeThemeKind() {
    const kind = vscode.window.activeColorTheme.kind;
    if (kind === vscode.ColorThemeKind.Dark)
        return 'dark';
    if (kind === vscode.ColorThemeKind.HighContrast)
        return 'highContrast';
    return 'light';
}
function getGlobalState(key, context) {
    return context.globalState.get(key);
}
async function setGlobalState(key, value, context) {
    await context.globalState.update(key, value);
}
//# sourceMappingURL=workspace.js.map