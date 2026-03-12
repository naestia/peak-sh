import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

const FILE_PATTERN = "**/{.github/workflows/*.yml,*/action.yml}";

// Pattern 1: regular local script
//   run: ./script.sh
//   run: bash ./script.sh
//   run: bash .github/scripts/foo.sh
const RUN_PATTERN_LOCAL =
  /^(\s*)run:\s+(?:(?:bash|sh)\s+)?(\.{1,2}?[\w./-]*\.sh)\s*$/;

// Pattern 2: action_path script
//   run: bash "${{ github.action_path }}/scripts/foo.sh"
const RUN_PATTERN_ACTION_PATH =
  /^(\s*)run:\s+(?:(?:bash|sh)\s+)?"?\$\{\{\s*github\.action_path\s*\}\}\/([\w./-]+\.sh)"?\s*$/;

// ── Types ─────────────────────────────────────────────────────────────────────
interface MatchResult {
  indent: string;
  rawPath: string;
  isActionPath: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function matchRunLine(text: string): MatchResult | null {
  const local = RUN_PATTERN_LOCAL.exec(text);
  if (local) return { indent: local[1], rawPath: local[2], isActionPath: false };

  const action = RUN_PATTERN_ACTION_PATH.exec(text);
  if (action) return { indent: action[1], rawPath: action[2], isActionPath: true };

  return null;
}

function resolveScriptPath(rawMatch: string, workflowFile: string, isActionPath = false): string | null {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) return null;

  const basename = path.basename(rawMatch);
  const normalized = rawMatch.replace(/^\.\//, "");

  // For action_path patterns, skip straight to scanning action script dirs
  if (isActionPath) {
    const actionScriptsDirs = findActionScriptDirs(workspaceRoot);
    console.log("[peak-sh] action script dirs:", actionScriptsDirs);
    for (const dir of actionScriptsDirs) {
      const candidate = path.join(dir, basename);
      console.log("[peak-sh] trying action path candidate:", candidate);
      if (fs.existsSync(candidate)) return candidate;
    }
    return null;
  }

  // 1. Exact path from workspace root (e.g. .github/scripts/foo.sh)
  const fromRoot = path.join(workspaceRoot, normalized);
  if (fs.existsSync(fromRoot)) return fromRoot;

  // 2. Relative to the workflow file itself
  const fromWorkflow = path.join(path.dirname(workflowFile), rawMatch);
  if (fs.existsSync(fromWorkflow)) return fromWorkflow;

  // 3. Shorthand: run: ./foo.sh → look in .github/scripts/foo.sh
  if (rawMatch.startsWith("./")) {
    const fromScripts = path.join(workspaceRoot, ".github", "scripts", basename);
    if (fs.existsSync(fromScripts)) return fromScripts;
  }

  // 4. Fallback: scan all action script dirs
  const actionScriptsDirs = findActionScriptDirs(workspaceRoot);
  for (const dir of actionScriptsDirs) {
    const candidate = path.join(dir, basename);
    if (fs.existsSync(candidate)) return candidate;
  }

  return null;
}

// Finds all directories named "scripts" that sit next to an action.yml
function findActionScriptDirs(workspaceRoot: string): string[] {
  const dirs: string[] = [];
  console.log("[peak-sh] scanning for action dirs in:", workspaceRoot);
  try {
    const entries = fs.readdirSync(workspaceRoot, { withFileTypes: true });
    for (const entry of entries) {
      console.log("[peak-sh] entry:", entry.name, "isDir:", entry.isDirectory());
      if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
      const actionYml = path.join(workspaceRoot, entry.name, "action.yml");
      const scriptsDir = path.join(workspaceRoot, entry.name, "scripts");
      console.log("[peak-sh] checking action.yml:", actionYml, "exists:", fs.existsSync(actionYml));
      console.log("[peak-sh] checking scripts dir:", scriptsDir, "exists:", fs.existsSync(scriptsDir));
      if (fs.existsSync(actionYml) && fs.existsSync(scriptsDir)) {
        dirs.push(scriptsDir);
      }
    }
  } catch (err) {
    console.log("[peak-sh] findActionScriptDirs error:", err);
  }
  console.log("[peak-sh] found action script dirs:", dirs);
  return dirs;
}

function countLines(filePath: string): number {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return content.split("\n").length;
  } catch {
    return 0;
  }
}

// ── Activation ────────────────────────────────────────────────────────────────
export function activate(ctx: vscode.ExtensionContext) {
  console.log("[peak-sh] activate() called");

  // 1. Hover provider
  ctx.subscriptions.push(
    vscode.languages.registerHoverProvider(
      { pattern: FILE_PATTERN },
      {
        provideHover(doc, position) {
          const line = doc.lineAt(position.line);
          const m = matchRunLine(line.text);
          if (!m) return null;

          const resolved = resolveScriptPath(m.rawPath, doc.fileName, m.isActionPath);

          if (!resolved || resolved.includes("${{")) {
            return new vscode.Hover(
              new vscode.MarkdownString(`⚠ **Script not found:** \`${m.rawPath}\``)
            );
          }

          let content: string;
          try {
            content = fs.readFileSync(resolved, "utf8");
          } catch {
            return null;
          }

          const md = new vscode.MarkdownString();
          md.isTrusted = true;
          md.appendMarkdown(`**${path.basename(resolved)}**\n\n`);
          md.appendCodeblock(content, "bash");
          return new vscode.Hover(md);
        },
      }
    )
  );

  // 2. CodeLens provider
  const codeLensProvider = new ScriptCodeLensProvider();
  ctx.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { pattern: FILE_PATTERN },
      codeLensProvider
    )
  );

  // Refresh CodeLens when document changes
  ctx.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.fileName.match(/\.(yml|yaml)$/)) {
        codeLensProvider.refresh();
      }
    })
  );

  // Refresh CodeLens when switching editors
  ctx.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor && editor.document.fileName.match(/\.(yml|yaml)$/)) {
        codeLensProvider.refresh();
      }
    })
  );

  // 3. Open script command
  ctx.subscriptions.push(
    vscode.commands.registerCommand(
      "peak-sh.openScript",
      async (scriptPath: string) => {
        if (!scriptPath || scriptPath.includes("${{")) {
          vscode.window.showWarningMessage(`[peak-sh] Cannot open unresolved path: ${scriptPath}`);
          return;
        }
        try {
          const uri = vscode.Uri.file(scriptPath);
          await vscode.commands.executeCommand("vscode.open", uri, {
            viewColumn: vscode.ViewColumn.Beside,
            preserveFocus: true,
          });
        } catch (err) {
          vscode.window.showErrorMessage(`[peak-sh] Failed to open script: ${err}`);
        }
      }
    )
  );
}

export function deactivate() {}

// ── CodeLens Provider ─────────────────────────────────────────────────────────
class ScriptCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

  public refresh(): void {
    this._onDidChangeCodeLenses.fire();
  }

  provideCodeLenses(doc: vscode.TextDocument): vscode.CodeLens[] {
    const lenses: vscode.CodeLens[] = [];

    for (let i = 0; i < doc.lineCount; i++) {
      const line = doc.lineAt(i);
      const m = matchRunLine(line.text);
      if (!m) continue;

      const resolved = resolveScriptPath(m.rawPath, doc.fileName, m.isActionPath);
      const range = new vscode.Range(i, 0, i, 0);

      if (!resolved || resolved.includes("${{")) {
        lenses.push(
          new vscode.CodeLens(range, {
            title: `⚠️ Script not found: ${m.rawPath}`,
            command: "",
          })
        );
        continue;
      }

      const lineCount = countLines(resolved);
      const basename = path.basename(resolved);
      lenses.push(
        new vscode.CodeLens(range, {
          title: `↳ ${basename}  •  ${lineCount} lines  —  click to open`,
          command: "peak-sh.openScript",
          arguments: [resolved],
          tooltip: `Click to open ${basename} in a new editor`,
        })
      );
    }

    return lenses;
  }
}