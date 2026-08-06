# Lernio UI Examples & Documentation

This directory contains standalone, isolated React components (`.tsx`) that demonstrate how the UI elements in the Lernio codebase reflect the rules laid out in the `DESIGN.md` specification. These examples act as reference points to quickly understand styling paradigms.

### Files Included:

#### Modals & Interactive Elements
- **`ExampleDeleteModal.tsx`**: Demonstrates the semantic "Danger" styling, using the exact `#c5221f` foregrounds and `#fce8e6` backgrounds. It illustrates the `rounded-2xl` modal surface with `backdrop-blur-sm` overlay.
- **`ExamplePrimaryModal.tsx`**: Demonstrates the branded "Primary" gradient modal headers (shifting from `blue-500` to a deep ink `#0d47a1`), typical form cluster spacing (`gap-4`), and crisp border states (`#dadce0` to `#c4c7cc` on hover).
- **`ExampleButtons.tsx`**: Demonstrates custom pill-shaped inline actions (`CopyButton` style) versus standard HeroUI structured buttons, abiding by our spacing and corner-rounding tokens.

#### Dashboard Components
- **`ExampleStatusBadges.tsx`**: Demonstrates how to map semantic colors (`red-50` background + `red-600` text) to a pill shape (`rounded-full`) and small bold typography (`text-[10px] font-semibold`) for status indicators.
- **`ExampleStatCard.tsx`**: Demonstrates how to construct the typical Lernio surface card—a crisp `#ffffff` background with `rounded-2xl` corners, using the specific Google-style expansive box shadow to lift it off the `#f8f9fa` canvas.
- **`ExampleEmptyState.tsx`**: Demonstrates how to create a centered layout with "glowing" blurred background icons (using `blur-xl opacity-60 scale-125`), and how to format decorative instruction cards with tracked uppercase captions (`tracking-widest`).

### How to use this:
These are purely instructional templates. Any coding agent or developer can review these files to understand precisely how to construct a new modal, button, form cluster, or layout component in this project without making structural or aesthetic mistakes.
