# Nexus Design System
## "Cosmic Glass"

| Metadata | Details |
| :--- | :--- |
| **Version** | 1.0 |
| **Theme** | Dark / Space / Glassmorphism |
| **Frameworks** | TailwindCSS, Angular 18 |

---

## 1. Principles

1.  **Depth over Flatness**: Use backdrop blur, layering, and shadows to create specialized depth (z-index) that mimics a workspace on a desk floating in space.
2.  **Content-First**: high contrast text on semi-transparent backgrounds.
3.  **Physics-Based**: Interactions (drag, hover) should feel weighted and smooth.

---

## 2. Design Tokens

### Colors (Palette)

| Token | Value | Hex/RGBA | Usage |
| :--- | :--- | :--- | :--- |
| `bg-dark` | Slate 900 | `#0F172A` | Global Page Background |
| `primary` | Violet 500 | `#8B5CF6` | Action Buttons, Active States, Hovers |
| `glass-bg` | White 8% | `rgba(255, 255, 255, 0.08)` | Cards, Panels, Sidebars |
| `glass-border` | White 10% | `rgba(255, 255, 255, 0.1)` | Borders for Glass Elements |
| `text-main` | White | `#FFFFFF` | Primary Text |
| `text-muted` | Slate 400 | `#94A3B8` | Secondary Text, Meta-data |

### Typography

| Family | Font | Usage |
| :--- | :--- | :--- |
| **Headings** | `Space Grotesk` | Page titles, Board headers (Modern, geometric) |
| **Body** | `Inter` | UI controls, Card descriptions (Legible, neutral) |
| **Code** | `JetBrains Mono` | Snippets, IDs, Technical data |

### Effects & Motion

| Effect | CSS Class | Value |
| :--- | :--- | :--- |
| **Glass Panel** | `.nexus-glass` | `backdrop-blur-xl bg-white/5 border-white/10` |
| **Hover Lift** | `.hover-lift` | `transform: translateY(-2px); shadow-lg` |
| **Focus Ring** | `.focus-ring` | `ring-2 ring-violet-500 ring-offset-2 ring-offset-[#0F172A]` |

---

## 3. Core Components

### The "Nexus Card" (`.nexus-card`)
The fundamental unit of the interface.

```css
.nexus-card {
    background: var(--glass-bg);
    backdrop-filter: blur(12px);
    border: 1px solid var(--glass-border);
    border-radius: 0.75rem; /* 12px */
    transition: all 0.2s ease-in-out;
}
.nexus-card:hover {
    background: rgba(255, 255, 255, 0.12);
    box-shadow: 0 4px 30px rgba(139, 92, 246, 0.15); /* Violet Glow */
    transform: translateY(-2px);
}
```

### Buttons

**Primary Button**
```html
<button class="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg shadow-lg shadow-violet-500/20 transition-all">
  Create Board
</button>
```

**Glass Button (Secondary)**
```html
<button class="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg backdrop-blur-sm transition-all">
  Cancel
</button>
```

### Inputs & Forms
```html
<input type="text" class="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500">
```

---

## 4. Layout Patterns

### Dashboard Grid
A responsive grid for board tiles.
```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
  <!-- Board Cards -->
</div>
```

### Kanban Board
Horizontal scrolling container with snap points.
```html
<div class="flex h-full overflow-x-auto gap-6 p-6 snap-x snap-mandatory">
  <!-- Columns -->
  <div class="w-80 flex-shrink-0 snap-center">...</div>
</div>
```

---

## 5. Accessibility (A11y)
- **Focus Indicators**: All interactive elements must have a visible `focus-ring` (Violet 500).
- **Contrast**: Text on glass backgrounds must maintain WCAG AA (4.5:1) contrast.
- **Motion**: Reduce motion for `prefers-reduced-motion` media query.

---

## 6. Iconography
Using **Lucide Angular** or **Material Symbols** (Rounded).
- Stroke width: `2px` (matches Inter font weight).
- Size: `16px` (sm), `20px` (md), `24px` (lg).

---
*End of Design System*
