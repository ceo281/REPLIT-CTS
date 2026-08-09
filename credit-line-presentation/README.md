# Credit Line Australia — website presentation

A 10-slide HTML deck presenting the finished Credit Line Australia website
build, prepared by AT Collective Enterprises. Imported from the Claude Design
project **Credit Line Presentation** (`Credit Line Presentation.dc.html`).

## Files

| File | Purpose |
| --- | --- |
| `index.html` | **The runnable deck.** Standalone `<deck-stage>` form — open it directly or serve the folder. |
| `Credit Line Presentation.dc.html` | The Claude Design source (`<x-dc>` / `<x-import>` form) the deck was imported from. |
| `deck-stage.js` | Vanilla web component: slide staging, keyboard/tap nav, thumbnail rail, print-to-PDF, speaker-note sync. |
| `image-slot.js` | Vanilla web component: drop-in image placeholders that persist to the sidecar. |
| `support.js` | Claude Design `dc-runtime`. Only needed to render the `.dc.html` source form. |
| `.image-slots.state.json` | Sidecar holding the two filled screenshots (hero + calculators) and their framing. |
| `uploads/` | Inter font files and the two decoded screenshot images. |

## Viewing

`index.html` runs in any modern browser. The two screenshots are also wired
directly via each `<image-slot src="…">`, so they show even when opened from
the filesystem. To use the sidecar-persisted framing exactly (and to let
`image-slot.js` `fetch()` the sidecar), serve the folder over HTTP:

```bash
cd credit-line-presentation
python3 -m http.server 8000
# then open http://localhost:8000/index.html
```

## Controls

- **← / →** (or ↑/↓, PgUp/PgDn, Space) — previous / next slide
- **Home / End** — first / last slide
- **R** — reset to the first slide
- **Print → Save as PDF** — one clean page per slide
- Click a thumbnail in the left rail to jump to a slide

## Slides

1. Cover · 2. The problem · 3. The audit · 4. The solution ·
5. A preview · 6. What was built · 7. The build, in use ·
8. Everything corrected · 9. About me · 10. Next steps

> Note: the imported design source ended mid-sentence in the *About me* slide
> and had no closing slide. On import, that paragraph was completed and a
> *Next steps* close (slide 10, from the deck outline) was added, in the same
> voice and palette as the rest of the deck.
