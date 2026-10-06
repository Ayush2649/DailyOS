export interface ValidationResult {
  valid: boolean;
  reason?: string;
  hostname?: string;
}

/**
 * Allowed Web Push service domains.
 * Hostname matching must be exact or at a ".<suffix>" boundary.
 */
const ALLOWED_SUFFIXES = [
  "fcm.googleapis.com",
  "android.googleapis.com",
  "push.apple.com",
  "push.services.mozilla.com",
  "notify.windows.com",
  "wns.windows.com",
];

/**
 * Validates a Web Push endpoint URL.
 * Enforces:
 * - String up to 2048 characters
 * - HTTPS protocol only
 * - Port 443 or none
 * - No userinfo
 * - Hostname matches allowed services exactly or at a `.<suffix>` boundary
 */
export function validatePushEndpoint(endpoint: unknown): ValidationResult {
  if (typeof endpoint !== "string" || !endpoint.trim()) {
    return { valid: false, reason: "endpoint_missing" };
  }

  if (endpoint.length > 2048) {
    return { valid: false, reason: "endpoint_too_long" };
  }

  if (!endpoint.startsWith("https://")) {
    return { valid: false, reason: "non_https_protocol" };
  }

  let parsed: URL;
  try {
    parsed = new URL(endpoint);
  } catch {
    return { valid: false, reason: "invalid_url_syntax" };
  }

  const hostname = parsed.hostname.toLowerCase();

  if (parsed.protocol !== "https:") {
    return { valid: false, reason: "non_https_protocol", hostname };
  }

  // Reject userinfo (e.g. https://fcm.googleapis.com@attacker.com/)
  if (parsed.username || parsed.password) {
    return { valid: false, reason: "userinfo_not_allowed", hostname };
  }

  // Require port 443 (or default empty string)
  if (parsed.port && parsed.port !== "443") {
    return { valid: false, reason: "non_standard_port", hostname };
  }

  // Host boundary match: exact or .<suffix>
  const isAllowed = ALLOWED_SUFFIXES.some(
    (suffix) => hostname === suffix || hostname.endsWith("." + suffix)
  );

  if (!isAllowed) {
    return { valid: false, reason: "unsupported_push_host", hostname };
  }

  return { valid: true, hostname };
}
