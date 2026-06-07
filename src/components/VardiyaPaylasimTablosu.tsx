import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { ThemeColors } from "../constants/theme";
import { vardiyaEtiket, vardiyaHucreAltMetin, vardiyaRenk } from "../lib/vardiya";
import type { ShiftKind, TeamMember } from "../types";

const GUN_KISA = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pa"];

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
  /** Paylaşım görüntüsü çözünürlüğü (1 = ekran, 2–3 = daha keskin PNG) */
  olcek?: number;
};

function createStyles(colors: ThemeColors, s: number) {
  const isimGen = Math.round(128 * s);
  const gunGen = Math.round(78 * s);
  const satirYuk = Math.round(58 * s);
  const baslikYuk = Math.round(68 * s);

  return {
    isimGen,
    gunGen,
    styles: StyleSheet.create({
      root: {
        backgroundColor: colors.bg,
        padding: Math.round(16 * s),
        borderRadius: Math.round(12 * s),
        borderWidth: Math.max(1, Math.round(s)),
        borderColor: colors.border,
      },
      ust: { marginBottom: Math.round(12 * s) },
      magaza: { fontSize: Math.round(18 * s), fontWeight: "800", color: colors.text },
      aralik: {
        fontSize: Math.round(13 * s),
        fontWeight: "600",
        color: colors.textMuted,
        marginTop: Math.round(4 * s),
      },
      hafta: {
        fontSize: Math.round(11 * s),
        fontWeight: "700",
        color: colors.primary,
        marginTop: Math.round(2 * s),
        textTransform: "uppercase",
      },
      tablo: {
        borderRadius: Math.round(10 * s),
        borderWidth: Math.max(1, Math.round(s)),
        borderColor: colors.border,
        overflow: "hidden",
        backgroundColor: colors.surface,
      },
      baslikSatir: {
        flexDirection: "row",
        backgroundColor: colors.surface2,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
        minHeight: baslikYuk,
      },
      veriSatir: {
        flexDirection: "row",
        minHeight: satirYuk,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border + "88",
      },
      isimHucre: {
        width: isimGen,
        paddingHorizontal: Math.round(8 * s),
        justifyContent: "center",
        borderRightWidth: StyleSheet.hairlineWidth,
        borderRightColor: colors.border,
      },
      isim: { fontSize: Math.round(12 * s), fontWeight: "700", color: colors.text },
      gunHucre: {
        width: gunGen,
        paddingHorizontal: Math.round(4 * s),
        paddingVertical: Math.round(6 * s),
        alignItems: "center",
        justifyContent: "center",
        borderRightWidth: StyleSheet.hairlineWidth,
        borderRightColor: colors.border + "66",
      },
      gunBaslik: { fontSize: Math.round(12 * s), fontWeight: "800", color: colors.text },
      gunTarih: {
        fontSize: Math.round(10 * s),
        fontWeight: "600",
        color: colors.textMuted,
        marginTop: Math.round(2 * s),
      },
      rtBadge: {
        marginTop: Math.round(4 * s),
        paddingHorizontal: Math.round(4 * s),
        paddingVertical: Math.round(2 * s),
        borderRadius: Math.round(4 * s),
        backgroundColor: colors.resmiTatil + "22",
      },
      rtText: {
        fontSize: Math.round(7 * s),
        fontWeight: "800",
        color: colors.resmiTatil,
        textAlign: "center",
      },
      hucre: {
        width: gunGen - Math.round(8 * s),
        minHeight: satirYuk - Math.round(12 * s),
        borderRadius: Math.round(8 * s),
        borderWidth: Math.max(1, Math.round(s)),
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: Math.round(3 * s),
        paddingVertical: Math.round(4 * s),
      },
      hucreBaslik: {
        fontSize: Math.round(10 * s),
        fontWeight: "800",
        color: colors.text,
        textAlign: "center",
      },
      hucreAlt: {
        fontSize: Math.round(8 * s),
        fontWeight: "600",
        color: colors.textMuted,
        textAlign: "center",
        marginTop: Math.round(2 * s),
      },
      footer: {
        marginTop: Math.round(10 * s),
        fontSize: Math.round(9 * s),
        color: colors.textMuted,
        textAlign: "right",
      },
    }),
  };
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
  olcek = 1,
}: Props) {
  const { isimGen, gunGen, styles } = useMemo(
    () => createStyles(colors, olcek),
    [colors, olcek],
  );
  const genislik = isimGen + gunGen * 7;

  return (
    <View
      style={[styles.root, { width: genislik + Math.round(32 * olcek) }]}
      collapsable={false}
    >
      <View style={styles.ust}>
        <Text style={styles.magaza}>{magazaAdi || "Vardiya"}</Text>
        <Text style={styles.aralik}>{aralik}</Text>
        <Text style={styles.hafta}>{haftaEtiket}</Text>
      </View>
      <View style={[styles.tablo, { width: genislik }]}>
        <View style={styles.baslikSatir}>
          <View style={styles.isimHucre}>
            <Text style={[styles.isim, { color: colors.textMuted, fontSize: Math.round(10 * olcek) }]}>
              Personel
            </Text>
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
