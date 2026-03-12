# Peak.sh

A VS Code extension that makes it easier to work with GitHub Actions workflows by providing quick access to external scripts referenced in your workflow files.

## Features

✨ **CodeLens Integration**
- Inline clickable links above `run:` lines that reference shell scripts
- Shows script name and line count
- Click to open the script in a side-by-side editor
- Clear warnings for missing or unresolvable scripts

📄 **Hover Previews**
- Hover over any `run:` line that references a script to see its contents
- Full syntax-highlighted preview in a hover tooltip

🔍 **Smart Script Resolution**
- Resolves relative paths from workspace root or workflow file location
- Supports GitHub Actions `${{ github.action_path }}` variable
- Automatically finds scripts in `.github/scripts/` directories
- Scans for scripts in action directories (next to `action.yml` files)

## Installation

### From Source

```bash
# 1. Install dependencies
npm install

# 2. Compile TypeScript
npm run compile

# 3. Package as .vsix
npm run package

# 4. Install into VS Code
code --install-extension peak-sh-0.1.0.vsix
```

### Development Mode

Open the project folder in VS Code and press **F5** to launch an Extension Development Host with the extension live-loaded.

## Usage

1. Open any GitHub Actions workflow file (`.github/workflows/*.yml`) or composite action (`*/action.yml`)
2. The extension automatically activates and scans for script references
3. **Click on CodeLens links** above `run:` lines to open scripts in a new editor pane
4. **Hover over `run:` lines** to preview script contents

## Supported Patterns

The extension recognizes the following script reference patterns:

```yaml
# Local script (relative to workspace root)
run: ./script.sh
run: bash ./script.sh
run: sh .github/scripts/deploy.sh

# Action path variable (composite actions)
run: bash "${{ github.action_path }}/scripts/setup.sh"
run: sh ${{ github.action_path }}/scripts/build.sh
```

## Configuration

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `peakSh.autoExpand` | boolean | `true` | Automatically expand scripts when opening a workflow file |
| `peakSh.borderColor` | string | `#00BCD4` | Left border color for inlined script blocks |

### Customizing CodeLens Appearance

The extension sets CodeLens to a bright cyan color (`#00D9FF` in dark mode, `#0088AA` in light mode). To customize:

```json
{
  "workbench.colorCustomizations": {
    "editorCodeLens.foreground": "#FF6B6B"
  }
}
```

## Project Structure

```
peak-sh/
├── src/
│   └── extension.ts      # Main extension code
├── package.json           # Extension manifest
├── tsconfig.json          # TypeScript configuration
└── README.md
```

## License

MIT License - Copyright (c) 2026 Viktor Berg