/**
 * Cross-Browser Safe Storage Utility
 * 
 * Provides fail-safe persistence that works across:
 * - Chrome / Edge / Firefox / Opera
 * - iOS Safari & macOS Safari (including strict Private Browsing mode)
 * - In-App Browsers (Telegram, WeChat, Facebook, Instagram WebViews)
 * - Browsers with cookies/storage disabled or strict privacy extensions
 * 
 * If window.localStorage throws (e.g. SecurityError, QuotaExceededError),
 * this gracefully falls back to an in-memory dictionary so the application
 * continues to function smoothly without crashing.
 */

const memoryStorage: Record<string, string> = {};

let isLocalStorageAvailable = false;

try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const testKey = '__snl_storage_test__';
    window.localStorage.setItem(testKey, 'ok');
    const result = window.localStorage.getItem(testKey);
    window.localStorage.removeItem(testKey);
    isLocalStorageAvailable = result === 'ok';
  }
} catch (e) {
  isLocalStorageAvailable = false;
  console.warn('LocalStorage is restricted in this browser session. Using resilient in-memory storage fallback.', e);
}

export const safeStorage = {
  /**
   * Safe getter that never throws
   */
  getItem(key: string): string | null {
    if (isLocalStorageAvailable) {
      try {
        const val = window.localStorage.getItem(key);
        if (val !== null) return val;
      } catch (e) {
        console.warn(`safeStorage: getItem error for key "${key}", falling back to memory`, e);
      }
    }
    return memoryStorage[key] ?? null;
  },

  /**
   * Safe setter that never throws
   */
  setItem(key: string, value: string): boolean {
    // Keep memory fallback in sync
    memoryStorage[key] = value;

    if (isLocalStorageAvailable) {
      try {
        window.localStorage.setItem(key, value);
        return true;
      } catch (e) {
        console.warn(`safeStorage: setItem error for key "${key}" (storage quota or private browsing restrictions).`, e);
      }
    }
    return true;
  },

  /**
   * Safe remove that never throws
   */
  removeItem(key: string): void {
    delete memoryStorage[key];

    if (isLocalStorageAvailable) {
      try {
        window.localStorage.removeItem(key);
      } catch (e) {
        console.warn(`safeStorage: removeItem error for key "${key}"`, e);
      }
    }
  },

  /**
   * Safe JSON parser with fallback default value
   */
  getJSON<T>(key: string, defaultValue: T): T {
    const raw = this.getItem(key);
    if (!raw) return defaultValue;
    try {
      const parsed = JSON.parse(raw);
      if (parsed === undefined || parsed === null) return defaultValue;
      return parsed as T;
    } catch (e) {
      console.warn(`safeStorage: Failed to parse JSON for "${key}"`, e);
      return defaultValue;
    }
  },

  /**
   * Safe JSON serializer
   */
  setJSON<T>(key: string, value: T): boolean {
    try {
      return this.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn(`safeStorage: Failed to serialize JSON for "${key}"`, e);
      return false;
    }
  },

  /**
   * Checks if browser persistent storage is actively working
   */
  isPersistent(): boolean {
    return isLocalStorageAvailable;
  }
};
