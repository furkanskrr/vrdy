import { supabase } from "./supabase";
import type { GrupMesaji } from "../types";

export async function grupMesajiDuzenle(
  groupId: string,
  mesajId: string,
  body: string,
  ekVar: boolean
): Promise<{ ok: true; row: GrupMesaji } | { ok: false; mesaj: string }> {
  const trimmed = body.trim();
  if (!trimmed && !ekVar) {
    return { ok: false, mesaj: "Mesaj metni boş olamaz." };
  }
  const govde = trimmed || (ekVar ? " " : "");

  const { data, error } = await supabase
    .from("group_messages")
    .update({ body: govde, edited_at: new Date().toISOString() })
    .eq("id", mesajId)
    .eq("group_id", groupId)
    .select()
    .single();

  if (error) {
    if (error.message.includes("edited_at")) {
      const retry = await supabase
        .from("group_messages")
        .update({ body: govde })
        .eq("id", mesajId)
        .eq("group_id", groupId)
        .select()
        .single();
      if (retry.error) {
        if (retry.error.message.includes("policy") || retry.error.code === "42501") {
          return {
            ok: false,
            mesaj: "Bu mesajı düzenleme yetkiniz yok. Supabase’te group_messages_edit.sql çalıştırın.",
          };
        }
        return { ok: false, mesaj: retry.error.message };
      }
      return { ok: true, row: retry.data as GrupMesaji };
    }
    if (error.message.includes("policy") || error.code === "42501") {
      return {
        ok: false,
        mesaj: "Bu mesajı düzenleme yetkiniz yok. Supabase’te group_messages_edit.sql çalıştırın.",
      };
    }
    return { ok: false, mesaj: error.message };
  }

  return { ok: true, row: data as GrupMesaji };
}
