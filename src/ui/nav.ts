import type { Story } from '../scroll/timeline';

/** Chapter dots and progress bar. */
export class Nav {
  private dots: HTMLButtonElement[] = [];
  private bar = document.getElementById('nav-progress')!;
  private lastIndex = -1;
  private lastP = -1;

  constructor(private readonly story: Story, goto: (id: string) => void) {
    const list = document.getElementById('nav-dots')!;
    for (const c of story.chapters) {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'nav__dot';
      b.setAttribute('aria-label', `Go to ${c.label}`);
      b.innerHTML = `<span aria-hidden="true">${c.label}</span>`;
      b.addEventListener('click', () => goto(c.id));
      li.append(b);
      list.append(li);
      this.dots.push(b);
    }
    document.querySelectorAll<HTMLElement>('[data-goto]').forEach((a) =>
      a.addEventListener('click', (e) => {
        e.preventDefault();
        goto(a.dataset.goto!);
      }),
    );
  }

  update(time: number, pageProgress: number) {
    const { chapter } = this.story.chapterAt(time);
    if (chapter.index !== this.lastIndex) {
      this.dots.forEach((d, i) => (i === chapter.index ? d.setAttribute('aria-current', 'step') : d.removeAttribute('aria-current')));
      this.lastIndex = chapter.index;
    }
    const p = Math.round(pageProgress * 1000) / 1000;
    if (p !== this.lastP) {
      this.bar.style.transform = `scaleX(${p})`;
      this.lastP = p;
    }
  }
}

/** Device-orientation parallax on touch devices, behind a permission button. */
export function setupMotionToggle(onTilt: (x: number, y: number) => void) {
  const btn = document.getElementById('motion-toggle') as HTMLButtonElement | null;
  const DOE = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent;
  if (!btn || !DOE || !matchMedia('(pointer: coarse)').matches) return;
  btn.hidden = false;
  const listen = () => {
    window.addEventListener('deviceorientation', (e) => {
      const x = Math.max(-1, Math.min(1, (e.gamma ?? 0) / 30));
      const y = Math.max(-1, Math.min(1, ((e.beta ?? 45) - 45) / 30));
      onTilt(x, -y);
    });
    btn.hidden = true;
  };
  btn.addEventListener('click', async () => {
    try {
      if (typeof DOE.requestPermission === 'function') {
        if ((await DOE.requestPermission()) !== 'granted') return;
      }
      listen();
    } catch {
      btn.hidden = true;
    }
  });
}

/**
 * Centred header links. Story links jump to a chapter (via data-goto); the rest
 * smooth-scroll to their section. The current section is marked aria-current.
 */
export class SectionLinks {
  private links: { el: HTMLAnchorElement; key: string; y: number }[];
  private active: HTMLAnchorElement | null = null;

  constructor(
    private readonly story: Story,
    private readonly storyEl: HTMLElement,
    scrollToEl: (el: HTMLElement) => void,
  ) {
    this.links = [...document.querySelectorAll<HTMLAnchorElement>('.nav__links a[data-section]')].map((el) => ({
      el, key: el.dataset.section!, y: 0,
    }));
    for (const l of this.links) {
      if (!l.key.startsWith('#')) continue; // story links are handled by data-goto
      l.el.addEventListener('click', (e) => {
        const target = document.querySelector<HTMLElement>(l.key);
        if (!target) return;
        e.preventDefault();
        scrollToEl(target);
        history.replaceState(null, '', l.key);
      });
    }
    this.measure();
    window.addEventListener('resize', () => this.measure());
  }

  /** Scroll position where each section starts. */
  measure() {
    const max = this.storyEl.offsetHeight - innerHeight;
    for (const l of this.links) {
      if (l.key.startsWith('#')) {
        const el = document.querySelector<HTMLElement>(l.key);
        l.y = el ? el.getBoundingClientRect().top + scrollY : Infinity;
      } else {
        const c = this.story.chapters.find((ch) => ch.id === l.key);
        l.y = c ? this.storyEl.offsetTop + (c.start / this.story.total) * max : Infinity;
      }
    }
  }

  update() {
    const probe = scrollY + innerHeight * 0.35;
    let current: HTMLAnchorElement | null = null;
    for (const l of this.links) if (l.y <= probe) current = l.el;
    if (current === this.active) return;
    this.active?.removeAttribute('aria-current');
    current?.setAttribute('aria-current', 'location');
    this.active = current;
  }
}
