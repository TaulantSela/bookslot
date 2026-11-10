// Embed plumbing that doesn't depend on the database: which sites may frame
// the widget, and how the widget identifies the page that embeds it.

export const MAX_EMBED_DOMAINS = 10;

// A CSP host-source: optional scheme, then either an optional "*." wildcard
// plus a hostname with a real TLD, or localhost, or an IPv4 address; then an
// optional port. Paths are not allowed.
const HOST_SOURCE =
  /^(https?:\/\/)?((\*\.)?(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}|localhost|(?:\d{1,3}\.){3}\d{1,3})(:\d{1,5})?$/;

/**
 * Turns what an owner types ("Example.com/", "https://www.example.com/book")
 * into a CSP host-source ("example.com", "https://www.example.com"), or null.
 */
export function normalizeEmbedDomain(input: string): string | null {
  let value = input.trim().toLowerCase();
  if (!value) return null;
  // Drop any path, query or fragment after the host.
  const schemeEnd = value.indexOf("://");
  const hostStart = schemeEnd === -1 ? 0 : schemeEnd + 3;
  const pathStart = value.slice(hostStart).search(/[/?#]/);
  if (pathStart !== -1) value = value.slice(0, hostStart + pathStart);
  return HOST_SOURCE.test(value) ? value : null;
}

/**
 * Parses the owner's list (one per line or comma-separated). Returns the
 * cleaned, de-duplicated list plus the entries that weren't valid.
 */
export function parseEmbedDomains(input: string) {
  const domains: string[] = [];
  const invalid: string[] = [];
  for (const entry of input.split(/[\n,]+/)) {
    if (!entry.trim()) continue;
    const domain = normalizeEmbedDomain(entry);
    if (!domain) invalid.push(entry.trim());
    else if (!domains.includes(domain)) domains.push(domain);
  }
  return { domains, invalid };
}

/**
 * CSP frame-ancestors for a shop's embed. Always allows our own origin (the
 * dashboard previews the widget); an empty list allows any site.
 */
export function embedFrameAncestors(domains: string[] | null | undefined) {
  if (!domains || domains.length === 0) return "frame-ancestors 'self' *";
  const allowed = domains
    .map(normalizeEmbedDomain)
    .filter((d): d is string => d !== null);
  // A restricted list that turned out entirely invalid must not widen to "*".
  return allowed.length
    ? `frame-ancestors 'self' ${allowed.join(" ")}`
    : "frame-ancestors 'self'";
}

/** The embedding page's origin as passed by widget.js, or null if it isn't one. */
export function parseParentOrigin(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.origin === value ? url.origin : null;
  } catch {
    return null;
  }
}

/** Widget instance id (lets a page tell several widgets apart), or null. */
export function parseInstanceId(value: unknown): string | null {
  return typeof value === "string" && /^[a-z0-9_-]{1,40}$/i.test(value)
    ? value
    : null;
}
