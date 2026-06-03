#!/usr/bin/env node
/**
 * Playwright ile canlı web ekran testi
 * Kullanım: node scripts/live-ekran-test.mjs [email] [sifre]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? "https://vrdy.vercel.app";

async function getPlaywright() {
  try {
    return await import("playwright");
  } catch {
    console.log("Playwright kuruluyor...");
    const { execSync } = await import("child_process");
    execSync("npm install --no-save playwright", { stdio: "inherit", cwd: path.join(__dirname, "..") });
    execSync("npx playwright install chromium", { stdio: "inherit", cwd: path.join(__dirname, "..") });
    return await import("playwright");
  }
}

function loadSifre() {
  const p = path.join(__dirname, "..", "şifre.txt");
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, "utf8").trim();
}

const SONUCLAR = [];

function kayit(ekran, durum, not = "") {
  SONUCLAR.push({ ekran, durum, not });
  const ikon = durum === "ok" ? "✓" : durum === "uyari" ? "⚠" : "✗";
  console.log(`  ${ikon} ${ekran}${not ? ` — ${not}` : ""}`);
}

async function main() {
  const email = process.argv[2] ?? process.env.TEST_EMAIL ?? "furkanskrr0@gmail.com";
  const sifre = process.argv[3] ?? process.env.TEST_PASSWORD ?? loadSifre() ?? "";

  console.log("=== Canlı Ekran Testi (Web) ===\n");
  console.log(`URL: ${WEB_URL}\n`);

  const { chromium } = await getPlaywright();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  try {
    // Auth ekranları
    await page.goto(WEB_URL, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(2000);

    const loginVisible =
      (await page.getByText("Giriş yap", { exact: false }).count()) > 0 ||
      (await page.getByPlaceholder(/e-?posta|email/i).count()) > 0;
    kayit("Giriş ekranı", loginVisible ? "ok" : "hata", loginVisible ? "yüklendi" : "form bulunamadı");

    // Kayıt sayfası
    const kayitLink = page.getByText("Kayıt ol", { exact: false }).first();
    if ((await kayitLink.count()) > 0) {
      await kayitLink.click();
      await page.waitForTimeout(1500);
      kayit("Kayıt ekranı", (await page.getByText("Kayıt", { exact: false }).count()) > 0 ? "ok" : "uyari");
      await page.goto(WEB_URL, { waitUntil: "networkidle" });
      await page.waitForTimeout(1500);
    }

    // Şifremi unuttum
    const sifreLink = page.getByText(/şifremi unuttum/i).first();
    if ((await sifreLink.count()) > 0) {
      await sifreLink.click();
      await page.waitForTimeout(1500);
      kayit("Şifremi unuttum", (await page.getByText(/sıfırla|e-?posta/i).count()) > 0 ? "ok" : "uyari");
      await page.goto(WEB_URL, { waitUntil: "networkidle" });
      await page.waitForTimeout(1500);
    }

    if (!sifre) {
      kayit("Ana uygulama sekmeleri", "uyari", "şifre yok — giriş atlandı");
      return;
    }

    // Giriş formu
    await page.goto(WEB_URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    const inputs = page.locator("input");
    const inputCount = await inputs.count();
    if (inputCount < 2) {
      kayit("Giriş formu", "hata", `input bulunamadı (${inputCount})`);
      return;
    }
    await inputs.nth(0).fill(email);
    await inputs.nth(1).fill(sifre);
    await page.getByText("Giriş yap", { exact: true }).last().click();
    await page.waitForTimeout(4000);

    const hataMetni = await page.locator("text=/hatalı|geçersiz|yanlış|error/i").first().textContent().catch(() => null);
    if (hataMetni) {
      kayit("Giriş", "hata", hataMetni.slice(0, 80));
      return;
    }

    const tabBar = page.locator('[role="tablist"], [class*="tab"]');
    const loggedIn =
      (await page.getByText("Ana", { exact: false }).count()) > 0 ||
      (await page.getByText(/iyi günler|günaydın|iyi akşamlar/i).count()) > 0;
    kayit("Giriş / oturum", loggedIn ? "ok" : "hata", loggedIn ? email : "ana ekran gelmedi");

    if (!loggedIn) return;

    async function sekmeyeGit(label) {
      const tab = page.getByText(label, { exact: true }).first();
      if ((await tab.count()) === 0) {
        kayit(label + " sekmesi", "hata", "tab bulunamadı");
        return false;
      }
      await tab.click();
      await page.waitForTimeout(2000);
      return true;
    }

    // Ana
    if (await sekmeyeGit("Ana")) {
      kayit("Ana ekran", "ok", "sekme açıldı");
    }

    // Vardiya
    if (await sekmeyeGit("Vardiya")) {
      const vardiyaOk =
        (await page.getByText(/vardiya|hafta|pazartesi|salı|çarşamba|perşembe|cuma|cumartesi|pazar/i).count()) > 0;
      kayit("Vardiya ekranı", vardiyaOk ? "ok" : "uyari", vardiyaOk ? "içerik var" : "boş veya yüklenmedi");
    }

    // Puantaj
    if (await sekmeyeGit("Puantaj")) {
      kayit("Puantaj ekranı", "ok", "sekme açıldı");
    }

    // Sohbet (yakında)
    if (await sekmeyeGit("Sohbet")) {
      const yakinda = (await page.getByText(/yakında|yakın zamanda/i).count()) > 0;
      kayit("Sohbet (kapalı)", yakinda ? "ok" : "uyari", yakinda ? "yakında mesajı" : "beklenen mesaj yok");
    }

    // Ayarlar
    if (await sekmeyeGit("Ayarlar")) {
      kayit("Ayarlar ekranı", "ok", "sekme açıldı");

      // Stack ekranları — Ayarlar içinden linkler
      const linkler = [
        { metin: /hesap|profil/i, ad: "Hesap bilgileri" },
        { metin: /takas/i, ad: "Vardiya takası" },
        { metin: /temizlik/i, ad: "Temizlik takvimi" },
        { metin: /arşiv/i, ad: "Arşiv" },
        { metin: /gizlilik/i, ad: "Gizlilik politikası" },
        { metin: /deneyim/i, ad: "Deneyim stüdyosu" },
      ];

      for (const l of linkler) {
        const el = page.getByText(l.metin).first();
        if ((await el.count()) === 0) {
          kayit(l.ad, "uyari", "link bulunamadı");
          continue;
        }
        await el.click();
        await page.waitForTimeout(2500);
        const crash = await page.getByText(/something went wrong|error boundary/i).count();
        kayit(l.ad, crash ? "hata" : "ok", crash ? "crash" : "açıldı");
        await page.goBack({ waitUntil: "networkidle" }).catch(async () => {
          await sekmeyeGit("Ayarlar");
        });
        await page.waitForTimeout(1000);
      }

      // Güncelleme kontrol
      const guncelle = page.getByText(/güncellemeleri kontrol/i).first();
      if ((await guncelle.count()) > 0) {
        kayit("Güncelleme kontrolü", "ok", "buton mevcut");
      }
    }
  } catch (e) {
    console.error("\nTest hatası:", e.message);
  } finally {
    await browser.close();
  }

  console.log("\n=== Ekran Özeti ===");
  const ok = SONUCLAR.filter((s) => s.durum === "ok").length;
  const uyari = SONUCLAR.filter((s) => s.durum === "uyari").length;
  const hata = SONUCLAR.filter((s) => s.durum === "hata").length;
  console.log(`  OK: ${ok} | Uyarı: ${uyari} | Hata: ${hata}`);
}

main();
