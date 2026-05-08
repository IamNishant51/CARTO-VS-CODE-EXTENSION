import * as vscode from 'vscode';

export function getWorkspaceRoot(): string | undefined {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return undefined;
  }
  return workspaceFolders[0].uri.fsPath;
}

export function getWorkspaceName(): string | undefined {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return undefined;
  }
  return workspaceFolders[0].name;
}

export async function showProgress<T>(
  title: string,
  task: (progress: vscode.Progress<{ message?: string; increment?: number }>) => Promise<T>
): Promise<T> {
  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Window,
      title,
      cancellable: false,
    },
    (progress) => task(progress as vscode.Progress<{ message?: string; increment?: number }>)
  );
}

export async function showInformationMessage(
  message: string,
  ...items: string[]
): Promise<string | undefined> {
  return vscode.window.showInformationMessage(message, ...items);
}

export async function showWarningMessage(
  message: string,
  ...items: string[]
): Promise<string | undefined> {
  return vscode.window.showWarningMessage(message, ...items);
}

export async function showErrorMessage(
  message: string,
  ...items: string[]
): Promise<string | undefined> {
  return vscode.window.showErrorMessage(message, ...items);
}

export function createStatusBarItem(
  command?: string,
  text?: string,
  tooltip?: string
): vscode.StatusBarItem {
  const item = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  if (command) item.command = command;
  if (text) item.text = text;
  if (tooltip) item.tooltip = tooltip;
  return item;
}

export async function openDocument(
  content: string,
  language: string = 'markdown'
): Promise<vscode.TextDocument> {
  const document = await vscode.workspace.openTextDocument({
    content,
    language,
  });
  return document;
}

export async function showDocument(
  content: string,
  language: string = 'markdown',
  title: string = 'Untitled'
): Promise<vscode.TextEditor> {
  const document = await openDocument(content, language);
  return vscode.window.showTextDocument(document, {
    viewColumn: vscode.ViewColumn.One,
    preserveFocus: true,
  });
}

export async function saveToFile(
  content: string,
  defaultUri?: vscode.Uri
): Promise<vscode.Uri | undefined> {
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

export async function copyToClipboard(text: string): Promise<void> {
  await vscode.env.clipboard.writeText(text);
}

export function getConfiguration<T>(
  key: string,
  defaultValue?: T
): T | undefined {
  const config = vscode.workspace.getConfiguration('carto');
  return config.get<T>(key) ?? defaultValue;
}

export function setConfiguration<T>(key: string, value: T): void {
  const config = vscode.workspace.getConfiguration('carto');
  config.update(key, value, vscode.ConfigurationTarget.Global);
}

export function getVscodeThemeKind(): 'dark' | 'light' | 'highContrast' {
  const kind = vscode.window.activeColorTheme.kind;
  if (kind === vscode.ColorThemeKind.Dark) return 'dark';
  if (kind === vscode.ColorThemeKind.HighContrast) return 'highContrast';
  return 'light';
}

export function getGlobalState<T>(
  key: string,
  context: vscode.ExtensionContext
): T | undefined {
  return context.globalState.get<T>(key);
}

export async function setGlobalState<T>(
  key: string,
  value: T,
  context: vscode.ExtensionContext
): Promise<void> {
  await context.globalState.update(key, value);
}