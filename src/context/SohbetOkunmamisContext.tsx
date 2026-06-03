import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SOHBET_AKTIF } from "../constants/features";
import { useAuth } from "./AuthContext";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

const SOHBET_SESSIZ_ANAHTAR = (groupId: string) => `vrdy_sohbet_sessiz:${groupId}`;

type SohbetOkunmamisContextValue = {
  okunmamisSayisi: number;
  /** Sohbet sekmesi / ekranı odakta mı (rozet yeni mesajda artmasın) */
  sohbetEkraniOdaktaAyarla: (odakta: boolean) => void;
  /** Sunucudan okunmamış sayıyı yeniden hesapla */
  okunmamisYenile: () => Promise<void>;
  /** Yalnızca bu grup sohbeti için bildirim rozeti (yerel) */
  sohbetSessiz: boolean;
  sohbetSessizAyarla: (sessiz: boolean) => Promise<void>;
};

const SohbetOkunmamisContext = createContext<SohbetOkunmamisContextValue | null>(null);

async function oturumKullaniciId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

export function SohbetOkunmamisProvider({ children }: { children: React.ReactNode }) {
  const { user, session } = useAuth();
  const groupId = user?.groupId ?? null;
  const uidHook = session?.user?.id ?? null;

  const [okunmamisSayisi, setOkunmamisSayisi] = useState(0);
  const [sohbetSessiz, setSohbetSessiz] = useState(false);
  const sohbetOdaktaRef = useRef(false);
  const sessizRef = useRef(false);
  sessizRef.current = sohbetSessiz;

  const sohbetEkraniOdaktaAyarla = useCallback((odakta: boolean) => {
    sohbetOdaktaRef.current = odakta;
  }, []);

  useEffect(() => {
    let iptal = false;
    if (!groupId) {
      sessizRef.current = false;
      setSohbetSessiz(false);
      return;
    }
    void (async () => {
      try {
        const v = await AsyncStorage.getItem(SOHBET_SESSIZ_ANAHTAR(groupId));
        const s = v === "1";
        if (!iptal) {
          sessizRef.current = s;
          setSohbetSessiz(s);
        }
      } catch {
        if (!iptal) {
          sessizRef.current = false;
          setSohbetSessiz(false);
        }
      }
    })();
    return () => {
      iptal = true;
    };
  }, [groupId]);

  const okunmamisYenile = useCallback(async () => {
    if (!isSupabaseConfigured || !groupId) {
      setOkunmamisSayisi(0);
      return;
    }
    if (sessizRef.current) {
      setOkunmamisSayisi(0);
      return;
    }
    const uid = (await oturumKullaniciId()) ?? uidHook;
    if (!uid) {
      setOkunmamisSayisi(0);
      return;
    }

    const { data: readRow, error: readErr } = await supabase
      .from("group_chat_reads")
      .select("last_read_at")
      .eq("group_id", groupId)
      .eq("profile_id", uid)
      .maybeSingle();

    if (readErr) {
      const m = readErr.message ?? "";
      if (
        !m.includes("does not exist") &&
        !m.includes("Could not find the table") &&
        !m.includes("schema cache")
      ) {
        if (__DEV__) console.warn("[sohbet] okunmamış (read):", m);
      }
      setOkunmamisSayisi(0);
      return;
    }

    const sonOkuma = readRow?.last_read_at ?? "1970-01-01T00:00:00.000Z";

    const { count, error: cntErr } = await supabase
      .from("group_messages")
      .select("id", { count: "exact", head: true })
      .eq("group_id", groupId)
      .neq("profile_id", uid)
      .gt("created_at", sonOkuma);

    if (cntErr) {
      if (__DEV__) console.warn("[sohbet] okunmamış (sayım):", cntErr.message);
      setOkunmamisSayisi(0);
      return;
    }
    setOkunmamisSayisi(count ?? 0);
  }, [groupId, uidHook]);

  const sohbetSessizAyarla = useCallback(
    async (sessiz: boolean) => {
      if (!groupId) return;
      sessizRef.current = sessiz;
      setSohbetSessiz(sessiz);
      try {
        if (sessiz) await AsyncStorage.setItem(SOHBET_SESSIZ_ANAHTAR(groupId), "1");
        else await AsyncStorage.removeItem(SOHBET_SESSIZ_ANAHTAR(groupId));
      } catch {
        /* */
      }
      if (sessiz) setOkunmamisSayisi(0);
      else await okunmamisYenile();
    },
    [groupId, okunmamisYenile]
  );

  useEffect(() => {
    if (!SOHBET_AKTIF) {
      setOkunmamisSayisi(0);
      return;
    }
    void okunmamisYenile();
  }, [okunmamisYenile, sohbetSessiz]);

  useEffect(() => {
    if (!SOHBET_AKTIF || !isSupabaseConfigured || !groupId) return;

    const ch = supabase
      .channel(`sohbet-rozet:${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "group_messages",
          filter: `group_id=eq.${groupId}`,
        },
        async (payload) => {
          if (sessizRef.current) {
            setOkunmamisSayisi(0);
            return;
          }
          const row = payload.new as { profile_id?: string };
          const uid = (await oturumKullaniciId()) ?? uidHook;
          if (!uid || row.profile_id === uid) return;
          if (sohbetOdaktaRef.current) {
            setOkunmamisSayisi(0);
            return;
          }
          void okunmamisYenile();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(ch);
    };
  }, [groupId, uidHook, okunmamisYenile]);

  const value = useMemo(
    () => ({
      okunmamisSayisi,
      sohbetEkraniOdaktaAyarla,
      okunmamisYenile,
      sohbetSessiz,
      sohbetSessizAyarla,
    }),
    [okunmamisSayisi, sohbetEkraniOdaktaAyarla, okunmamisYenile, sohbetSessiz, sohbetSessizAyarla]
  );

  return <SohbetOkunmamisContext.Provider value={value}>{children}</SohbetOkunmamisContext.Provider>;
}

export function useSohbetOkunmamis() {
  const ctx = useContext(SohbetOkunmamisContext);
  if (!ctx) {
    throw new Error("useSohbetOkunmamis yalnızca SohbetOkunmamisProvider içinde kullanılmalıdır");
  }
  return ctx;
}
