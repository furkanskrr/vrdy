export type ShiftKind =
  | "sabah"
  | "ogle"
  | "tamgun"
  | "izin"
  | "antre"
  | "aksam"
  | "envanter"
  | "envanter_izni"
  | "envanter_full"
  /** Resmi tatilde çalışmayan; takvimde işaretli gün + müdür ataması */
  | "resmi_tatil";

export type TeamRole = "mudur" | "yardimci" | "personel";

/** Yanıtlanan mesaj özeti (PostgREST embed veya istemci birleştirmesi) */
export type GrupMesajiYanitOzet = {
  id: string;
  sender_ad: string;
  body: string;
  created_at: string;
};

export type SohbetEkTuru = "image" | "file";

/** Grup sohbeti satırı (Supabase group_messages) */
export type GrupMesaji = {
  id: string;
  group_id: string;
  profile_id: string;
  sender_ad: string;
  body: string;
  created_at: string;
  edited_at?: string | null;
  reply_to_id?: string | null;
  attachment_type?: SohbetEkTuru | null;
  attachment_path?: string | null;
  attachment_name?: string | null;
  attachment_mime?: string | null;
  /** İstemci: imzalı okuma URL’si */
  attachment_url?: string | null;
  /** Sunucudan `reply_parent` embed veya mesajlar listesinden doldurulur */
  reply_parent?: GrupMesajiYanitOzet | null;
};

export type TeamMember = {
  id: string;
  ad: string;
  rol: TeamRole;
  partnerId: string;
  /** group_members.profile_id — bildirim / takas için */
  profileId?: string;
};

export type TakasDurum =
  | "awaiting_partner"
  | "awaiting_manager"
  | "approved"
  | "rejected_partner"
  | "rejected_manager"
  | "cancelled";

export type TakasKaydi = {
  id: string;
  groupId: string;
  fromMemberId: string;
  toMemberId: string;
  dateFrom: string;
  dateTo: string;
  shiftKindFrom: ShiftKind;
  shiftKindTo: ShiftKind;
  status: TakasDurum;
  createdAt: string;
};

export type GunAtamasi = Record<string, ShiftKind>;

export type GunlukPlan = {
  tarih: string;
  atamalar: GunAtamasi;
};

export type HaftalikSatir = {
  uye: TeamMember;
  gunler: ShiftKind[];
};

export type UserProfile = {
  email: string;
  ad: string;
  magazaAdi: string;
  rol: TeamRole;
  grupKodu: string | null;
  groupId: string | null;
  /** İlk kurulum ekranı (rol / müdürde mağaza) tamamlandı mı */
  onboardingComplete: boolean;
  onboarded: boolean;
  /** Yalnızca fetchProfile: üyelik satırı yokken profil gruptan düşürüldü; birleştirmede eski onboarding=true ezilmesin */
  authGruptanKoparildi?: boolean;
};
