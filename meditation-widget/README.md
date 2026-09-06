# Mindful — Healing Sounds widget

Two meditation cards, ready to drop into any website:

1. **Card 1 — Daily Mindfulness** with a **curated healing-frequency player**, over a **moving video background** (`assets/card1.mp4`)
2. **Card 3 — 4-7-8 Breathing** with a guided breathing orb + soft 432 Hz pacing tone, over a **moving video background** (`assets/card3.mp4`)

The video backgrounds autoplay, loop, and are muted (so they start on their own).
The healing tones are **generated live in the browser** with the Web Audio API — the exact
Hz shown is the exact Hz you hear. **No external servers, no CDNs** — the widget ships with
its own files.

## Files

```
meditation-widget/
├── index.html        ← the widget
└── assets/
    ├── card1.mp4      ← moving background for card 1
    └── card3.mp4      ← moving background for card 3
```

Keep `index.html` and the `assets/` folder together. To swap the two clips, just replace the
files (same names), or swap the two `<source src="assets/…">` lines in `index.html`.

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

## Run it on Replit

The repo already has a `.replit` file, so it runs with no setup.

1. In Replit: **Create Repl → Import from GitHub**.
2. Paste the repo URL: `https://github.com/ceo281/REPLIT-CTS` and pick the
   `claude/meditation-healing-sounds-pfyzsg` branch.
3. Press **Run**. Replit serves the widget and opens the webview.
4. Copy the public URL from the webview (looks like `https://<repl-name>.<user>.repl.co`) —
   that link is your live widget, openable by anyone.

To put it on your website, embed that Replit URL:

```html
<iframe src="https://YOUR-REPL-URL.repl.co"
  title="Mindful — Healing Sounds"
  style="width:100%;max-width:760px;height:1200px;border:0;border-radius:24px"
  allow="autoplay" loading="lazy"></iframe>
```

(Under the hood the Run command is `python3 -m http.server 8080 --directory meditation-widget`.)

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
  starts when the visitor taps a frequency row or the play button — this is expected.
- **The video backgrounds move on their own** (autoplay + loop + muted). They're bundled in
  `assets/`, so there's nothing external to break.
- **Headphones** give the best experience for low frequencies (174/396 Hz).
- The widget auto-silences its tones when its browser tab is hidden (the muted video keeps looping).

## Local preview

```bash
npx http-server meditation-widget -p 8080
# then open http://localhost:8080
```
