import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Constants from "expo-constants";
import type { ThemeColors } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";
import { ustEkranBoslugu } from "../lib/safeArea";
import type { MainStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<MainStackParamList, "GizlilikPolitikasi">;

const APP_ADI = Constants.expoConfig?.name ?? "Vardiyam?";
const SON_GUNCELLEME = "17 Nisan 2026";

function createGizlilikStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    icerik: { paddingHorizontal: 20 },
    ustBaslik: { fontSize: 22, fontWeight: "800", color: colors.text, marginBottom: 6 },
    meta: { fontSize: 12, color: colors.textMuted, marginBottom: 20, lineHeight: 18 },
    bolum: { marginBottom: 20 },
    bolumBaslik: {
      fontSize: 15,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 8,
    },
    paragraf: {
      fontSize: 14,
      color: colors.textMuted,
      lineHeight: 22,
    },
  });
}

type GizlilikStyles = ReturnType<typeof createGizlilikStyles>;

function Bolum({ baslik, children, st }: { baslik: string; children: string; st: GizlilikStyles }) {
  return (
    <View style={st.bolum}>
      <Text style={st.bolumBaslik}>{baslik}</Text>
      <Text style={st.paragraf}>{children}</Text>
    </View>
  );
}

export function GizlilikPolitikasiScreen({}: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createGizlilikStyles(colors), [colors]);

  return (
    <ScrollView
      style={[styles.screen, { paddingTop: ustEkranBoslugu(insets.top, 8) }]}
      contentContainerStyle={[styles.icerik, { paddingBottom: insets.bottom + 28 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.ustBaslik}>Gizlilik politikası</Text>
      <Text style={styles.meta}>
        {APP_ADI} · Son güncelleme: {SON_GUNCELLEME}
      </Text>

      <Bolum
        baslik="1. Giriş"
        st={styles}
        children={`Bu metin, ${APP_ADI} mobil uygulamasını kullanırken kişisel verilerinizin nasıl işlendiğini açıklar. Uygulamayı kullanmaya devam ederek bu politikayı okuduğunuzu varsayarız; koşulları kabul etmiyorsanız lütfen kullanımı durdurun.`}
      />

      <Bolum
        baslik="2. Veri sorumlusu ve altyapı"
        st={styles}
        children="Hesap oluşturma, kimlik doğrulama ve veritabanı işlemleri Supabase (üçüncü taraf bulut altyapısı) üzerinden yürütülür. Uygulama, sizin adınıza bu hizmet sağlayıcısıyla veri paylaşır; işleme amaçları bu politikada özetlenmiştir. Altyapı sağlayıcısının kendi gizlilik koşulları da geçerli olabilir."
      />

      <Bolum
        baslik="3. Hangi veriler işlenir?"
        st={styles}
        children={`• Hesap: e-posta adresi, oturum bilgileri (şifre doğrudan saklanmaz; kimlik doğrulama sağlayıcısı yönetir).\n• Profil ve ekip: ad, mağaza adı, rol, grup üyeliği, ekip listesi ve izin/vardiya ile ilişkili kayıtlar.\n• Cihaz bildirimleri: bildirimleri açmayı seçerseniz, bildirim göndermek için cihaz push anahtarı (token) sunucuya kaydedilebilir.\n• Uygulama içi tercihler: örneğin üst bildirim özetinin gösterilip gösterilmeyeceği gibi yerel veya sunucu tarafında saklanan basit ayarlar.\n• Teknik veriler: bağlantı sırasında oluşan standart günlük ve hata kayıtları (altyapı sağlayıcısı tarafından tutulabilir).`}
      />

      <Bolum
        baslik="4. İşleme amaçları"
        st={styles}
        children="Veriler; hesabınızı oluşturmak ve güvenli oturum sağlamak, grubunuzun vardiya ve izin planını görüntülemek ve güncellemek, ekip içi bildirimleri iletmek, uygulamanın işleyişini sürdürmek ve yasal yükümlülüklere uymak amacıyla işlenir."
      />

      <Bolum
        baslik="5. Paylaşım"
        st={styles}
        children="Verileriniz, aynı gruptaki yetkili üyelerle (vardiya ve izin bağlamında) paylaşılır. Hizmetin çalışması için zorunlu olduğu ölçüde altyapı sağlayıcılarına aktarılır. Ticari amaçla üçüncü taraflara satış veya profilleme yapılmaz."
      />

      <Bolum
        baslik="6. Saklama süresi"
        st={styles}
        children="Hesabınız ve grubunuz aktif olduğu sürece ilgili kayıtlar saklanır. Hesabınızı veya grubunuzu silme süreçleri ürün geliştirmesine bağlıdır; silme talebiniz için uygulama içi destek veya geliştirici ile iletişim kanallarını kullanabilirsiniz."
      />

      <Bolum
        baslik="7. Haklarınız (KVKK)"
        st={styles}
        children="6698 sayılı Kanun kapsamında; verilerinize erişim, düzeltme, silme, işlenmesini kısıtlama ve itiraz haklarınız bulunabilir. Taleplerinizi veri sorumlusuna iletebilirsiniz. Ayrıca zarar hâlinde başvuru hakkınız saklıdır."
      />

      <Bolum
        baslik="8. Çocukların kullanımı"
        st={styles}
        children="Uygulama, bilerek çocuklardan veri toplamak için tasarlanmamıştır. Ebeveyn veya vasiler, işyeri kullanımı kapsamında çocuk adına hesap açmamalıdır."
      />

      <Bolum
        baslik="9. Politika değişiklikleri"
        st={styles}
        children="Bu metin güncellenebilir. Önemli değişikliklerde uygulama içi bildirim veya ekran üzerinden bilgilendirme yapılabilir. Güncel sürüm her zaman bu sayfada yer alır."
      />

      <Bolum
        baslik="10. İletişim"
        st={styles}
        children="Gizlilik ile ilgili sorularınız için uygulama mağaza sayfasındaki geliştirici iletişim bilgilerini veya işletmenizin uygulamayı sağlayan tarafıyla kurduğunuz kanalları kullanabilirsiniz."
      />
    </ScrollView>
  );
}
