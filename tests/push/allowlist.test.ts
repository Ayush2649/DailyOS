import { describe, it, expect } from "vitest";
import { validatePushEndpoint } from "@/lib/push/allowlist";

describe("validatePushEndpoint", () => {
  describe("Valid push services", () => {
    it("accepts FCM on fcm.googleapis.com", () => {
      const res = validatePushEndpoint("https://fcm.googleapis.com/fcm/send/token123");
      expect(res.valid).toBe(true);
      expect(res.hostname).toBe("fcm.googleapis.com");
    });

    it("accepts FCM on subdomains of fcm.googleapis.com", () => {
      const res = validatePushEndpoint("https://sub.fcm.googleapis.com/fcm/send/token123");
      expect(res.valid).toBe(true);
      expect(res.hostname).toBe("sub.fcm.googleapis.com");
    });

    it("accepts legacy Android GCM on android.googleapis.com", () => {
      const res = validatePushEndpoint("https://android.googleapis.com/gcm/send/token123");
      expect(res.valid).toBe(true);
      expect(res.hostname).toBe("android.googleapis.com");
    });

    it("accepts Apple Web Push on web.push.apple.com", () => {
      const res = validatePushEndpoint("https://web.push.apple.com/some/path");
      expect(res.valid).toBe(true);
      expect(res.hostname).toBe("web.push.apple.com");
    });

    it("accepts Apple Web Push on subdomains of push.apple.com", () => {
      const res = validatePushEndpoint("https://p01.push.apple.com/some/path");
      expect(res.valid).toBe(true);
      expect(res.hostname).toBe("p01.push.apple.com");
    });

    it("accepts Mozilla Autopush on updates.push.services.mozilla.com", () => {
      const res = validatePushEndpoint("https://updates.push.services.mozilla.com/push/some/path");
      expect(res.valid).toBe(true);
      expect(res.hostname).toBe("updates.push.services.mozilla.com");
    });

    it("accepts Mozilla Autopush on subdomains of push.services.mozilla.com", () => {
      const res = validatePushEndpoint("https://dom.push.services.mozilla.com/push/path");
      expect(res.valid).toBe(true);
      expect(res.hostname).toBe("dom.push.services.mozilla.com");
    });

    it("accepts Windows WNS on notify.windows.com and subdomains", () => {
      const res1 = validatePushEndpoint("https://db5.notify.windows.com/w/?token=some-wns-token");
      expect(res1.valid).toBe(true);
      expect(res1.hostname).toBe("db5.notify.windows.com");

      const res2 = validatePushEndpoint("https://notify.windows.com/token");
      expect(res2.valid).toBe(true);
      expect(res2.hostname).toBe("notify.windows.com");
    });

    it("accepts Windows WNS on subdomains of wns.windows.com", () => {
      const res = validatePushEndpoint("https://client.wns.windows.com/token");
      expect(res.valid).toBe(true);
      expect(res.hostname).toBe("client.wns.windows.com");
    });

    it("accepts HTTPS with standard port 443 explicitly specified", () => {
      const res = validatePushEndpoint("https://fcm.googleapis.com:443/fcm/send/token");
      expect(res.valid).toBe(true);
      expect(res.hostname).toBe("fcm.googleapis.com");
    });
  });

  describe("Lookalike attacks and security restrictions (must reject)", () => {
    it("rejects fcm.googleapis.com.attacker.com", () => {
      const res = validatePushEndpoint("https://fcm.googleapis.com.attacker.com/send");
      expect(res.valid).toBe(false);
      expect(res.reason).toBe("unsupported_push_host");
      expect(res.hostname).toBe("fcm.googleapis.com.attacker.com");
    });

    it("rejects evil-fcm.googleapis.com.attacker.com", () => {
      const res = validatePushEndpoint("https://evil-fcm.googleapis.com.attacker.com/send");
      expect(res.valid).toBe(false);
      expect(res.reason).toBe("unsupported_push_host");
    });

    it("rejects evil-fcm.googleapis.com (hyphen instead of dot suffix)", () => {
      const res = validatePushEndpoint("https://evil-fcm.googleapis.com/send");
      expect(res.valid).toBe(false);
      expect(res.reason).toBe("unsupported_push_host");
    });

    it("rejects userinfo embedded in URL: https://fcm.googleapis.com@attacker.com/", () => {
      const res = validatePushEndpoint("https://fcm.googleapis.com@attacker.com/");
      expect(res.valid).toBe(false);
      expect(res.reason).toBe("userinfo_not_allowed");
      expect(res.hostname).toBe("attacker.com");
    });

    it("rejects userinfo credentials: https://user:pass@fcm.googleapis.com/send", () => {
      const res = validatePushEndpoint("https://user:pass@fcm.googleapis.com/send");
      expect(res.valid).toBe(false);
      expect(res.reason).toBe("userinfo_not_allowed");
    });

    it("rejects non-https (http://)", () => {
      const res = validatePushEndpoint("http://fcm.googleapis.com/fcm/send");
      expect(res.valid).toBe(false);
      expect(res.reason).toBe("non_https_protocol");
    });

    it("rejects non-443 port (e.g. :8443, :8080, :80)", () => {
      const res1 = validatePushEndpoint("https://fcm.googleapis.com:8443/fcm/send");
      expect(res1.valid).toBe(false);
      expect(res1.reason).toBe("non_standard_port");

      const res2 = validatePushEndpoint("https://web.push.apple.com:80/send");
      expect(res2.valid).toBe(false);
      expect(res2.reason).toBe("non_standard_port");
    });

    it("rejects protocol-relative URLs", () => {
      const res = validatePushEndpoint("//fcm.googleapis.com/fcm/send");
      expect(res.valid).toBe(false);
      expect(res.reason).toBe("non_https_protocol");
    });

    it("rejects endpoint strings exceeding length limit of 2048", () => {
      const longUrl = "https://fcm.googleapis.com/fcm/send/" + "x".repeat(2100);
      const res = validatePushEndpoint(longUrl);
      expect(res.valid).toBe(false);
      expect(res.reason).toBe("endpoint_too_long");
    });
  });
});
