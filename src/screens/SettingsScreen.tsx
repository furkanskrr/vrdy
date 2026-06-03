import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useDelight } from "../context/DelightContext";
import { playDelightFeedback } from "../lib/delight/feedback";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";
import type { MainStackParamList } from "../navigation/types";
import type { ThemeColors } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";
import { rolEtiket } from "../data/team";
import { useAuth } from "../context/AuthContext";
import { RolRozeti } from "../components/RolRozeti";
import { KritikOnayModal } from "../components/GroupChatOverlays";
import { useSchedule, type HaftaGunuIndex } from "../context/ScheduleContext";
import { useNotification } from "../context/NotificationContext";
import { useUpdate } from "../context/UpdateContext";
import {
  probePushSetup,
  requestPushPermissionAndFetchToken,
  savePushToken,
  shouldOfferPushEnableInSettings,
} from "../lib/notifications";
import { isSupabaseConfigured } from "../lib/supabase";
import { ustEkranBoslugu } from "../lib/safeArea";
import type { TeamMember } from "../types";

const IZIN_GUNLERI = [
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
  "Pazar",
] as const;

/** Vardiya ekranıyla aynı kısaltmalar —ızgara alanı dar olduğu için */
const IZIN_GUN_KISA = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pa"] as const;

function izinBasHarfler(ad: string): string {
  const p = ad.trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2) return (p[0][0] + p[p.length - 1][0]).toUpperCase();
  if (p.length === 1 && p[0].length > 0) return p[0][0].toUpperCase();
  return "?";
}

function izinAvatarRenk(rol: TeamMember["rol"], c: ThemeColors): string {
  if (rol === "mudur") return c.morning;
  if (rol === "yardimci") return c.fullday;
  return c.primary;
}

const APP_SURUMU = Constants.expoConfig?.version ?? "1.0.0";

type Sekme = "genel" | "izin" | "ekip";

type AyarlarKritikOnay =
  | { tur: "cikis" }
  | { tur: "uyeSil"; uye: TeamMember };

export function SettingsScreen() {
  const { colors, isDark, setMode } = useTheme();
  const delight = useDelight();
  const styles = useMemo(() => createSettingsStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { height: ekranYuksekligi } = useWindowDimensions();
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { user, session, isMudur, vardiyaDuzenleyebilir, cikisYap, kurulumaSifirla } = useAuth();
  const { ekip, izinGunu, setIzinGunu, clearIzinGunu, uyeSil, uyeGuncelle } = useSchedule();
  const { bildirimGonder, icBildirimKutusu, setIcBildirimKutusu } = useNotification();
  const { yenidenKontrol, kontrolEdiliyor } = useUpdate();
  const [sekme, setSekme] = useState<Sekme>("genel");
  const [pushAyarGoster, setPushAyarGoster] = useState(false);
  const [pushAyarBusy, setPushAyarBusy] = useState(false);

  const [partnerModalUye, setPartnerModalUye] = useState<TeamMember | null>(null);
  const [partnerModalSecim, setPartnerModalSecim] = useState("");
  const [kritikOnay, setKritikOnay] = useState<AyarlarKritikOnay | null>(null);

  const benimUyeKaydi = useMemo(
    () => ekip.find((m) => m.profileId === session?.user?.id),
    [ekip, session?.user?.id]
  );

  const izinOzeti = useMemo(() => {
    const toplam = ekip.length;
    const izinTanimli = ekip.filter((u) => izinGunu[u.id] !== undefined).length;
    const esli = ekip.filter((u) => u.partnerId).length;
    return { toplam, izinTanimli, esli };
  }, [ekip, izinGunu]);

  const ekipRolOzeti = useMemo(() => {
    let mudur = 0;
    let yardimci = 0;
    let personel = 0;
    for (const u of ekip) {
      if (u.rol === "mudur") mudur += 1;
      else if (u.rol === "yardimci") yardimci += 1;
      else personel += 1;
    }
    return { mudur, yardimci, personel };
  }, [ekip]);

  function handleUyeSil(u: TeamMember) {
    setKritikOnay({ tur: "uyeSil", uye: u });
  }

  async function uyeSilOnayla(u: TeamMember) {
    const sonuc = await uyeSil(u.id);
    if (sonuc == null) {
      Alert.alert(
        "Silinemedi",
        "Sunucu bu işlemi reddetti veya bağlantı kurulamadı. Supabase SQL Editor’de `supabase/remove_group_member_rpc.sql` dosyasını bir kez çalıştırın; ardından tekrar deneyin."
      );
      return;
    }
    if (sonuc === "self") {
      kurulumaSifirla();
      bildirimGonder("bilgi", "Gruptan ayrıldınız", "Rol seçim ekranına yönlendirildiniz.");
    } else {
      bildirimGonder("bilgi", "Ekip güncellendi", `${u.ad} gruptan çıkarıldı.`);
    }
  }

  function partnerModalAc(u: TeamMember) {
    setPartnerModalUye(u);
    setPartnerModalSecim(u.partnerId || "");
  }

  function partnerModalKapat() {
    setPartnerModalUye(null);
    setPartnerModalSecim("");
  }

  async function partnerKaydet() {
    if (!partnerModalUye || !isMudur) return;
    const a = partnerModalUye;
    const yeni = partnerModalSecim;
    const eskiA = a.partnerId;

    if ((yeni || "") === (eskiA || "")) {
      partnerModalKapat();
      return;
    }

    if (eskiA) {
      const eskiKarsi = ekip.find((e) => e.id === eskiA);
      if (eskiKarsi?.partnerId === a.id) {
        await uyeGuncelle(eskiA, { partner_id: null });
      }
    }

    if (!yeni) {
      await uyeGuncelle(a.id, { partner_id: null });
      bildirimGonder("bilgi", "Partner", `${a.ad}: partner kaldırıldı`);
      partnerModalKapat();
      return;
    }

    if (yeni === a.id) return;

    const b = ekip.find((e) => e.id === yeni);
    if (b?.partnerId) {
      const bEski = ekip.find((e) => e.id === b.partnerId);
      if (bEski?.partnerId === b.id) {
        await uyeGuncelle(b.partnerId, { partner_id: null });
      }
    }

    await uyeGuncelle(a.id, { partner_id: null });
    await uyeGuncelle(yeni, { partner_id: null });

    await uyeGuncelle(a.id, { partner_id: yeni });
    await uyeGuncelle(yeni, { partner_id: a.id });

    bildirimGonder("bilgi", "Partner", `${a.ad} ↔ ${b?.ad ?? "?"} eşlendi`);
    partnerModalKapat();
  }

  const yenilePushAyarSatiri = useCallback(async () => {
    if (!user?.groupId || !isSupabaseConfigured) {
      setPushAyarGoster(false);
      return;
    }
    const probe = await probePushSetup();
    setPushAyarGoster(shouldOfferPushEnableInSettings(probe));
  }, [user?.groupId]);

  useFocusEffect(
    useCallback(() => {
      void yenilePushAyarSatiri();
    }, [yenilePushAyarSatiri])
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void yenilePushAyarSatiri();
    });
    return () => sub.remove();
  }, [yenilePushAyarSatiri]);

  async function handlePushEtkinlestir() {
    const probeOnce = await probePushSetup();
    if (probeOnce.available && probeOnce.status === "denied") {
      Linking.openSettings();
      return;
    }
    setPushAyarBusy(true);
    try {
      const t = await requestPushPermissionAndFetchToken();
      if (t) {
        await savePushToken(t);
        await yenilePushAyarSatiri();
        bildirimGonder("bilgi", "Bildirimler", "Ekip bildirimleri etkinleştirildi.");
      } else {
        await yenilePushAyarSatiri();
      }
    } finally {
      setPushAyarBusy(false);
    }
  }

  function genelYardimGoster() {
    Alert.alert(
      "Hızlı rehber",
      [
        "• Vardiya: Tablo yatay açılır; değişiklikten sonra «Kaydet» ile sunucuya yazılır.",
        "• Resmi tatil: Gün başlığına (Pt, Sa…) dokunun; çalışmayan personele hücreden «Resmi tatil» atayın.",
        "• İzinler: Haftalık izin günü; müdür Ayarlar → İzinler’den düzenler.",
        "• Ekip bildirimleri: Telefonda izin verirseniz push ile de haberdar olursunuz (ayrı satır).",
      ].join("\n")
    );
  }

  async function grupKoduPaylas() {
    if (!user?.grupKodu) return;
    try {
      await Share.share({
        message: `Vardiyam? ekip daveti!\n\nMağaza: ${user.magazaAdi}\nGrup kodu: ${user.grupKodu}\n\nUygulamayı indir ve bu kodla ekibe katıl.`,
      });
    } catch {
      /* kullanıcı iptal etti */
    }
  }

  return (
    <View style={styles.kok}>
    <ScrollView
      style={[styles.screen, { paddingTop: ustEkranBoslugu(insets.top, 12) }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <Ionicons name="settings-outline" size={24} color={colors.primary} />
        <Text style={styles.head}>Ayarlar</Text>
      </View>

      {user && (
        <TouchableOpacity
          style={styles.hesapOzet}
          onPress={() => nav.navigate("HesapBilgileri")}
          activeOpacity={0.75}
        >
          <View style={[styles.avatar, isMudur && { backgroundColor: colors.morning }]}>
            <Ionicons
              name={isMudur ? "shield-checkmark" : "person"}
              size={22}
              color="#fff"
            />
          </View>
          <View style={styles.userInfo}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Text style={styles.userName}>{user.ad}</Text>
              <RolRozeti rol={user.rol} size="md" />
            </View>
            <Text style={styles.userEmail}>{user.email}</Text>
            <Text style={styles.hesapOzetAlt}>Hesap bilgileri ve şifre ›</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      )}

      {/* Sekmeler */}
      <View style={styles.seg}>
        {(["genel", "izin", "ekip"] as Sekme[]).map((s) => {
          const ikonlar: Record<Sekme, keyof typeof Ionicons.glyphMap> = {
            genel: "options-outline",
            izin: "calendar-outline",
            ekip: "people-outline",
          };
          const etiketler: Record<Sekme, string> = {
            genel: "Genel",
            izin: "İzinler",
            ekip: "Ekip",
          };
          return (
            <TouchableOpacity
              key={s}
              style={[styles.segBtn, sekme === s && styles.segBtnAktif]}
              onPress={() => setSekme(s)}
            >
              <Ionicons
                name={ikonlar[s]}
                size={15}
                color={sekme === s ? colors.text : colors.textMuted}
              />
              <Text style={[styles.segText, sekme === s && styles.segTextAktif]}>
                {etiketler[s]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ─── GENEL ─── */}
      {sekme === "genel" && (
        <>
          {user && (
            <View style={styles.genelOzet}>
              <View style={styles.genelOzetUst}>
                <Ionicons name="storefront-outline" size={22} color={colors.primary} />
                <Text style={styles.genelOzetBaslik}>Çalışma alanınız</Text>
              </View>
              <View style={styles.genelOzetGrid}>
                <View style={styles.genelOzetHucre}>
                  <Text style={styles.genelOzetEtiket}>Mağaza</Text>
                  <Text style={styles.genelOzetDeger} numberOfLines={2}>
                    {user.magazaAdi?.trim() || "—"}
                  </Text>
                </View>
                <View style={styles.genelOzetHucre}>
                  <Text style={styles.genelOzetEtiket}>Rolünüz</Text>
                  <Text style={styles.genelOzetDeger}>{rolEtiket(user.rol)}</Text>
                </View>
                <View style={styles.genelOzetHucre}>
                  <Text style={styles.genelOzetEtiket}>Ekip</Text>
                  <Text style={styles.genelOzetDeger}>{ekip.length} kişi</Text>
                </View>
                {user.grupKodu ? (
                  <View style={styles.genelOzetHucre}>
                    <Text style={styles.genelOzetEtiket}>Grup kodu</Text>
                    <Text style={styles.genelOzetDegerMono} selectable>
                      {user.grupKodu}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.genelOzetNot}>
                Vardiya ve izin verileri bu gruba göre senkronize olur. Kodu paylaşmak için{" "}
                <Text style={styles.genelOzetNotKalın}>Ekip</Text> sekmesini kullanın.
              </Text>
              {!vardiyaDuzenleyebilir ? (
                <Text style={styles.genelOzetNot}>
                  Haftalık tablo ve resmi tatilleri yalnızca müdür düzenleyebilir; siz salt okunur görüntülersiniz.
                </Text>
              ) : null}
            </View>
          )}

          <Text style={styles.bolumBaslik}>Bildirimler</Text>
          <View style={[styles.row, styles.rowCoklu]}>
            <View style={[styles.rowLeft, styles.rowLeftTop]}>
              <Ionicons name="chatbox-ellipses-outline" size={20} color={colors.primary} style={styles.rowIkonUst} />
              <View style={styles.rowTextCol}>
                <Text style={styles.rowLabel}>Uygulama içi özet</Text>
                <Text style={styles.rowSub}>
                  Vardiya kaydı, izin değişimi gibi işlemlerden sonra üstte kısa bilgi kutusu gösterilir. Kapatırsanız
                  yine de geçmiş kayıtlar tutulur; sadece üst bildirim çıkmaz.
                </Text>
              </View>
            </View>
            <Switch
              value={icBildirimKutusu}
              onValueChange={setIcBildirimKutusu}
              trackColor={{ false: colors.surface2, true: colors.primaryMuted }}
              thumbColor={icBildirimKutusu ? colors.primary : colors.textMuted}
            />
          </View>

          {pushAyarGoster ? (
            <TouchableOpacity
              style={[styles.row, styles.pushEnableRow]}
              onPress={() => void handlePushEtkinlestir()}
              activeOpacity={0.7}
              disabled={pushAyarBusy}
            >
              <View style={[styles.rowLeft, styles.rowLeftTop]}>
                <Ionicons name="phone-portrait-outline" size={20} color={colors.afternoon} style={styles.pushEnableIkon} />
                <View style={styles.rowTextCol}>
                  <Text style={styles.rowLabel}>Cihaz bildirimleri (push)</Text>
                  <Text style={styles.rowSub}>
                    Ekip olayları için telefonunuzun bildirim izni gerekir. Kapalıysa buradan açmayı deneyin; reddettiyseniz
                    sistem ayarlarına yönlendirilirsiniz.
                  </Text>
                </View>
              </View>
              {pushAyarBusy ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              )}
            </TouchableOpacity>
          ) : null}

          <Text style={styles.bolumBaslik}>Görünüm ve dil</Text>
          <View style={[styles.row, styles.rowCoklu]}>
            <View style={[styles.rowLeft, styles.rowLeftTop]}>
              <Ionicons name="moon-outline" size={20} color={colors.primary} style={styles.rowIkonUst} />
              <View style={styles.rowTextCol}>
                <Text style={styles.rowLabel}>Koyu tema</Text>
                <Text style={styles.rowSub}>
                  Açık veya koyu görünüm. Tercihiniz bu cihazda saklanır.
                </Text>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={(v) => {
                setMode(v ? "dark" : "light");
                void playDelightFeedback("selection", {
                  hapticsEnabled: delight.uiHapticsEnabled,
                  soundsEnabled: delight.uiSoundsEnabled,
                });
              }}
              trackColor={{ false: colors.surface2, true: colors.primaryMuted }}
              thumbColor={isDark ? colors.primary : colors.textMuted}
            />
          </View>

          <TouchableOpacity
            style={styles.row}
            onPress={() => nav.navigate("DelightHub")}
            activeOpacity={0.7}
          >
            <View style={[styles.rowLeft, styles.rowLeftTop]}>
              <Ionicons name="color-palette-outline" size={20} color={colors.primary} style={styles.rowIkonUst} />
              <View style={styles.rowTextCol}>
                <Text style={styles.rowLabel}>Deneyim stüdyosu</Text>
                <Text style={styles.rowSub}>
                  Görünüm paketleri, kişisel vurgu rengi ve dokunsal geri bildirim ayarları.
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={[styles.row, styles.rowCoklu]}>
            <View style={[styles.rowLeft, styles.rowLeftTop]}>
              <Ionicons name="language-outline" size={20} color={colors.primary} style={styles.rowIkonUst} />
              <View style={styles.rowTextCol}>
                <Text style={styles.rowLabel}>Dil</Text>
                <Text style={styles.rowSub}>Arayüz metinleri Türkçe. Çoklu dil desteği planlanıyor.</Text>
              </View>
            </View>
            <Text style={styles.rowValue}>TR</Text>
          </View>

          <Text style={styles.bolumBaslik}>Planlama</Text>
          <TouchableOpacity
            style={styles.row}
            onPress={() => nav.navigate("MainTabs", { screen: "Vardiya" })}
            activeOpacity={0.7}
          >
            <View style={[styles.rowLeft, styles.rowLeftTop]}>
              <Ionicons name="calendar-outline" size={20} color={colors.primary} style={styles.rowIkonUst} />
              <View style={styles.rowTextCol}>
                <Text style={styles.rowLabel}>Haftalık vardiya tablosu</Text>
                <Text style={styles.rowSub}>Yatay görünümde düzenleme; resmi tatil ve manuel atamalar.</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.row}
            onPress={() => nav.navigate("Takas")}
            activeOpacity={0.7}
          >
            <View style={[styles.rowLeft, styles.rowLeftTop]}>
              <Ionicons name="swap-horizontal-outline" size={20} color={colors.primary} style={styles.rowIkonUst} />
              <View style={styles.rowTextCol}>
                <Text style={styles.rowLabel}>Vardiya takası</Text>
                <Text style={styles.rowSub}>Partnerinizle aynı gün içinde çalışma vardiyası takası (onay akışı).</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.row}
            onPress={() => nav.navigate("TemizlikTakvimi")}
            activeOpacity={0.7}
          >
            <View style={[styles.rowLeft, styles.rowLeftTop]}>
              <Ionicons name="sparkles-outline" size={20} color={colors.primary} style={styles.rowIkonUst} />
              <View style={styles.rowTextCol}>
                <Text style={styles.rowLabel}>Aylık temizlik takvimi</Text>
                <Text style={styles.rowSub}>
                  Her gün bir bölge; işi yapan onaylar, kayıt grupta saklanır (30 bölge döngüsü).
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <Text style={styles.bolumBaslik}>Yardım ve veri</Text>
          <TouchableOpacity
            style={styles.row}
            onPress={() => nav.navigate("Arsiv")}
            activeOpacity={0.7}
          >
            <View style={[styles.rowLeft, styles.rowLeftTop]}>
              <Ionicons name="archive-outline" size={20} color={colors.primary} style={styles.rowIkonUst} />
              <View style={styles.rowTextCol}>
                <Text style={styles.rowLabel}>Arşiv ve aylık raporlar</Text>
                <Text style={styles.rowSub}>Geçmiş aylara göz atın; özet raporları buradan açın.</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.row} onPress={genelYardimGoster} activeOpacity={0.7}>
            <View style={[styles.rowLeft, styles.rowLeftTop]}>
              <Ionicons name="help-circle-outline" size={20} color={colors.primary} style={styles.rowIkonUst} />
              <View style={styles.rowTextCol}>
                <Text style={styles.rowLabel}>Uygulamayı kullanma</Text>
                <Text style={styles.rowSub}>Vardiya, resmi tatil, izin ve bildirimler için kısa madde listesi.</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.row}
            onPress={() => nav.navigate("GizlilikPolitikasi")}
            activeOpacity={0.7}
          >
            <View style={[styles.rowLeft, styles.rowLeftTop]}>
              <Ionicons name="document-text-outline" size={20} color={colors.primary} style={styles.rowIkonUst} />
              <View style={styles.rowTextCol}>
                <Text style={styles.rowLabel}>Gizlilik politikası</Text>
                <Text style={styles.rowSub}>Kişisel verilerin işlenmesi, KVKK ve bildirimler hakkında özet metin.</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={[styles.row, styles.rowCoklu]}>
            <View style={[styles.rowLeft, styles.rowLeftTop]}>
              <Ionicons name="cloud-done-outline" size={20} color={colors.textMuted} style={styles.rowIkonUst} />
              <View style={styles.rowTextCol}>
                <Text style={styles.rowLabel}>Verileriniz</Text>
                <Text style={styles.rowSub}>
                  Hesap ve grup verileri güvenli bağlantı ile sunucuda saklanır; yalnızca grup üyeleri kendi planınızı
                  görür.
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.row}
            onPress={() => {
              void yenidenKontrol().then((sonuc) => {
                if (sonuc.tur === "guncel") {
                  bildirimGonder("bilgi", "Güncel", `Sürüm ${APP_SURUMU} — yeni sürüm yok.`);
                }
              });
            }}
            disabled={kontrolEdiliyor}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="refresh-circle-outline" size={20} color={colors.primary} style={styles.rowIkonUst} />
              <View style={styles.rowTextCol}>
                <Text style={styles.rowLabel}>Güncellemeleri kontrol et</Text>
                <Text style={styles.rowSub}>
                  Yeni sürüm varsa ekranda bildirim çıkar; silip yeniden kurmanız gerekmez.
                </Text>
              </View>
            </View>
            {kontrolEdiliyor ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            )}
          </TouchableOpacity>

          <Text style={styles.versionText}>
            {Constants.expoConfig?.name ?? "Vardiyam?"} · sürüm {APP_SURUMU}
          </Text>

          <TouchableOpacity
            style={styles.cikis}
            onPress={() => setKritikOnay({ tur: "cikis" })}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.danger} />
            <Text style={styles.cikisText}>Çıkış yap</Text>
          </TouchableOpacity>
        </>
      )}

      {/* ─── İZİN GÜNLERİ ─── */}
      {sekme === "izin" && (
        <>
          <View style={styles.sekmeOzet}>
            <View style={styles.sekmeOzetUst}>
              <Ionicons name="calendar-number-outline" size={22} color={colors.primary} />
              <Text style={styles.sekmeOzetBaslik}>Haftalık izin şablonu</Text>
            </View>
            <Text style={styles.sekmeOzetAciklama}>
              Her üye için sabit bir hafta günü seçilir; vardiya tablosu bu şablona göre çalışma ve izin hücrelerini
              hesaplar.
            </Text>
            <View style={styles.sekmeOzetIstatistik}>
              <View style={styles.sekmeOzetHucre}>
                <Text style={styles.sekmeOzetSayi}>{izinOzeti.toplam}</Text>
                <Text style={styles.sekmeOzetEtiket}>Ekip üyesi</Text>
              </View>
              <View style={styles.sekmeOzetHucre}>
                <Text style={styles.sekmeOzetSayi}>{izinOzeti.izinTanimli}</Text>
                <Text style={styles.sekmeOzetEtiket}>İzin günü tanımlı</Text>
              </View>
              <View style={styles.sekmeOzetHucre}>
                <Text style={styles.sekmeOzetSayi}>{izinOzeti.esli}</Text>
                <Text style={styles.sekmeOzetEtiket}>Partner eşleşmesi</Text>
              </View>
            </View>
          </View>

          {!isMudur && (
            <View style={styles.kilit}>
              <Ionicons name="lock-closed" size={18} color={colors.afternoon} />
              <Text style={styles.kilitText}>
                İzin günlerini yalnızca müdür değiştirebilir. Burada mevcut planı görüntülersiniz; değişiklik için
                müdürünüze danışın.
              </Text>
            </View>
          )}

          <Text style={styles.bolumBaslik}>Nasıl çalışır?</Text>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
            <Text style={styles.infoText}>
              • Her kişi haftada tam 1 gün izin kullanır.{"\n"}• Partnerler aynı günde izin alamaz; çakışan günler
              soluk ve üstü çizili görünür.{"\n"}• İzinlinin partneri o gün tam gün çalışır; izin öncesi sabah, sonrası
              öğle vardiyası atanır.{"\n"}              • İzin gününü değiştirdiğinizde, o güne bağlı manuel vardiya atamaları
              temizlenebilir; haftalık tabloyu kontrol edin.{"\n"}• Seçili izin gününe uzun basarak haftalık izin
              şablonunu tamamen kaldırabilirsiniz; sonrasında vardiyayı hücreden manuel girersiniz.
            </Text>
          </View>

          <Text style={styles.bolumBaslik}>Gün kutularının anlamı</Text>
          <Text style={styles.bolumAlt}>
            Kartlarda günler kısaltmayla yazar: Pt Pazartesi, Sa Salı, … Pa Pazar. Kutunun rengine ve çizgiye göre o
            günü seçip seçemediğiniz anlaşılır.
          </Text>
          <View style={styles.lejantKutuPro}>
            <View style={styles.lejantOge}>
              <View style={styles.lejantOrnekSutun}>
                <View style={styles.lejantMiniHucreSecili}>
                  <Text style={styles.lejantMiniTxtSecili}>Pt</Text>
                </View>
              </View>
              <View style={styles.lejantOgeMetin}>
                <Text style={styles.lejantOgeBaslik}>Seçili izin günü</Text>
                <Text style={styles.lejantOgeAciklama}>
                  Mavi çerçeveli, dolu görünen kutu: Bu çalışanın her hafta tekrarlayan izin günü. Vardiya sekmesinde o
                  günler izin olarak işlenir. Müdür başka bir güne dokununca kayıt o güne taşınır; seçili güne uzun
                  basınca izin şablonu kaldırılır.
                </Text>
              </View>
            </View>
            <View style={styles.lejantOge}>
              <View style={styles.lejantOrnekSutun}>
                <View style={styles.lejantMiniHucreKilit}>
                  <Text style={styles.lejantMiniTxtKilit}>Cu</Text>
                </View>
              </View>
              <View style={styles.lejantOgeMetin}>
                <Text style={styles.lejantOgeBaslik}>Kilitli gün (dokunulmaz)</Text>
                <Text style={styles.lejantOgeAciklama}>
                  Soluk ve üstü çizili: Partneriniz zaten o gün izinli. Aynı günde iki kişi izin alamaz; önce sizin veya
                  partnerin izin gününü değiştirmeden bu kutuya dokunamazsınız.
                </Text>
              </View>
            </View>
            <View style={[styles.lejantOge, styles.lejantOgeSon]}>
              <View style={styles.lejantOrnekSutun}>
                <View style={styles.lejantMiniHucreBos}>
                  <Text style={styles.lejantMiniTxtBos}>Sa</Text>
                </View>
              </View>
              <View style={styles.lejantOgeMetin}>
                <Text style={styles.lejantOgeBaslik}>Boş / seçilebilir gün</Text>
                <Text style={styles.lejantOgeAciklama}>
                  Normal çerçeve: Henüz bu kişi için seçilmemiş veya partner yüzünden kilitli olmayan gün. Müdür
                  dokununca yeni izin günü olur. Müdür değilseniz kutular yalnızca görüntülenir.
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.sekmeKisayol} onPress={() => setSekme("ekip")} activeOpacity={0.75}>
            <Ionicons name="people-outline" size={20} color={colors.primary} />
            <View style={styles.sekmeKisayolMetin}>
              <Text style={styles.sekmeKisayolBaslik}>Ekip ve partner</Text>
              <Text style={styles.sekmeKisayolAlt}>Partner ataması olmadan takas kuralı çalışmaz; Ekip sekmesinden eşleştirin.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <Text style={styles.bolumBaslik}>Ekip izin planı</Text>
          <Text style={styles.bolumAlt}>
            Her satır bir çalışandır. İstediğiniz güne dokunarak haftalık izin şablonunu güncelleyin; kayıt anında
            sunucuya yazılır.
          </Text>

          {ekip.map((u) => {
            const partnerIzin = u.partnerId ? izinGunu[u.partnerId] : undefined;
            const partner = u.partnerId ? ekip.find((e) => e.id === u.partnerId) : undefined;
            const seciliIdx = izinGunu[u.id];
            const renk = izinAvatarRenk(u.rol, colors);
            return (
              <View key={u.id} style={styles.izinUyeninKarti}>
                <View style={styles.izinKartUst}>
                  <View style={[styles.izinKartAvatar, { backgroundColor: renk }]}>
                    <Text style={styles.izinKartAvatarTxt}>{izinBasHarfler(u.ad)}</Text>
                  </View>
                  <View style={styles.izinKartOrta}>
                    <View style={styles.izinKartAdSatiri}>
                      <Text style={styles.izinKartAd} numberOfLines={1}>
                        {u.ad}
                      </Text>
                      <RolRozeti rol={u.rol} size="sm" />
                      {benimUyeKaydi?.id === u.id ? (
                        <View style={styles.izinKartBenRozet}>
                          <Text style={styles.izinKartBenRozetTxt}>Siz</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.izinKartHaftalik}>
                      <Ionicons name="calendar-outline" size={15} color={colors.primary} />
                      <Text style={styles.izinKartHaftalikTxt}>
                        {seciliIdx !== undefined
                          ? `Haftalık izin: ${IZIN_GUNLERI[seciliIdx]}`
                          : "Henüz izin günü seçilmedi"}
                      </Text>
                    </View>
                  </View>
                </View>
                {partner ? (
                  <View style={styles.izinKartPartnerSatiri}>
                    <Ionicons name="git-network-outline" size={14} color={colors.textMuted} />
                    <Text style={styles.izinKartPartnerEtiket} numberOfLines={1}>
                      Partner: {partner.ad}
                      {partnerIzin !== undefined ? ` · izin: ${IZIN_GUNLERI[partnerIzin]}` : ""}
                    </Text>
                  </View>
                ) : null}
                <View style={styles.izinGunIzgarasi}>
                  {IZIN_GUNLERI.map((gun, idx) => {
                    const sec = izinGunu[u.id] === idx;
                    const engelli = partnerIzin === idx;
                    const disabled = !isMudur || engelli;
                    return (
                      <TouchableOpacity
                        key={gun}
                        disabled={disabled}
                        activeOpacity={isMudur && !engelli ? 0.75 : 1}
                        style={[
                          styles.izinGunHucre,
                          sec && styles.izinGunHucreSecili,
                          engelli && styles.izinGunHucreKilit,
                          !isMudur && styles.izinGunHucreSalt,
                          !isMudur && sec && styles.izinGunHucreSaltSecili,
                        ]}
                        onPress={async () => {
                          if (isMudur && !sec) {
                            await setIzinGunu(u.id, idx as HaftaGunuIndex);
                            bildirimGonder("izin", "İzin günü değişti", `${u.ad} izin günü: ${gun}`);
                          }
                        }}
                        onLongPress={() => {
                          if (!isMudur || !sec) return;
                          Alert.alert(
                            "İzin gününü kaldır",
                            `${u.ad} için haftalık izin şablonu (${gun}) kaldırılsın mı? Vardiya tablosunda bu günler boş kalır; gerektiğinde hücreden manuel atama yapabilirsiniz.`,
                            [
                              { text: "Vazgeç", style: "cancel" },
                              {
                                text: "Kaldır",
                                style: "destructive",
                                onPress: async () => {
                                  const ok = await clearIzinGunu(u.id);
                                  if (ok) {
                                    bildirimGonder("izin", "İzin günü kaldırıldı", `${u.ad} için haftalık izin şablonu silindi.`);
                                  } else {
                                    Alert.alert("Hata", "İzin günü kaldırılamadı. Bağlantıyı kontrol edip tekrar deneyin.");
                                  }
                                },
                              },
                            ]
                          );
                        }}
                        delayLongPress={400}
                      >
                        <Text
                          style={[
                            styles.izinGunHucreTxt,
                            sec && styles.izinGunHucreTxtSecili,
                            engelli && styles.izinGunHucreTxtKilit,
                          ]}
                        >
                          {IZIN_GUN_KISA[idx]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </>
      )}

      {/* ─── EKİP ─── */}
      {sekme === "ekip" && (
        <>
          <View style={styles.sekmeOzet}>
            <View style={styles.sekmeOzetUst}>
              <Ionicons name="people-circle-outline" size={22} color={colors.primary} />
              <Text style={styles.sekmeOzetBaslik}>Ekip özeti</Text>
            </View>
            <Text style={styles.sekmeOzetAciklama}>
              Önce kadrodan partner atayın; davet kodu ve rol açıklamaları aşağıda.
            </Text>
            <View style={styles.sekmeOzetIstatistik}>
              <View style={styles.sekmeOzetHucre}>
                <Text style={styles.sekmeOzetSayi}>{ekip.length}</Text>
                <Text style={styles.sekmeOzetEtiket}>Toplam üye</Text>
              </View>
              <View style={styles.sekmeOzetHucre}>
                <Text style={styles.sekmeOzetSayi}>{ekipRolOzeti.mudur + ekipRolOzeti.yardimci}</Text>
                <Text style={styles.sekmeOzetEtiket}>Yönetim</Text>
              </View>
              <View style={styles.sekmeOzetHucre}>
                <Text style={styles.sekmeOzetSayi}>{ekipRolOzeti.personel}</Text>
                <Text style={styles.sekmeOzetEtiket}>Personel</Text>
              </View>
            </View>
            <View style={styles.rolDagilimSatir}>
              <Text style={styles.rolDagilimText}>
                Müdür {ekipRolOzeti.mudur} · Müdür yrd. {ekipRolOzeti.yardimci} · Personel {ekipRolOzeti.personel}
              </Text>
            </View>
          </View>

          <Text style={styles.bolumBaslik}>Kadro</Text>

          {isMudur && ekip.length > 0 && (
            <View style={styles.ekipIpucu}>
              <Ionicons name="hand-left-outline" size={16} color={colors.primary} />
              <Text style={styles.ekipIpucuText}>
                Satıra dokunun: partner seçin veya kaldırın. Sil ikonu üyeyi ekipten çıkarır (geri alınamaz).
                Yeni üye yalnızca grup kodu ile uygulamada «Gruba katıl» diyerek eklenir.
              </Text>
            </View>
          )}

          {!isMudur && ekip.length > 0 ? (
            <View style={styles.ekipSaltOkunurNot}>
              <Ionicons name="eye-outline" size={16} color={colors.textMuted} />
              <Text style={styles.ekipSaltOkunurNotText}>
                Partner ve üye silme yalnızca müdüre açıktır; listeyi görüntülüyorsunuz.
              </Text>
            </View>
          ) : null}

          {ekip.length === 0 && (
            <View style={styles.ekipBosCard}>
              <Ionicons name="people-outline" size={40} color={colors.textMuted} />
              <Text style={styles.ekipBosText}>Ekipte henüz başka üye yok</Text>
              <Text style={styles.ekipBosAlt}>
                {isMudur
                  ? "Grup gizlidir; ekip arkadaşlarınız uygulamada bu kodu girerek katılır. Kodu aşağıdaki «Davet» bölümünden paylaşın."
                  : "Müdürünüzden grup kodunu alıp uygulamada \"Gruba katıl\" ile ekibe katılabilirsiniz."}
              </Text>
            </View>
          )}

          {ekip.map((u) => {
            const partner = ekip.find((e) => e.id === u.partnerId);
            const izinGunuAdi = izinGunu[u.id] !== undefined ? IZIN_GUNLERI[izinGunu[u.id]] : "—";
            return (
              <TouchableOpacity
                key={u.id}
                style={styles.ekipCard}
                disabled={!isMudur}
                activeOpacity={isMudur ? 0.75 : 1}
                onPress={() => isMudur && partnerModalAc(u)}
              >
                <View style={styles.ekipCardLeft}>
                  <View style={[styles.ekipAvatar, {
                    backgroundColor: u.rol === "mudur" ? colors.morning :
                      u.rol === "yardimci" ? colors.fullday : colors.primary,
                  }]}>
                    <Ionicons
                      name={
                        u.rol === "mudur" ? "shield-checkmark" :
                        u.rol === "yardimci" ? "people" : "person"
                      }
                      size={18}
                      color="#fff"
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={styles.ekipAdSatiri}>
                      <Text style={styles.ekipAd} numberOfLines={1}>
                        {u.ad}
                      </Text>
                      <RolRozeti rol={u.rol} size="sm" />
                      {benimUyeKaydi?.id === u.id ? (
                        <View style={styles.benBadgeEkip}>
                          <Text style={styles.benBadgeEkipText}>Siz</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>
                <View style={styles.ekipCardRight}>
                  <Text style={styles.ekipDetay}>İzin: {izinGunuAdi}</Text>
                  <Text style={styles.ekipDetay}>
                    Partner: {partner?.ad ?? "—"}
                  </Text>
                </View>
                {isMudur && (
                  <TouchableOpacity style={styles.silBtn} onPress={() => handleUyeSil(u)}>
                    <Ionicons name="trash-outline" size={16} color={colors.danger} />
                  </TouchableOpacity>
                )}
                {isMudur && (
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={styles.ekipChevron} />
                )}
              </TouchableOpacity>
            );
          })}

          <Text style={styles.bolumBaslik}>Davet</Text>
          {user?.grupKodu ? (
            <View style={styles.grupCard}>
              <View style={styles.grupHeader}>
                <Ionicons name="key-outline" size={18} color={colors.primary} />
                <Text style={styles.grupLabel}>Grup kodu</Text>
              </View>
              <Text style={styles.grupKodAciklama}>
                Kodu yalnızca güvendiğiniz çalışanlarla paylaşın; kodu bilen herkes ekibe katılım isteği gönderebilir.
              </Text>
              <Text style={styles.grupKod} selectable>
                {user.grupKodu}
              </Text>
              {isMudur && (
                <TouchableOpacity style={styles.grupPaylasBtn} onPress={grupKoduPaylas}>
                  <Ionicons name="share-social-outline" size={16} color="#fff" />
                  <Text style={styles.grupPaylasBtnText}>Kodu paylaş</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.grupCardBos}>
              <Ionicons name="key-outline" size={22} color={colors.textMuted} />
              <Text style={styles.grupCardBosText}>Grup kodu yüklenemedi veya hesap gruba bağlı değil.</Text>
            </View>
          )}

          <Text style={styles.bolumBaslik}>Roller</Text>
          <View style={styles.rolKartKutu}>
            <View style={styles.rolKartSatir}>
              <View style={[styles.rolKartNokta, { backgroundColor: colors.morning }]} />
              <Text style={styles.rolKartMetin}>
                <Text style={styles.rolKartKalın}>Müdür:</Text> Grup kodu, ekip listesi, izin günleri, partner atama;
                vardiya ve resmi tatil düzenleme.
              </Text>
            </View>
            <View style={styles.rolKartSatir}>
              <View style={[styles.rolKartNokta, { backgroundColor: colors.fullday }]} />
              <Text style={styles.rolKartMetin}>
                <Text style={styles.rolKartKalın}>Müdür yrd.:</Text> Kendi planını görür; vardiya takası talebi açabilir;
                izin gününü müdür belirler.
              </Text>
            </View>
            <View style={styles.rolKartSatir}>
              <View style={[styles.rolKartNokta, { backgroundColor: colors.primary }]} />
              <Text style={styles.rolKartMetin}>
                <Text style={styles.rolKartKalın}>Personel:</Text> Kendi planını görür; vardiya takası talebi açabilir;
                izin gününü müdür belirler.
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.sekmeKisayol} onPress={() => setSekme("izin")} activeOpacity={0.75}>
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            <View style={styles.sekmeKisayolMetin}>
              <Text style={styles.sekmeKisayolBaslik}>İzin günleri</Text>
              <Text style={styles.sekmeKisayolAlt}>Haftalık izin şablonunu düzenlemek için İzinler sekmesine geçin.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </>
      )}
    </ScrollView>

      <Modal
        visible={partnerModalUye != null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={partnerModalKapat}
      >
        <Pressable
          style={[styles.overlay, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}
          onPress={partnerModalKapat}
        >
          <Pressable
            style={[styles.modalKart, styles.modalKartPartner, { maxHeight: ekranYuksekligi * 0.88 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalBaslikBlok}>
              <Text style={styles.modalBaslik}>Partner seç</Text>
              <Text style={styles.modalAltBaslik}>{partnerModalUye?.ad}</Text>
            </View>

            <Text style={styles.modalHintParagraf}>
              Takas çiftleri için bir personeli seçin. Başka bir çiftin parçasıysa önceki eşleşme kaldırılır.
            </Text>

            <ScrollView
              style={styles.partnerListeScroll}
              contentContainerStyle={styles.partnerListeIcerik}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <TouchableOpacity
                style={[styles.partnerSecenek, !partnerModalSecim && styles.partnerSecenekSec]}
                onPress={() => setPartnerModalSecim("")}
                activeOpacity={0.75}
              >
                <View style={styles.partnerSecenekSol}>
                  <View style={[styles.partnerSecenekIkon, { backgroundColor: colors.surface2 }]}>
                    <Ionicons name="close-circle-outline" size={22} color={colors.textMuted} />
                  </View>
                  <View>
                    <Text style={styles.partnerSecenekAd}>Partner yok</Text>
                    <Text style={styles.partnerSecenekAlt}>Eşleşmeyi kaldır</Text>
                  </View>
                </View>
                {!partnerModalSecim ? (
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                ) : (
                  <View style={styles.partnerRadioBos} />
                )}
              </TouchableOpacity>

              {ekip
                .filter((mu) => partnerModalUye != null && mu.id !== partnerModalUye.id)
                .map((mu) => {
                  const sec = partnerModalSecim === mu.id;
                  return (
                    <TouchableOpacity
                      key={mu.id}
                      style={[styles.partnerSecenek, sec && styles.partnerSecenekSec]}
                      onPress={() => setPartnerModalSecim(mu.id)}
                      activeOpacity={0.75}
                    >
                      <View style={styles.partnerSecenekSol}>
                        <View
                          style={[
                            styles.partnerSecenekIkon,
                            {
                              backgroundColor:
                                mu.rol === "mudur"
                                  ? colors.morning
                                  : mu.rol === "yardimci"
                                    ? colors.fullday
                                    : colors.primary,
                            },
                          ]}
                        >
                          <Ionicons name="person" size={20} color="#fff" />
                        </View>
                        <View style={styles.partnerSecenekMetin}>
                          <Text style={styles.partnerSecenekAd} numberOfLines={1}>
                            {mu.ad}
                          </Text>
                          <Text style={styles.partnerSecenekAlt}>{rolEtiket(mu.rol)}</Text>
                        </View>
                      </View>
                      {sec ? (
                        <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                      ) : (
                        <View style={styles.partnerRadioBos} />
                      )}
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalIptalBtn} onPress={partnerModalKapat}>
                <Text style={styles.modalIptalText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalEkleBtn} onPress={partnerKaydet}>
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={styles.modalEkleText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <KritikOnayModal
        gorunur={kritikOnay !== null}
        baslik={
          kritikOnay?.tur === "cikis"
            ? "Çıkış yap"
            : kritikOnay?.tur === "uyeSil" && kritikOnay.uye.profileId === session?.user?.id
              ? "Gruptan ayrıl"
              : "Üyeyi çıkar"
        }
        aciklama={
          kritikOnay?.tur === "cikis"
            ? "Oturumunuz kapatılır. Tekrar kullanmak için e-posta ve şifreyle giriş yapmanız gerekir."
            : kritikOnay?.tur === "uyeSil" && kritikOnay.uye.profileId === session?.user?.id
              ? "Kendi ekip kaydınız silinir; profil bu gruptan ayrılır. Rol ve mağaza seçimini kurulumda baştan yaparsınız. Bu işlem geri alınamaz."
              : kritikOnay?.tur === "uyeSil"
                ? `${kritikOnay.uye.ad} ekipten çıkarılsın mı? Bu kişinin hesabı da bu gruptan koparılır; işlem geri alınamaz.`
                : ""
        }
        onayLabel={
          kritikOnay?.tur === "cikis"
            ? "Çıkış yap"
            : kritikOnay?.tur === "uyeSil" && kritikOnay.uye.profileId === session?.user?.id
              ? "Ayrıl"
              : "Çıkar"
        }
        iptalLabel="Vazgeç"
        tehlikeli
        colors={colors}
        onOnay={async () => {
          if (!kritikOnay) return;
          if (kritikOnay.tur === "cikis") {
            await cikisYap();
            return;
          }
          await uyeSilOnayla(kritikOnay.uye);
        }}
        onIptal={() => setKritikOnay(null)}
      />
    </View>
  );
}

function createSettingsStyles(colors: ThemeColors) {
  return StyleSheet.create({
  kok: { flex: 1, backgroundColor: colors.bg },
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 16, paddingBottom: 40 },

  headerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  head: { fontSize: 24, fontWeight: "800", color: colors.text },

  hesapOzet: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  hesapOzetAlt: { fontSize: 12, color: colors.primary, fontWeight: "700", marginTop: 6 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: "700", color: colors.text },
  userEmail: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  userMeta: { flexDirection: "row", gap: 8, marginTop: 6, flexWrap: "wrap" },
  rolBadge: {
    backgroundColor: colors.primaryMuted + "33",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  rolBadgeText: { fontSize: 11, color: colors.primary, fontWeight: "700" },
  magazaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surface2,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  magazaBadgeText: { fontSize: 11, color: colors.textMuted, fontWeight: "600" },

  seg: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 11,
    borderRadius: 11,
  },
  segBtnAktif: { backgroundColor: colors.primaryMuted + "44" },
  segText: { color: colors.textMuted, fontWeight: "600", fontSize: 13 },
  segTextAktif: { color: colors.text },

  bolumBaslik: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    marginTop: 6,
    marginBottom: 6,
  },
  bolumAlt: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: 12,
  },

  genelOzet: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  genelOzetUst: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  genelOzetBaslik: { fontSize: 16, fontWeight: "800", color: colors.text },
  genelOzetGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  genelOzetHucre: {
    width: "47%",
    minWidth: 130,
    flexGrow: 1,
    backgroundColor: colors.surface2,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  genelOzetEtiket: { fontSize: 11, fontWeight: "700", color: colors.textMuted, marginBottom: 4 },
  genelOzetDeger: { fontSize: 14, fontWeight: "700", color: colors.text, lineHeight: 20 },
  genelOzetDegerMono: { fontSize: 15, fontWeight: "800", color: colors.primary, letterSpacing: 2 },
  genelOzetNot: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
    marginTop: 12,
  },
  genelOzetNotKalın: { fontWeight: "700", color: colors.text },

  sekmeOzet: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sekmeOzetUst: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  sekmeOzetBaslik: { fontSize: 16, fontWeight: "800", color: colors.text },
  sekmeOzetAciklama: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  sekmeOzetIstatistik: { flexDirection: "row", gap: 8, marginTop: 14 },
  sekmeOzetHucre: {
    flex: 1,
    backgroundColor: colors.surface2,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 0,
  },
  sekmeOzetSayi: { fontSize: 22, fontWeight: "800", color: colors.text },
  sekmeOzetEtiket: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textMuted,
    marginTop: 4,
    textAlign: "center",
  },
  rolDagilimSatir: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rolDagilimText: { fontSize: 12, color: colors.textMuted, textAlign: "center", lineHeight: 18 },

  lejantKutuPro: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 0,
  },
  lejantOge: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lejantOgeSon: { borderBottomWidth: 0, paddingBottom: 0 },
  lejantOrnekSutun: { width: 44, alignItems: "center", paddingTop: 2 },
  lejantMiniHucreSecili: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primaryMuted + "55",
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  lejantMiniTxtSecili: { fontSize: 14, fontWeight: "800", color: colors.primary },
  lejantMiniHucreKilit: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.42,
  },
  lejantMiniTxtKilit: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textMuted,
    textDecorationLine: "line-through",
  },
  lejantMiniHucreBos: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  lejantMiniTxtBos: { fontSize: 14, fontWeight: "700", color: colors.textMuted },
  lejantOgeMetin: { flex: 1, minWidth: 0 },
  lejantOgeBaslik: { fontSize: 14, fontWeight: "800", color: colors.text, marginBottom: 4 },
  lejantOgeAciklama: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },

  izinUyeninKarti: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  izinKartUst: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  izinKartAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  izinKartAvatarTxt: { fontSize: 17, fontWeight: "800", color: "#fff" },
  izinKartOrta: { flex: 1, minWidth: 0 },
  izinKartAdSatiri: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  izinKartAd: { fontSize: 16, fontWeight: "800", color: colors.text, flexShrink: 1 },
  izinKartBenRozet: {
    backgroundColor: colors.primaryMuted + "44",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  izinKartBenRozetTxt: { fontSize: 10, fontWeight: "800", color: colors.primary },
  izinKartRol: { fontSize: 12, color: colors.textMuted, marginTop: 2, fontWeight: "600" },
  izinKartHaftalik: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  izinKartHaftalikTxt: { fontSize: 13, color: colors.text, fontWeight: "600", flex: 1 },
  izinKartPartnerSatiri: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  izinKartPartnerEtiket: { fontSize: 12, color: colors.textMuted, flex: 1, fontWeight: "500" },
  izinGunIzgarasi: { flexDirection: "row", gap: 6, marginTop: 14 },
  izinGunHucre: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    borderRadius: 11,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  izinGunHucreSecili: {
    backgroundColor: colors.primaryMuted + "50",
    borderWidth: 2,
    borderColor: colors.primary,
  },
  izinGunHucreKilit: {
    opacity: 0.38,
    backgroundColor: colors.surface2,
  },
  izinGunHucreSalt: { opacity: 0.72 },
  izinGunHucreSaltSecili: { opacity: 1 },
  izinGunHucreTxt: { fontSize: 13, fontWeight: "700", color: colors.textMuted },
  izinGunHucreTxtSecili: { color: colors.primary, fontWeight: "800" },
  izinGunHucreTxtKilit: { textDecorationLine: "line-through", color: colors.textMuted },

  sekmeKisayol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  sekmeKisayolMetin: { flex: 1, minWidth: 0 },
  sekmeKisayolBaslik: { fontSize: 15, fontWeight: "700", color: colors.text },
  sekmeKisayolAlt: { fontSize: 12, color: colors.textMuted, marginTop: 4, lineHeight: 17 },

  rolKartKutu: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  rolKartSatir: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  rolKartNokta: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  rolKartMetin: { flex: 1, fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  rolKartKalın: { fontWeight: "800", color: colors.text },

  grupKodAciklama: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
    textAlign: "center",
    marginBottom: 12,
    alignSelf: "stretch",
  },
  grupCardBos: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    gap: 10,
  },
  grupCardBosText: { fontSize: 13, color: colors.textMuted, textAlign: "center", lineHeight: 19 },

  ekipSaltOkunurNot: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ekipSaltOkunurNotText: { flex: 1, fontSize: 12, color: colors.textMuted, lineHeight: 17 },

  ekipAdSatiri: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  benBadgeEkip: {
    backgroundColor: colors.primaryMuted + "33",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  benBadgeEkipText: { fontSize: 10, fontWeight: "800", color: colors.primary },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  rowCoklu: { alignItems: "flex-start" },
  pushEnableRow: { alignItems: "flex-start" },
  rowLeftTop: { alignItems: "flex-start", flex: 1 },
  pushEnableIkon: { marginTop: 2 },
  rowIkonUst: { marginTop: 2 },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  rowTextCol: { flex: 1, minWidth: 0 },
  rowLabel: { color: colors.text, fontSize: 15, fontWeight: "600" },
  rowSub: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 4, fontWeight: "500" },
  rowValue: { color: colors.textMuted, fontSize: 14, fontWeight: "500" },

  aktifBadge: {
    backgroundColor: colors.morning + "22",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  aktifBadgeText: { color: colors.morning, fontSize: 12, fontWeight: "700" },

  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: colors.primaryMuted + "22",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.primaryMuted + "44",
  },
  infoText: { flex: 1, fontSize: 12, color: colors.textMuted, lineHeight: 18 },

  kilit: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: colors.afternoon + "15",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.afternoon + "33",
  },
  kilitText: { flex: 1, fontSize: 12, color: colors.textMuted, lineHeight: 18 },

  versionText: {
    textAlign: "center",
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 8,
    marginBottom: 8,
  },

  cikis: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.danger + "44",
  },
  cikisText: { color: colors.danger, fontWeight: "700", fontSize: 16 },

  grupCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  grupHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  grupLabel: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
  grupKod: {
    fontSize: 32,
    fontWeight: "900",
    color: colors.primary,
    letterSpacing: 6,
    marginBottom: 12,
  },
  grupPaylasBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  grupPaylasBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  ekipIpucu: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: colors.primaryMuted + "22",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.primaryMuted + "44",
  },
  ekipIpucuText: { flex: 1, fontSize: 12, color: colors.textMuted, lineHeight: 17 },
  ekipBosCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  ekipBosText: { fontSize: 15, fontWeight: "700", color: colors.text, marginTop: 12 },
  ekipBosAlt: { fontSize: 12, color: colors.textMuted, textAlign: "center", marginTop: 6, lineHeight: 18 },
  ekipCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ekipCardLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  ekipAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  ekipAd: { fontSize: 14, fontWeight: "700", color: colors.text },
  ekipRol: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  ekipCardRight: { alignItems: "flex-end" },
  ekipDetay: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  silBtn: { padding: 8, marginLeft: 4 },
  ekipChevron: { alignSelf: "center", marginLeft: 2 },

  overlay: {
    flex: 1,
    backgroundColor: "#000000bb",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalKart: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 22,
    width: "100%",
    maxWidth: 440,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalKartPartner: {
    flexDirection: "column",
    flexShrink: 1,
  },
  modalBaslikBlok: { marginBottom: 12 },
  modalBaslik: { fontSize: 20, fontWeight: "800", color: colors.text, marginBottom: 4 },
  modalAltBaslik: { fontSize: 15, fontWeight: "600", color: colors.primary },
  modalHintParagraf: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: 16,
  },
  partnerListeScroll: {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 140,
    marginHorizontal: -4,
  },
  partnerListeIcerik: { paddingBottom: 8 },
  partnerSecenek: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  partnerSecenekSec: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted + "22",
  },
  partnerSecenekSol: { flexDirection: "row", alignItems: "center", flex: 1, gap: 12, minWidth: 0 },
  partnerSecenekIkon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  partnerSecenekMetin: { flex: 1, minWidth: 0 },
  partnerSecenekAd: { fontSize: 16, fontWeight: "700", color: colors.text },
  partnerSecenekAlt: { fontSize: 12, color: colors.textMuted, marginTop: 3 },
  partnerRadioBos: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
  },
  modalBtnRow: { flexDirection: "row", gap: 10, marginTop: 18, flexShrink: 0 },
  modalIptalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalIptalText: { color: colors.textMuted, fontWeight: "600", fontSize: 15 },
  modalEkleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  modalEkleText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  });
}
