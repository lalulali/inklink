# 💎 Inklink: The Ultimate Feature Showcase & Test Suite

> "A tool is only as good as the visions it can manifest. Precision is the canvas, imagination is the paint." — *Anonymous Creator*

Welcome to the **Master Documentation Node**. This file is a comprehensive, multi-dimensional benchmark that showcases every single extended Markdown and HTML feature currently implemented in the **Inklink** engine. It is designed to stress-test layout calculations, text wrapping, and state management.

![Coffee Technology Hero](https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80)

---

## 🎨 1. Typography & Formatting Gallery

The renderer supports a high density of inline styles, even when combined:

- **Standard Styles**: **Bold Content**, *Italic Emphasis*, ***Triple Combined Weight***, and ~~Strikethrough Deleted~~.
- **Enhanced Styles**: <u>Underlined Text</u>, ==Highlighted Item==, and <mark>HTML Mark</mark>.
- **Highlight Variants**: ==Combined **Bold** Highlight== and <mark>*Italic Mark*</mark>.
- **Vertical Spacing**: Chemistry notation $H_2O$ and exponents $E=mc^2$ using ^Superscript^ and ~Subscript~.
- **Technical Input**: Common shortcuts like <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd> or inline code: `` `Array.prototype.map()` ``.
- **Rich Links**: [**Bold Link**](https://example.com) or [*Italic Link*](https://example.com) with internal ~~strikethrough~~ formatting.

---

## 🏗️ 2. Advanced Layout & HTML Elements

Custom HTML blocks allow for rich, nested visualization that goes beyond standard Markdown. Inklink supports a curated set of HTML tags for maximum layout control:

### 📐 Positioning & Containers
<center>
  <h1>Centered Heading 1</h1>
  <h4>Centered Heading 4 Support</h4>
  <p>Standard paragraphs inside a <code>&lt;center&gt;</code> tag should remain perfectly aligned and wrapped within the node's boundaries, regardless of width.</p>
</center>

<div style="background: rgba(139, 92, 246, 0.1); border: 2px solid #8b5cf6; border-radius: 8px; padding: 16px; margin: 12px 0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
  <strong style="color: #6d28d9;">💡 Design Token Card</strong>: This <code>&lt;div&gt;</code> demonstrates how custom CSS-like styling in HTML allows users to create high-contrast "callout cards" for critical information.
  <p>You can even use <span>spans for fine-grained style control</span> within a container.</p>
</div>

### 📑 Semantic Lists & Details
<ul>
  <li><b>Unordered List</b> via <code>&lt;ul&gt;</code></li>
  <li>Supports <i>italicized</i> items</li>
  <li>
    <ol>
      <li>Nested <u>Ordered List</u> via <code>&lt;ol&gt;</code></li>
      <li>Item <sub>Subscript</sub> and Item <sup>Superscript</sup></li>
    </ol>
  </li>
</ul>

### 🖋️ Typography & Inline Blocks
Support for <b>bold</b>, <i>italic</i>, <em>emphasis</em>, <strong>strong</strong>, <u>underline</u>, <mark>mark/highlight</mark>, <kbd>keyboard</kbd>, and <sub>sub</sub>/<sup>sup</sup> tags is fully baked into the layout engine. Use <code>&lt;br&gt;</code> for manual<br/>line breaks within a single node.

---

## 🖼️ 3. Internet Media & Integrity Tests

Testing external image loading, aspect ratio scaling, and error fallback states:

- **High-Res External**: 
  ![Technology](https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=60)
- **HTML Image Tag**:
  <img src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=400&q=60" width="200" />
- **Legacy Image Tag**:
  <image src="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=60" width="200" />
- **Nature Landscape (Landscape Ratio)**: 
  ![Nature](https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=60)
- **Image with Link**:
  [![Linked Architecture](https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=60)](https://unsplash.com)
- **404 Integrity Handling**: 
  ![Non-Existent Image](https://images.unsplash.com/photo-broken-link-for-404-test)

---

## 🛠️ 4. Note Blocks: The Productivity Core

### 💻 Multi-Language Code Stacking Gallery

```typescript
// Type-safe coffee brewing algorithm
interface BrewConfig {
  method: 'V60' | 'AeroPress' | 'Chemex';
  temperature: number; // in Celsius
  ratio: number; // liquid:beans
}
```

```python
# Real-time extraction calculation
def get_ey(dose, yield_wt, tds):
    return (yield_wt * tds) / dose

print(f"Extraction: {get_ey(18, 36, 0.091):.2%}")
```

```json
{
  "project": "Inklink",
  "status": "In Development",
  "modules": ["D3Renderer", "TreeBuilder", "LayoutEngine"]
}
```

### 📋 Task List Progression & Nesting
- [x] **Phase 1**: Core Parser Engine
    - [x] Handle sequential hashing
    - [x] Implement recursion limits
- [ ] *Phase 2*: Rendering Stability
    - [x] Fix thumbnail vertical padding
    - [ ] ~~Legacy SVG transition bug~~ (Deprecated)
    - [ ] Add <kbd>Shift</kbd> + <kbd>Tab</kbd> shortcut support
- [ ] Phase 3: Public Beta Rollout 🚀

### ⚖️ Tabular Data Mastery
| Feature Group | Component | Status | Metrics | Action |
| :--- | :--- | :---: | :--- | :--- |
| **Logic** | Logic Engine | ✅ *Stable* | ==98.4%== Accuracy | [View Docs](https://example.com) |
| **Visuals** | D3 Renderer | 🛠️ *Active* | <kbd>v0.1.7</kbd> | ^High Priority^ |
| **Styles** | UI Kit (Tailwind) | 🚧 *Pending* | ~~Draft Stage~~ | ~In Queue~ |

---

## 🔗 5. Hyperlinks & Global Anchors

Inklink supports standard Markdown links as well as raw HTML anchors with target attributes.

- **Internal Reference**: [See Section 1](#1-typography--formatting-gallery)
- **External Authority**: [Inklink GitHub Repository](https://github.com)
- **HTML Anchor**: <a href="https://example.com" target="_blank">Visit Example</a>
- **Safe Secure Links**: <a href="https://unsplash.com" target="_blank" rel="noopener">Browse Unsplash Assets</a>

---

## 📜 6. Blockquotes & Citations

Quotes can be nested and contain rich formatting to simulate academic or research papers:

> "This is a multiline blockquote designed to test the left-border styling and vertical height calculations when multiple formatting types appear inside."
> 
> - Support for **bold markers** and *italics*
> - Support for [nested links](https://example.com) and `inline code` snippets
> - Support for multiple paragraphs within a single quote block
> 
> > "Deep nesting of quotes is also supported, and should maintain consistent indentation behavior."

---

## 🔢 7. Deep Hierarchical Nesting

Testing the "Sprawl" limits of the layout engine:

1. Level 1: Core System
    - Level 2: Component A
        - Level 3: Sub-component X
            - Level 4: **Unit Test A1** (High Density)
            - Level 5: `system_check.sh` output trace
                - Level 6: Recursion limit reached?
    - Level 2: Component B
        - Level 3: [Documentation Hub](https://example.com)

---

## 🏗️ 9. HTML Table Prowess

Standard HTML tables are now handled with full rendering fidelity. This allows for advanced formatting that Markdown tables cannot achieve, such as multi-line cells and specific alignment overrides.

### 📊 Professional HTML Table Structure
<table>
  <thead>
    <tr>
      <th align="left">System Component</th>
      <th align="center">Update Priority</th>
      <th align="right">Metric (Load)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><b>Adaptive Minimap v2</b><br/>Neighborhood scaling enabled</td>
      <td align="center">🔴 CRITICAL</td>
      <td align="right">==14ms==</td>
    </tr>
    <tr>
      <td><b>HTML Extraction Engine</b><br/>RegEx matching across newlines</td>
      <td align="center">🟢 STABLE</td>
      <td align="right">~2ms~</td>
    </tr>
    <tr>
      <td><b>Precision Touch Interface</b><br/>Mobile adaptive overlays</td>
      <td align="center">🟡 PENDING</td>
      <td align="right">--</td>
    </tr>
  </tbody>
  <tfoot>
    <tr>
      <td><b>Total Modules</b></td>
      <td align="center">--</td>
      <td align="right">3 Active</td>
    </tr>
  </tfoot>
</table>

### 🛠️ Minimalist HTML Table
<table>
  <tr>
    <td><b>Header A</b></td>
    <td><b>Header B</b></td>
  </tr>
  <tr>
    <td>Row 1, Cell 1</td>
    <td>Row 1, Cell 2</td>
  </tr>
</table>

---

## 📐 8. Mathematical Notation & Symbols

Inklink provides a lightweight, performant Unicode-based math renderer. Use standard LaTeX-style commands within `$ ... $` delimiters for professional scientific visualization.

### 🔢 Operators & Relations
- **Basic**: $\pm$ (\pm), $\mp$ (\mp), $\times$ (\times), $\div$ (\div), $\cdot$ (\cdot)
- **Relations**: $\neq$ (\neq), $\approx$ (\approx), $\cong$ (\cong), $\equiv$ (\equiv), $\sim$ (\sim), $\propto$ (\propto)
- **Inequalities**: $\le$ (\le), $\ge$ (\ge), $\leq$ (\leq), $\geq$ (\geq)
- **Calculus & Logic**: $\infty$ (\infty), $\int$ (\int), $\sum$ (\sum), $\prod$ (\prod), $\nabla$ (\nabla), $\partial$ (\partial)
- **Set Theory**: $\in$ (\in), $\notin$ (\notin), $\subset$ (\subset), $\supset$ (\supset), $\forall$ (\forall), $\exists$ (\exists)
- **Arrows**: $\to$ (\to), $\leftarrow$ (\leftarrow), $\leftrightarrow$ (\leftrightarrow), $\Rightarrow$ (\Rightarrow)

### 🏛️ Greek Alphabet
- **Lowercase**: $\alpha, \beta, \gamma, \delta, \epsilon, \zeta, \eta, \theta, \iota, \kappa, \lambda, \mu, \nu, \xi, \pi, \rho, \sigma, \tau, \phi, \chi, \psi, \omega$
- **Uppercase**: $\Gamma, \Delta, \Theta, \Lambda, \Pi, \Sigma, \Phi, \Psi, \Omega$

### 🧪 Complex Structures
- **Radicals**: $\sqrt{x}$ (\sqrt{x}), $\sqrt{x^2 + y^2}$ (\sqrt{x^2 + y^2})
- **Fractions**: $\frac{a}{b}$ (\frac{a}{b}), $\frac{\Delta y}{\Delta x}$ (\frac{\Delta y}{\Delta x})
- **Geometry**: $\deg$ (\deg), $\perp$ (\perp), $\parallel$ (\parallel), $\oplus$ (\oplus), $\otimes$ (\otimes)

---

## 🧪 10. Symbol & Edge-Case Stress Test

Ensuring various keyboard symbols and special encodings don't break the D3 attribute updates:

- **Arrow Symbols**: ← ↑ → ↓ ↔ ↕
- **Currency**: $ £ € ¥ ₹ ₿
- **Indentation Check**:
    - Four spaces: `    `
    - Vertical bars: |
    - Double dashes: -- vs --- (Em-dash)