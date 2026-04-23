# Inklink — Markdown Mind Map for VS Code

[![VS Code Extension](https://img.shields.io/badge/VS%20Code-Extension-007ACC?logo=visualstudiocode&logoColor=white)](https://marketplace.visualstudio.com/items?itemName=ChrisHadi.inklink)
[![Open VSX](https://img.shields.io/open-vsx/v/ChrisHadi/inklink?color=purple&logo=open-vsx&logoColor=white)](https://open-vsx.org/extension/ChrisHadi/inklink)

> **Turn any Markdown file into a visual mind map — right inside your editor.**

You've got a 300-line spec. You wrote it last week. Now you need to find that one requirement about rate limiting. You're scrolling. And scrolling.

**There's a better way.**

Inklink instantly visualizes your Markdown as an interactive mind map — in a side panel, next to your code. No tab switching. No context loss. Just your document's structure, at a glance.

![Inklink VS Code Extension](../public/screenshots/vscode.png)

---

## Why Inklink?

| Stuck? | Inklink Solves It |
|---|---|
| Can't see the forest for the trees | **Instant structure** — every heading and list item becomes a visual node |
| Lost in long documents | **Click to navigate** — double-click any node to jump to its source line |
| Switching apps kills your flow | **Stay in your editor** — mind map lives in a side panel |
| Need to share document structure | **One-click export** — PNG, SVG, or interactive HTML |
| Dark mode issues | **Native look** — designed to blend with VS Code theming |

---

## What You Get

### 🗺️ Instant Mind Map
Open any `.md` file and see its structure immediately. Headings become branches. Lists become leaves. The entire document becomes navigable at a glance.

### 🔄 Live Synchronization
The map updates as you type. Every change in your editor reflects in the mind map — instantly, automatically.

### 🔗 Bidirectional Navigation
- **Double-click a node** → editor jumps to that line
- **Click in the editor** → corresponding node highlights
- **Edit markdown** → map updates in real time

### 📝 Expandable Note Blocks
Code blocks and quotes show as interactive pills on nodes. Click to expand. Click again to collapse. State persists as you edit.

### 🖼️ Images & Tables
- Markdown images render as clickable thumbnails
- Tables become interactive elements within nodes
- Click images for fullscreen lightbox viewing

### 🧭 Three Layout Options
- **Two-Sided** — balanced left and right branches
- **Left-to-Right** — classic flow
- **Right-to-Light** — for RTL or alternative views

### 🔭 Smart Minimap
Navigate huge documents without getting lost. The minimap keeps your current position in focus, even with 1000+ nodes.

### 🎨 Dark Mode Built-In
Color-coded branches that look great in any theme. Links stay visible on saturated nodes.

### 📤 Export One-Click
Share your visual structure:
- **PNG** — high-res image
- **SVG** — scalable vector
- **HTML** — standalone interactive file (opens anywhere, no Inklink needed)

---

## How to Use

1. Open any `.md` file in VS Code
2. Click the **Inklink icon** in the editor title bar, **or**
3. Right-click the file → **Open Mindmap**, **or**
4. Command Palette (`Cmd+Shift+P`) → **Inklink: Open Mindmap**

The mind map appears in a side panel. Write on the left. Think on the right.

---

## Example Markdown

```markdown
# Project Title

## Phase 1
- Research
    gather competitive analysis
- Design
    wireframes and testing
    
## Phase 2

### Backend
- API Design
- Database Schema

### Frontend  
- Component Library
- State Management
```

Every heading and list item becomes a visual node with the full structure visible at a glance.

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `E` | Toggle editor panel |
| `X` | Expand all nodes |
| `C` | Collapse all nodes |
| `M` | Toggle minimap |
| `F` | Fit map to screen |
| `R` | Reset zoom |
| `Enter` | Toggle selected node |
| `Escape` | Deselect |
| `Arrow keys` | Navigate nodes |
| `Scroll` | Pan canvas |
| `Cmd/Ctrl + Scroll` | Zoom |
| `Cmd/Ctrl + ←/→` | Switch layouts |
| `Cmd/Ctrl + B` | Bold |
| `Cmd/Ctrl + I` | Italic |

> Standard VS Code shortcuts (`Cmd+S`, `Cmd+F`, `Cmd+Z`) work natively — Inklink doesn't override them.

---

## How It Works

Inklink runs as a VS Code Webview powered by React and D3.js. Your Markdown gets parsed into a tree structure and rendered as an SVG mind map.

The extension talks to VS Code:
- **File watching** → map updates when file changes
- **Cursor sync** → editor position highlights in map
- **Line reveal** → double-click navigates to source

All rendering is local. No data leaves your machine.

---

## Requirements

- VS Code 1.85.0 or later
- No extra dependencies

---

## Use Cases

- **Product Specs** — visualize PRDs and user stories
- **Architecture Docs** — navigate ADRs and RFCs
- **AI Prompts** — see complex instruction structures
- **Documentation** — explore large docs as trees
- **Meeting Notes** — turn agendas into mind maps
- **Project Planning** — map milestones and tasks

---

## Also on the Web

Inklink is also available at **[inklink.bychris.me](https://inklink.bychris.me)** with additional features:
- Drag-and-drop file opening
- Full markdown editor with find & replace
- Local IndexedDB recovery

Both the web app and VS Code extension share the same rendering engine — your mind maps look identical everywhere.

---

## License

MIT — see [LICENSE](https://github.com/lalulali/inklink/blob/main/LICENSE) for details.

---

**Inklink** — *Visualize your thinking. Navigate your knowledge. All in Markdown.*