# Mindful — Healing Sounds widget

Two meditation cards, ready to drop into any website:

1. **Card 1 — Daily Mindfulness** (the fish image) with a **curated healing-frequency player**
2. **Card 3 — 4-7-8 Breathing** (its own image) with a guided breathing orb + soft 432 Hz pacing tone

The healing tones are **generated live in the browser** with the Web Audio API — the exact
Hz shown is the exact Hz you hear. There are **no audio files to host** and, apart from the two
background photos, **no external dependencies**.

## Curated frequencies

Solfeggio + natural tuning, each played as a pure sine tone (with a gentle 4-cent detune for warmth):

| Hz  | Name         | Commonly associated with              |
|-----|--------------|---------------------------------------|
| 174 | Foundation   | Grounding, ease                       |
| 396 | Liberation   | Releasing fear/tension (root)         |
| 432 | Natural Tune | Warm, calming reference pitch         |
| 528 | Renewal      | The “love” frequency, balance/repair  |
| 639 | Connection   | Harmony, empathy, relationships       |
| 741 | Cleansing    | Clarity, expression                   |
| 852 | Intuition    | Inner awareness                       |
| 963 | Awakening    | Stillness, oneness (crown)            |

> These are traditional/wellness associations, not medical claims. The widget is a relaxation
> aid, not a medical device or treatment.

## How to embed it in another website

### Option A — iframe (recommended, keeps it isolated)

Host `index.html` anywhere that serves static files (GitHub Pages, Netlify, your own server),
then paste this where you want the widget to appear:

```html
<iframe
  src="https://YOUR-HOST/path/to/index.html"
  title="Mindful — Healing Sounds"
  loading="lazy"
  style="width:100%;max-width:760px;height:660px;border:0;border-radius:24px;overflow:hidden"
  allow="autoplay">
</iframe>
```

Adjust `height` to taste. On narrow screens the two cards stack, so allow more height on mobile
(e.g. `height:1180px` under a `@media (max-width:660px)` rule).

### Option B — paste inline

Open `index.html`, copy everything **inside** `<body>` (the two `<section class="card">` blocks,
the `<style>` block from `<head>`, and the `<script>` at the bottom) and paste it into your page.
Use this only if your site's CSS won't collide — the iframe option avoids that entirely.

## Notes

- **Sound needs a click.** Browsers only allow audio after a user gesture, so the first tone
  starts when the visitor taps a frequency chip or the play button — this is expected.
- **Headphones** give the best experience for low frequencies (174/396 Hz).
- **Images.** The two photos are loaded from their original hosted URLs. For maximum reliability
  on your own site, download them and change the two `background-image` URLs in the `<style>`
  block to your own copies.
- The widget auto-silences itself when its browser tab is hidden.

## Local preview

```bash
npx http-server meditation-widget -p 8080
# then open http://localhost:8080
```
