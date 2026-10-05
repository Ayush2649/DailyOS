import { describe, it, expect } from "vitest";
import { getUserKey } from "@/lib/auth/userKey";

describe("getUserKey", () => {
  it("returns user.id when id only is present", () => {
    const session = {
      user: {
        id: "usr_abc123",
      },
    };
    expect(getUserKey(session)).toBe("usr_abc123");
  });

  it("returns user.email when email only is present", () => {
    const session = {
      user: {
        email: "alice@example.com",
      },
    };
    expect(getUserKey(session)).toBe("alice@example.com");
  });

  it("returns user.id when both id and email are present (id wins)", () => {
    const session = {
      user: {
        id: "usr_abc123",
        email: "alice@example.com",
      },
    };
    expect(getUserKey(session)).toBe("usr_abc123");
  });

  it("returns null when neither id nor email is present", () => {
    expect(getUserKey({ user: {} })).toBeNull();
    expect(getUserKey({ user: { id: null, email: null } })).toBeNull();
  });

  it("returns null when session is null or undefined", () => {
    expect(getUserKey(null)).toBeNull();
    expect(getUserKey(undefined)).toBeNull();
  });
});
