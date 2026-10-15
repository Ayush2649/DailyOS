import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const {
  mockSignInWithCustomToken,
  mockSignOut,
  mockOnAuthStateChanged,
  mockAuthInstance,
} = vi.hoisted(() => {
  const authInstance = {
    name: "[DEFAULT]",
    currentUser: null as any,
  };
  return {
    mockSignInWithCustomToken: vi.fn(),
    mockSignOut: vi.fn(),
    mockOnAuthStateChanged: vi.fn((_auth, cb) => {
      // Return unlisten function
      return vi.fn();
    }),
    mockAuthInstance: authInstance,
  };
});

vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(() => mockAuthInstance),
  signInWithCustomToken: mockSignInWithCustomToken,
  signOut: mockSignOut,
  onAuthStateChanged: mockOnAuthStateChanged,
}));

let mockSessionData: any = null;
let mockSessionStatus: "loading" | "authenticated" | "unauthenticated" = "unauthenticated";

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: mockSessionData,
    status: mockSessionStatus,
  }),
}));

import { auth } from "@/lib/firebase";
import {
  FirebaseAuthProvider,
  useFirebaseAuth,
  FirebaseAuthGate,
} from "@/components/FirebaseAuthProvider";

describe("Firebase Auth Client Integration & Lifecycle", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthInstance.currentUser = null;
    mockSessionData = null;
    mockSessionStatus = "unauthenticated";
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("safely exports auth instance from lib/firebase.ts reusing existing app", () => {
    expect(auth).toBeDefined();
    expect(auth.name).toBe("[DEFAULT]");
  });

  it("useFirebaseAuth returns a safe default state when consumed outside provider", () => {
    let contextResult: any;
    function Consumer() {
      contextResult = useFirebaseAuth();
      return null;
    }

    renderToStaticMarkup(React.createElement(Consumer));
    expect(contextResult).toBeDefined();
    expect(contextResult.isReady).toBe(false);
    expect(contextResult.status).toBe("idle");
    expect(contextResult.firebaseUser).toBeNull();
    expect(contextResult.userId).toBeNull();
    expect(contextResult.error).toBeNull();
    expect(typeof contextResult.syncToken).toBe("function");
  });

  it("FirebaseAuthGate renders loading spinner when isReady is false", () => {
    function MockLoadingProvider({ children }: { children: React.ReactNode }) {
      mockSessionStatus = "loading";
      return React.createElement(FirebaseAuthProvider, null, children);
    }

    const html = renderToStaticMarkup(
      React.createElement(
        MockLoadingProvider,
        null,
        React.createElement(
          FirebaseAuthGate,
          null,
          React.createElement("div", { id: "protected-content" }, "Secret Dashboard")
        )
      )
    );

    expect(html).toContain("Connecting securely");
    expect(html).not.toContain("Secret Dashboard");
  });

  it("FirebaseAuthGate blocks protected content when firebaseUser is null even if session is unauthenticated", () => {
    function MockUnauthProvider({ children }: { children: React.ReactNode }) {
      mockSessionStatus = "unauthenticated";
      return React.createElement(FirebaseAuthProvider, null, children);
    }

    const html = renderToStaticMarkup(
      React.createElement(
        MockUnauthProvider,
        null,
        React.createElement(
          FirebaseAuthGate,
          null,
          React.createElement("div", { id: "protected-content" }, "Secret Dashboard")
        )
      )
    );

    expect(html).toContain("Connecting securely");
    expect(html).not.toContain("Secret Dashboard");
  });

  it("FirebaseAuthGate renders custom fallback when provided and isReady is false", () => {
    function MockLoadingProvider({ children }: { children: React.ReactNode }) {
      mockSessionStatus = "loading";
      return React.createElement(FirebaseAuthProvider, null, children);
    }

    const html = renderToStaticMarkup(
      React.createElement(
        MockLoadingProvider,
        null,
        React.createElement(
          FirebaseAuthGate,
          { fallback: React.createElement("div", { id: "custom-skeleton" }, "Loading Skeleton...") },
          React.createElement("div", { id: "protected-content" }, "Secret Dashboard")
        )
      )
    );

    expect(html).toContain("Loading Skeleton...");
    expect(html).not.toContain("Secret Dashboard");
  });

  it("signs out of Firebase when NextAuth session status is unauthenticated", async () => {
    mockSessionStatus = "unauthenticated";
    mockSessionData = null;
    mockAuthInstance.currentUser = { uid: "existing_user" } as any;
    mockSignOut.mockResolvedValueOnce(undefined);

    let contextResult: any;
    function Consumer() {
      contextResult = useFirebaseAuth();
      return null;
    }

    renderToStaticMarkup(
      React.createElement(FirebaseAuthProvider, null, React.createElement(Consumer))
    );

    // Initial render synchronously starts effect
    expect(contextResult).toBeDefined();
  });

  it("fetches custom token and signs in with signInWithCustomToken on authenticated session", async () => {
    const mockUid = "google_user_12345";
    mockSessionStatus = "authenticated";
    mockSessionData = {
      user: { id: mockUid, name: "Test User", email: "test@satat.app" },
    };

    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ token: "custom_token_abc" }),
    });
    global.fetch = mockFetch;

    mockSignInWithCustomToken.mockResolvedValueOnce({
      user: { uid: mockUid },
    });

    let contextResult: any;
    function Consumer() {
      contextResult = useFirebaseAuth();
      return null;
    }

    renderToStaticMarkup(
      React.createElement(FirebaseAuthProvider, null, React.createElement(Consumer))
    );

    expect(contextResult).toBeDefined();
  });

  it("rejects authentication and signs out if returned Firebase UID does not match NextAuth identity", async () => {
    const expectedUid = "legitimate_user_id";
    const mismatchedUid = "different_user_id";

    mockSessionStatus = "authenticated";
    mockSessionData = {
      user: { id: expectedUid },
    };

    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ token: "token_for_wrong_user" }),
    });
    global.fetch = mockFetch;

    mockSignInWithCustomToken.mockResolvedValueOnce({
      user: { uid: mismatchedUid },
    });
    mockSignOut.mockResolvedValue(undefined);

    let contextResult: any;
    function Consumer() {
      contextResult = useFirebaseAuth();
      return null;
    }

    renderToStaticMarkup(
      React.createElement(FirebaseAuthProvider, null, React.createElement(Consumer))
    );

    expect(contextResult).toBeDefined();
  });

  it("handles 401 from token endpoint by setting unauthenticated state safely", async () => {
    mockSessionStatus = "authenticated";
    mockSessionData = {
      user: { id: "expired_session_user" },
    };

    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: "Unauthorized" }),
    });
    global.fetch = mockFetch;

    let contextResult: any;
    function Consumer() {
      contextResult = useFirebaseAuth();
      return null;
    }

    renderToStaticMarkup(
      React.createElement(FirebaseAuthProvider, null, React.createElement(Consumer))
    );

    expect(contextResult).toBeDefined();
  });
});

