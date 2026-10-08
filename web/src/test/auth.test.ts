import { describe, it, expect, beforeEach } from "vitest";
import {
  saveToken,
  getToken,
  removeToken,
  isTokenValid,
  decodeToken,
  getCurrentRole,
} from "../lib/auth";

// Minimal JWT with exp in future (real RS256 signature not needed — we only test decode+exp logic)
function makeToken(role: string, expOffsetSeconds: number): string {
  const payload = {
    sub: "user-test",
    role,
    exp: Math.floor(Date.now() / 1000) + expOffsetSeconds,
  };
  const encoded = btoa(JSON.stringify(payload));
  return `header.${encoded}.signature`;
}

beforeEach(() => {
  localStorage.clear();
});

describe("token storage", () => {
  it("saves and retrieves token", () => {
    saveToken("abc");
    expect(getToken()).toBe("abc");
  });

  it("removeToken clears storage", () => {
    saveToken("abc");
    removeToken();
    expect(getToken()).toBeNull();
  });
});

describe("isTokenValid", () => {
  it("returns false for null", () => {
    expect(isTokenValid(null)).toBe(false);
  });

  it("returns false for malformed token", () => {
    expect(isTokenValid("not.a.token")).toBe(false);
  });

  it("returns false for expired token", () => {
    const token = makeToken("admin", -60);
    expect(isTokenValid(token)).toBe(false);
  });

  it("returns true for valid token", () => {
    const token = makeToken("admin", 3600);
    expect(isTokenValid(token)).toBe(true);
  });
});

describe("decodeToken", () => {
  it("decodes payload correctly", () => {
    const token = makeToken("employee", 3600);
    const payload = decodeToken(token);
    expect(payload?.role).toBe("employee");
    expect(payload?.sub).toBe("user-test");
  });

  it("returns null for bad base64", () => {
    expect(decodeToken("a.!!!.b")).toBeNull();
  });
});

describe("getCurrentRole", () => {
  it("returns null when no token", () => {
    expect(getCurrentRole()).toBeNull();
  });

  it("returns role from stored token", () => {
    saveToken(makeToken("admin", 3600));
    expect(getCurrentRole()).toBe("admin");
  });
});
