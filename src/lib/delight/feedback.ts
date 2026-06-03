import * as Haptics from "expo-haptics";

export type FeedbackKind = "selection" | "impactLight" | "impactMedium" | "success" | "warning" | "celebrate";

/**
 * UI geri bildirimi: haptic desenleri. (Özel ses dosyası eklenirse burada çalınır.)
 */
export async function playDelightFeedback(
  kind: FeedbackKind,
  opts: { hapticsEnabled: boolean; soundsEnabled: boolean }
): Promise<void> {
  if (opts.hapticsEnabled) {
    try {
      switch (kind) {
        case "selection":
          await Haptics.selectionAsync();
          break;
        case "impactLight":
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case "impactMedium":
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case "success":
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case "warning":
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case "celebrate":
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          setTimeout(() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }, 60);
          break;
        default:
          await Haptics.selectionAsync();
      }
    } catch {
      /* simülatör */
    }
  }
  if (opts.soundsEnabled) {
    /* İleride: expo-audio ile kısa UI tıkları */
  }
}
