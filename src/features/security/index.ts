export { AppLockOverlay } from './components/AppLockOverlay';
export { AppLockSettings } from './components/AppLockSettings';
export { BUSY_GRACE_MS, LOCK_AFTER_MS, shouldLockOnReturn, type LockAfter } from './domain/lockPolicy';
export { useAppLockLifecycle } from './hooks/useAppLock';
export { withoutLocking } from './store/lockStore';
export { isDataEncrypted } from './services/storage';
