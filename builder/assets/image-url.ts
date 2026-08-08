import { getPlaceholderByPath } from "./placeholders";

const RESPONSIVE_WIDTHS = [400, 800, 1200, 1600] as const;

export interface ResponsiveImageSources {
  readonly src: string;
  readonly srcSet?: string;
  readonly sizes?: string;
  readonly loading?: "lazy" | "eager";
}

function isCloudinaryUrl(url: string): boolean {
  return url.includes("res.cloudinary.com/");
}

function cloudinaryTransformUrl(url: string, width: number): string {
  const marker = "/upload/";
  const index = url.indexOf(marker);
  if (index === -1) {
    return url;
  }
  const prefix = url.slice(0, index + marker.length);
  const suffix = url.slice(index + marker.length);
  if (suffix.startsWith("w_") || suffix.startsWith("f_auto")) {
    return `${prefix}f_auto,q_auto,w_${width},c_limit/${suffix.replace(/^[^/]+\//, "")}`;
  }
  return `${prefix}f_auto,q_auto,w_${width},c_limit/${suffix}`;
}

/** Client-safe responsive src generation — no provider SDK imports. */
export function buildResponsiveImageSources(src: string): ResponsiveImageSources {
  if (!src) {
    return { src: "" };
  }

  if (isCloudinaryUrl(src)) {
    const srcSet = RESPONSIVE_WIDTHS.map(
      (width) => `${cloudinaryTransformUrl(src, width)} ${width}w`,
    ).join(", ");
    return {
      src: cloudinaryTransformUrl(src, 800),
      srcSet,
      sizes: "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 800px",
      loading: "lazy",
    };
  }

  if (getPlaceholderByPath(src)) {
    return { src, loading: "lazy" };
  }

  return { src };
}
