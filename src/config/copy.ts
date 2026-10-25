/**
 * Structured copy and data. Long-form chapter copy lives in index.html so it is
 * crawlable without JavaScript or WebGL; everything that is data (prices,
 * colors, labels) lives here.
 */

export interface Colorway {
  id: 'starWhite' | 'nightSky';
  name: string;
  swatch: string;
  /** Titanium frame tint (mirror-polished). */
  frame: string;
  /** Back glass (Ceramic Shield). */
  back: string;
  /** Micro-blasted hinge cover. */
  hinge: string;
}

export const colorways: Colorway[] = [
  // Sampled from the supplied Star White photos (back glass ≈ #ecebe7).
  { id: 'starWhite', name: 'Star White', swatch: '#ecebe7', frame: '#d9d8d4', back: '#ecebe7', hinge: '#c7c6c1' },
  // Estimated — replace once a Night Sky photo is supplied (media key colors.nightSky).
  { id: 'nightSky', name: 'Night Sky', swatch: '#1e2433', frame: '#4a5161', back: '#1c2232', hinge: '#3c4251' },
];

export const accessoryColors = {
  case: [
    { id: 'navy', name: 'Navy Blue', hex: '#1f2b45' },
    { id: 'sand', name: 'Sand', hex: '#d6c6a9' },
  ],
  folio: [
    { id: 'navy', name: 'Navy Blue', hex: '#1f2b45' },
    { id: 'taupe', name: 'Taupe', hex: '#8a7c6d' },
  ],
} as const;

export interface PriceTier {
  capacity: string;
  /** null = not yet confirmed; shown as "Price to be confirmed". */
  price: string | null;
  monthly: string | null;
}

// Only the entry tier is confirmed. Fill the others once confirmed.
export const pricing: PriceTier[] = [
  { capacity: '256GB', price: '$1,999', monthly: '$83.29/mo. for 24 mo.' },
  { capacity: '512GB', price: null, monthly: null },
  { capacity: '1TB', price: null, monthly: null },
  { capacity: '2TB', price: null, monthly: null },
];

export const strings = {
  priceTbc: 'Price to be confirmed',
  loading: 'Loading iPhone Duo',
};
