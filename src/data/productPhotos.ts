/**
 * Generated placeholder product photos.
 *
 * These are inline SVG data URIs: no binary assets, no network requests, and
 * they scale cleanly from the 56px list thumbnail up to the full-size preview
 * modal. The visuals follow the MejaFlow palette (pine + ember on paper) so the
 * catalogue reads as one product rather than a stock-image grab bag.
 *
 * Replace any entry with a real photo URL once photography exists; the
 * `Product.photo` contract is unchanged.
 */

type Glass = 'coffee' | 'milk' | 'tea' | 'matcha' | 'clear';
type Dish = 'rice' | 'noodle' | 'pastry' | 'cake';

interface PhotoSpec {
  /** Gradient stops for the backdrop, top-left to bottom-right. */
  backdrop: [string, string];
  /** What sits in the centre of the frame. */
  subject: Glass | Dish;
  /** Liquid / food colour for the subject. */
  fill: string;
  /** Secondary colour (froth, garnish, icing). */
  accent: string;
}

interface GlassSpec extends PhotoSpec {
  subject: Glass;
}

interface DishSpec extends PhotoSpec {
  subject: Dish;
}

const DISHES: ReadonlySet<string> = new Set<Dish>(['rice', 'noodle', 'pastry', 'cake']);

function isDish(subject: Glass | Dish): subject is Dish {
  return DISHES.has(subject);
}

const PAPER = '#f4efe5';

function glassShape(kind: Glass, fill: string, accent: string): string {
  // A soft cast shadow anchors the object to a surface instead of floating it.
  const shadow = `<ellipse cx="100" cy="163" rx="46" ry="9" fill="#000" opacity="0.28"/>`;

  if (kind === 'clear') {
    // Bottled water: tall slim bottle with a cap and highlight band.
    return `${shadow}
      <rect x="76" y="26" width="48" height="22" rx="6" fill="${accent}" opacity="0.9"/>
      <path d="M78 54h44a9 9 0 0 1 9 9v86a16 16 0 0 1-16 16H85a16 16 0 0 1-16-16V63a9 9 0 0 1 9-9Z" fill="${fill}" opacity="0.5"/>
      <path d="M78 54h44a9 9 0 0 1 9 9v86a16 16 0 0 1-16 16H85a16 16 0 0 1-16-16V63a9 9 0 0 1 9-9Z" fill="none" stroke="${accent}" stroke-width="3.5" opacity="0.95"/>
      <rect x="84" y="80" width="7" height="62" rx="3.5" fill="${PAPER}" opacity="0.55"/>
      <rect x="72" y="96" width="56" height="26" rx="5" fill="${accent}" opacity="0.3"/>`;
  }

  // Tapered tumbler: wide at the rim, narrow at the base.
  const body = `
    <path d="M56 56h88l-10 100a14 14 0 0 1-14 12H80a14 14 0 0 1-14-12Z" fill="${fill}"/>
    <path d="M56 56h88l-10 100a14 14 0 0 1-14 12H80a14 14 0 0 1-14-12Z" fill="none" stroke="${PAPER}" stroke-width="3" opacity="0.6"/>
    <path d="M68 70h12l4 84H66Z" fill="${PAPER}" opacity="0.13"/>`;

  if (kind === 'coffee') {
    return `${shadow}${body}
      <ellipse cx="100" cy="56" rx="44" ry="10" fill="${accent}" opacity="0.9"/>
      <ellipse cx="100" cy="56" rx="30" ry="6" fill="${accent}"/>
      <ellipse cx="100" cy="54" rx="22" ry="4" fill="${PAPER}" opacity="0.35"/>`;
  }
  if (kind === 'milk') {
    return `${shadow}${body}
      <ellipse cx="100" cy="56" rx="44" ry="10" fill="${accent}"/>
      <path d="M64 58c8-9 14 7 22 0s14 9 22 0 14 7 22 0" fill="none" stroke="${fill}" stroke-width="4" opacity="0.5"/>
      <ellipse cx="100" cy="52" rx="26" ry="5" fill="${PAPER}" opacity="0.3"/>`;
  }
  if (kind === 'matcha') {
    return `${shadow}${body}
      <ellipse cx="100" cy="56" rx="44" ry="10" fill="${accent}" opacity="0.95"/>
      <ellipse cx="100" cy="56" rx="26" ry="5.5" fill="${PAPER}" opacity="0.55"/>
      <circle cx="100" cy="56" r="4" fill="${accent}"/>`;
  }
  // tea: tall glass with ice cubes
  return `${shadow}${body}
    <rect x="74" y="78" width="22" height="22" rx="5" fill="${PAPER}" opacity="0.42" transform="rotate(-16 85 89)"/>
    <rect x="104" y="104" width="22" height="22" rx="5" fill="${PAPER}" opacity="0.42" transform="rotate(20 115 115)"/>
    <ellipse cx="100" cy="56" rx="44" ry="10" fill="${accent}" opacity="0.85"/>`;
}

function dishShape(kind: Dish, fill: string, accent: string): string {
  if (kind === 'rice') {
    return `
      <ellipse cx="100" cy="136" rx="86" ry="34" fill="#000" opacity="0.24"/>
      <ellipse cx="100" cy="128" rx="84" ry="36" fill="${PAPER}" opacity="0.2"/>
      <ellipse cx="100" cy="124" rx="74" ry="30" fill="${accent}" opacity="0.95"/>
      <path d="M42 120c9-24 30-34 58-34s49 10 58 34c-12 18-35 27-58 27s-46-9-58-27Z" fill="${fill}"/>
      <circle cx="100" cy="114" r="21" fill="${PAPER}" opacity="0.94"/>
      <circle cx="100" cy="114" r="10" fill="${accent}" opacity="0.9"/>
      <path d="M60 128c8 5 16 7 24 7M142 130c6-2 12-5 17-10" stroke="${accent}" stroke-width="4" fill="none" opacity="0.75"/>`;
  }
  if (kind === 'noodle') {
    return `
      <ellipse cx="100" cy="136" rx="86" ry="34" fill="#000" opacity="0.24"/>
      <ellipse cx="100" cy="128" rx="84" ry="36" fill="${PAPER}" opacity="0.2"/>
      <ellipse cx="100" cy="124" rx="74" ry="30" fill="${accent}" opacity="0.95"/>
      <path d="M40 118c0-16 27-28 60-28s60 12 60 28-27 28-60 28-60-12-60-28Z" fill="${fill}"/>
      <path d="M54 112c12-11 30-16 48-16s36 5 48 16" stroke="${PAPER}" stroke-width="3" fill="none" opacity="0.5"/>
      <path d="M58 126c12 9 30 14 44 14s32-5 44-14" stroke="${PAPER}" stroke-width="3" fill="none" opacity="0.32"/>
      <circle cx="72" cy="114" r="11" fill="${PAPER}" opacity="0.85"/>
      <circle cx="128" cy="120" r="9" fill="${PAPER}" opacity="0.7"/>`;
  }
  if (kind === 'pastry') {
    return `
      <ellipse cx="100" cy="140" rx="82" ry="28" fill="#000" opacity="0.22"/>
      <ellipse cx="100" cy="134" rx="80" ry="32" fill="${PAPER}" opacity="0.18"/>
      <path d="M22 126c0-26 34-48 78-48s78 22 78 48c0 14-34 24-78 24s-78-10-78-24Z" fill="${fill}"/>
      <path d="M36 108c14-16 35-26 64-26s50 10 64 26" stroke="${accent}" stroke-width="4" fill="none" opacity="0.8"/>
      <path d="M46 120c14-10 32-15 54-15s40 5 54 15" stroke="${accent}" stroke-width="4" fill="none" opacity="0.6"/>
      <path d="M60 134c14-7 25-10 40-10s26 3 40 10" stroke="${accent}" stroke-width="4" fill="none" opacity="0.45"/>`;
  }
  // cake slice
  return `
    <ellipse cx="100" cy="150" rx="80" ry="24" fill="#000" opacity="0.22"/>
    <ellipse cx="100" cy="144" rx="76" ry="24" fill="${PAPER}" opacity="0.18"/>
    <path d="M34 138l66-74 66 74Z" fill="${fill}"/>
    <path d="M48 132l52-56 52 56" fill="none" stroke="${accent}" stroke-width="5" opacity="0.75"/>
    <path d="M34 138h132l-10 14H44Z" fill="${accent}" opacity="0.9"/>
    <circle cx="100" cy="76" r="8" fill="${accent}" opacity="0.9"/>`;
}

function buildPhoto(spec: GlassSpec): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200" role="img">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${spec.backdrop[0]}"/>
      <stop offset="1" stop-color="${spec.backdrop[1]}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.38" r="0.62">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="200" height="200" fill="url(#bg)"/>
  <rect width="200" height="200" fill="url(#glow)"/>
  ${glassShape(spec.subject, spec.fill, spec.accent)}
</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, ' ').trim())}`;
}

function buildDish(spec: DishSpec): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200" role="img">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${spec.backdrop[0]}"/>
      <stop offset="1" stop-color="${spec.backdrop[1]}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.38" r="0.62">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.2"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="200" height="200" fill="url(#bg)"/>
  <rect width="200" height="200" fill="url(#glow)"/>
  ${dishShape(spec.subject, spec.fill, spec.accent)}
</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, ' ').trim())}`;
}

const PINE: [string, string] = ['#1b3529', '#0b1712'];
const EMBER: [string, string] = ['#c4573a', '#8e2c19'];
const CLAY: [string, string] = ['#8a6a4f', '#4a3527'];
const OLIVE: [string, string] = ['#4d6b3f', '#22331c'];
const STONE: [string, string] = ['#5c6b73', '#26313a'];

/** Keyed by a stable slug so multiple branches can share one rendering. */
const photoSpecs: Record<string, PhotoSpec> = {
  americano: { backdrop: PINE, subject: 'coffee', fill: '#3a2216', accent: '#c98d62' },
  cappuccino: { backdrop: CLAY, subject: 'coffee', fill: '#7a4a2a', accent: '#f0dcc4' },
  'kopi-susu': { backdrop: CLAY, subject: 'milk', fill: '#a9793f', accent: '#f3e4cd' },
  'es-kopi-kelapa': { backdrop: CLAY, subject: 'coffee', fill: '#4a2d1c', accent: '#e8e0cc' },
  matcha: { backdrop: OLIVE, subject: 'matcha', fill: '#7d9b52', accent: '#eef3e2' },
  'es-teh': { backdrop: EMBER, subject: 'tea', fill: '#a2541f', accent: '#f6dfb8' },
  'air-mineral': { backdrop: STONE, subject: 'clear', fill: '#cfe3ea', accent: '#eaf4f7' },
  'nasi-goreng': { backdrop: PINE, subject: 'rice', fill: '#c9a15e', accent: '#7a4a24' },
  'mie-ayam': { backdrop: CLAY, subject: 'noodle', fill: '#d8ab5f', accent: '#8a4f24' },
  croissant: { backdrop: EMBER, subject: 'pastry', fill: '#cf9548', accent: '#8a5a22' },
  'banana-cake': { backdrop: CLAY, subject: 'cake', fill: '#c78648', accent: '#6f4423' },
  'nasi-goreng-uji': { backdrop: PINE, subject: 'rice', fill: '#c9a15e', accent: '#7a4a24' },
  'es-jeruk': { backdrop: EMBER, subject: 'tea', fill: '#e08a1e', accent: '#fdf0cf' },
};

/** Product id → photo slug. Products absent from this map keep the placeholder icon. */
const productPhotoSlugs: Record<string, string> = {
  prd_kmg_americano: 'americano',
  prd_kmg_cappuccino: 'cappuccino',
  prd_kmg_kopi_susu: 'kopi-susu',
  prd_kmg_kelapa: 'es-kopi-kelapa',
  prd_kmg_matcha: 'matcha',
  prd_kmg_teh: 'es-teh',
  prd_kmg_air: 'air-mineral',
  prd_kmg_nasgor: 'nasi-goreng',
  prd_kmg_mie: 'mie-ayam',
  prd_kmg_croissant: 'croissant',
  prd_kmg_banana: 'banana-cake',
  prd_snp_kopi_susu: 'kopi-susu',
  prd_snp_americano: 'americano',
  prd_snp_matcha: 'matcha',
  prd_snp_nasgor: 'nasi-goreng',
  prd_snp_mie: 'mie-ayam',
  prd_snp_croissant: 'croissant',
  prd_uji_nasgor: 'nasi-goreng-uji',
  prd_uji_esjeruk: 'es-jeruk',
};

const cache = new Map<string, string>();

function render(slug: string): string | null {
  const spec = photoSpecs[slug];
  if (!spec) {
    return null;
  }
  const cached = cache.get(slug);
  if (cached) {
    return cached;
  }
  const uri = isDish(spec.subject) ? buildDish({ ...spec, subject: spec.subject }) : buildPhoto({ ...spec, subject: spec.subject });
  cache.set(slug, uri);
  return uri;
}

/** Returns a generated photo data URI for a product, or null when none is mapped. */
export function productPhoto(productId: string): string | null {
  const slug = productPhotoSlugs[productId];
  return slug ? render(slug) : null;
}
