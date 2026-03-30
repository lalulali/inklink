# Inklink

![Status](https://img.shields.io/badge/status-MVP-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)

> **Visualize your thinking. Navigate your knowledge. All in Markdown.**

---

## The Problem

*"Markdown is the new hot coding language. Deal with it."*
— [InfoWorld, March 2026](https://www.infoworld.com/article/4146579/markdown-is-now-a-first-class-coding-language-deal-with-it.html)

Markdown is everywhere. It is how developers write specs, how teams collaborate on requirements, how AI agents receive instructions, and how knowledge gets shared. It has quietly become the lingua franca of the modern technical world — not just a formatting tool, but a **first-class language for structuring thought**.

Yet the tooling has not caught up.

You write a 300-line document and **lose the structure**. You share a markdown file and your collaborator has to read every line to understand the hierarchy. You use AI to generate specs in markdown and have no quick way to comprehend the shape of the output.

**The gap is not in writing markdown — it is in reading and navigating it.**

Inklink exists to close that gap.

---

## What is Inklink?

Inklink is a **markdown-to-mind-map visualizer** built for the way we think and work today. It takes any markdown document — a spec, a plan, an outline, a set of AI instructions — and instantly renders it as an interactive, navigable mind map.

There is no conversion step. No import format. No special syntax to learn. Just write markdown the way you always have, and Inklink gives you a living, visual representation of its structure in real time.

**Write on the left. Think on the right.**

---

## Who is it for?

- **Developers** who use markdown as the primary medium for specs, RFCs, and ADRs and want to quickly grasp or present their structure
- **Product managers** who outline requirements in markdown and need a faster way to review hierarchy and coverage
- **Technical writers** who maintain large documentation trees and need to navigate them without losing context
- **AI practitioners** who work with markdown-heavy workflows, prompts, and system instructions and need to reason about their shape
- **Anyone** who thinks better visually and has always found markdown indentation a bit hard to scan at a glance

---

## Core Features

### 🗺️ Real-time Mind Map Rendering
Your markdown becomes a mind map as you type. Headers and indented lists translate directly to nodes and branches — no configuration required.

### 🔗 Bidirectional Navigation
**Double-click any node** to jump directly to the corresponding source line in the editor. The connection between visual and text is always live — edit the markdown, the map updates; navigate the map, the editor follows.

### 🧭 Multiple Layout Directions
Choose how your map flows: balanced two-sided, left-to-right, or right-to-left. Each layout uses a height-based algorithm for clean, non-overlapping node spacing.

### 🔍 Professional Search & Replace
A VS Code-style find and replace panel with full keyboard shortcuts (`Cmd+Shift+F` / `Cmd+Shift+H`), overlapping match support, regex, match-case, whole-word, and preserve-case modes.

### 🗂️ File-First Workflow
Open any `.md` file directly from the filesystem. Save changes back in place. Auto-save to local storage ensures you never lose work on a refresh.

### 📤 Export Options
Export your mind map as SVG, PNG, or a standalone interactive HTML file — ready to embed in any documentation or share with stakeholders who do not have Inklink.

### 📦 Full Undo / Redo
50-step history with standard keyboard shortcuts. Change your mind as many times as you need.

### 🌗 Dark & Light Mode
Theme-aware rendering with color-coded branch hierarchies. Looks great in both modes.

### 📱 Mobile Responsive
A fully adaptive layout — slide-in editor drawer, mobile-optimized toolbar, and quick-action markdown shortcuts — so the tool works wherever you are.

---

## Quick Start

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/lalulali/inklink.git
cd inklink
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

### Build for Production

```bash
npm run build
npm start
```

### Run Tests

```bash
npm test
```

---

## How it Works

Paste or type any markdown document into the editor panel. Inklink parses the heading hierarchy (`#`, `##`, `###`, ...) and list indentation (spaces or tabs) into a tree structure, which D3.js renders as an SVG mind map in real time.

The format is flexible — you can mix heading levels and bullet lists freely, and add descriptive notes on the next indented line to annotate any node:

```markdown
# Product Vision

## Core Features

- Editor
    use WYSIWYG editor for a seamless writing experience
- Visualization
    real-time mind map rendering as you type

## Design

### Typography
### Color System
    primary, secondary, and semantic tokens

## Roadmap

### MVP
- Core editor
- Mind map renderer
- Export to SVG

### v1.0
- Collaborative editing
- Plugin system
```

Inklink renders this as a branching mind map rooted at **Product Vision**. Each heading becomes a branch, each list item becomes a leaf node, and indented lines beneath a node appear as its descriptive label — giving you full control over both structure and context without leaving your markdown.

---

## Keyboard Shortcuts

### 🌐 Global

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl + O` | Open file |
| `Cmd/Ctrl + S` | Save file |
| `Cmd/Ctrl + Z` | Undo |
| `Cmd/Ctrl + Shift + Z` | Redo |
| `Cmd/Ctrl + E` | Open export dialog |
| `Cmd/Ctrl + F` | Find node on canvas |
| `Cmd/Ctrl + Shift + F` | Find in editor |
| `Cmd/Ctrl + Shift + H` | Find & replace in editor |
| `?` | Open keyboard reference |

### 🗺️ Canvas

| Shortcut | Action |
|---|---|
| `E` | Toggle editor panel |
| `X` | Expand selected node (or all) |
| `C` | Collapse selected node (or all) |
| `Enter` | Toggle collapse on selected node |
| `F` | Fit map to screen |
| `R` | Reset zoom to 100% |
| `Escape` | Deselect node / close canvas search |
| `Cmd/Ctrl + ←` | Switch to right-to-left layout |
| `Cmd/Ctrl + →` | Switch to left-to-right layout |
| `Cmd/Ctrl + ↑ / ↓` | Switch to two-sided layout |
| `Arrow keys` *(node selected)* | Navigate between nodes |
| `Scroll` | Pan canvas |
| `Alt/Cmd + Scroll` | Zoom in / out |

### ✏️ Editor

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl + B` | Toggle **bold** on selection |
| `Cmd/Ctrl + I` | Toggle *italic* on selection |
| `Cmd/Ctrl + Shift + X` | Toggle ~~strikethrough~~ on selection |
| `Enter` | Continue list / auto-indent |
| `Shift + Enter` | Add note line under current item |
| `Tab` | Indent list item |
| `Backspace` | Smart dedent on list items |

---

## Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 with App Router |
| Language | TypeScript (strict mode) |
| Rendering | D3.js (SVG-based) |
| Styling | Tailwind CSS + shadcn/ui |
| Testing | Jest + fast-check (property-based) |

---

## Inspiration & References

This project was inspired by [Markmap](https://github.com/markmap/markmap), which was studied as a reference implementation for D3.js rendering patterns, pan/zoom interaction, and SVG export techniques. Inklink's markdown parser, layout algorithms, state management, and file operations are fully custom implementations.

---

## License

MIT — see [LICENSE](./LICENSE) for details.

---

## Acknowledgments

- [Markmap](https://github.com/markmap/markmap) — For D3.js rendering patterns and inspiration
- [D3.js](https://d3js.org/) — For SVG visualization
- [shadcn/ui](https://ui.shadcn.com/) — For component patterns
- [InfoWorld](https://www.infoworld.com/article/4146579/markdown-is-now-a-first-class-coding-language-deal-with-it.html) — For articulating what the developer community already knows: Markdown is a first-class language, and the tools should treat it that way