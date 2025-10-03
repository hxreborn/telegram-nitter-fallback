import fetch from "node-fetch";

const healthCache = new Map<
  string,
  { isHealthy: boolean; lastChecked: number }
>();
const HEALTH_CHECK_TTL = 5 * 60 * 1000;
const HEALTH_CHECK_TIMEOUT = 5000;

async function checkInstanceHealth(instance: URL): Promise<boolean> {
  const cacheKey = instance.toString();
  const cached = healthCache.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.lastChecked < HEALTH_CHECK_TTL) {
    return cached.isHealthy;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

    const response = await fetch(instance.toString(), {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      healthCache.set(cacheKey, { isHealthy: false, lastChecked: now });
      return false;
    }

    const text = await response.text();
    const textSample = text.slice(0, 2048);
    const looksRateLimited = /Instance has been rate limited|Just a moment|Enable JavaScript and cookies|Checking your browser/i.test(textSample);

    const isHealthy = !looksRateLimited;
    healthCache.set(cacheKey, { isHealthy, lastChecked: now });
    return isHealthy;
  } catch (error) {
    healthCache.set(cacheKey, { isHealthy: false, lastChecked: now });
    return false;
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
