# Design System Specification: The Precision Archive

## 1. Overview & Creative North Star
**Creative North Star: The Precision Archive**

This design system is built on the philosophy of "Informed Minimalism." While the initial impulse for a clean, Notion-like interface is often to rely on grids and boxes, this system moves beyond the template. We are creating a digital environment that feels like a high-end architectural portfolio or a premium scientific journal. 

The "Precision Archive" breaks the generic "SaaS look" through **intentional asymmetry** and **tonal depth**. We achieve a premium feel not through decoration, but through the rigorous application of white space (negative space as a structural element) and a sophisticated typographic scale. We aren't just displaying data; we are curating evidence.

---

## 2. Colors & Surface Philosophy

### The Palette
We utilize a sophisticated range of neutrals to define "zones" of information without cluttering the user's cognitive load.
- **Primary (`#0053db`):** Our "Action Signal." Reserved strictly for primary intent and focus states.
- **Surface Tiers:** These are the backbone of the system. We move from `surface_container_lowest` (pure white) to `surface_dim` to create a sense of physical layering.

### The "No-Line" Rule
Standard UI relies on 1px borders to separate content. **In this system, explicit borders for sectioning are prohibited.** Boundaries must be defined through background color shifts. 
- *Example:* A side navigation bar should use `surface_container_low`, while the main content area uses `surface`. The "line" is created by the change in hex code, not a stroke. This creates a seamless, "infinite" feel.

### Surface Hierarchy & Nesting
Treat the UI as a series of stacked sheets of fine paper. 
- **Base Layer:** `surface` (#f8f9fa).
- **Sectioning:** Use `surface_container_low` for large background blocks.
- **Interactive Cards:** Use `surface_container_lowest` (#ffffff) to make elements "pop" forward naturally.

### The Glass & Gradient Rule
To prevent the design from feeling "flat" or "cheap," use Glassmorphism for floating elements (modals, dropdowns, floating headers). Use `surface` at 80% opacity with a `20px` backdrop-blur. 
For primary CTAs, apply a subtle linear gradient from `primary` (#0053db) to `primary_dim` (#0048c1) at a 135-degree angle. This adds a "weighted" feel to the button that a flat color cannot achieve.

---

## 3. Typography: Editorial Authority

The choice of **Inter** is a commitment to clarity. Our hierarchy is designed to guide the eye through "Information Scaffolding."

- **Display & Headline:** Use `display-md` (2.75rem) for high-impact entry points. Pair this with a `tight` letter-spacing (-0.02em) to give it a modern, editorial "bite."
- **Title & Body:** Use `title-md` for section headers. Ensure `body-lg` is used for primary reading to maintain an "evidence-based" authoritative feel.
- **Tonal Contrast:** Use `on_surface_variant` (#586064) for labels and secondary metadata. The slight reduction in contrast against the `on_surface` text creates an immediate visual hierarchy that feels professional rather than overwhelming.

---

## 4. Elevation & Depth: Tonal Layering

We avoid traditional "drop shadows" that look like 2010-era software. Depth is achieved through light and layering.

- **The Layering Principle:** Instead of a shadow, place a `surface_container_lowest` card on a `surface_container_low` background. The subtle 2-bit difference in brightness provides a "soft lift."
- **Ambient Shadows:** When a floating state is required (e.g., a dragged item or a modal), use a shadow with a high blur (32px) and very low opacity (4%). The shadow color should be tinted with `on_surface` (#2b3437) to mimic natural light refraction.
- **The "Ghost Border" Fallback:** If a container requires a border for accessibility (e.g., input fields), use the `outline_variant` token at **20% opacity**. It should be felt, not seen. 100% opaque borders are strictly forbidden.

---

## 5. Components

### Buttons
- **Primary:** Gradient fill (`primary` to `primary_dim`), `md` (0.375rem) corner radius. Use `label-md` for button text, transformed to medium weight.
- **Secondary:** `surface_container_high` background with `on_surface` text. No border.
- **Tertiary:** No background. `primary` text color. Use only for low-priority actions like "Cancel."

### Cards & Lists
- **Prohibition:** Do not use horizontal divider lines (`<hr>`). 
- **The Alternative:** Use vertical white space from the Spacing Scale (specifically `spacing-6` or `spacing-8`) to separate list items. If separation is visually required, use a subtle background shift to `surface_container_low` on hover.

### Input Fields
- **Default:** `surface_container_lowest` background with a 1px "Ghost Border" (`outline_variant` @ 20%).
- **Focus:** Transition the border to 100% opacity `primary` and add a 3px outer "halo" of `primary_fixed_dim` at 30% opacity.

### Chips
- Use `secondary_container` for background and `on_secondary_container` for text. Keep the radius at `full` for a distinct "pill" shape that contrasts against the `md` radius of cards.

---

## 6. Do’s and Don’ts

### Do:
- **Use "Aggressive" Whitespace:** If you think there is enough space between sections, double it. Space is the luxury of this design system.
- **Nesting Tiers:** Place `surface_container_high` elements inside `surface_container_low` areas to create "wells" of information.
- **Focus on Alignment:** Use a strict 8pt grid (referencing our Spacing Scale) to ensure every element feels mathematically placed.

### Don’t:
- **Don't use pure Black:** Always use `on_surface` (#2b3437) for text to maintain a premium, "ink-on-paper" feel.
- **Don't use Dividers:** If you feel the need to draw a line, try adding `16px` of padding instead. 
- **Don't Over-decorate:** Avoid icons unless they serve a functional purpose. Let the typography do the work.
- **No Sharp Corners:** Avoid `none` (0px) rounding. Everything should have at least the `DEFAULT` (0.25rem) or `md` (0.375rem) radius to feel approachable and modern.
