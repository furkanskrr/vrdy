import { sendPushToGroup } from "./notifications";
import { supabase } from "./supabase";
import type { GrupMesaji, SohbetEkTuru } from "../types";

export type MesajGonderGirdi = {
  groupId: string;
  uid: string;
  senderAd: string;
  body: string;
  replyToId?: string | null;
  attachment?: {
    type: SohbetEkTuru;
    path: string;
    name: string;
    mime: string;
  };
  push?: boolean;
};

export async function grupMesajiGonder(
  girdi: MesajGonderGirdi
): Promise<{ ok: true; row: GrupMesaji } | { ok: false; mesaj: string }> {
  const body = girdi.body.trim();
  const insertPayload: Record<string, unknown> = {
    group_id: girdi.groupId,
    profile_id: girdi.uid,
    sender_ad: girdi.senderAd,
    body: body || (girdi.attachment ? " " : ""),
  };
  if (girdi.replyToId) insertPayload.reply_to_id = girdi.replyToId;
  if (girdi.attachment) {
    insertPayload.attachment_type = girdi.attachment.type;
    insertPayload.attachment_path = girdi.attachment.path;
    insertPayload.attachment_name = girdi.attachment.name;
    insertPayload.attachment_mime = girdi.attachment.mime;
  }

  let { data, error } = await supabase.from("group_messages").insert(insertPayload).select().single();

  if (error && (error.message ?? "").includes("reply_to_id")) {
    const { reply_to_id: _r, ...fallback } = insertPayload;
    const retry = await supabase.from("group_messages").insert(fallback).select().single();
    data = retry.data;
    error = retry.error;
  }

  if (error && (error.message ?? "").includes("attachment_")) {
    const { attachment_type: _a, attachment_path: _p, attachment_name: _n, attachment_mime: _m, ...metin } =
      insertPayload;
    if (!body) {
      return {
        ok: false,
        mesaj: "Ek göndermek için Supabase’te group_chat_media_shortcuts.sql çalıştırın.",
      };
    }
    const retry = await supabase.from("group_messages").insert(metin).select().single();
    data = retry.data;
    error = retry.error;
  }

  if (error) return { ok: false, mesaj: error.message };

  const row = data as GrupMesaji;
  if (girdi.push !== false) {
    const baslik = girdi.senderAd || "Ekip sohbeti";
    const govde =
      body.length > 0
        ? body.length > 140
          ? `${body.slice(0, 137)}…`
          : body
        : girdi.attachment?.type === "image"
          ? "📷 Fotoğraf"
          : girdi.attachment?.type === "audio"
            ? "🎤 Ses mesajı"
            : "📎 Dosya";
    void sendPushToGroup(girdi.groupId, baslik, govde);
  }

  return { ok: true, row };
}
