Project Nexus - Design System Specification
Document Control
Version	Date	Status	Author
1.0	2026-02-07	Approved	Perplexity AI
Traceability: Product Brief → PRD → FSD → ERD → API → Wireframes → Design System → CSS Implementation			
1. Design Philosophy
"Cosmic Elegance" – Purple glassmorphism yang sophisticated, smooth animations, premium feel. Kombinasi deep space backgrounds + glowing glass elements + subtle purple interactions.

text
Mood: Futuristic confidence
Voice: Professional minimalism
Motion: Organic fluid 60fps
2. Color System (CSS Variables)
2.1 Core Palette
text
--violet-50:  #F5F3FF
--violet-500: #8B5CF6  /* Primary */
--violet-600: #7C3AED  
--violet-700: #6D28D9

--space-bg-start: #0F0F23
--space-bg-end:   #1E1B4B

--glass-bg:          rgba(255,255,255,0.08)
--glass-border:      rgba(139,92,246,0.3)
--glass-shadow:      rgba(0,0,0,0.4)

--success:   #10B981
--warning:   #F59E0B
--error:     #EF4444
--text-100:  #F8FAFC  /* Primary text */
--text-500:  #94A3B8  /* Secondary */
2.2 Gradients
text
--gradient-navbar: linear-gradient(90deg, var(--violet-600), var(--violet-500))
--gradient-space: linear-gradient(135deg, var(--space-bg-start) 0%, var(--space-bg-end) 100%)
--gradient-button: radial-gradient(circle at center, var(--violet-500), var(--violet-700))
2.3 Shadows & Glows
text
--shadow-glass: 0 8px 32px var(--glass-shadow)
--shadow-glow: 0 0 20px rgba(139,92,246,0.4)
--shadow-elevated: 0 20px 40px rgba(0,0,0,0.3)
3. Typography System
3.1 Font Stack (Google Fonts)
css
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Inter:wght@400;500&display=swap');
3.2 Type Scale
text
:root {
  --font-space-grotesk: 'Space Grotesk', sans-serif;
  --font-jetbrains: 'JetBrains Mono', monospace; 
  --font-inter: 'Inter', sans-serif;
}

.logo { font-family: var(--font-space-grotesk); font-weight: 700; font-size: clamp(24px,5vw,32px); }
.h1 { font-family: var(--font-space-grotesk); font-weight: 600; font-size: clamp(20px,4vw,24px); line-height: 1.3; }
.h2-card-title { font-family: var(--font-jetbrains); font-weight: 500; font-size: 16px; line-height: 1.4; }
.body { font-family: var(--font-inter); font-weight: 400; font-size: 15px; line-height: 1.5; }
.caption { font-family: var(--font-inter); font-weight: 400; font-size: 13px; line-height: 1.6; }
4. Spacing & Layout System (8pt Grid)
text
--spacing-xs: 4px;    /* Micro */
--spacing-sm: 8px;    /* Default gap */
--spacing-md: 16px;   /* Card padding */
--spacing-lg: 24px;   /* Column gap */
--spacing-xl: 32px;   /* Section */
--spacing-2xl: 48px;  /* Hero */

CSS Grid utility:
.nexus-grid { display: grid; gap: var(--spacing-lg); }
5. Component Library
5.1 NexusCard (Glassmorphism Masterpiece)
css
.nexus-card {
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  padding: var(--spacing-md) var(--spacing-lg);
  margin-bottom: var(--spacing-sm);
  box-shadow: var(--shadow-glass);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  /* Hover */
  &:hover {
    transform: translateY(-2px) scale(1.02);
    box-shadow: var(--shadow-glow), var(--shadow-elevated);
    border-color: #8B5CF6;
  }
  
  /* Dragging */
  &.cdk-drag-preview {
    opacity: 0.8;
    box-shadow: var(--shadow-glow);
  }
}
5.2 NexusColumn
css
.nexus-column {
  min-width: 340px;
  background: rgba(30,27,75,0.6);
  border-radius: 24px;
  padding: var(--spacing-xl);
  margin-right: var(--spacing-lg);
  
  /* Left gradient accent */
  border-left: 4px solid transparent;
  background-image: linear-gradient(90deg, transparent, transparent),
                    linear-gradient(to right, #8B5CF6, #A78BFA);
  background-size: 4px 100%, 100% 100%;
  background-position: left, left;
  background-repeat: no-repeat;
}
5.3 NexusButton Variants
css
/* Primary (Add Column/Task) */
.btn-primary {
  background: var(--gradient-button);
  border: none;
  border-radius: 50%;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-glow);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(139,92,246,0.4); }
  50% { box-shadow: 0 0 0 12px rgba(139,92,246,0); }
}

/* Secondary (Edit/Delete) */
.btn-secondary {
  background: rgba(255,255,255,0.1);
  border: 1px solid var(--glass-border);
  color: var(--text-100);
  padding: 8px 16px;
  border-radius: 8px;
  backdrop-filter: blur(10px);
}
6. Layout Components
6.1 Global Layout
css
:root {
  --navbar-height: 64px;
  --column-min-width: 340px;
  --max-columns-visible: 4;
}

body {
  background: var(--gradient-space);
  min-height: 100vh;
  font-family: var(--font-inter);
  color: var(--text-100);
  overflow-x: auto;
}

#app-container {
  min-height: calc(100vh - var(--navbar-height));
  padding: var(--spacing-2xl);
  display: flex;
  flex-direction: column;
}
6.2 Navbar
css
.nexus-navbar {
  height: var(--navbar-height);
  background: rgba(15,15,35,0.98);
  backdrop-filter: blur(20px);
  box-shadow: 0 -2px 20px rgba(139,92,246,0.1);
  padding: 0 var(--spacing-xl);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
6.3 Board Container
css
.nexus-board {
  display: flex;
  gap: var(--spacing-lg);
  padding: var(--spacing-xl) 0;
  overflow-x: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(139,92,246,0.3) transparent;
}
7. Animation System
7.1 CSS Transitions (Angular CDK Compatible)
css
/* Universal smooth */
* {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Drag preview */
.cdk-drag-preview {
  --webkit-box-shadow: var(--shadow-glow);
  box-shadow: var(--shadow-glow);
  animation: dragFloat 0.2s ease-out;
}

/* Success ripple */
@keyframes ripple {
  0% { transform: scale(0); opacity: 1; }
  100% { transform: scale(2); opacity: 0; }
}

.ripple-success::after {
  content: '';
  position: absolute;
  top: 50%; left: 50%;
  width: 0; height: 0;
  background: rgba(139,92,246,0.4);
  border-radius: 50%;
  animation: ripple 0.6s linear;
}
8. Responsive Design Tokens
text
--container-padding-mobile: 16px;
--container-padding-tablet: 24px; 
--container-padding-desktop: 32px;

@media (max-width: 768px) {
  :root {
    --column-min-width: 280px;
    --spacing-lg: 16px;
  }
}
9. TailwindCSS Configuration (Ready Copy)
js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        violet: {
          50: '#F5F3FF',
          500: '#8B5CF6',
          600: '#7C3AED'
        }
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.2, 1) infinite',
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
  ]
}
10. CSS Custom Properties Complete
css
:root {
  /* Colors */
  --violet-500: #8B5CF6;
  --space-bg-start: #0F0F23;
  
  /* Spacing */
  --spacing-xs: 4px;
  --spacing-lg: 24px;
  
  /* Components */
  --navbar-height: 64px;
  --glass-bg: rgba(255,255,255,0.08);
  
  /* Typography */
  --font-space-grotesk: 'Space Grotesk', sans-serif;
}
Implementation Checklist
text
✅ [ ] Install Google Fonts (Space Grotesk, JetBrains Mono, Inter)
✅ [ ] TailwindCSS + custom config  
✅ [ ] CSS variables global
✅ [ ] Glassmorphism utility classes
✅ [ ] Animation keyframes
✅ [ ] Responsive breakpoints
✅ [ ] Dark mode ready (CSS vars)
Status: CSS-in-JS Ready for Angular
Next: Day 2 Frontend → Perfect Visual Implementation

Project Nexus Design System v1.0 - Cosmic Perfection