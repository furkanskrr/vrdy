#!/usr/bin/env node
/**
 * Canlı ortam + Supabase şema smoke testi
 * Kullanım: node scripts/live-canli-test.mjs [email] [sifre]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadEnv() {
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

const env = { ...loadEnv(), ...process.env };
const SUPABASE_URL = env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const ANON_KEY = env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
const WEB_URL = env.EXPO_PUBLIC_WEB_URL ?? "https://vrdy.vercel.app";

const TABLOLAR = [
  { ad: "profiles", sql: "schema.sql", not: "expo_push_token sütunu push için" },
  { ad: "groups", sql: "schema.sql" },
  { ad: "group_members", sql: "schema.sql" },
  { ad: "shift_overrides", sql: "schema.sql" },
  { ad: "group_messages", sql: "group_messages.sql" },
  { ad: "group_chat_shortcuts", sql: "group_chat_media_shortcuts.sql" },
  { ad: "group_chat_reads", sql: "group_chat_reads.sql" },
  { ad: "group_pinned_messages", sql: "group_pinned_messages.sql" },
  { ad: "group_cleaning_completions", sql: "group_cleaning.sql" },
  { ad: "group_holidays", sql: "group_holidays.sql" },
  { ad: "shift_swap_requests", sql: "shift_swap_migration.sql" },
];

const RPCLER = [
  { ad: "remove_group_member", sql: "remove_group_member_rpc.sql" },
  { ad: "get_group_push_tokens", sql: "push_rpc_canli.sql" },
  { ad: "get_push_tokens_for_profiles", sql: "push_rpc_canli.sql" },
  { ad: "current_profile_group_id", sql: "schema.sql" },
];

async function supabaseRest(pathname, opts = {}) {
  const url = `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${pathname}`;
  const res = await fetch(url, {
    ...opts,
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      "Content-Type": "application/json",
      ...(opts.headers ?? {}),
    },
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, json, ok: res.ok };
}

async function tabloVarMi(tablo) {
  const r = await supabaseRest(`${tablo}?select=*&limit=0`);
  if (r.status === 200) return { durum: "ok", detay: "tablo erişilebilir" };
  const msg = typeof r.json === "object" ? r.json?.message ?? r.json?.hint : String(r.json);
  if (r.status === 404 || String(msg).includes("does not exist"))
    return { durum: "eksik", detay: msg ?? "tablo yok" };
  if (r.status === 401 || r.status === 403)
    return { durum: "ok", detay: "tablo var (RLS — anon erişim yok, normal)" };
  return { durum: "uyari", detay: `${r.status}: ${msg ?? "?"}` };
}

async function rpcVarMi(fn) {
  const r = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  const text = await r.text();
  if (r.status === 404) return { durum: "eksik", detay: "RPC bulunamadı" };
  if (text.includes("does not exist") && text.includes("function"))
    return { durum: "eksik", detay: text.slice(0, 120) };
  return { durum: "ok", detay: `RPC mevcut (HTTP ${r.status})` };
}

async function webEndpoint(url, ad) {
  try {
    const r = await fetch(url, { redirect: "follow" });
    return { ad, url, durum: r.ok ? "ok" : "hata", http: r.status };
  } catch (e) {
    return { ad, url, durum: "hata", http: 0, detay: e.message };
  }
}

async function girisYap(email, sifre) {
  const r = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password: sifre }),
  });
  const json = await r.json();
  if (!r.ok) return { ok: false, mesaj: json?.error_description ?? json?.msg ?? r.status };
  return { ok: true, token: json.access_token, user: json.user };
}

async function oturumluSorgu(token, tablo, select = "id") {
  const r = await supabaseRest(`${tablo}?select=${select}&limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return r;
}

async function main() {
  console.log("=== Vrdy Canlı Smoke Test ===\n");

  if (!SUPABASE_URL.startsWith("http") || ANON_KEY.length < 10) {
    console.error("HATA: .env içinde EXPO_PUBLIC_SUPABASE_URL ve ANON_KEY gerekli");
    process.exit(1);
  }

  // Web uçları
  console.log("## Web (Vercel)\n");
  for (const t of [
    await webEndpoint(WEB_URL, "Ana sayfa"),
    await webEndpoint(`${WEB_URL}/app-version.json`, "app-version.json"),
    await webEndpoint(`${WEB_URL}/Vardiyam.apk`, "Vardiyam.apk"),
    await webEndpoint(`${WEB_URL}/indir.html`, "indir.html"),
  ]) {
    console.log(`  ${t.durum === "ok" ? "✓" : "✗"} ${t.ad} — HTTP ${t.http}${t.detay ? ` (${t.detay})` : ""}`);
  }

  // Supabase tablolar
  console.log("\n## Supabase tablolar (21 migration ile uyum)\n");
  let eksikTablo = 0;
  for (const t of TABLOLAR) {
    const s = await tabloVarMi(t.ad);
    const ikon = s.durum === "ok" ? "✓" : s.durum === "eksik" ? "✗" : "⚠";
    if (s.durum === "eksik") eksikTablo++;
    console.log(`  ${ikon} ${t.ad.padEnd(28)} [${t.sql}] — ${s.detay}`);
  }

  console.log("\n## Supabase RPC fonksiyonları\n");
  let eksikRpc = 0;
  for (const fn of RPCLER) {
    const s = await rpcVarMi(fn.ad);
    const ikon = s.durum === "ok" ? "✓" : "✗";
    if (s.durum !== "ok") eksikRpc++;
    console.log(`  ${ikon} ${fn.ad.padEnd(28)} [${fn.sql}] — ${s.detay}`);
  }

  // Opsiyonel giriş testi
  const email = process.argv[2];
  const sifre = process.argv[3];
  if (email && sifre) {
    console.log("\n## Oturumlu API testi\n");
    const auth = await girisYap(email, sifre);
    if (!auth.ok) {
      console.log(`  ✗ Giriş başarısız: ${auth.mesaj}`);
    } else {
      console.log(`  ✓ Giriş OK — ${auth.user?.email}`);
      const token = auth.token;
      const sorgular = [
        ["profiles", "id,ad,rol,group_id,onboarding_complete"],
        ["group_members", "id,profile_id"],
        ["shift_overrides", "id"],
        ["group_holidays", "id"],
        ["shift_swap_requests", "id"],
        ["group_cleaning_completions", "id"],
        ["group_messages", "id"],
      ];
      for (const [tablo, sel] of sorgular) {
        const r = await oturumluSorgu(token, tablo, sel);
        const ikon = r.status === 200 ? "✓" : "✗";
        const msg = r.status !== 200 && typeof r.json === "object" ? r.json?.message : "";
        console.log(`  ${ikon} ${tablo} — HTTP ${r.status}${msg ? ` (${msg})` : ""}`);
      }
    }
  } else {
    console.log("\n## Oturumlu test atlandı\n");
    console.log("  Ekran testi için: node scripts/live-canli-test.mjs email sifre");
  }

  console.log("\n=== Özet ===");
  console.log(`  Tablo sorunu: ${eksikTablo}`);
  console.log(`  RPC sorunu: ${eksikRpc}`);
  process.exit(eksikTablo + eksikRpc > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
