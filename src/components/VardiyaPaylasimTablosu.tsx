import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { ThemeColors } from "../constants/theme";
import { vardiyaEtiket, vardiyaHucreAltMetin, vardiyaRenk } from "../lib/vardiya";
import type { ShiftKind, TeamMember } from "../types";

const GUN_KISA = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pa"];
const ISIM_GEN = 128;
const GUN_GEN = 78;
const SATIR_YUK = 58;
const BASLIK_YUK = 68;

type Satir = { uye: TeamMember; gunler: (ShiftKind | undefined)[] };

type Props = {
  colors: ThemeColors;
  magazaAdi: string;
  aralik: string;
  haftaEtiket: string;
  pzt: Date;
  satirlar: Satir[];
  resmiTatiller: Record<string, string>;
  gunIso: (gunIndex: number) => string;
  gunNo: (gunIndex: number) => number;
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      backgroundColor: colors.bg,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    ust: { marginBottom: 12 },
    magaza: { fontSize: 18, fontWeight: "800", color: colors.text },
    aralik: { fontSize: 13, fontWeight: "600", color: colors.textMuted, marginTop: 4 },
    hafta: { fontSize: 11, fontWeight: "700", color: colors.primary, marginTop: 2, textTransform: "uppercase" },
    tablo: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
      backgroundColor: colors.surface,
    },
    baslikSatir: {
      flexDirection: "row",
      backgroundColor: colors.surface2,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      minHeight: BASLIK_YUK,
    },
    veriSatir: {
      flexDirection: "row",
      minHeight: SATIR_YUK,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border + "88",
    },
    isimHucre: {
      width: ISIM_GEN,
      paddingHorizontal: 8,
      justifyContent: "center",
      borderRightWidth: StyleSheet.hairlineWidth,
      borderRightColor: colors.border,
    },
    isim: { fontSize: 12, fontWeight: "700", color: colors.text },
    gunHucre: {
      width: GUN_GEN,
      paddingHorizontal: 4,
      paddingVertical: 6,
      alignItems: "center",
      justifyContent: "center",
      borderRightWidth: StyleSheet.hairlineWidth,
      borderRightColor: colors.border + "66",
    },
    gunBaslik: { fontSize: 12, fontWeight: "800", color: colors.text },
    gunTarih: { fontSize: 10, fontWeight: "600", color: colors.textMuted, marginTop: 2 },
    rtBadge: {
      marginTop: 4,
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: colors.resmiTatil + "22",
    },
    rtText: { fontSize: 7, fontWeight: "800", color: colors.resmiTatil, textAlign: "center" },
    hucre: {
      width: GUN_GEN - 8,
      minHeight: SATIR_YUK - 12,
      borderRadius: 8,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 3,
      paddingVertical: 4,
    },
    hucreBaslik: { fontSize: 10, fontWeight: "800", color: colors.text, textAlign: "center" },
    hucreAlt: { fontSize: 8, fontWeight: "600", color: colors.textMuted, textAlign: "center", marginTop: 2 },
    footer: { marginTop: 10, fontSize: 9, color: colors.textMuted, textAlign: "right" },
  });
}

/** Ekran dışında tam tablo — paylaşım görüntüsü (tüm personel, kırpılmadan) */
export function VardiyaPaylasimTablosu({
  colors,
  magazaAdi,
  aralik,
  haftaEtiket,
  satirlar,
  resmiTatiller,
  gunIso,
  gunNo,
}: Props) {
  const styles = useMemo(() => createStyles(colors), [colors]);
  const genislik = ISIM_GEN + GUN_GEN * 7;

  return (
    <View style={[styles.root, { width: genislik + 32 }]} collapsable={false}>
      <View style={styles.ust}>
        <Text style={styles.magaza}>{magazaAdi || "Vardiya"}</Text>
        <Text style={styles.aralik}>{aralik}</Text>
        <Text style={styles.hafta}>{haftaEtiket}</Text>
      </View>
      <View style={[styles.tablo, { width: genislik }]}>
        <View style={styles.baslikSatir}>
          <View style={styles.isimHucre}>
            <Text style={[styles.isim, { color: colors.textMuted, fontSize: 10 }]}>Personel</Text>
          </View>
          {GUN_KISA.map((g, i) => {
            const iso = gunIso(i);
            const rt = resmiTatiller[iso];
            return (
              <View key={g} style={styles.gunHucre}>
                <Text style={styles.gunBaslik}>{g}</Text>
                <Text style={styles.gunTarih}>{gunNo(i)}</Text>
                {rt ? (
                  <View style={styles.rtBadge}>
                    <Text style={styles.rtText}>Resmi{"\n"}tatil</Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
        {satirlar.map(({ uye, gunler }, idx) => (
          <View
            key={uye.id}
            style={[
              styles.veriSatir,
              idx % 2 === 1 && { backgroundColor: colors.surface2 + "44" },
              idx === satirlar.length - 1 && { borderBottomWidth: 0 },
            ]}
          >
            <View style={styles.isimHucre}>
              <Text style={styles.isim} numberOfLines={2}>
                {uye.ad}
              </Text>
            </View>
            {gunler.map((v, i) => {
              const renk = v ? vardiyaRenk(v, colors) : colors.border;
              const alt = v ? vardiyaHucreAltMetin(v) : "";
              return (
                <View key={i} style={styles.gunHucre}>
                  <View
                    style={[
                      styles.hucre,
                      {
                        backgroundColor: v ? renk + "22" : colors.bg,
                        borderColor: v ? renk + "66" : colors.border,
                      },
                    ]}
                  >
                    <Text style={styles.hucreBaslik} numberOfLines={2}>
                      {v ? vardiyaEtiket(v) : "—"}
                    </Text>
                    {alt ? (
                      <Text style={styles.hucreAlt} numberOfLines={2}>
                        {alt}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </View>
      <Text style={styles.footer}>Vardiyam · {new Date().toLocaleDateString("tr-TR")}</Text>
    </View>
  );
}
