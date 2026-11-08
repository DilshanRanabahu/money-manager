import * as LocalAuthentication from 'expo-local-authentication';

import { err, ok, type Result } from '@/shared/lib/result';

/**
 * Thin wrapper over expo-local-authentication.
 * Fingerprint (or face) first; the phone's PIN / pattern / password is always allowed as a
 * fallback so the owner can never be locked out of their own data.
 */

export type AuthFailure = 'cancelled' | 'unavailable' | 'failed';

/** Can this phone protect the app? True if it has any screen lock (biometric or PIN). */
export async function canProtect(): Promise<boolean> {
  try {
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    return level !== LocalAuthentication.SecurityLevel.NONE;
  } catch {
    return false;
  }
}

export async function authenticate(promptMessage: string): Promise<Result<true, AuthFailure>> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
      requireConfirmation: false,
    });
    if (result.success) return ok(true);
    switch (result.error) {
      case 'user_cancel':
      case 'system_cancel':
      case 'app_cancel':
        return err('cancelled');
      case 'not_enrolled':
      case 'not_available':
      case 'passcode_not_set':
        return err('unavailable');
      default:
        return err('failed');
    }
  } catch {
    return err('failed');
  }
}
