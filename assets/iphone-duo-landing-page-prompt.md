# PROMPT: Scroll-Driven 3D Landing Page for iPhone Duo (Three.js)

## 1. Role and goal

You are a senior creative developer and WebGL engineer. Build a premium, award-level, single-page landing site for **iPhone Duo**, Apple's first foldable iPhone (announced September 9, 2026; on sale October 23, 2026).

The centerpiece is a **real-time Three.js 3D iPhone Duo that physically unfolds, rotates and re-poses as the user scrolls**, revealing each major feature in sequence. Scroll position is the timeline: scrolling down plays the story forward, scrolling up reverses it smoothly. The 3D scene must be the star of the page, not a decoration behind the text.

I will supply product pictures and videos separately. Build the page so every media slot listed in Section 7 can be filled by dropping a file into `/public/assets/` and changing one line in a config file. Until my files arrive, use clearly labelled placeholder media (solid gradient / generated textures) so the page is fully functional.

---

## 2. Tech stack (required)

- **Three.js** (latest stable) for all 3D. This is mandatory and non-negotiable.
- **Vite** + vanilla **TypeScript** (or JavaScript if simpler); no heavy framework required. (React Three Fiber is acceptable only if you keep the same scroll architecture.)
- **GSAP + ScrollTrigger** for scroll-scrubbed timelines. **Lenis** for smooth scrolling, synced to GSAP's ticker.
- Three.js add-ons: `RoundedBoxGeometry`, `RGBELoader` / `RoomEnvironment` for image-based lighting, `GLTFLoader` + `DRACOLoader` (if I supply a model), `EffectComposer` with subtle bloom (optional, toggle by device tier).
- Plain CSS (custom properties, `clamp()` type scale). No UI kit.
- Output: a static build that deploys to any static host.

---

## 3. The 3D model

**If I provide a `.glb` of iPhone Duo**, load it, name the two halves and hinge nodes, and drive them as below.

**If I do not**, build the device procedurally in Three.js so folding is a true kinematic animation:

- Group hierarchy: `device` → `leftPanel` (pivot at hinge) + `rightPanel` (pivot at hinge) + `hingeCover`.
- Each panel is a `RoundedBoxGeometry` shell with a mirror-polished titanium look (`MeshPhysicalMaterial`, high metalness, low roughness, clearcoat) plus a front glass layer and a back glass layer.
- **Real proportions** (1 scene unit = 100 mm):
  - Open: **164.6 × 117.8 × 5.2 mm** (two 82.3 × 117.8 mm halves joined at a hinge along the 117.8 mm edge)
  - Closed: **84.1 × 117.8 × 11.3 mm**
  - Weight 254 g (use for copy only)
- Book-style fold ("passport" design): **rounded corners on the free side, squared-off corners at the hinge side.**
- A separate hinge cover with a **contrasting micro-blasted matte finish** against the polished frame.
- **Inner display:** 7.6" folding Super Retina XDR, roughly 4:3. **Outer display:** 5.4". Both screens share the same aspect ratio. Screen surfaces are `CanvasTexture` / `VideoTexture` so I can swap content (images or video clips) per scroll chapter. The inner display has a **nano-texture matte finish** (slightly rough, low specular); the outer display is glossier Ceramic Shield 2.
- Back: **two rear cameras only** (48MP Fusion Main + 48MP Fusion Ultra Wide) in the top corner, plus flash and microphone. No telephoto lens. Add a tiny Apple-less back (no logo needed unless I supply one).
- **Side button with Touch ID** on the frame (Touch ID, not Face ID).
- Two colorways, tweenable at runtime: **Night Sky** (dark, near-black blue) and **Star White**. Sample exact tones from my supplied photos once available.

Lighting: soft studio HDRI, one key light, one rim light that sweeps across the titanium as the model rotates, contact shadow on a ground plane that fades when the device floats. Tone mapping ACES Filmic, sRGB output, antialiasing on.

---

## 4. Scroll choreography (the core of the project)

Pin a full-viewport `<canvas>` and drive one master GSAP timeline with `scrub`. Total scroll length roughly **1,000 vh**. Each chapter below owns a scroll range; text panels fade/slide in and out in sync. Camera moves, model rotation, fold angle and screen content are all tied to scroll progress. Use easing so it feels weighty, not linear.

| # | Chapter | Scroll action on the 3D model | On-screen story |
|---|---------|-------------------------------|-----------------|
| 0 | **Hero** | Device **closed**, floating, slow idle rotation, mirror-polished titanium catching light. Outer display glows. Page loads with a short intro reveal. | Headline: "iPhone Duo." Sub: "The first foldable iPhone." Price/date chip: "From $1,999 · Available October 23." |
| 1 | **Unfold** | Camera dollies in; the device **opens from 0° to 180°**, panels rotating about the hinge, inner display lighting up as it flattens. | "50% larger than iPhone 18 Pro Max when open." "7.6-inch inner display." "Closed, a 5.4-inch outer display with 90% of iPhone 18 Pro's screen area." Animated number counters. |
| 2 | **Display** | Open device settles flat, rotates to landscape. Camera slides toward the center of the screen. Sweep a light across the nano-texture surface to show reduced glare. Zoom to the fold line to show a flat, smooth surface. | Nano-texture finish, wide-angle OLEDs, **3000 nits peak brightness**, **ProMotion up to 120Hz**, Always-On. A minimal crease visibility message: custom adhesives let display layers glide like pages of a book. Under-display FaceTime camera "hidden until you need it." |
| 3 | **Versatility / iOS 27** | Rotate between portrait and landscape; fold partially to show iOS adapting. Screen texture cross-fades through my supplied UI media. | Split View (two apps side by side on iPhone for the first time), Today View widgets, Dock and controls on the side, redesigned vertical Dynamic Island, swap between displays when flipped. Third-party callouts: Netflix, Zoom, Slack. |
| 4 | **Built to last** | Device **explodes into layers** (rear Ceramic Shield, titanium frame, folding OLED stack, titanium plate, front glass), then reassembles. Hinge cover separates to reveal the hinge mechanism. | Grade 5 titanium frame, mirror-polished with a 3D-printed micro-blasted hinge cover. Hinge engineered from **100+ components**. **Ceramic Shield 2** on the outer display (3x better scratch resistance than the previous generation), Ceramic Shield on the back. Scratch-resistant coating and custom-polymer nano-textured cover layer on the inner display. **IP68**. |
| 5 | **Posable** | Fold to ~100–120° and cycle through poses on a ground plane: **Tent** (hands-free FaceTime), **Laptop** (typing/viewing), **Standing** (StandBy clock / photo frame), **Seated**. Camera orbits between poses. | "Anything's posable." StandBy works on either display even when not charging. Hands-free calls. Watch at the perfect angle. |
| 6 | **Cameras** | Flip the device to show the back, then fold it to show front/back at once. Camera macro-zoom onto the two lenses with a lens-flare pulse. Outer display shows a live preview (use my video). | 48MP Fusion Main (24MP default, 4K 120 fps Dolby Vision, 2x optical-quality zoom), 48MP Fusion Ultra Wide (macro), 12MP Center Stage front camera. New: **Smart Take, Duo Preview, Kid Cue, Duo FaceTime.** Photographic Styles with texture and grain controls. Present these as 4 small cards that animate in sequentially. |
| 7 | **A20 Pro + cooling** | Shell turns translucent / x-ray. Reveal the **A20 Pro chip, custom vapor chamber** and the **two batteries (one in each half)** glowing. Heat-map gradient dissipates across the vapor chamber. | A20 Pro (2nm): up to 20% faster CPU than A19 Pro, up to 40% faster GPU, Dual 16-core Neural Engine, 50% more memory bandwidth, up to 35% better sustained performance than iPhone 17 Pro. Apple's first dual-battery iPhone. |
| 8 | **Battery & charging** | Both battery cells pulse; energy "flows" between them. A charge ring fills to 50%. | Up to **31 hours** video playback (inner display), up to **44 hours** (outer display), up to **24 hours** mixed use. Fast charge to **50% in about 20 minutes** wired, about 30 minutes wireless with MagSafe or Qi2. |
| 9 | **Siri AI & Apple Intelligence** | Device stands open; the inner display shows Siri AI on one side and an app on the other. Soft glow around the edges. | Siri AI (beta, English first), personal context, onscreen awareness, Siri mode in Camera, write with Siri, Visual Intelligence, photo editing (Spatial Reframing, Extend, Clean Up). |
| 10 | **Colors** | Slow 360° turntable. Two clickable swatches tween the material between **Night Sky** and **Star White** in real time. | "Two refined colors." |
| 11 | **Accessories** | Device slides into the **iPhone Duo Case** (navy blue, sand; two-part design) and the **Folio with Kickstand** (navy blue, taupe), then props up on the kickstand. Use my images as textures or as hero stills if modelling is impractical. | Case $79, Folio with Kickstand $129. Both MagSafe, Qi2 25W compatible. |
| 12 | **Specs & CTA** | Camera pulls back, device closes and rests; final hero pose. | Compact specs grid, availability, pricing table, CTA buttons (see Section 6). |

**Implementation requirements for the choreography**

- One source of truth: a `chapters.config` array (id, scroll range, camera position/target, fold angle, model rotation, material state, screen media key, text block id). The timeline is generated from it.
- **Fold angle** is a single animated number (0–180°) that rotates the two panels about the hinge; the outer display fades out and the inner display fades in at the correct angle.
- Camera uses a `CatmullRomCurve3` path with scrubbed `lookAt` targets for cinematic motion; add very subtle mouse-parallax on desktop and device-orientation parallax on mobile (permission-gated).
- Exploded-view and x-ray states are driven by scalar uniforms/positions so they reverse cleanly on scroll-up.
- Keep scroll direction fully reversible with no state that can desync.

---

## 5. Visual and UX direction

- **Mood:** restrained, premium, cinematic. Mostly dark backgrounds with soft gradient pools and generous negative space; occasional light chapters for contrast (e.g. Star White).
- **Typography:** a clean geometric/neo-grotesk sans (e.g. Inter Tight, Geist or similar from Google Fonts); very large display headlines (clamp 56–160 px), light weights, tight tracking; small-caps eyebrow labels; tabular figures for stats.
- **Motion:** slow, weighty easings (`power3.inOut`, custom cubic-bezier); text uses masked line-reveal animations; numbers count up; no gratuitous bounce.
- **Layout:** text lives at left/right of the model and never covers the device's focal point; on mobile, text sits in bottom sheets over the canvas.
- **Chrome:** minimal sticky nav (wordmark "iPhone Duo", chapter progress indicator with dots, "Pre-order" / "Buy" button), scroll hint on hero, chapter counter, optional sound toggle.
- **Copy:** write original, tight marketing copy based on the facts in Section 8. Do not copy Apple's page layout, sentences or imagery verbatim.

---

## 6. Sections beyond the 3D story

After chapter 12 (normal scroll, canvas unpinned or fading to a still):

1. **Specs grid** (displays, chip, cameras, battery, build, connectivity, storage, colors, dimensions).
2. **Pricing table:** 256GB / 512GB / 1TB / 2TB, starting at $1,999 (U.S.) or $83.29/month for 24 months. Ask me to confirm per-capacity prices before hardcoding anything above the entry tier.
3. **Availability:** pre-orders Oct 16; on sale **Oct 23, 2026** in 70+ countries and regions; 28 more countries from **Oct 30**.
4. **Environment strip:** 35% recycled content, 60% renewable electricity in manufacturing, 100% fiber-based packaging.
5. **FAQ accordion** (foldable vs flip, crease, Apple Pencil, eSIM-only, Touch ID, durability).
6. **Final CTA** and footer with legal footnotes.

CTAs: "Buy" and "Learn more" should be configurable URLs in the config file (default `#`).

---

## 7. Media slots (I will provide these)

Create `src/config/media.ts` with a typed manifest. Every slot below must work with a placeholder and be swappable by changing a path. Support `.jpg/.png/.webp/.avif` for images, `.mp4/.webm` for video, `.glb` for the model.

| Key | Use |
|-----|-----|
| `model.glb` | Optional full device model (hinge nodes named `hinge`, `panelLeft`, `panelRight`) |
| `hero.still` / `hero.video` | Hero poster and optional looping background video |
| `screen.outer.*` | Images/videos shown on the outer display (lock screen, camera preview, Netflix Clips) |
| `screen.inner.*` | Inner display content: home screen (two pages + Today View), Split View, Siri AI, Netflix, Zoom, Slack, Photos, StandBy, FaceTime |
| `colors.nightSky`, `colors.starWhite` | Product photos for sampling/matching colors and reflections |
| `camera.*` | Sample photos and video clips for the Cameras chapter (Smart Take, Duo Preview, Kid Cue, Duo FaceTime) |
| `durability.*` | Hinge / layer / titanium close-ups |
| `accessories.case.*`, `accessories.folio.*` | Case (navy blue, sand) and Folio (navy blue, taupe) images |
| `lifestyle.*` | Poses: tent, laptop, standing, seated |
| `og.image` | Social share image |

Rules for using my media:
- Use **videos as `VideoTexture`** on the 3D screens (muted, `playsInline`, preloaded, paused when off-screen).
- Use **images as hero stills, chapter backgrounds and texture sources.**
- Compress and generate responsive sizes; lazy-load everything that is not in the first two chapters; show a branded loading screen with real progress.
- When I send the files, wire each one into the right chapter and tell me which slots remain unfilled.

---

## 8. Fact sheet (use only these facts; source: Apple Newsroom and Apple product page, Sept–Oct 2026)

**Positioning:** the first foldable iPhone; the largest iPhone display ever; the thinnest iPhone when open.

**Displays**
- Inner: 7.6" Super Retina XDR foldable display, nano-texture finish, wide-angle OLEDs. 50% larger than iPhone 18 Pro Max.
- Outer: 5.4" Super Retina XDR. 90% of the screen area of iPhone 18 Pro.
- Same aspect ratio on both. ProMotion up to 120Hz, Always-On, 3000 nits peak outdoor brightness.
- Under-display FaceTime camera hidden when not in use.
- Apple Pencil (USB-C) support arriving later this year (no hover).

**Design and durability**
- Grade 5 titanium frame, mirror-polished; 3D-printed micro-blasted hinge cover.
- Hinge: more than 100 components; supports the center of the display; magnet array for secure closure.
- Ceramic Shield 2 (outer display), Ceramic Shield (back); IP68.
- Open dimensions 164.6 × 117.8 × 5.2 mm; closed 84.1 × 117.8 × 11.3 mm; 254 g. *(Dimensions and weight come from third-party spec listings; verify against Apple's tech specs page before publishing.)*
- Colors: **Star White, Night Sky.**

**Cameras**
- 48MP Fusion Main (24MP default, 2x optical-quality telephoto crop, sensor-shift OIS, zero shutter lag, 4K 120 fps Dolby Vision).
- 48MP Fusion Ultra Wide (macro).
- 12MP Center Stage front camera. Under-display FaceTime camera.
- Smart Take, Duo Preview, Kid Cue, Duo FaceTime, Dual Capture, Photographic Styles with texture and grain, Cinematic effects after capture, 4K time-lapse in Dolby Vision.

**Performance and battery**
- A20 Pro (2nm), 6-core CPU, 7-core GPU with Neural Accelerators, Dual 16-core Neural Engine, custom vapor chamber.
- Dual-battery architecture (one per side). Up to 31 h video (inner), 44 h video (outer), 24 h mixed.
- ~50% charge in ~20 min wired (60W-capable adapter, sold separately); ~30 min MagSafe/Qi2.
- Wi-Fi 7, Bluetooth 6, Thread (N1 chip); C2 modem with mmWave in the U.S.; **eSIM-only worldwide**; satellite features.

**Software**
- iOS 27 (ships with iOS 27.1): Split View, two windows of the same app, saved app pairs, side-mounted Dock and controls, vertical Dynamic Island, Today View, upgraded StandBy.
- Siri AI (beta, English at launch; not available in the EU initially) and Apple Intelligence.
- Touch ID in the side button; Camera Control with Siri Camera mode.

**Pricing and availability (U.S.)**
- From $1,999 (256GB), or $83.29/month for 24 months. Storage: 256GB, 512GB, 1TB, 2TB.
- Duo Case $79; Folio with Kickstand $129.
- Pre-order from Oct 16; available Oct 23, 2026 (70+ countries); 28 more countries from Oct 30.

**Do not state** battery capacity in mAh, RAM, or any benchmark number that Apple has not published. Third-party sites disagree on these.

---

## 9. Performance, responsiveness, accessibility

- Target **60 fps on a modern laptop and 30+ fps on mid-range phones**. Cap devicePixelRatio at 2 (1.5 on mobile), use instancing/merged geometry where possible, dispose of unused textures, pause rendering when the tab is hidden or the canvas is off-screen.
- Tiered quality: detect GPU/device and drop bloom, shadows and exploded-view detail on low-end devices.
- Fully responsive from 360 px to 4K. On mobile, simplify camera paths and reduce text per chapter; keep the unfold chapter dramatic.
- **`prefers-reduced-motion`:** replace scrubbed 3D motion with a static, stepped presentation (still renders per chapter, simple fades).
- Semantic HTML for all copy so it is readable and crawlable without WebGL; WebGL-unsupported fallback with a poster image sequence.
- Keyboard-accessible nav and CTA, visible focus states, WCAG AA contrast, `alt` text, `aria-live` off for decorative counters.
- SEO: title, meta description, Open Graph/Twitter tags, structured data for the product.
- Lighthouse targets: Performance ≥ 80 desktop, Accessibility ≥ 95, SEO ≥ 95.

---

## 10. Deliverables

1. A working Vite project with the folder structure below, `npm run dev` and `npm run build` both succeeding.
2. `README.md` explaining: how to swap media, how to edit chapters, how to change colors/copy, and how to deploy.
3. A short **chapter-by-chapter QA checklist** confirming each scroll range plays forward and in reverse.

```
/src
  /three      scene.ts, device.ts, materials.ts, lights.ts, camera-path.ts, postfx.ts
  /scroll     timeline.ts, chapters.config.ts
  /ui         nav.ts, counters.ts, text-reveal.ts, faq.ts
  /config     media.ts, copy.ts, links.ts
  /styles     tokens.css, base.css, sections.css
/public/assets  images/ videos/ models/ hdr/
index.html
```

## 11. Process

1. Briefly restate your plan and any assumptions (especially if no `.glb` is provided).
2. Build the scene and the **unfold** chapter first; show it working before the rest.
3. Add the remaining chapters in order, testing scrub forward/reverse after each.
4. Wire placeholder media, then polish typography, easing and lighting.
5. Run a performance and accessibility pass; fix issues.
6. List open questions and which media slots still need my files.

## 12. Acceptance criteria

- The 3D iPhone Duo **visibly unfolds, rotates and re-poses in direct response to scroll**, in both directions, with no jumps.
- Every chapter in Section 4 exists, with its feature story tied to a distinct 3D state.
- Colors swap live between Night Sky and Star White.
- All facts match Section 8; nothing unverified appears on the page.
- All media slots are swappable via the manifest; placeholders are clearly labelled.
- It runs smoothly on desktop and mobile and degrades gracefully without WebGL or with reduced motion.

*Note: iPhone Duo and related names and imagery belong to Apple. Use only assets I have the right to use, and write original copy.*
