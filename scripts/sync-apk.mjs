/**
 * EAS artifact APK'yı public/Vardiyam.apk olarak indirir.
 * Kullanım: node scripts/sync-apk.mjs [kaynak-url]
 * URL verilmezse public/app-version.json içindeki eas artifact veya androidApkUrl okunur.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const hedef = path.join(root, "public", "Vardiyam.apk");
const configPath = path.join(root, "public", "app-version.json");

function kaynakUrlBul() {
  const arg = process.argv[2]?.trim();
  if (arg) return arg;

  if (fs.existsSync(configPath)) {
    const cfg = JSON.parse(fs.readFileSync(configPath, "utf8"));
    if (cfg.easArtifactUrl?.trim()) return cfg.easArtifactUrl.trim();
    const apk = cfg.androidApkUrl?.trim() ?? "";
    if (apk.includes("expo.dev/artifacts")) return apk;
  }

  console.error("Kaynak URL gerekli: node scripts/sync-apk.mjs <eas-artifact-url>");
  process.exit(1);
}

async function main() {
  const url = kaynakUrlBul();
  console.log(`İndiriliyor: ${url}`);
  console.log(`Hedef: public/Vardiyam.apk`);

  const res = await fetch(url);
  if (!res.ok) {
    const uyari =
      `İndirme başarısız: HTTP ${res.status} (EAS artifact süresi dolmuş olabilir).`;
    if (fs.existsSync(hedef)) {
      console.warn(`${uyari} Mevcut public/Vardiyam.apk korunuyor.`);
    } else {
      console.warn(`${uyari} Web build devam eder; yeni APK: npm run eas:android-apk`);
    }
    process.exit(0);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(hedef), { recursive: true });
  fs.writeFileSync(hedef, buf);

  const mb = (buf.length / (1024 * 1024)).toFixed(1);
  console.log(`Tamam — Vardiyam.apk (${mb} MB)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
