---
version: "alpha"
name: Lernio Design System
description: Educational Learning Management System UI Language
colors:
  primary: "#3b82f6"
  primary-dark: "#0d47a1"
  primary-container: "#dbeafe"
  secondary: "#9353d3"
  secondary-container: "#faf5ff"
  secondary-border: "#d8b4fe"
  success: "#137333"
  success-container: "#e6f4ea"
  success-border: "#ceead6"
  danger: "#c5221f"
  danger-container: "#fce8e6"
  danger-border: "#fad2cf"
  background: "#f8f9fa"
  surface: "#ffffff"
  border: "#e8eaed"
  border-hover: "#c4c7cc"
  border-focus: "#dadce0"
  text-primary: "#202124"
  text-secondary: "#5f6368"
  text-muted: "#9aa0a6"
typography:
  font-sans:
    fontFamily: Inter, sans-serif
  h1:
    fontFamily: "{typography.font-sans.fontFamily}"
    fontSize: 1.875rem
    fontWeight: 500
    letterSpacing: "-0.015em"
  h2:
    fontFamily: "{typography.font-sans.fontFamily}"
    fontSize: 1.5rem
    fontWeight: 500
  body:
    fontFamily: "{typography.font-sans.fontFamily}"
    fontSize: 0.875rem
    fontWeight: 400
  label:
    fontFamily: "{typography.font-sans.fontFamily}"
    fontSize: 0.75rem
    fontWeight: 500
  caption:
    fontFamily: "{typography.font-sans.fontFamily}"
    fontSize: 0.6875rem
    fontWeight: 600
    letterSpacing: "0.1em"
rounded:
  sm: 0.25rem
  md: 0.5rem
  lg: 0.75rem
  xl: 1rem
  full: 9999px
spacing:
  xs: 0.375rem
  sm: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  xxl: 2rem
components:
  modal-surface:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
---

## Overview

Lernio is a modern Educational Learning Management System tailored for secure, closed-ecosystem educational video hosting. The UI exudes a crisp, distraction-free environment that balances approachability for students and dense information architecture for staff. We leverage HeroUI blended with custom Tailwind components.

## Colors

The palette embraces a very clean, low-noise aesthetic with high-contrast foregrounds on subtle backgrounds.

- **Primary (#3b82f6):** The principal brand and interactive action color. Gradients often pair this with a deeper ink (#0d47a1) for branded moments.
- **Secondary (#9353d3):** Used mostly as a subtle distinguisher for custom features (like "Custom Access" modes), paired with purple-tinted backgrounds.
- **Success / Danger:** Semantic feedback colors use high-saturation foregrounds against low-saturation pastel backgrounds (e.g., `#c5221f` text on `#fce8e6` container).
- **Surfaces & Borders:** Neutral greys lean slightly cool. The app canvas is `#f8f9fa`, raising pristine `#ffffff` surface cards framed by faint `#e8eaed` borders.

## Typography

Typography focuses heavily on legibility and clear hierarchies using the 'Inter' sans-serif family.

- **Headings:** Tracked slightly tight (`-0.015em`), usually running at medium font weight.
- **Body & Labels:** Standard sans-serif at `14px` (`text-sm`) for content and `12px` (`text-xs`) for dense input labels (`#5f6368`).
- **Captions:** Tiny `11px` highly tracked uppercase strings exist for section dividers or tertiary metadata.

## Layout

Lernio layouts are composed around centered canvas cards (for auth), or spacious modal dialogs on top of backdrop-blurred overlays.
Spacing tokens emphasize an 8px (`0.5rem`) multiplier for padding and margin. Dense informational components (like form clusters) tighten up to 6px (`0.375rem`).

## Elevation & Depth

Deep shadows are used sparingly but effectively to pull important interactive zones forward.

- Modals utilize a large, soft `shadow-2xl` coupled with a subtle `ring-1 ring-black/10` to detach firmly from the backdrop.
- Auth screens and primary floating components use an expansive, slightly hard-edged Google-style shadow: `[0_1px_2px_0_rgba(60,64,67,0.3),0_2px_6px_2px_rgba(60,64,67,0.15)]`.
- The Navigation loader bar brings a glowing `box-shadow` of primary blue to signify loading without cluttering the screen real estate.

## Shapes

Corners are mostly heavily rounded to keep the UI feeling modern and approachable.

- Standard inputs and basic buttons: **8px (`rounded-md/lg`)**.
- Modal dialogs, primary cards: **16px (`rounded-xl/2xl`)**.
- Nav items and icons: **Pill/Fully rounded (`rounded-full`)**.

## Components

Lernio blends `@heroui` atomic parts with rich custom components. 

### Modals
Modals consist of a heavy backdrop (`bg-black/40 backdrop-blur-sm`), centering a `rounded-2xl` canvas. Headers often sport a lush blue gradient background, contrasting the stark white form content below.

### Forms & Inputs
Forms use floating outlines or simple borders (`border-[#dadce0]`) that activate (`focus:ring-2 focus:ring-blue-500/20`) on interaction.

### Feedback
Alerts and read-only status indicators employ a unified "Pill/Banner" styling: A very light background, a 1px border matching the tint, and dark readable text of the matching hue.

## Do's and Don'ts

- **Do** use `bg-black/40 backdrop-blur-sm` for overlay dialogs to retain context without distraction.
- **Do** use `text-[#5f6368]` for standard form labels to ensure they do not overpower the input values themselves.
- **Don't** use fully saturated primary backgrounds on large areas; restrict strong primary blocks to headers or important primary buttons.
- **Don't** mix border radiuses aggressively. Maintain `rounded-lg` for inputs and `rounded-2xl` for the modal container itself.
