# iPhone Duo — scroll-driven 3D landing page

> **Unofficial project.** This is not an Apple website and is not affiliated with or endorsed by Apple Inc. It is a landing page concept made for a YouTube tutorial by Sergei Chyrkov. iPhone, iPhone Duo and the product imagery belong to Apple.

A single-page site where a real-time Three.js iPhone Duo unfolds, rotates and re-poses as you scroll.
Scroll position is the timeline: down plays the story forward, up reverses it.

Stack: Vite · TypeScript · Three.js · GSAP + ScrollTrigger · Lenis · plain CSS.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/
npm run preview  # serve dist/ locally
```

## Project layout

```
index.html                 all chapter copy (semantic, crawlable without WebGL)
src/main.ts                wiring: loader, Lenis, ScrollTrigger, render loop
src/three/
  scene.ts                 renderer, background, ground, camera framing, labels
  device.ts                procedural iPhone Duo (panels, hinge, cameras, internals, case)
  materials.ts             titanium / glass / x-ray materials, colorway blend
  screens.ts               display shader + media playlists (cross-fades)
  placeholders.ts          generated, labelled placeholder screens
  lights.ts                key/rim/fill + studio environment (IBL)
  camera-path.ts           CatmullRom camera rail
  postfx.ts                subtle bloom (high tier only)
  model.ts                 optional .glb loader (lazy-loaded)
  quality.ts               device tier + WebGL detection
src/scroll/
  chapters.config.ts       ONE source of truth for the choreography
  timeline.ts              builds the single scrubbed GSAP timeline from the config
src/ui/                    nav, counters, text reveals, FAQ, pickers, media, fallback
src/config/
  media.ts                 media manifest (every swappable file)
  copy.ts                  prices, colors, accessory colors
  links.ts                 CTA URLs
src/styles/                tokens.css, base.css, sections.css
public/assets/             images/ videos/ models/ hdr/
```

## Swap media

Open `src/config/media.ts`. Each slot has one `src` line. Drop your file into `public/assets/…` and change that line:

```ts
'screen.inner.netflix': { kind: 'video', src: 'assets/videos/netflix.mp4', … },
```

- `src: null` → a generated placeholder is drawn and stamped `PLACEHOLDER · <key>`.
- Images: `.jpg .png .webp .avif`. Videos: `.mp4 .webm` (muted, inline, paused when off screen). Model: `.glb`.
- **Screen media aspect ratios:** inner display ≈ 1.42 : 1 (landscape), outer display ≈ 0.69 : 1 (portrait).
  Content shown while the device is rotated (`todayView`, `facetime`, `outer.facetime`) is drawn rotated in
  `placeholders.ts`; supply real files already rotated the same way.
- The browser console lists every slot that still uses a placeholder on load.

### Using a .glb instead of the procedural device

Set `'model.glb'.src`. Export the model **open and flat**, 1 unit = 100 mm, inner display facing +Z, hinge along +Y at x = 0, with nodes named `panelLeft` (x < 0), `panelRight` (x > 0) and `hinge`. The procedural shells hide; displays, x-ray internals and the case stay procedural.

## Edit the choreography

Everything the 3D device does lives in `src/scroll/chapters.config.ts`. Each chapter has:

| Field | Meaning |
|---|---|
| `length` | scroll length in vh (total ≈ 1,180 vh) |
| `side` | where the text sits (`left`/`right`); the device moves to the other side |
| `keys[]` | tweens at a local position `at` (0–1) lasting `dur` with an `ease` |
| `hold` | the still used for reduced motion and nav-dot jumps |

A key's `to` can set any numeric state (`fold` 0–180, `explode`, `xray`, `heat`, `battery`, `flow`, `charge`, `ground`, `glow`, `caseIn`, `kick`, `bgLight`, `spin`, …) plus:

- `pose`: `euler(x, y, z)` in degrees, or the fold-aware helpers `tent()`, `laptop(fold, yaw)`, `standing(yaw)`
- `camera`: `{ pos, target }` stop on the camera rail, or `{ anchor: 'lens', pos, target }` to frame a part of the device
- `innerScreen` / `outerScreen`: a media key to cross-fade to
- `frameX`: how far the device sits from centre (sign comes from `side`)

Every value is tweened on one timeline, so scrolling back always reverses cleanly.

## Change copy, colors, prices

- **Chapter copy:** `index.html` (each chapter is an `<article class="panel" data-chapter="…">`). Lines inside `<span class="line">` get the masked reveal; elements with `data-reveal` stagger in; `data-count` numbers count up.
- **Colorways:** `src/config/copy.ts` → `colorways` (frame, back glass, hinge tones).
- **Prices:** `src/config/copy.ts` → `pricing`. Only 256GB ($1,999) is set; the others show "Price to be confirmed" until filled.
- **CTA links:** `src/config/links.ts` (any `data-link="buy"` etc. gets the URL).
- **Design tokens:** `src/styles/tokens.css`.

## Deploy

`npm run build` writes a static site to `dist/` with relative paths, so it works on any static host or sub-folder (Netlify, Vercel, GitHub Pages, S3, …). Update the `canonical` and Open Graph URLs in `index.html` for your domain.

## Quality, accessibility, fallbacks

- Quality tiers (auto, or force with `?quality=low|mid|high`): high = DPR 2 + shadows + bloom; mid = DPR 1.5 + shadows; low = DPR 1.25, blob shadow, lighter hinge.
- Rendering pauses when the tab is hidden or the story is off screen; screen videos pause too.
- `prefers-reduced-motion` (test with `?motion=reduced`): no smooth scroll or scrubbing; each chapter jumps to a still with a short fade.
- No WebGL (test with `?webgl=off`): poster images per chapter; the Unfold chapter steps through the supplied unfold frames.
- Without JavaScript the chapters render as a normal stack of sections.
- `?debug` exposes `window.duo.at('chapterId', 0.5)` to jump anywhere in the story.

## QA checklist (scroll forward, then back up through each range)

| # | Chapter (vh) | Forward | Reverse |
|---|---|---|---|
| 0 | Hero (0–70) | Closed device sways gently, outer lock screen lit; headline revealed after load; text fades out near the end | Sway resumes, headline returns |
| 1 | Unfold (70–180) | Camera dollies in, device opens 0→180°, outer display dims, inner display lights; counters 50 / 7.6 / 5.4 / 90 | Closes back to the hero pose, counters run down |
| 2 | Display (180–280) | Moves left; light sweeps across the screen; under-display camera ring appears; device tips back to a grazing view | Sweep runs backward, device returns upright |
| 3 | iOS 27 (280–380) | Rotates to portrait, Today View; folds partly; back to landscape; Split View → streaming → video call → team chat placeholders | Cross-fades and rotations unwind in order |
| 4 | Built to last (380–480) | Layers explode with labels (cover, OLED, plate, frame, back, hinge parts) then reassemble | Explodes again, then collapses back |
| 5 | Posable (480–600) | Drops to the floor: Tent → Laptop → Standing → Seated, pose list highlights in step | Poses step back to Tent, then lifts off |
| 6 | Cameras (600–700) | Flips to the back, folds into a V, zooms onto the lens with a flare, pulls out; 4 cards appear one by one | Cards hide in reverse, flips back to front |
| 7 | A20 Pro (700–780) | Shell turns x-ray; heat map spreads from the chip; labels appear | Heat retracts, shell turns solid |
| 8 | Battery (780–850) | Both cells glow, energy flows across the hinge, ring fills to 50% | Ring empties, glow fades |
| 9 | Siri AI (850–930) | Stands open on the floor, Siri screen, coloured edge glow | Glow fades, device lifts |
| 10 | Colors (930–1020) | Page turns light, closed device does a 360° turn; swatches switch Star White / Night Sky live | Page turns dark again |
| 11 | Accessories (1020–1110) | Case slides on (navy/sand), then the kickstand opens and the device leans on it; chips recolour | Kickstand closes, case slides off |
| 12 | Buy (1110–1180) | Device closes and rests in the hero pose; CTAs | Re-opens into the accessories pose |

Also check: nav dots jump to each chapter; the progress bar tracks the page; at 360 px wide the text sits in a bottom sheet and the device stays centred; with `?motion=reduced` and `?webgl=off` every chapter still reads.

## Open items

- Per-capacity prices for 512GB, 1TB and 2TB.
- A Night Sky photo to sample real tones (current values are estimates).
- One-line descriptions for Smart Take, Kid Cue and Duo FaceTime (current lines are deliberately generic).
- Dimensions and weight are flagged in the footnotes as third-party figures to verify.
- Screen, camera-card and accessory images now come from apple.com/iphone-duo (cropped and perspective-corrected to fit the 3D displays). They are Apple's copyrighted assets: fine for a private demo or tutorial, but check usage rights before publishing.
- The iOS 27 chapter's third-party slots (`screen.inner.netflix/zoom/slack`) are empty; the chapter currently shows Apple's streaming, game and reading-app shots (`screen.inner.video/game/reader`). Drop real Netflix/Zoom/Slack screenshots into those slots and swap the keys in `chapters.config.ts` if you want them.
- Still empty but not shown anywhere: `model.glb`, `hero.video`, `colors.nightSky`, `durability.*`, `lifestyle.*`, `screen.inner.photos`, `screen.outer.netflixClips`, and the navy case / taupe folio photos.
