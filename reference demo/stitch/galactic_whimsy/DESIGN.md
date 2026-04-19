# Design System: Cosmic Play & Fantasy Frontiers

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Galactic Playground."** 

Moving away from the sterile, rigid grids of traditional educational software, this system adopts a philosophy of **Layered Wonder**. We treat the screen not as a flat surface, but as a deep, mystical cosmos where UI elements float like friendly planets. By utilizing intentional asymmetry, overlapping "cloud" shapes, and a rejection of harsh geometric lines, we create an environment that feels organic, safe, and endlessly discoverable for children aged 5-10.

The core tension is between the **Depth of Space** (dark, immersive backgrounds) and the **Tactile Pop of Fantasy** (vibrant, chunky interactive elements). This system breaks the "template" look by using exaggerated scales—making the small things tiny and the interactive things massive—creating a hierarchy that is intuitive even for pre-readers.

---

## 2. Colors & Surface Philosophy

### The Palette of Discovery
The color strategy uses the deep `surface` and `background` (#000341) to create a sense of vastness, allowing the high-energy `primary` (Solar Yellow), `secondary` (Neon Nebula Green), and `tertiary` (Comet Orange) tokens to pulse with life.

*   **The "No-Line" Rule:** Sectioning is never achieved through 1px solid strokes. Instead, use background shifts. A game module should be a `surface-container-low` shape sitting atop the `surface` background. If visual separation is needed, use a shape-based silhouette (like a rounded "cloud" or "bubble") rather than a divider.
*   **Surface Hierarchy & Nesting:** Use the tiers to create a "Lunar Base" effect. 
    *   **Lowest:** The deep void of space.
    *   **High/Highest:** The "interactive deck" or control panel where gameplay happens.
    *   **Nesting Example:** A `surface-container-highest` card (the quest) sitting inside a `surface-container-low` tray (the inventory).
*   **The "Glass & Gradient" Rule:** To keep the UI from feeling "flat" or "cheap," use Glassmorphism for floating navigation bars or pause menus. Apply `surface_variant` with a 60% opacity and a 20px backdrop blur. 
*   **Signature Textures:** Use subtle radial gradients on all major CTAs (e.g., transitioning from `primary` #ffe483 at the top-left to `primary_container` #fdd400 at the bottom-right) to give buttons a "candy-coated" 3D feel.

---

## 3. Typography: The Friendly Bold

The typography system relies on the interplay between **Plus Jakarta Sans** (for high-impact clarity) and **Be Vietnam Pro** (for friendly, rounded readability).

*   **Display & Headlines (Plus Jakarta Sans):** These are our "Hero" fonts. Used at `display-lg` (3.5rem) and `headline-lg` (2rem), they should feel chunky and authoritative but never aggressive. The rounded terminals of Jakarta Sans echo the soft corners of our UI.
*   **Body & Titles (Be Vietnam Pro):** This is for instruction and storytelling. Its generous x-height and open counters make it perfect for kids developing literacy. 
*   **Hierarchy as Guidance:** In this system, typography is a wayfinder. Instructions are always `title-lg`, while supporting text is kept to a minimum in `body-md`. We never use `label-sm` for critical path information; if it's important enough to be on screen for a 6-year-old, it must be `title-sm` or larger.

---

## 4. Elevation & Depth: Tonal Layering

We reject traditional drop shadows in favor of **Tonal Volume**.

*   **The Layering Principle:** Instead of shadows, we "stack" colors. A `secondary` button sits on a `secondary_container` "shadow shape" offset by 4px to create a cartoon-style 3D effect.
*   **Ambient Shadows:** For floating modal elements (like an achievement pop-up), use a `primary_fixed` tinted shadow: `box-shadow: 0 20px 40px rgba(255, 228, 131, 0.15)`. This mimics the glow of a nearby star rather than a grey shadow.
*   **The "Ghost Border" Fallback:** While we avoid thin lines, a "thick-and-thin" border style is permitted for cartoon charm. Use `outline_variant` at 20% opacity with a width of `4px` to define game-cards.
*   **Glassmorphism:** Use the `surface_bright` token with transparency for "Holographic" UI elements (like an oxygen meter or a map), allowing the space background to shimmer through.

---

## 5. Components

### Interactive Elements
*   **Buttons:** Must use the `xl` (3rem) roundedness scale. 
    *   *Primary:* `primary` background, 4px bottom-offset "thick border" of `on_primary_fixed_variant` for a 3D tactile look.
    *   *Scale:* Interaction should trigger a "squish" effect (transform: scale(0.95)).
*   **Cards:** Forbid the use of divider lines. Separate content using `surface-container-high` blocks against a `surface-container-low` base. Use the `lg` (2rem) corner radius.
*   **Input Fields:** Use `surface_container_highest` for the field background. The focus state should not be a thin blue line, but a `4px` glow using the `secondary` (Lime Green) color.
*   **Checkboxes & Radios:** These should be reimagined as "Star Toggles." When active, they should glow using the `primary_dim` color.

### Contextual Components
*   **The "Quest Tray":** A bottom-anchored container using `surface_container_low` with an asymmetrical, wavy top edge to break the horizontal line of the screen.
*   **Power-Up Chips:** Small, pill-shaped (`full` roundedness) elements using the `tertiary` (Orange) palette to signify high-energy items.

---

## 6. Do's and Don'ts

### Do:
*   **Do** use "friendly" asymmetry. A button can be slightly tilted by 1-2 degrees to feel more playful.
*   **Do** use high-contrast color pairings for accessibility (e.g., `on_primary` text on `primary` backgrounds).
*   **Do** ensure every interactive element has a minimum hit target of 44x44px, but aim for 64px given the target age group.

### Don't:
*   **Don't** use black (#000000) for shadows or text. Use `surface_container_lowest` for dark areas and `on_surface` for text.
*   **Don't** use sharp 90-degree corners. Every element must have at least the `sm` (0.5rem) radius.
*   **Don't** use "Adult" jargon. Use the UI to show, not tell. If a button deletes something, use a "Trash-can-rocket" icon and a `error` (Soft Red) color shift.