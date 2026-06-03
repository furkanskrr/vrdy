/**
 * Kök `temizlik.txt` dosyasını okuyup `src/constants/cleaningSchedule.ts` içindeki listeyi üretir.
 * Kullanım: npm run sync-temizlik
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const txtPath = path.join(root, "temizlik.txt");
const tsPath = path.join(root, "src", "constants", "cleaningSchedule.ts");

if (!fs.existsSync(txtPath)) {
  console.error("temizlik.txt bulunamadı:", txtPath);
  process.exit(1);
}

const raw = fs.readFileSync(txtPath, "utf8");
const lines = raw.split(/\r?\n/);
const items = [];
for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed) continue;
  const m = trimmed.match(/^\d+\.gün:\s*(.+)$/i);
  if (m) items.push(m[1].trim());
}

if (items.length !== 30) {
  console.error(`temizlik.txt: 30 görev satırı bekleniyor (N.gün: ...), okunan: ${items.length}`);
  process.exit(1);
}

function esc(s) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

const arrayBody = items.map((s) => `  "${esc(s)}"`).join(",\n");

const out = `/** Takvim günü (1–31) → 1–30 arası temizlik sırası; ay sonunda döngü mantığıyla tüm mağaza kapsanır. */
export function temizlikSlotuAyinGunu(gun: number): number {
  const g = Math.max(1, Math.min(31, Math.floor(gun)));
  return ((g - 1) % 30) + 1;
}

/** Yerel saat diliminde YYYY-MM-DD */
export function yerelTarihAnahtar(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return \`\${y}-\${m}-\${day}\`;
}

/**
 * Bu dosya \`npm run sync-temizlik\` ile kök \`temizlik.txt\` üzerinden üretilir.
 * Görevleri değiştirmek için önce \`temizlik.txt\` düzenleyin, sonra sync komutunu çalıştırın.
 */
export const TEMIZLIK_BOLGELERI: readonly string[] = [
${arrayBody},
] as const;

export function temizlikBolgesiMetni(slot: number): string {
  const i = Math.max(1, Math.min(30, Math.floor(slot))) - 1;
  return TEMIZLIK_BOLGELERI[i] ?? \`Bölge \${slot}\`;
}
`;

fs.writeFileSync(tsPath, out, "utf8");
console.log("OK: temizlik.txt → src/constants/cleaningSchedule.ts (30 görev)");
