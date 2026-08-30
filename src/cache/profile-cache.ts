import { env } from "../config/env.js";
import type { LinkedinProfile } from "../schemas/index.js";

import { TtlCache } from "./ttl-cache.js";

export const profileCache = new TtlCache<string, LinkedinProfile>({
  maxEntries: env.PROFILE_CACHE_MAX_ENTRIES,
  ttlMs: env.PROFILE_CACHE_TTL_MS,
});

export function createProfileCacheKey(
  apiKeyScope: string,
  canonicalProfileUrl: string,
): string {
  return `${apiKeyScope}:${canonicalProfileUrl}`;
}
