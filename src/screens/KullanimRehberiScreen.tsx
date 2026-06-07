import { useMemo, type ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Constants from "expo-constants";
import type { ThemeColors } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";
import { ustEkranBoslugu } from "../lib/safeArea";
import type { MainStackParamList } from "../navigation/types";
import { SOHBET_AKTIF } from "../constants/features";

type Props = NativeStackScreenProps<MainStackParamList, "KullanimRehberi">;

const APP_ADI = Constants.expoConfig?.name ?? "Vardiyam?";

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    icerik: { paddingHorizontal: 20 },
    ustBaslik: { fontSize: 22, fontWeight: "800", color: colors.text, marginBottom: 6 },
    meta: { fontSize: 13, color: colors.textMuted, marginBottom: 20, lineHeight: 20 },
    girisKart: {
      backgroundColor: colors.primary + "14",
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.primary + "33",
      padding: 14,
      marginBottom: 22,
    },
    girisMetin: { fontSize: 14, color: colors.text, lineHeight: 22 },
    bolum: { marginBottom: 22 },
    bolumBaslikSatir: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
    bolumBaslik: { fontSize: 16, fontWeight: "800", color: colors.text, flex: 1 },
    paragraf: { fontSize: 14, color: colors.textMuted, lineHeight: 22, marginBottom: 8 },
    madde: { fontSize: 14, color: colors.textMuted, lineHeight: 22, marginBottom: 6, paddingLeft: 4 },
    ipucu: {
      backgroundColor: colors.surface2,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      marginTop: 8,
    },
    ipucuBaslik: { fontSize: 12, fontWeight: "800", color: colors.primary, marginBottom: 6 },
    ipucuMetin: { fontSize: 13, color: colors.textMuted, lineHeight: 20 },
    rolKart: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      marginBottom: 10,
    },
    rolBaslik: { fontSize: 14, fontWeight: "800", color: colors.text, marginBottom: 6 },
    ayirici: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginVertical: 8,
    },
  });
}

type St = ReturnType<typeof createStyles>;

function Bolum({
  ikon,
  baslik,
  children,
  st,
  colors,
}: {
  ikon: keyof typeof Ionicons.glyphMap;
  baslik: string;
  children: ReactNode;
  st: St;
  colors: ThemeColors;
}) {
  return (
    <View style={st.bolum}>
      <View style={st.bolumBaslikSatir}>
        <Ionicons name={ikon} size={20} color={colors.primary} />
        <Text style={st.bolumBaslik}>{baslik}</Text>
      </View>
      {children}
    </View>
  );
}

function Madde({ children, st }: { children: string; st: St }) {
  return <Text style={st.madde}>• {children}</Text>;
}

function Ipucu({ baslik, children, st }: { baslik: string; children: string; st: St }) {
  return (
    <View style={st.ipucu}>
      <Text style={st.ipucuBaslik}>{baslik}</Text>
      <Text style={st.ipucuMetin}>{children}</Text>
    </View>
  );
}

export function KullanimRehberiScreen({}: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const st = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScrollView
      style={[st.screen, { paddingTop: ustEkranBoslugu(insets.top, 8) }]}
      contentContainerStyle={[st.icerik, { paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={st.ustBaslik}>Uygulamayı kullanma rehberi</Text>
      <Text style={st.meta}>
        {APP_ADI} — mağaza ekibinizin vardiya, izin, takas ve iletişimini tek yerden yönetmesi için hazırlanmıştır.
        Bu sayfa tüm sekmeleri adım adım anlatır.
      </Text>

      <View style={st.girisKart}>
        <Text style={st.girisMetin}>
          İlk kez mi kullanıyorsunuz? Önce hesap açın veya giriş yapın, rolünüzü seçin, ardından müdür grup oluşturur
          veya siz grup kodu ile ekibe katılırsınız. Gruba girdikten sonra alt menüdeki sekmeler açılır.
        </Text>
      </View>

      <Bolum ikon="people-outline" baslik="Roller ve yetkiler" st={st} colors={colors}>
        <View style={st.rolKart}>
          <Text style={st.rolBaslik}>Müdür</Text>
          <Text style={st.paragraf}>
            Grubu kurar, mağaza adını belirler, ekip üyesi ekler/siler, haftalık izin günlerini atar, vardiya tablosunu
            düzenler, resmi tatil işaretler, takas taleplerini onaylar ve temizlik denetimi yapabilir.
          </Text>
        </View>
        <View style={st.rolKart}>
          <Text style={st.rolBaslik}>Müdür yardımcısı</Text>
          <Text style={st.paragraf}>
            Müdürle aynı vardiya düzenleme yetkisine sahiptir: haftalık plan, resmi tatil, paylaşım. Ekip üyeliği
            yönetimi ve hesap silme gibi kritik işlemler müdüre aittir.
          </Text>
        </View>
        <View style={st.rolKart}>
          <Text style={st.rolBaslik}>Personel</Text>
          <Text style={st.paragraf}>
            Kendi vardiyasını ve ekibin günlük planını görür; partneriyle vardiya takası talep edebilir; temizlik
            görevinde «yaptım» onayı verir. Vardiya veya izin değiştiremez — müdüre danışır.
          </Text>
        </View>
      </Bolum>

      <Bolum ikon="home-outline" baslik="Ana sayfa" st={st} colors={colors}>
        <Madde st={st}>Bugünün tarihi ve mağaza adınız üstte görünür.</Madde>
        <Madde st={st}>Bugün çalışan ekip listelenir; her satırda ad, rol, vardiya türü ve saat aralığı yazar.</Madde>
        <Madde st={st}>Aylık çalışma saati özeti (hedefe göre ilerleme çubuğu) kendi kaydınız için gösterilir.</Madde>
        <Ipucu baslik="İpucu" st={st}>
          Ana sayfa salt okunurdur; değişiklik yapmak için Vardiya sekmesine geçin.
        </Ipucu>
      </Bolum>

      <Bolum ikon="calendar-outline" baslik="Vardiya sekmesi" st={st} colors={colors}>
        <Text style={st.paragraf}>
          Haftalık tablo yatay (manzara) modda açılır. Üstte hafta oklarıyla önceki / sonraki haftalara gidebilirsiniz.
        </Text>
        <Madde st={st}>
          <Text style={{ fontWeight: "700", color: colors.text }}>Düzenleme (müdür / müdür yrd.):</Text> Bir hücreye
          dokunun → vardiya türünü seçin. Değişiklikler önce «bekleyen» olarak işaretlenir; üstte «Kaydet» ile
          sunucuya yazılır. Kaydetmeden çıkarsanız değişiklikler uygulanmaz.
        </Madde>
        <Madde st={st}>
          <Text style={{ fontWeight: "700", color: colors.text }}>Resmi tatil:</Text> Gün başlığına (Pt, Sa, Ça…) dokunun
          → o günü resmi tatil yapın veya not ekleyin. İlgili personele hücreden «Resmi tatil» atayabilirsiniz.
        </Madde>
        <Madde st={st}>
          <Text style={{ fontWeight: "700", color: colors.text }}>Paylaş:</Text> Hafta satırındaki paylaş simgesiyle
          tablonun görüntüsünü (PNG) oluşturup WhatsApp vb. uygulamalara gönderebilirsiniz.
        </Madde>
        <Madde st={st}>
          Partner kuralı: Bir kişi izinliyse partneri o gün tam gün çalışır; izin günleri Ayarlar → İzinler bölümünden
          tanımlanır.
        </Madde>
        <Ipucu baslik="Önemli" st={st}>
          Kaydet tuşuna bastıktan sonra «bekleyen kayıt» uyarısı kaybolmalıdır. Kaybolmuyorsa internet bağlantınızı
          kontrol edin veya oturumu kapatıp tekrar giriş yapın.
        </Ipucu>
      </Bolum>

      <Bolum ikon="time-outline" baslik="Puantaj" st={st} colors={colors}>
        <Madde st={st}>Seçtiğiniz ay için ekip bazında çalışma saatleri özetlenir.</Madde>
        <Madde st={st}>Vardiya türlerine göre saat dağılımı ve aylık hedefe yakınlık görülür.</Madde>
        <Madde st={st}>Resmi tatil ve izin günleri puantaja uygun şekilde yansır.</Madde>
      </Bolum>

      <Bolum ikon="swap-horizontal-outline" baslik="Vardiya takası" st={st} colors={colors}>
        <Text style={st.paragraf}>Ayarlar → «Vardiya takası» veya ilgili kısayoldan açılır.</Text>
        <Madde st={st}>Yalnızca partneri tanımlı personel, aynı günde farklı vardiyaları olan partneriyle takas isteyebilir.</Madde>
        <Madde st={st}>Akış: Personel talep gönderir → Partner kabul/red → Müdür veya müdür yrd. onaylar → Vardiyalar güncellenir.</Madde>
        <Madde st={st}>İzin, resmi tatil veya envanter izni günlerinde takas yapılamaz.</Madde>
      </Bolum>

      {SOHBET_AKTIF ? (
        <Bolum ikon="chatbubbles-outline" baslik="Grup sohbeti" st={st} colors={colors}>
          <Madde st={st}>Ekip içi mesajlaşma; gönderilen mesajlar gruptaki herkese görünür.</Madde>
          <Madde st={st}>Bir mesaja uzun basarak yanıtlayabilir; müdür önemli mesajları sabitleyebilir.</Madde>
          <Madde st={st}>Okunmamış mesaj sayısı sekme simgesinde rozet olarak görünür.</Madde>
        </Bolum>
      ) : null}

      <Bolum ikon="sparkles-outline" baslik="Temizlik takvimi" st={st} colors={colors}>
        <Madde st={st}>Aylık 30 bölgelik döngü: her gün bir reyon / alan temizliği planlanır.</Madde>
        <Madde st={st}>Personel işi bitirince «yaptım» der; o gün vardiyada olan müdür veya müdür yrd. denetim onayı verir.</Madde>
        <Madde st={st}>İki onay (yapan + denetleyen) tamamlanınca gün yeşil işaretlenir.</Madde>
      </Bolum>

      <Bolum ikon="settings-outline" baslik="Ayarlar" st={st} colors={colors}>
        <Madde st={st}>
          <Text style={{ fontWeight: "700", color: colors.text }}>Genel:</Text> Tema, bildirimler, grup kodu paylaşımı,
          güncelleme kontrolü, gizlilik politikası ve çıkış.
        </Madde>
        <Madde st={st}>
          <Text style={{ fontWeight: "700", color: colors.text }}>İzinler:</Text> Her çalışan için haftalık sabit izin
          günü (Pt–Pa). Partner aynı günü seçemez; kilitli günler soluk ve üstü çizili görünür.
        </Madde>
        <Madde st={st}>
          <Text style={{ fontWeight: "700", color: colors.text }}>Ekip:</Text> Üye ekleme, rol atama, partner eşleştirme
          (müdür). Üye silmek kalıcıdır; dikkatli kullanın.
        </Madde>
        <Madde st={st}>
          <Text style={{ fontWeight: "700", color: colors.text }}>Bildirimler:</Text> Telefon izni verirseniz vardiya
          değişikliği, takas ve grup mesajları için push bildirimi alırsınız.
        </Madde>
      </Bolum>

      <Bolum ikon="archive-outline" baslik="Arşiv" st={st} colors={colors}>
        <Madde st={st}>Geçmiş aylara ait özet raporlara göz atabilirsiniz.</Madde>
        <Madde st={st}>Aylık rapor detayında ekip ve saat dağılımı incelenir.</Madde>
      </Bolum>

      <Bolum ikon="cloud-download-outline" baslik="Güncellemeler" st={st} colors={colors}>
        <Madde st={st}>Küçük düzeltmeler uygulama açılışında otomatik (OTA) gelir.</Madde>
        <Madde st={st}>Büyük sürümlerde güncelleme ekranı çıkar; Android’de uygulama içinden indirip üzerine kurabilirsiniz.</Madde>
        <Madde st={st}>iPhone’da tarayıcıdan (vrdy.vercel.app) veya Ana Ekrana ekli kısayol üzerinden kullanıyorsanız sayfayı yenilemek güncellemeyi getirir.</Madde>
        <Ipucu baslik="Sorun giderme" st={st}>
          Vardiya kaydedilmiyorsa: Kaydet’e bastıktan sonra bekleyen uyarısı kalkmıyorsa uygulamayı tamamen kapatıp açın.
          iPhone PWA kullanıyorsanız sekme yerine Ana Ekran kısayolunu tercih edin.
        </Ipucu>
      </Bolum>

      <View style={st.ayirici} />
      <Text style={[st.paragraf, { textAlign: "center", marginTop: 4 }]}>
        Sorularınız için müdürünüze veya uygulama yöneticinize başvurun.
      </Text>
    </ScrollView>
  );
}
