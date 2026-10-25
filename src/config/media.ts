/**
 * Media manifest — the single place to swap pictures, videos and the 3D model.
 *
 * To fill a slot: drop the file into /public/assets/<images|videos|models>/ and
 * change that slot's `src` line. Paths are relative to /public.
 * A slot with `src: null` shows a generated, clearly labelled placeholder.
 *
 * Supported: .jpg .png .webp .avif (image) · .mp4 .webm (video) · .glb (model)
 */

export type MediaKind = 'image' | 'video' | 'model';

export interface MediaSlot {
  kind: MediaKind;
  /** Path under /public, or null to use the generated placeholder. */
  src: string | null;
  /** Optional smaller variant for narrow screens (images only). */
  srcSmall?: string;
  /** Poster frame for videos. */
  poster?: string;
  alt: string;
  /** Where the slot is used (for the README / QA). */
  use: string;
}

const A = 'assets';

export const media = {
  // ---------------------------------------------------------------- model
  'model.glb': {
    kind: 'model', src: null,
    alt: 'iPhone Duo 3D model',
    use: 'Optional. If set, nodes named hinge / panelLeft / panelRight drive the fold.',
  },

  // ---------------------------------------------------------------- hero
  'hero.still': {
    kind: 'image', src: `${A}/images/design-hero.webp`, srcSmall: `${A}/images/design-hero-640.webp`,
    alt: 'iPhone Duo closed, open and half-folded, in Star White',
    use: 'Hero poster, no-WebGL fallback, film gallery',
  },
  'hero.video': {
    kind: 'video', src: null,
    alt: 'iPhone Duo hero loop', use: 'Optional looping hero background',
  },

  // ---------------------------------------------------------------- outer display (5.4")
  'screen.outer.lock': {
    kind: 'image', src: `${A}/images/screen-outer-lock.jpg`,
    alt: 'Lock screen on the outer display', use: '3D outer display: hero, colors, CTA',
  },
  'screen.outer.camera': {
    kind: 'image', src: `${A}/images/screen-outer-camera.jpg`,
    alt: 'Camera preview on the outer display', use: '3D outer display: Cameras chapter (Duo Preview)',
  },
  'screen.outer.netflixClips': {
    kind: 'video', src: null,
    alt: 'Netflix Clips on the outer display', use: '3D outer display (optional)',
  },
  'screen.outer.facetime': {
    kind: 'image', src: `${A}/images/screen-outer-facetime.jpg`,
    alt: 'Hands-free FaceTime on the outer display', use: '3D outer display: Posable chapter (tent)',
  },

  // ---------------------------------------------------------------- inner display (7.6")
  'screen.inner.lock': {
    kind: 'image', src: `${A}/images/screen-inner-lock.jpg`,
    alt: 'Lock screen on the inner display', use: '3D inner display: Unfold, Display',
  },
  'screen.inner.home': {
    kind: 'image', src: `${A}/images/screen-inner-home.jpg`,
    alt: 'Home Screen, two pages', use: '3D inner display: Built to last',
  },
  'screen.inner.todayView': {
    kind: 'image', src: `${A}/images/screen-inner-todayview.jpg`,
    alt: 'Messages with a video in portrait', use: '3D inner display: iOS 27 (portrait)',
  },
  'screen.inner.splitView': {
    kind: 'image', src: `${A}/images/screen-inner-mail.jpg`,
    alt: 'Split View with Mail and Apple Intelligence summaries', use: '3D inner display: iOS 27',
  },
  'screen.inner.netflix': { kind: 'video', src: null, alt: 'Netflix on the inner display', use: '3D inner display: iOS 27, Posable' },
  'screen.inner.zoom': { kind: 'image', src: null, alt: 'Zoom on the inner display', use: '3D inner display: iOS 27' },
  'screen.inner.slack': { kind: 'image', src: null, alt: 'Slack on the inner display', use: '3D inner display: iOS 27' },
  'screen.inner.video': {
    kind: 'image', src: `${A}/images/screen-inner-video.jpg`,
    alt: 'Streaming video on the inner display', use: '3D inner display: iOS 27',
  },
  'screen.inner.game': {
    kind: 'image', src: `${A}/images/screen-inner-game.jpg`,
    alt: 'A game on the inner display', use: '3D inner display: iOS 27',
  },
  'screen.inner.reader': {
    kind: 'image', src: `${A}/images/screen-inner-reader.jpg`,
    alt: 'A reading app with Siri on the inner display', use: '3D inner display: iOS 27',
  },
  'screen.inner.tv': {
    kind: 'image', src: `${A}/images/screen-inner-tv.jpg`,
    alt: 'Video on the top half, playback controls on the bottom half', use: '3D inner display: Posable (seated)',
  },
  'screen.inner.photos': { kind: 'image', src: null, alt: 'Photos on the inner display', use: '3D inner display: Cameras' },
  'screen.inner.standby': { kind: 'image', src: `${A}/images/screen-inner-standby.jpg`, alt: 'StandBy calendar on the inner display', use: '3D inner display: Posable (standing)' },
  'screen.inner.facetime': { kind: 'image', src: `${A}/images/screen-inner-facetime.jpg`, alt: 'FaceTime on the inner display', use: '3D inner display: Posable (laptop)' },
  'screen.inner.siri': {
    kind: 'image', src: `${A}/images/screen-inner-siri.jpg`,
    alt: 'Siri AI app next to its answers', use: '3D inner display: Siri AI',
  },

  // ---------------------------------------------------------------- colors (for sampling)
  'colors.starWhite': {
    kind: 'image', src: `${A}/images/design-hero.webp`,
    alt: 'iPhone Duo in Star White', use: 'Color reference (Star White sampled #ecebe7)',
  },
  'colors.nightSky': {
    kind: 'image', src: null,
    alt: 'iPhone Duo in Night Sky', use: 'Color reference (Night Sky tones are estimated until a photo is supplied)',
  },

  // ---------------------------------------------------------------- cameras chapter
  'camera.duoPreview': {
    kind: 'video', src: `${A}/videos/camera-duo.mp4`,
    alt: 'Close-up of the two rear cameras, then the outer display showing the subject their shot',
    use: 'Cameras chapter film card + film gallery',
  },
  'camera.duoPreviewStill': {
    kind: 'image', src: `${A}/images/camera-duo-preview.webp`,
    alt: 'Duo Preview: the subject sees the shot on the outer display', use: 'Cameras chapter card',
  },
  'camera.smartTake': { kind: 'image', src: `${A}/images/camera-smart-take.webp`, alt: 'Smart Take: a group photo framed on the inner display', use: 'Cameras chapter card' },
  'camera.kidCue': { kind: 'image', src: `${A}/images/camera-kid-cue.webp`, alt: 'Kid Cue: a child on a swing in the viewfinder', use: 'Cameras chapter card' },
  'camera.duoFaceTime': { kind: 'image', src: `${A}/images/camera-duo-facetime.webp`, alt: 'Duo FaceTime with the family around iPhone Duo', use: 'Cameras chapter card' },

  // ---------------------------------------------------------------- films
  'film.unfoldLandscape': {
    kind: 'video', src: `${A}/videos/unfold-landscape.mp4`, poster: `${A}/images/display-endframe.webp`,
    alt: 'iPhone Duo unfolding into its 7.6-inch display', use: 'Film gallery, reduced-motion Unfold',
  },
  'film.unfoldPortrait': {
    kind: 'video', src: `${A}/videos/unfold-portrait.mp4`, poster: `${A}/images/unfold-1.webp`,
    alt: 'iPhone Duo opening like a book', use: 'Film gallery',
  },
  'film.displayEnd': {
    kind: 'image', src: `${A}/images/display-endframe.webp`, srcSmall: `${A}/images/display-endframe-640.webp`,
    alt: 'iPhone Duo fully open in landscape', use: 'No-WebGL fallback (Unfold / Display)',
  },
  'film.siri': {
    kind: 'image', src: `${A}/images/siri-hero.webp`, srcSmall: `${A}/images/siri-hero-480.webp`,
    alt: 'iPhone Duo open with Mail and Apple Intelligence', use: 'No-WebGL fallback (iOS 27 / Siri)',
  },
  'film.unfold1': { kind: 'image', src: `${A}/images/unfold-1.webp`, alt: 'iPhone Duo closed', use: 'No-WebGL unfold sequence 1/4' },
  'film.unfold2': { kind: 'image', src: `${A}/images/unfold-2.webp`, alt: 'iPhone Duo starting to open', use: 'No-WebGL unfold sequence 2/4' },
  'film.unfold3': { kind: 'image', src: `${A}/images/unfold-3.webp`, alt: 'iPhone Duo half open', use: 'No-WebGL unfold sequence 3/4' },
  'film.unfold4': { kind: 'image', src: `${A}/images/unfold-4.webp`, alt: 'iPhone Duo nearly open', use: 'No-WebGL unfold sequence 4/4' },

  // ---------------------------------------------------------------- durability
  'durability.hinge': { kind: 'image', src: null, alt: 'Hinge close-up', use: 'Built to last (optional still)' },
  'durability.layers': { kind: 'image', src: null, alt: 'Display layer stack', use: 'Built to last (optional still)' },
  'durability.titanium': { kind: 'image', src: null, alt: 'Titanium frame close-up', use: 'Built to last (optional still)' },

  // ---------------------------------------------------------------- accessories
  'accessories.case.navy': { kind: 'image', src: null, alt: 'iPhone Duo Case in navy blue', use: 'Accessories (3D case is procedural)' },
  'accessories.case.sand': { kind: 'image', src: `${A}/images/accessories-case.webp`, alt: 'iPhone Duo Case', use: 'Accessories' },
  'accessories.folio.navy': { kind: 'image', src: `${A}/images/accessories-folio.webp`, alt: 'Folio with Kickstand', use: 'Accessories' },
  'accessories.folio.taupe': { kind: 'image', src: null, alt: 'Folio with Kickstand in taupe', use: 'Accessories' },

  // ---------------------------------------------------------------- lifestyle
  'lifestyle.tent': { kind: 'image', src: null, alt: 'Tent pose', use: 'Posable (optional still)' },
  'lifestyle.laptop': { kind: 'image', src: null, alt: 'Laptop pose', use: 'Posable (optional still)' },
  'lifestyle.standing': { kind: 'image', src: null, alt: 'Standing pose', use: 'Posable (optional still)' },
  'lifestyle.seated': { kind: 'image', src: null, alt: 'Seated pose', use: 'Posable (optional still)' },

  // ---------------------------------------------------------------- social
  'og.image': { kind: 'image', src: `${A}/images/design-hero.jpg`, alt: 'iPhone Duo', use: 'Open Graph / Twitter card (set in index.html)' },
} satisfies Record<string, MediaSlot>;

export type MediaKey = keyof typeof media;

export function slot(key: MediaKey): MediaSlot {
  return media[key] as MediaSlot;
}

/** Resolve a /public path against Vite's base so it works in sub-folders. */
export function url(path: string): string {
  return import.meta.env.BASE_URL + path;
}

/** Slots that still need files (used by the console report and README). */
export function unfilledSlots(): MediaKey[] {
  return (Object.keys(media) as MediaKey[]).filter((k) => !slot(k).src);
}
