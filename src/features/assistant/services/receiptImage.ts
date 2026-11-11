import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { withoutLocking } from '@/features/security';
import { err, ok, type Result } from '@/shared/lib/result';

/** Longest side sent to Claude. Larger images cost more and read no better. */
const MAX_SIDE = 1568;

export type PickedImage = { uri: string; base64: string };

/**
 * Take or choose a photo (e.g. a receipt), shrink it and return it as JPEG base64.
 * `null` when the user cancels. The photo stays on the phone unless the message is sent.
 */
export async function pickImage(source: 'camera' | 'library'): Promise<Result<PickedImage | null>> {
  try {
    // The camera / photo picker leaves the app; don't lock on the way back.
    const result = await withoutLocking(async () => {
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return 'denied' as const;
        return ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
      }
      // Android's system photo picker: no storage permission needed.
      return ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    });
    if (result === 'denied') return err('Allow camera access in phone settings to take a photo.');
    if (result.canceled || !result.assets[0]) return ok(null);

    const asset = result.assets[0];
    const landscape = asset.width >= asset.height;
    const longest = Math.max(asset.width, asset.height);
    const context = ImageManipulator.manipulate(asset.uri);
    if (longest > MAX_SIDE) context.resize(landscape ? { width: MAX_SIDE } : { height: MAX_SIDE });
    const image = await context.renderAsync();
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
    if (!saved.base64) return err("Couldn't read that photo.");
    return ok({ uri: saved.uri, base64: saved.base64 });
  } catch {
    return err("Couldn't open the photo.");
  }
}
