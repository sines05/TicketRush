# Design System: TicketRush
**Project ID:** local-ticketrush-frontend

## 1. Visual Theme & Atmosphere
The TicketRush interface embodies a modern, premium, and "glassmorphic" aesthetic. The atmosphere is airy and cinematic in light mode ("Ocean Breeze"), and deep, atmospheric, and highly saturated in dark mode ("Dark Amethyst"). It breaks away from generic flat digital designs by utilizing layered glass panes, subtle ambient radial background gradients to provide environmental depth, and staggered entry motion with spring physics to feel tactile and alive.

## 2. Color Palette & Roles

### Ocean Breeze (Light Mode)
* **Ice Off-White** (`#F4F7FA`): Used for the primary app background. Provides a clean, breathable canvas.
* **Charcoal Off-Black** (`#191C24`): Used for primary text and high-contrast foreground elements. Prevents the harshness of pure black.
* **Tropic Wave** (`#169BA6`): Used for primary actions, active states, and focus rings. Highly saturated but kept below 80% to remain elegant.
* **Ocean Blue** (`#42BAD1`): Used for secondary actions, ambient background gradients, and accents.
* **Tide Mint** (`#94C8BD`): Used for tertiary accents, hover states, and gradient blends.
* **Slate Gray** (`#64748B`): Used for muted text, placeholders, and secondary labels, ensuring WCAG AA contrast against the light background.

### Dark Amethyst (Dark Mode)
* **Deep Off-Black Purple** (`#140E1B`): Used for the primary app background. Creates a rich, cinematic dark environment.
* **Soft White** (`#FFEFF0`): Used for primary text, offering high readability without glaring contrast.
* **Muted Teal** (`#9BCDAE`): Used for primary buttons and active indicators in dark mode.
* **Pacific Cyan** (`#3E8B99`): Used for secondary buttons and ambient dark-mode gradients.
* **Powder Blush** (`#F0AAB0`): Used for error states, destructive actions, or warm gradient accents.

## 3. Typography Rules
* **Font Family:** A modern geometric sans-serif (e.g., Geist or Inter) with stylistic ligatures and contextual alternates enabled (`font-feature-settings: "rlig" 1, "calt" 1`).
* **Headers (h1-h6):** Weighted heavily (SemiBold 600 to Bold 700) with tight letter-spacing (`tracking-tight`) to feel deliberate and grounded. Text wrapping is optimized using `text-balance`.
* **Body:** Clean and highly legible, using Regular (400) for standard paragraphs and Medium (500) for subtle emphasis. Tabular numbers are used in data-heavy contexts (like pricing and seat numbers).

## 4. Component Stylings
* **Buttons:** Subtly rounded corners (`border-radius: 0.75rem`). They feature GPU-accelerated hover effects, lifting slightly (`translate-y: -1px`) while expanding their tinted drop shadow. All state changes use smooth, 300ms transitions.
* **Cards/Containers:** True glassmorphism. Containers use a translucent background (`backdrop-filter: blur(12px) saturate(180%)`) with a 1px inner border (`border: 1px solid hsl(var(--tr-glass-border))`). Depth is achieved not with black shadows, but with deeply tinted, diffused shadows (e.g., `rgb(0 150 165 / 0.12)`) and inset background highlights.
* **Inputs/Forms:** Defined by a 1px solid border with subtly rounded corners matching the cards. When focused, they emit a crisp, solid ring in the primary Tropic Wave color to ensure accessibility and clear active state feedback.

## 5. Layout Principles
* **Whitespace & Grids:** The layout breathes through generous negative space, avoiding dense, utilitarian dashboard aesthetics. Content is constrained by max-width containers (1200px-1440px) to prevent over-stretching on large displays.
* **Environmental Backgrounds:** Pure flat backgrounds are avoided. The root body utilizes 3-4 large-scale radial gradients (1000px+ circles at 12-15% opacity) pinned to different screen coordinates to create an ambient, textured environment.
* **Motion & Reveal:** Components never appear instantly. The layout leverages staggered entry animations (`animate-fade-in-up`, `animate-scale-in`) so that cards, headers, and grids cascade into view naturally upon mount.
