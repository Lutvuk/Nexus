Project Nexus - UI Wireframes & Visual Specification
Document Control
Version	Date	Status	Author
1.0	2026-02-07	Approved	Perplexity AI
Traceability: Product Brief → PRD → FSD → ERD → API → UI Wireframes → Frontend Implementation			
1. Design System Foundation
1.1 Color Palette (Purple Glassmorphism)
text
Primary:        #8B5CF6  (Violet 500)
Primary Dark:   #7C3AED  (Violet 600)  
Primary Light:  #A78BFA  (Violet 300)
Surface:        rgba(15,15,35,0.95)
Glass:          rgba(255,255,255,0.08)
Glass Border:   rgba(139,92,246,0.3)
Success:        #10B981
Error:          #EF4444
Background:     linear-gradient(135deg, #0F0F23 0%, #1E1B4B 100%)
1.2 Typography Scale
text
Logo:      Space Grotesk Bold 32px / 1.2
H1 Column: Space Grotesk SemiBold 20px / 1.3
H2 Card:   JetBrains Mono Medium 16px / 1.4
Body:      Inter Regular 15px / 1.5
Caption:   Inter Regular 13px / 1.6
1.3 Spacing System (8px grid)
text
xs: 4px    (micro padding)
sm: 8px    (gutters)
md: 16px   (card padding)
lg: 24px   (column gap) 
xl: 32px   (section gap)
2xl: 48px  (hero spacing)
2. Complete Wireframe Specifications
2.1 Desktop Layout (1440px+)
text
┌──────────────────────────────────────────────────────────────┐ ← Viewport
│ 🪐 NEXUS WORKSPACE                             [19:30]       │ ← 64px Navbar
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌─────────────────────┐ ┌─────────────────────┐             │ ← 24px gap
│ │ PLAN (2)            │ │ PROGRESS (1)        │             │ ← Column 340px min
│ │ ┌─────────────────┐ │ ┌─────────────────┐  │             │
│ │ │Design System    │ │ │Backend API      │  │             │ ← Glass cards
│ │ │Purple glass UI  │ │ │Go Gin setup     │  │             │
│ │ └─────────────────┘ │ └─────────────────┘  │             │
│ │ [+ Add Task]        │ [+ Add Task]         │             │
│ └─────────────────────┘ └─────────────────────┘             │
│                                                             │
│ ┌─────────────────────┐                                     │
│ │ COMPLETE (0)        │                                     │
│ │                                              │             │
│ │ [+ Add Task]        │ [+ ADD COLUMN]         │ ← Floating │
│ └─────────────────────┘                           CTA         │
└──────────────────────────────────────────────────────────────┘
2.2 Mobile Layout (375px)
text
┌─────────────────────────────────────┐ ← Full viewport
│ 🪐 NEXUS [≡]                        │ ← Collapsible nav
├─────────────────────────────────────┤
│ ← Horizontal Scroll ─────────────── │
│ ┌─────────────┐ ┌─────────────┐    │
│ │PLAN(2)      │ │PROGRESS(1)  │    │ ← Stack + scroll
│ │[Card1]      │ │[Card1]      │    │
│ │[+]          │ │[+]          │    │
│ └─────────────┘ └─────────────┘    │
│                                    │
│                    [+ ADD COLUMN]  │ ← Sticky bottom
└─────────────────────────────────────┘
3. Component Wireframes
3.1 NexusNavbarComponent (Always Visible)
text
[Left: Orbit Logo "NEXUS"]                           [Right: Time 19:30]
Height: 64px
Background: rgba(15,15,35,0.98) backdrop-blur-md
Box-shadow: 0 -2px 20px rgba(139,92,246,0.1)
3.2 NexusColumnComponent (Draggable Header)
text
┌─────────────────────────────────────────────┐ ← 340px × auto
│ Plan                       (2 cards) [✏️]   │ ← Header 48px
├─────────────────────────────────────────────┤
│                                             │
│ ┌─────────────────────────────────────┐    │ ← Card gap 12px
│ │ 🪐 Design glassmorphism system      │    │ ← Card 72px height
│ │ Purple #8B5CF6 theme implementation │    │
│ │ 10 Feb • pos 0                      │    │
│ └─────────────────────────────────────┘    │
│ ┌─────────────────────────────────────┐    │
│ │ 🪐 Setup Angular CDK drag-drop      │    │
│ │ Connected lists configuration      │    │
│ │ 10 Feb • pos 1                     │    │
│ └─────────────────────────────────────┘    │
│                                             │
│ [+ Add Task]                                │ ← Bottom CTA 40px
└─────────────────────────────────────────────┘
Column Header Interactions:

Hover → Purple glow border

Click ✏️ → Inline rename input

Drag header → Column reorder (future)

3.3 NexusCardComponent (Draggable)
text
┌─────────────────────────────────────────────┐ ← 320px × 72px
│ 🪐 Design glassmorphism system              │ ← Title 16px JetBrains Mono
│ Purple #8B5CF6 theme implementation         │ ← Desc 15px Inter
│                                             │
│ 10 Feb 2026 • position 0  [✏️][🗑️]         │ ← Footer 13px
└─────────────────────────────────────────────┘

Glassmorphism:
• Background: rgba(255,255,255,0.08)
• Backdrop-filter: blur(20px)
• Border: 1px solid rgba(139,92,246,0.3)
• Box-shadow: 0 8px 32px rgba(0,0,0,0.4)
Card States:

text
Default:    Subtle glass
Hover:      Purple border glow + scale(1.02)
Dragging:   Ghost opacity 0.8 + gold trail
Drop Zone:  Target column purple highlight
3.4 AddColumnModalComponent
text
┌─────────────────────────────────────────────┐ ← Centered overlay
│                                            │
│           [+ ADD COLUMN]                   │ ← Purple gradient button
│                                            │
│  ┌─────────────────────────────────────┐  │ ← Glass modal 400px
│  │ Column Name                        │  │
│  │ ┌───────────────────────────────┐  │  │
│  │ │Design System Review           │  │  │ ← Input focus purple
│  │ └───────────────────────────────┘  │  │
│  │                                     │  │
│  │ [Cancel]          [Create Column]   │  │
│  └─────────────────────────────────────┘  │
│                                            │
└─────────────────────────────────────────────┘
4. State & Interaction Wireframes
4.1 Loading State (Skeleton)
text
Column skeleton:
┌─────────────────────────────────────────────┐
│ Plan                          ▱▱▱▱▱        │ ← Shimmer lines
├─────────────────────────────────────────────┤
│ ┌──────────────────────────────┐           │
│ │ ▱▱▱▱▱▱▱▱▱▱▱▱               │           │ ← Purple shimmer
│ │ ▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱  │           │
│ └──────────────────────────────┘           │
└─────────────────────────────────────────────┘
4.2 Empty State
text
┌─────────────────────────────────────────────┐
│ Complete (0)                                │
│                                             │
│    ✨ No completed tasks                    │ ← Centered purple text
│        yet! Drop cards here                 │
│                                             │
│              👇                             │ ← Arrow icon
└─────────────────────────────────────────────┘
4.3 Error Toast (Bottom Right)
text
┌─────────────────────────────────────────────┐ ← 320px × 64px
│ ❌ Network error                           │ ← Purple glass toast
│ Connection lost, retrying...                │
│                                             │
│                       [RETRY]               │
└─────────────────────────────────────────────┘
Animation: Slide up + fade 4s → Auto dismiss
5. Responsive Breakpoints
Screen	Columns	Behavior
320px+ Mobile	Stack vertical	Horizontal scroll board
768px Tablet	2 columns	Side-by-side + gap 16px
1024px Desktop	3+ columns	Full flex layout
1440px+	Fluid	Max 4 columns visible
Mobile Touch Targets: 48px min (Add buttons, drag handles)

6. Animation Specifications
6.1 Drag-Drop Timeline (300ms total)
text
0ms:     cdkDragStarted → card scale(0.95) + opacity(0.8)
50ms:    Ghost element created (pointer follows)
250ms:   Drop → target column purple glow + ripple
300ms:   Cards reorder smooth + success pulse
6.2 Add Card Animation
text
Input Enter → New card slides up from bottom (200ms ease-out)
→ Purple sparkle particles (3 particles)
→ List re-positions smoothly
7. Accessibility Wireframes
Keyboard Navigation
text
Tab → Column headers (focus purple outline)
Tab → Cards (focus ring)
↑↓ → Navigate cards in column
←→ → Switch columns
Enter → Edit inline
Esc → Cancel edit
Screen Reader
text
Column: "Plan column, 2 cards, Add task button"
Card: "Design glassmorphism UI card, position 0, Edit Delete"
8. Asset Requirements
text
Fonts (Google):
• Space Grotesk (logo/headers)
• JetBrains Mono (card titles) 
• Inter (body)

Icons:
• Orbit logo SVG (custom)
• + (add) → Lucide React purple
• ✏️ 🗑️ → Lucide glassmorphism

Gradients:
• Navbar → #8B5CF6 → #A78BFA
• Buttons → #8B5CF6 radial
Implementation Notes
text
✅ Angular CDK DragDrop → Exact wireframe behavior
✅ TailwindCSS + custom glassmorphism → Visual perfect
✅ Framer Motion → Smooth 60fps animations
✅ Responsive → Mobile-first breakpoints

CSS Variables → Theme switch ready (future dark mode toggle)
Status: Frontend Ready for Development
Next: Design System → Day 2 Angular Implementation

Project Nexus UI Wireframes v1.0 - Visual Perfection