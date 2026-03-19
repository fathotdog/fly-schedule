# Design System Strategy: The Academic Architect

## 1. Overview & Creative North Star
The "Academic Architect" is our creative North Star. In a world of cluttered, spreadsheet-heavy scheduling tools, this design system brings the precision of an architectural blueprint and the legibility of a high-end editorial journal. 

We reject the "boxed-in" feeling of traditional enterprise software. Instead, we use **Tonal Depth** and **Intentional Asymmetry** to guide the educator’s eye. The system feels authoritative yet breathable, replacing rigid grid lines with sophisticated spatial relationships. By utilizing high-contrast typography scales and layered surfaces, we transform complex data into a navigable, premium landscape.

---

## 2. Colors: The Depth Palette
Our color strategy moves away from "flat" UI. We use a sophisticated range of blues and slates to establish trust, while leveraging Material Design's container tiers to create a sense of physical layering.

### The "No-Line" Rule
**Strict Mandate:** Designers are prohibited from using 1px solid borders for sectioning. 
Structure must be defined through:
1.  **Background Color Shifts:** A `surface-container-low` section sitting on a `background` surface.
2.  **Tonal Transitions:** Using the `surface-container` tiers (Lowest to Highest) to denote nested importance.

### Surface Hierarchy & Nesting
Treat the UI as a series of stacked sheets of fine paper or frosted glass:
*   **Base Layer:** `surface` (#f7f9fb) for the main application canvas.
*   **Secondary Workspaces:** `surface-container-low` (#f2f4f6) for sidebar or secondary navigation areas.
*   **Active Content Cards:** `surface-container-lowest` (#ffffff) to provide a crisp, elevated "pop" for the most critical data.
*   **Modals/Overlays:** `surface-container-high` (#e6e8ea) to create a distinct visual break.

### The "Glass & Gradient" Rule
To elevate the experience, floating elements (like course drag-previews) should utilize **Glassmorphism**: 
*   **Effect:** Apply `surface-variant` at 80% opacity with a `20px` backdrop-blur.
*   **Signature Gradients:** For primary CTAs (e.g., "Publish Schedule"), use a subtle linear gradient from `primary` (#002c98) to `primary-container` (#1a43bf) at a 135° angle to add visual "soul."

---

## 3. Typography: Editorial Authority
We pair the structural strength of **Manrope** for high-level data with the hyper-legibility of **Inter** for dense scheduling information.

*   **Display & Headlines (Manrope):** Used for page titles and high-level stats. The generous x-height of Manrope conveys modern professionalism. Use `headline-lg` (2rem) for dashboard headers to establish immediate hierarchy.
*   **Body & Labels (Inter):** Used for the "heavy lifting." `body-md` (0.875rem) is the workhorse for table data.
*   **Tonal Contrast:** Always pair `on-surface` (#191c1e) for primary text with `on-surface-variant` (#444654) for metadata (e.g., "Course ID" or "Instructor Name") to create depth without adding more lines.

---

## 4. Elevation & Depth: Tonal Layering
Traditional shadows are often too "dirty" for a clean academic system. We prioritize **Tonal Layering** over drop shadows.

### The Layering Principle
To create a "lifted" card:
*   Place a `surface-container-lowest` (#ffffff) card on a `surface-container-low` (#f2f4f6) background. This creates a soft, natural edge.

### Ambient Shadows
If an element must float (e.g., a dragged course card):
*   **Value:** `0px 12px 32px`
*   **Color:** `on-surface` at 6% opacity. This mimics natural light rather than a harsh digital shadow.

### The "Ghost Border" Fallback
If contrast ratios require a boundary (e.g., in high-density tables):
*   Use a **Ghost Border**: `outline-variant` (#c4c5d6) at 15% opacity. Never use 100% opaque borders.

---

## 5. Components: Precision Primitives

### Course Cards (Drag-and-Drop)
*   **Style:** No borders. Use `surface-container-lowest` for the card background.
*   **Radius:** `lg` (0.5rem).
*   **Interactivity:** On "grab," transition to a Glassmorphic state (80% opacity + blur) and apply a `primary` (#002c98) `sm` (0.125rem) left-accent bar to indicate selection.

### Data Tables & Timetables
*   **Rule:** Forbid divider lines. 
*   **Separation:** Use `spacing.4` (0.9rem) vertical padding and alternating row colors using `surface` and `surface-container-low`.
*   **Header:** `label-md` in `primary` (#002c98) with `uppercase` tracking for an authoritative, "ledger" feel.

### Status Badges
*   **Success (Completed):** `tertiary-container` (#005a54) background with `on-tertiary-container` text.
*   **Warning (Conflict):** `error_container` (#ffdad6) background with `on-error_container` text.
*   **Radius:** `full` (9999px) for a "pill" look that contrasts against the rectangular grid.

### Input Fields
*   **Background:** `surface-container-highest` (#e0e3e5).
*   **State:** When focused, the background shifts to `surface-container-lowest` with a `2px` `primary` "Ghost Border" (20% opacity).

---

## 6. Do’s and Don’ts

### Do
*   **Do** use white space as a structural element. If two sections feel cluttered, increase spacing using `spacing.8` (1.75rem) rather than adding a line.
*   **Do** use `tertiary` (#00413c) for "Success" states—it is more sophisticated than a standard bright green and fits the "Trustworthy" brief.
*   **Do** ensure all drag-and-drop targets have a "dashed" Ghost Border using `outline` at 20% opacity to signal drop-zones.

### Don't
*   **Don't** use pure black (#000000) for text. Always use `on-surface` (#191c1e) to maintain a premium, ink-on-paper feel.
*   **Don't** use `DEFAULT` (0.25rem) corners for large containers. Use `xl` (0.75rem) for main dashboard cards to soften the data-heavy environment.
*   **Don't** use high-saturation accent colors. Stick to the provided Material tokens to ensure the "Academic Architect" professional tone is preserved.