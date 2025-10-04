import fetch from "node-fetch";

const healthCache = new Map<
  string,
  { isHealthy: boolean; lastChecked: number }
>();
const HEALTH_CHECK_TTL = 5 * 60 * 1000;
const HEALTH_CHECK_TIMEOUT = 5000;
const MAX_CONTENT_LENGTH = 100 * 1024;
const MAX_HEALTH_CHECK_BYTES = 10 * 1024;
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
const RATE_LIMIT_PATTERNS = /Instance has been rate limited|Just a moment|Enable JavaScript and cookies|Checking your browser/i;

const decoder = new TextDecoder();

function looksRateLimited(sample: string): boolean {
  return RATE_LIMIT_PATTERNS.test(sample);
}

function recordHealth(cacheKey: string, healthy: boolean): boolean {
  healthCache.set(cacheKey, { isHealthy: healthy, lastChecked: Date.now() });
  return healthy;
}

async function checkInstanceHealth(instance: URL): Promise<boolean> {
  const cacheKey = instance.toString();
  const cached = healthCache.get(cacheKey);

  if (cached && Date.now() - cached.lastChecked < HEALTH_CHECK_TTL) {
    return cached.isHealthy;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

    const response = await fetch(cacheKey, {
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT },
    });

    clearTimeout(timeout);

    if (!response.ok) return recordHealth(cacheKey, false);

    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_CONTENT_LENGTH) {
      return recordHealth(cacheKey, false);
    }

    let text = "";
    let totalRead = 0;

    for await (const chunk of response.body) {
      text += decoder.decode(chunk, { stream: true });
      totalRead += chunk.length;
      if (totalRead >= MAX_HEALTH_CHECK_BYTES) {
        response.body.destroy();
        break;
      }
    }

    const healthy = !looksRateLimited(text);
    return recordHealth(cacheKey, healthy);
  } catch {
    return recordHealth(cacheKey, false);
  }
}

export async function pickHealthyInstance(
  instances: URL[]
): Promise<URL | null> {
  const shuffled = [...instances].sort(() => Math.random() - 0.5);

  return new Promise((resolve) => {
    let settledCount = 0;
    const total = shuffled.length;

    for (const instance of shuffled) {
      checkInstanceHealth(instance).then((healthy) => {
        if (healthy) {
          resolve(instance);
        } else {
          settledCount++;
          if (settledCount === total) {
            resolve(null);
          }
        }
      });
    }
  });
}
