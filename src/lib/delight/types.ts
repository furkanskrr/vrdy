import type { AppearanceId } from "../../constants/appearances";

export type DelightPersisted = {
  appearanceId: AppearanceId;
  uiHapticsEnabled: boolean;
  uiSoundsEnabled: boolean;
  /** #RRGGBB veya null = paketin kendi birincil rengi */
  customAccentHex: string | null;
};

export const DELIGHT_STORAGE_KEY = "@vrdy_delight_v2";

export const defaultDelightPersisted = (): DelightPersisted => ({
  appearanceId: "classic",
  uiHapticsEnabled: true,
  uiSoundsEnabled: true,
  customAccentHex: null,
});
