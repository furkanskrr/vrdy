/**
 * Supabase şifre sıfırlama deep link: implicit (#access_token) veya PKCE (?code=).
 */

export type SifirlamaParse =
  | { kind: "tokens"; access_token: string; refresh_token: string }
  | { kind: "pkce"; code: string };

function normalizeForUrlParse(url: string): string {
  return url.replace(/^([a-zA-Z][a-zA-Z0-9+.-]*):\/\//, (_m, scheme: string) => {
    if (scheme === "exp") return "http://exp.host/";
    return "http://app.host/";
  });
}

export function sifirlamaBaglantisiniAyikla(url: string): SifirlamaParse | null {
  if (!url || typeof url !== "string") return null;

  const hashIdx = url.indexOf("#");
  if (hashIdx >= 0) {
    const frag = url.slice(hashIdx + 1);
    const p = new URLSearchParams(frag);
    const access_token = p.get("access_token");
    if (access_token) {
      return { kind: "tokens", access_token, refresh_token: p.get("refresh_token") ?? "" };
    }
    const codeH = p.get("code");
    if (codeH) return { kind: "pkce", code: codeH };
  }

  const beforeHash = url.split("#")[0];
  const qIdx = beforeHash.indexOf("?");
  if (qIdx >= 0) {
    const p = new URLSearchParams(beforeHash.slice(qIdx + 1));
    const access_token = p.get("access_token");
    if (access_token) {
      return { kind: "tokens", access_token, refresh_token: p.get("refresh_token") ?? "" };
    }
    const code = p.get("code");
    if (code) return { kind: "pkce", code };
  }

  try {
    const u = new URL(normalizeForUrlParse(url));
    const access_token = u.searchParams.get("access_token");
    if (access_token) {
      return { kind: "tokens", access_token, refresh_token: u.searchParams.get("refresh_token") ?? "" };
    }
    const code = u.searchParams.get("code");
    if (code) return { kind: "pkce", code };
  } catch {
    /* */
  }

  return null;
}

export function sifirlamaBaglantisiMi(url: string): boolean {
  return sifirlamaBaglantisiniAyikla(url) !== null;
}
