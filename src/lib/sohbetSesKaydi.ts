import type { SohbetEkTaslak } from "./groupChatMedia";

export const SES_KAYIT_MAX_SN = 120;

function sureFormat(sn: number): string {
  const s = Math.max(0, Math.floor(sn));
  const dk = Math.floor(s / 60);
  const kalan = s % 60;
  return `${dk}:${kalan.toString().padStart(2, "0")}`;
}

export async function sesKaydiBaslat(): Promise<void> {
  throw new Error("Ses mesajı geçici olarak kapalı.");
}

export function sesKaydiAktifMi(): boolean {
  return false;
}

export async function sesKaydiDurdur(_sureSn: number): Promise<SohbetEkTaslak | null> {
  return null;
}

export async function sesKaydiIptal(): Promise<void> {}

export { sureFormat };
