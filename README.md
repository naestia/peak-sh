# Peak.sh — local install

## Structure
```
gha-script-inliner/
  src/
    extension.ts
  package.json
  tsconfig.json
```

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Compile
npm run compile

# 3. Package as .vsix
npx vsce package

# 4. Install into VS Code
  code --install-extension peak-sh-0.1.0.vsix
```

## Dev mode (no packaging needed)
Open the folder in VS Code and press **F5** — this launches an Extension
Development Host with the extension live-loaded.

## Usage
- Open any `.github/workflows/*.yml` file — the extension will automatically detect script references
- **Click on the CodeLens** to open the script in a new editor pane
- **Hover over the `run:` line** to see a preview of the script content
- `Ctrl+Shift+P` → **Peak.sh: Toggle All Inlined Scripts** to toggle on/off

## Features
✨ **Enhanced CodeLens**
- 🔍 CodeLens links with file icons showing script name and line count
- ⚠️ Clear warnings for missing scripts
- 📄 Hover preview of script contents

## Settings
| Setting | Default | Description |
|---|---|---|
| `peakSh.autoExpand` | `true` | Expand on file open |
| `peakSh.borderColor` | `#00BCD4` | Left border accent color |

## Customizing CodeLens Color
The extension sets the CodeLens color to a bright cyan (`#00D9FF` in dark mode). If you want to customize it further, add this to your VSCode `settings.json`:

```json
{
  "workbench.colorCustomizations": {
    "editorCodeLens.foreground": "#FF6B6B"  // Your custom color
  }
}
```

## Supported patterns
```yaml
run: ./script.sh
run: bash ./script.sh
run: bash .github/scripts/deploy.sh
run: sh ./scripts/build.sh
```