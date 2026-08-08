/**
 * Curated placeholder photographs bundled in public/placeholders/.
 * Sourced from Pexels (free for commercial use — licence verified 2026-08-08).
 */

export interface PlaceholderAsset {
  readonly key: string;
  readonly path: string;
  readonly aspectRatio: string;
  readonly description: string;
  readonly sourceUrl: string;
  readonly photographer: string;
}

export const PLACEHOLDER_MANIFEST: readonly PlaceholderAsset[] = [
  {
    key: "portrait-plant",
    path: "/placeholders/portrait-plant.jpg",
    aspectRatio: "3/4",
    description: "Potted plant on neutral wall, warm tone, portrait",
    sourceUrl: "https://www.pexels.com/photo/green-plant-on-white-ceramic-pot-1084199/",
    photographer: "Lydia Bond",
  },
  {
    key: "portrait-calm",
    path: "/placeholders/portrait-calm.jpg",
    aspectRatio: "3/4",
    description: "Soft neutral interior, calm portrait crop",
    sourceUrl: "https://www.pexels.com/photo/white-and-brown-wooden-table-1457842/",
    photographer: "Lisa Fotios",
  },
  {
    key: "landscape-desk",
    path: "/placeholders/landscape-desk.jpg",
    aspectRatio: "4/3",
    description: "Minimal desk workspace, landscape",
    sourceUrl: "https://www.pexels.com/photo/macbook-pro-on-brown-wooden-table-374074/",
    photographer: "Burst",
  },
  {
    key: "landscape-nature",
    path: "/placeholders/landscape-nature.jpg",
    aspectRatio: "4/3",
    description: "Calm green landscape, muted tones",
    sourceUrl: "https://www.pexels.com/photo/green-grass-field-near-mountain-during-golden-hour-417074/",
    photographer: "Pixabay",
  },
  {
    key: "banner-wide",
    path: "/placeholders/banner-wide.jpg",
    aspectRatio: "16/9",
    description: "Wide neutral banner, soft light",
    sourceUrl: "https://www.pexels.com/photo/white-and-gray-abstract-painting-2832382/",
    photographer: "Eberhard Grossgasteiger",
  },
  {
    key: "banner-architecture",
    path: "/placeholders/banner-architecture.jpg",
    aspectRatio: "16/9",
    description: "Clean architecture wide shot",
    sourceUrl: "https://www.pexels.com/photo/low-angle-photography-of-white-concrete-building-323780/",
    photographer: "Expect Best",
  },
  {
    key: "square-object",
    path: "/placeholders/square-object.jpg",
    aspectRatio: "1/1",
    description: "Single object on neutral background, square",
    sourceUrl: "https://www.pexels.com/photo/white-ceramic-mug-on-white-surface-1027130/",
    photographer: "Lisa Fotios",
  },
  {
    key: "square-texture",
    path: "/placeholders/square-texture.jpg",
    aspectRatio: "1/1",
    description: "Subtle texture, square crop",
    sourceUrl: "https://www.pexels.com/photo/white-and-gray-abstract-painting-2832042/",
    photographer: "Eberhard Grossgasteiger",
  },
  {
    key: "portrait-person-neutral",
    path: "/placeholders/portrait-person-neutral.jpg",
    aspectRatio: "3/4",
    description: "Neutral portrait, professional tone",
    sourceUrl: "https://www.pexels.com/photo/woman-wearing-gray-blazer-1181690/",
    photographer: "Christina Morillo",
  },
  {
    key: "landscape-coffee",
    path: "/placeholders/landscape-coffee.jpg",
    aspectRatio: "4/3",
    description: "Coffee cup still life, warm neutral",
    sourceUrl: "https://www.pexels.com/photo/person-holding-white-ceramic-mug-1002543/",
    photographer: "Chevanon Photography",
  },
  {
    key: "banner-sky",
    path: "/placeholders/banner-sky.jpg",
    aspectRatio: "16/9",
    description: "Soft sky gradient, wide banner",
    sourceUrl: "https://www.pexels.com/photo/white-clouds-and-blue-sky-907485/",
    photographer: "Emiliano Arano",
  },
  {
    key: "square-leaf",
    path: "/placeholders/square-leaf.jpg",
    aspectRatio: "1/1",
    description: "Green leaf macro, calm square",
    sourceUrl: "https://www.pexels.com/photo/green-leaf-plant-1084199/",
    photographer: "Lydia Bond",
  },
] as const;

export function getPlaceholderByKey(key: string): PlaceholderAsset | undefined {
  return PLACEHOLDER_MANIFEST.find((entry) => entry.key === key);
}

export function getPlaceholderByPath(path: string): PlaceholderAsset | undefined {
  return PLACEHOLDER_MANIFEST.find((entry) => entry.path === path);
}
