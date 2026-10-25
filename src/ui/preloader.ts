/**
 * Launch preloader: a huge 0→100 counter on black. The counter never runs
 * ahead of real loading progress, and once it reaches 100 the loader blurs
 * away while the hero un-blurs underneath.
 */

export class Preloader {
  private readonly el = document.getElementById('loader')!;
  private readonly num = document.getElementById('loader-num')!;
  private target = 0;
  private shown = 0;
  private loaded = false;
  private last = -1;
  private resolveDone!: () => void;
  /** Resolves when the counter reaches 100 after loading finished. */
  readonly finished = new Promise<void>((r) => (this.resolveDone = r));

  constructor(private readonly reduced: boolean) {
    document.documentElement.classList.add('is-loading');
    requestAnimationFrame(this.tick);
  }

  /** Real loading progress, 0..1. */
  setProgress(p: number) {
    this.target = Math.max(this.target, Math.min(1, p));
  }

  complete() {
    this.target = 1;
    this.loaded = true;
  }

  private tick = () => {
    const goal = this.target * 100;
    if (this.reduced) this.shown = goal;
    else if (this.shown < goal) {
      // ease toward real progress, never faster than ~1.5s for the full count
      this.shown = Math.min(goal, this.shown + Math.min(1.15, Math.max(0.35, (goal - this.shown) * 0.08)));
    }
    const v = Math.floor(this.shown + 1e-6);
    if (v !== this.last) {
      this.num.textContent = String(v);
      this.el.setAttribute('aria-valuenow', String(v));
      this.last = v;
    }
    if (this.loaded && this.shown >= 100) {
      this.reveal();
      return;
    }
    requestAnimationFrame(this.tick);
  };

  private reveal() {
    this.el.classList.add('is-done');
    document.documentElement.classList.remove('is-loading');
    this.resolveDone();
    window.setTimeout(() => this.el.remove(), 1600);
  }
}
