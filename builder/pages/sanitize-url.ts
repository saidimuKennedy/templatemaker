/**
 * Rejects dangerous URL schemes before they reach navigation or href output.
 * Shared by page link resolution and action navigate steps.
 */
export function isSafeNavigationUrl(url: string): boolean {
  const trimmed = url.trim();
  if (trimmed === "") {
    return false;
  }
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:")) {
    return false;
  }
  return true;
}
