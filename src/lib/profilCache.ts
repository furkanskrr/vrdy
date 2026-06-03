import AsyncStorage from "@react-native-async-storage/async-storage";
import type { UserProfile } from "../types";

const ON_EK = "vrdy:profil:v1:";

export async function profilCacheOku(userId: string): Promise<UserProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(ON_EK + userId);
    if (!raw) return null;
    const p = JSON.parse(raw) as UserProfile;
    if (!p?.email) return null;
    return p;
  } catch {
    return null;
  }
}

export async function profilCacheYaz(userId: string, profil: UserProfile): Promise<void> {
  try {
    const { authGruptanKoparildi: _, ...kayit } = profil;
    await AsyncStorage.setItem(ON_EK + userId, JSON.stringify(kayit));
  } catch {
    /* */
  }
}

export async function profilCacheSil(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(ON_EK + userId);
  } catch {
    /* */
  }
}
