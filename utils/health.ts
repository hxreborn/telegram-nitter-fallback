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
// Only check for bot protection and rate limiting, not "tweet not found"
// since that's a legitimate response for deleted/unavailable tweets
const BOT_PROTECTION_PATTERNS: RegExp[] = [
  /Instance has been rate limited/i,
  /Just a moment/i,
  /Enable (?:JavaScript|JS) and cookies/i,
  /Checking your browser/i,
  /__goaway_challenge/i,
  /anubis_challenge/i,
  /Making sure you'?re not a bot/i,
  /Checking you are not a bot/i,
  /Loading challenge/i,
  /bot protection/i,
  /Please wait a moment while we ensure/i,
  /DDoS protection by Cloudflare/i,
  /Attention Required!\s*\|\s*Cloudflare/i,
  /Checking if the site connection is secure/i,
  /Please stand by,? while we are checking your browser/i,
  /Your browser will redirect in a few seconds/i,
  /Verifying your request/i,
  /__cf_chl/i,
  /cf_chl_/i,
  /cf-browser-verification/i,
  /cf-turnstile/i,
  /cf-please-wait/i,
  /_cf_chl_opt/i,
  /hcaptcha-checkbox/i,
  /data-sitekey=/i,
  /cdn-cgi\/challenge-platform/i,
  /cdn-cgi\/l\/chk_jschl/i,
  /challenge-platform\/h\//i,
  /error code: 1020/i,
  /error code: 1015/i,
  /Sorry, you have been blocked/i,
];

// Just test the homepage - more reliable than testing specific tweets
// since tweet fetching from Twitter may be broken even if instance is up
const TEST_PATH = "/";

const decoder = new TextDecoder();

function hasBotProtection(sample: string): boolean {
  return BOT_PROTECTION_PATTERNS.some((pattern) => pattern.test(sample));
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

    // Test with the homepage
    const testUrl = new URL(TEST_PATH, instance);
    const response = await fetch(testUrl.toString(), {
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

    const healthy = !hasBotProtection(text);
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
