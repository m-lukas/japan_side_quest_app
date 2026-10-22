# Japan Quest Log style system

## Visual direction

A Japanese arcade prize cabinet with glossy capsule tokens and physical challenge cards. The reference is the layered violet challenge cards and rounded point medallions, translated into an original interface rather than copied branding.

Gradients communicate curvature, reflected light or a button bevel. They are not arbitrary background decoration. Five promoted cards are the primary content; search is a quieter secondary surface.

## Palette

| Role | Token | Light value | Use |
|---|---|---|---|
| Wisteria canvas | `--page` | `#f4effb` | Page background |
| Porcelain | `--surface` | `#fffdfd` | Card bodies and panels |
| Aubergine ink | `--ink` | `#292144` | Body and heading text |
| Muted lilac | `--muted` | `#726586` | Supporting text |
| Cabinet violet | `--violet-700` | `#6f31ac` | Card shell and depth |
| Prize violet | `--violet-500` | `#a957e4` | Highlights and accents |
| Capsule lavender | `--violet-300` | `#cf9af5` | Reflected light |
| Peach gold | `--gold` | `#ffd076` | Complete action and prizes |
| Tea jade | `--jade` | `#267966` | Guidance, focus and foliage |
| Sakura rose | `--rose` | `#e88da8` | Small celebratory accent |

Dark mode swaps canvas, surfaces, text, lines and shadows through tokens. It preserves the capsule's violet/gold identity. Gold buttons always use dark `--ink-on-gold`, not the theme text color, for readable labels.

## Typography

- **Noto Sans JP** for descriptions, labels, navigation and card titles. Use sentence/title case, never forced uppercase.
- **Reggae One** for the main site title and the explanation's feature headline only. This Japanese display font includes Latin characters. Do not use it for paragraphs or small controls.
- Font families are loaded through Google Fonts with system/CJK fallbacks. The app still works if the fonts cannot be loaded.
- No em dash, en dash, or centered-dot separators in application copy.

## Scale and shapes

Spacing tokens: 4, 8, 12, 16, 24, 32, 48 px. Use 24-32 px between sections and 20-24 px between cards.

Radii: 12 px for small elements, 20 px for inset surfaces, 28 px for physical cards/panels, fully rounded primary actions. Minimum interactive target is 44 px. Mobile search input is 16 px to avoid iOS focus zoom.

## Components

### Capsule

`<Capsule points={5} />` is the reusable point token. The number has an accessible points label. The visible shell comprises a top claw, translucent globe, paper prize, equatorial seam, lower molded shell, reflection and ground shadow. `<Capsule small />` is used in map details and admin rows. It needs no image or animation library.

### Challenge card

A raised violet header supports the capsule and white title; a porcelain body contains the description and actions. No regional badges. Card headings wrap rather than clip. Automatic recommendations have Complete and Swap actions. Search cards have only Complete, with a label indicating whether they are already promoted.

On desktop the first row has three cards and the second row two wider cards. Tablet uses two columns; phones use a single column. Persistent game state does not depend on this arrangement.

### Buttons and tabs

Primary actions use a peach-gold bevel, inset upper shine and bottom-edge depth. Secondary actions use the theme surface and a softer bevel. Press states translate down and flatten the shadow. Disabled and saving states block interaction. Focus rings use jade. Selected navigation is a raised violet pill; inactive tabs remain quiet.

### Search

An inset input surface with clear focus outline, labeled input, clear button, debounce, cancellable requests and a live status message. Search results are distinct from the promoted hand. Empty/error/loading states are text-first; no random placeholder cards.

### Modal

A raised porcelain panel with capsule header, focus trap, focus restoration, Escape/backdrop dismissal when not saving and scrollable mobile layout. The optional location action is explicit. A save failure remains inside the modal and can be retried.

### Decoration

Bamboo and torii line icons are small original SVGs. Background art is low-opacity, non-interactive and behind the content. No hidden tap targets. The main torii silhouette is removed on narrow screens.

## Motion

Use short physical hover/press states, score-track transitions and one brief confetti burst after a confirmed save. No confetti for swaps or failed saves. All nonessential motion and confetti are disabled under `prefers-reduced-motion`.

## Extend the system

Change semantic tokens first, rather than adding one-off colors. Put new shared icon paths in `GameArt.js`. Reuse `button`, `icon-button`, `section-title`, `capsule`, and panel radii. Keep the highest saturation on game-relevant parts, not body text or the entire page.
