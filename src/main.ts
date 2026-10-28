import './styles/tokens.css';
import './styles/base.css';
import './styles/sections.css';

import { inject } from '@vercel/analytics';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import * as THREE from 'three';

import { buildStory } from './scroll/timeline';
import { Scene3D } from './three/scene';
import { detectTier, hasWebGL } from './three/quality';
import { Panels } from './ui/text-reveal';
import { Nav, SectionLinks, setupMotionToggle } from './ui/nav';
import { initFaq } from './ui/faq';
import { initMediaDom } from './ui/media-dom';
import { initAccessoryPickers, initColorPicker, renderPricing } from './ui/pickers';
import { Fallback } from './ui/fallback';
import { DragRotate } from './ui/drag-rotate';
import { Preloader } from './ui/preloader';
import { applyLinks } from './config/links';
import { accessoryColors } from './config/copy';
import { unfilledSlots } from './config/media';

gsap.registerPlugin(ScrollTrigger);

// Initialize Vercel Web Analytics
inject({
  mode: import.meta.env.MODE === 'production' ? 'production' : 'development',
  debug: import.meta.env.MODE !== 'production',
});

const html = document.documentElement;
const params = new URLSearchParams(location.search);
// QA overrides: ?motion=reduced  ?webgl=off  ?quality=low|mid|high  ?debug
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || params.get('motion') === 'reduced';
if (reduced) html.classList.add('reduced');

const story = buildStory();
html.style.setProperty('--story-len', String(story.total));

renderPricing();
applyLinks();
initMediaDom();
initFaq(reduced);

// ------------------------------------------------------------------ 3D or fallback
const canvas = document.getElementById('webgl') as HTMLCanvasElement;
const storyEl = document.getElementById('story')!;
let scene: Scene3D | null = null;
let fallback: Fallback | null = null;
const tier = detectTier();
if (hasWebGL() && params.get('webgl') !== 'off') {
  try {
    scene = new Scene3D(canvas, tier, story.camStops, story.innerPlaylist, story.outerPlaylist);
  } catch (err) {
    console.warn('WebGL init failed, using stills.', err);
  }
}
if (!scene) {
  html.classList.add('no-webgl');
  fallback = new Fallback(story);
}

// ------------------------------------------------------------------ UI
const panels = new Panels(story, reduced);
const drag = scene ? new DragRotate(canvas, (x, y) => scene!.hitTest(x, y), reduced) : null;
const noDrag = { yaw: 0, pitch: 0 };
const chaptersNav = document.getElementById('chapters');
const scrollToTime = (time: number, immediate = false) => {
  const max = storyEl.offsetHeight - innerHeight;
  const y = storyEl.offsetTop + (time / story.total) * max;
  if (lenis) lenis.scrollTo(y, immediate ? { immediate: true, force: true } : { duration: 1.8, easing: (t: number) => 1 - Math.pow(1 - t, 4) });
  else window.scrollTo({ top: y, behavior: immediate || reduced ? 'auto' : 'smooth' });
};
const goto = (id: string) => {
  const c = story.chapters.find((ch) => ch.id === id);
  if (c) scrollToTime(c.start + c.length * (c.hold ?? 0.5));
};
const nav = new Nav(story, goto);
const sectionLinks = new SectionLinks(story, storyEl, (el) => {
  const y = el.getBoundingClientRect().top + scrollY - 20;
  if (lenis) lenis.scrollTo(y, { duration: 1.6, easing: (t: number) => 1 - Math.pow(1 - t, 4) });
  else window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
});

const color = { t: 0 };
initColorPicker((t) => gsap.to(color, { t, duration: reduced ? 0 : 1.2, ease: 'power2.inOut' }));

const caseChoice = { case: accessoryColors.case[0].hex as string, folio: accessoryColors.folio[0].hex as string };
let caseKind: 'case' | 'folio' = 'case';
const caseColor = new THREE.Color(caseChoice.case);
const tweenCaseColor = () => {
  const c = new THREE.Color(caseChoice[caseKind]);
  gsap.to(caseColor, { r: c.r, g: c.g, b: c.b, duration: reduced ? 0 : 0.8, ease: 'power2.inOut' });
};
initAccessoryPickers((kind, hex) => {
  caseChoice[kind] = hex;
  if (kind === caseKind) tweenCaseColor();
});

// Pointer / device-orientation parallax (subtle).
const parallax = { x: 0, y: 0, tx: 0, ty: 0 };
if (!reduced) {
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    parallax.tx = (e.clientX / innerWidth) * 2 - 1;
    parallax.ty = -((e.clientY / innerHeight) * 2 - 1);
  }, { passive: true });
  setupMotionToggle((x, y) => {
    parallax.tx = x;
    parallax.ty = y;
  });
}

// ------------------------------------------------------------------ smooth scroll + scrub
let lenis: Lenis | null = null;
if (!reduced) {
  lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.9 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis!.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

let rawTime = 0; // time from the scroll position, unsmoothed
let stepIndex = -1;
ScrollTrigger.create({
  trigger: storyEl,
  start: 'top top',
  end: 'bottom bottom',
  animation: reduced ? undefined : story.tl,
  scrub: reduced ? false : 0.9,
  onUpdate: (self) => {
    rawTime = self.progress * story.total;
    if (!reduced) return;
    // Reduced motion: jump to each chapter's still with a quick cross-fade.
    const { chapter } = story.chapterAt(rawTime);
    if (chapter.index === stepIndex) return;
    stepIndex = chapter.index;
    canvas.style.opacity = '0';
    window.setTimeout(() => {
      story.tl.time(chapter.start + chapter.length * (chapter.hold ?? 0.5));
      canvas.style.opacity = '1';
    }, 220);
  },
});
if (reduced) story.tl.time(story.chapters[0].start + story.chapters[0].length * (story.chapters[0].hold ?? 0));

// ------------------------------------------------------------------ render loop
let running = true;
new IntersectionObserver(([e]) => {
  running = e.isIntersecting;
  chaptersNav?.classList.toggle('is-hidden', !running);
  if (!running) scene?.device.inner.pauseAll();
  if (!running) scene?.device.outer.pauseAll();
}).observe(storyEl);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    scene?.device.inner.pauseAll();
    scene?.device.outer.pauseAll();
  }
});

const resize = () => scene?.resize(innerWidth, innerHeight);
window.addEventListener('resize', resize);
resize();

const intro = { p: reduced ? 1 : 0 };
const chargeFill = document.getElementById('charge-fill');
const chargePct = document.getElementById('charge-pct');
let lastCharge = -1;
let lastLight: boolean | null = null;
const t0 = performance.now();

let lastTime = 0;
gsap.ticker.add(() => {
  const time = (performance.now() - t0) / 1000;
  const dt = Math.min(0.1, time - lastTime);
  lastTime = time;
  const tlTime = story.tl.time();
  const s = story.state;
  const textTime = reduced ? rawTime : tlTime;

  panels.update(textTime, intro.p);
  const pageMax = document.documentElement.scrollHeight - innerHeight;
  nav.update(textTime, pageMax > 0 ? scrollY / pageMax : 0);
  sectionLinks.update();

  const light = s.bgLight > 0.5;
  if (light !== lastLight) {
    document.body.classList.toggle('is-light', light);
    lastLight = light;
  }

  const ch = Math.round(s.charge * 100);
  if (ch !== lastCharge && chargeFill && chargePct) {
    chargeFill.style.strokeDashoffset = String(326.73 * (1 - s.charge));
    chargePct.textContent = `${ch}%`;
    lastCharge = ch;
  }

  const { chapter, local } = story.chapterAt(tlTime);
  const kind = chapter.id === 'accessories' && local >= 0.5 ? 'folio' : 'case';
  if (kind !== caseKind) {
    caseKind = kind;
    tweenCaseColor();
  }

  fallback?.update(textTime);
  if (!scene || !running || document.hidden) return;
  parallax.x += (parallax.tx - parallax.x) * 0.05;
  parallax.y += (parallax.ty - parallax.y) * 0.05;
  scene.device.m.caseMat.color.copy(caseColor);
  drag?.update(dt, chapter.index);
  scene.update({ state: s, time, storyTime: tlTime, colorT: color.t, parallax, intro: intro.p, drag: drag ?? noDrag });
  scene.render();
});

// ------------------------------------------------------------------ loading
const preloader = new Preloader(reduced);

(async () => {
  let fontsDone = false;
  let sceneP = scene ? 0 : 1;
  const report = () => preloader.setProgress(0.15 * (fontsDone ? 1 : 0) + 0.85 * sceneP);
  await Promise.all([
    document.fonts.ready.then(() => { fontsDone = true; report(); }),
    scene?.load((p) => { sceneP = p; report(); }) ?? Promise.resolve(),
  ]).catch((err) => console.warn('Some media failed to load', err));
  preloader.complete();
  await preloader.finished;
  ScrollTrigger.refresh();
  sectionLinks.measure();
  gsap.to(intro, { p: 1, duration: reduced ? 0 : 2.2, ease: 'power2.out', delay: 0.15 });

  const missing = unfilledSlots();
  if (missing.length) console.info(`[iPhone Duo] ${missing.length} media slots use placeholders:`, missing.join(', '));
})();

// Debug helpers: ?debug
if (params.has('debug')) {
  Object.assign(window, {
    duo: {
      story, scene, goto, lenis: () => lenis,
      at: (id: string, local: number) => {
        const c = story.chapters.find((ch) => ch.id === id)!;
        scrollToTime(c.start + c.length * local, true);
      },
    },
  });
}
