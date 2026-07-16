// Minimal robots.txt compliance for web-crawl adapters. Every page-crawling
// source must call isAllowed() before fetching a URL.

const cache = new Map<string, string[]>();

async function disallowedPaths(origin: string): Promise<string[]> {
  const cached = cache.get(origin);
  if (cached) return cached;
  let rules: string[] = [];
  try {
    const res = await fetch(`${origin}/robots.txt`);
    if (res.ok) {
      const text = await res.text();
      let applies = false;
      for (const raw of text.split("\n")) {
        const line = raw.split("#")[0].trim();
        const [key, ...rest] = line.split(":");
        const value = rest.join(":").trim();
        if (/^user-agent$/i.test(key)) {
          applies = value === "*";
        } else if (applies && /^disallow$/i.test(key) && value) {
          rules.push(value);
        }
      }
    }
  } catch {
    // If robots.txt is unreachable, be conservative and disallow everything.
    rules = ["/"];
  }
  cache.set(origin, rules);
  return rules;
}

export async function isAllowed(url: string): Promise<boolean> {
  const { origin, pathname } = new URL(url);
  const rules = await disallowedPaths(origin);
  return !rules.some((rule) => pathname.startsWith(rule));
}

/** Polite delay between requests to the same host. */
export function politeDelay(ms = 1500): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
