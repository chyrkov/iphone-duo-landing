import gsap from 'gsap';

const TAU = Math.PI * 2;
const MAX_PITCH = 0.45;

/**
 * Drag the phone to turn it a full 360°. The drag adds a yaw/pitch offset on
 * top of the scroll pose, keeps a little momentum on release, and eases back
 * to the nearest full turn when the chapter changes so the scroll story stays
 * in sync. The hint button spins it 360° (keyboard-friendly alternative).
 */
export class DragRotate {
  yaw = 0;
  pitch = 0;
  private vYaw = 0;
  private dragging = false;
  private lastX = 0;
  private lastY = 0;
  private lastT = 0;
  private chapter = -1;
  private resetting: gsap.core.Tween | null = null;
  private lastHover = 0;
  private readonly hint: HTMLButtonElement | null;

  constructor(
    private readonly el: HTMLElement,
    private readonly hitTest: (clientX: number, clientY: number) => boolean,
    private readonly reduced: boolean,
  ) {
    this.hint = document.getElementById('drag-hint') as HTMLButtonElement | null;
    el.addEventListener('pointerdown', this.onDown);
    el.addEventListener('pointermove', this.onMove);
    el.addEventListener('pointerup', this.onUp);
    el.addEventListener('pointercancel', this.onUp);
    el.addEventListener('lostpointercapture', this.onUp);
    el.addEventListener('dblclick', (e) => {
      if (this.hitTest(e.clientX, e.clientY)) this.reset(0.8);
    });
    this.hint?.addEventListener('click', () => this.spin());
  }

  private onDown = (e: PointerEvent) => {
    if (e.button !== 0 || !this.hitTest(e.clientX, e.clientY)) return;
    this.resetting?.kill();
    this.dragging = true;
    this.vYaw = 0;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.lastT = performance.now();
    this.el.setPointerCapture(e.pointerId);
    this.el.classList.add('is-dragging');
    this.hint?.classList.add('is-used');
  };

  private onMove = (e: PointerEvent) => {
    if (!this.dragging) {
      // Show a grab cursor only over the phone (throttled raycast).
      if (e.pointerType === 'mouse' && performance.now() - this.lastHover > 60) {
        this.lastHover = performance.now();
        this.el.classList.toggle('is-grabbable', this.hitTest(e.clientX, e.clientY));
      }
      return;
    }
    const now = performance.now();
    const dt = Math.max(1, now - this.lastT) / 1000;
    // One full turn ≈ the width of the viewport (min 600px).
    const perPx = TAU / Math.max(600, innerWidth);
    const dYaw = (e.clientX - this.lastX) * perPx;
    this.yaw += dYaw;
    this.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, this.pitch + (e.clientY - this.lastY) * perPx * 0.6));
    this.vYaw = this.vYaw * 0.6 + (dYaw / dt) * 0.4;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.lastT = now;
  };

  private onUp = () => {
    if (!this.dragging) return;
    this.dragging = false;
    this.el.classList.remove('is-dragging');
    if (this.reduced || performance.now() - this.lastT > 80) this.vYaw = 0;
  };

  /** Animated full turn (used by the hint button). */
  spin() {
    this.resetting?.kill();
    this.vYaw = 0;
    this.hint?.classList.add('is-used');
    const target = Math.round(this.yaw / TAU) * TAU + TAU;
    this.resetting = gsap.to(this, { yaw: target, pitch: 0, duration: this.reduced ? 0 : 2.2, ease: 'power2.inOut' });
  }

  /** Ease back to the nearest full turn, i.e. the choreographed pose. */
  reset(duration = 1.2) {
    if (this.dragging) return;
    this.resetting?.kill();
    this.vYaw = 0;
    const target = Math.round(this.yaw / TAU) * TAU;
    this.resetting = gsap.to(this, {
      yaw: target, pitch: 0, duration: this.reduced ? 0 : duration, ease: 'power3.inOut',
      onComplete: () => { this.yaw = 0; }, // same pose; drop the extra turns
    });
  }

  /** Call every frame with the delta time and the current chapter index. */
  update(dt: number, chapter: number) {
    if (chapter !== this.chapter) {
      if (this.chapter !== -1 && (this.yaw !== 0 || this.pitch !== 0)) this.reset();
      this.chapter = chapter;
    }
    if (!this.dragging && Math.abs(this.vYaw) > 0.01) {
      this.yaw += this.vYaw * dt;
      this.vYaw *= Math.exp(-dt * 2.6);
    }
  }
}
