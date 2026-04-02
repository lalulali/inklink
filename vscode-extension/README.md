# Inklink — Markdown Mind Map Visualizer

[![VS Code Extension](https://img.shields.io/badge/VS%20Code-Extension-007ACC?logo=visualstudiocode&logoColor=white)](https://marketplace.visualstudio.com/items?itemName=ChrisHadi.inklink)
[![Open VSX](https://img.shields.io/open-vsx/v/ChrisHadi/inklink?color=purple&logo=open-vsx&logoColor=white)](https://open-vsx.org/extension/ChrisHadi/inklink)

> **Turn any Markdown file into a live, interactive mind map — right inside VS Code.**

Inklink is a **Markdown mind map extension** for Visual Studio Code that instantly visualizes the structure of your `.md` files as navigable, color-coded mind maps. No export step. No separate tool. Just open a Markdown file and see its hierarchy come alive in a side panel.

Whether you are writing a product spec, reviewing an architecture decision record, drafting AI prompts, or navigating a large documentation tree — Inklink gives you the **bird's-eye view** that plain text cannot.

---

## ✨ Why Inklink?

| Challenge | Inklink's Answer |
|---|---|
| Markdown files grow beyond what you can scan | **Real-time mind map** renders the full hierarchy instantly |
| You lose your place in large documents | **Bidirectional navigation** — click a node to jump to its source line |
| Context-switching between tools kills your flow | **No tab switch** — the mind map lives right beside your editor |
| You need to present structure to your team | **Export to PNG, SVG, or interactive HTML** with one click |
| You want visual tools that respect your dark theme | **Full dark mode** — designed to blend seamlessly with VS Code |

---

## 🚀 Key Features

### 🗺️ Real-Time Markdown Mind Map
Every heading (`#`, `##`, `###`) and list item in your Markdown automatically becomes a node in the mind map. Edit the file — the map updates instantly. No manual refresh required.

### 🔄 Real-Time Synchronization
The mind map is live-synced with your editor buffer. It updates as you type, providing an instant visual preview of your document structure as it evolves. No manual refresh or save required.

### 🔗 Bidirectional Editor ↔ Map Navigation
- **Double-click any node** → your VS Code editor jumps to the exact line
- **Click a line in the editor** → the corresponding node highlights in the mind map
- The connection is always live: write on the left, think on the right

### 🧭 Multiple Layout Directions
Choose how your mind map flows:
- **Two-Sided (Balanced)** — branches spread left and right
- **Left-to-Right** — classic reading direction
- **Right-to-Left** — for RTL workflows or alternative perspectives

### 🔭 Lighthouse Minimap
A smart minimap in the bottom-right corner keeps you oriented on even the largest mind maps. The current viewport is highlighted with an inverted overlay so your position is always unmistakable — even when zoomed out to see thousands of nodes.

### 🔍 Canvas Search
Find any node by text directly on the mind map canvas. Navigate through results with keyboard shortcuts.

### 📤 Export Your Mind Map
Share your visual thinking with anyone:
- **PNG** — high-resolution image export
- **SVG** — scalable vector graphics
- **Interactive HTML** — a standalone file anyone can open in a browser, zoom, pan, expand, and collapse — no Inklink required

### 🎨 Theme-Aware Design
Inklink automatically matches your VS Code theme (light or dark). Color-coded branches maintain their vibrant light-mode colors in both themes, ensuring visual consistency and excellent readability against dark backgrounds.

### 🛡️ Auto-Save & Recovery
Your work is continuously saved in the background. If VS Code crashes or the panel is accidentally closed, your mind map state is preserved and restored on next launch.

### ⚙️ Expand, Collapse & Focus
- **Expand All / Collapse All** — control how much of the tree is visible
- **Click a collapse indicator** — fold or unfold individual branches
- **Fit to Screen** — instantly center and scale the map to fit your panel

---

## 📦 Getting Started

### Open a Mind Map

1. Open any `.md` file in VS Code
2. Click the **Inklink icon** in the editor title bar, or
3. Right-click the file in the Explorer → **Open Mindmap**, or
4. Open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) → **Inklink: Open Mindmap**

The mind map opens in a **side panel** next to your editor — your Markdown source and its visual structure, side by side.

### Supported Markdown Structure

```markdown
# Project Title

## Phase 1
- Research
    gather competitive analysis data
- Design
    wireframes and user testing
    
## Phase 2

### Backend
- API Design
- Database Schema

### Frontend  
- Component Library
- State Management

## Phase 3
- Launch
- Post-launch monitoring
```

Every heading and list item becomes a node. Indented text beneath a node becomes its **descriptive label** — giving you both structure and context without leaving Markdown.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `E` | Toggle editor panel visibility |
| `X` | Expand all nodes |
| `C` | Collapse all nodes |
| `M` | Toggle minimap |
| `F` | Fit map to screen |
| `R` | Reset zoom to 100% |
| `Enter` | Toggle collapse on selected node |
| `Escape` | Deselect node |
| `Arrow keys` | Navigate between nodes |
| `Scroll` | Pan the canvas |
| `Cmd/Ctrl + Scroll` | Zoom in / out |
| `Cmd/Ctrl + ←` | Right-to-left layout |
| `Cmd/Ctrl + →` | Left-to-right layout |
| `Cmd/Ctrl + ↑ / ↓` | Two-sided layout |

> **Note:** Standard VS Code shortcuts like `Cmd+S` (Save), `Cmd+F` (Find), and `Cmd+Z` (Undo) work natively — Inklink does not override them.

---

## 🏗️ How It Works Under the Hood

Inklink runs as a **VS Code Webview panel** powered by React, D3.js, and TypeScript. Your Markdown is parsed into a tree structure using a custom heading + list parser, then rendered as an SVG mind map with D3's layout algorithms.

The extension communicates bidirectionally with VS Code's editor API:
- **File watching** — the mind map updates when the source file changes on disk
- **Cursor sync** — editor cursor position broadcasts to the mind map for live highlighting
- **Line reveal** — double-clicking a node sends the target line back to VS Code for navigation

All rendering happens locally. No data leaves your machine. No external API calls. No telemetry.

---

## 🔧 Requirements

- **VS Code** 1.85.0 or later
- No additional dependencies — everything is bundled

---

## 💡 Use Cases

- **📋 Product Specs** — Visualize PRDs, user stories, and acceptance criteria written in Markdown
- **🏛️ Architecture Docs** — Navigate ADRs, RFC documents, and system design specs
- **🤖 AI Prompt Engineering** — See the structure of complex system prompts and agent instructions at a glance
- **📚 Documentation** — Explore multi-section docs, tutorials, and knowledge bases as interactive trees
- **🎓 Study Notes** — Organize lecture notes and research hierarchies visually
- **📝 Meeting Notes** — Turn action items and agendas into browsable mind maps
- **🗓️ Project Planning** — Map out milestones, phases, and task breakdowns

---

## 🌐 Also Available on the Web

Inklink is also available as a **free web application** at [inklink.bychris.me](https://inklink.bychris.me) with additional features like drag-and-drop file opening, local IndexedDB recovery, and a full markdown editor with find & replace.

The VS Code extension and the web app share the same rendering engine, layout algorithms, and design system — so your mind maps look identical everywhere.

---

## 🤝 Contributing

Inklink is open source. Contributions, bug reports, and feature requests are welcome on [GitHub](https://github.com/lalulali/inklink).

---

## ☕ Support

If Inklink has saved you time or helped you think more clearly, consider [buying me a coffee](https://buymeacoffee.com/christianh5). It keeps the project alive.

---

## 📄 License

MIT — see [LICENSE](https://github.com/lalulali/inklink/blob/main/LICENSE) for details.

---

**Inklink** — *Visualize your thinking. Navigate your knowledge. All in Markdown.*
