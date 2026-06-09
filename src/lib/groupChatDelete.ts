import { supabase } from "./supabase";

export async function grupMesajiSil(
  groupId: string,
  mesajId: string
): Promise<{ ok: true } | { ok: false; mesaj: string }> {
  const { error } = await supabase
    .from("group_messages")
    .delete()
    .eq("id", mesajId)
    .eq("group_id", groupId);

  if (error) {
    if (error.message.includes("policy") || error.code === "42501") {
      return {
        ok: false,
        mesaj: "Bu mesajı silme yetkiniz yok. Supabase’te group_messages_delete.sql çalıştırın.",
      };
    }
    return { ok: false, mesaj: error.message };
  }
  return { ok: true };
}
