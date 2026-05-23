/*
 * Local key/value storage shim.
 *
 * The app talks to a `window.storage` async API (get/set/delete). In a hosted
 * environment this may be injected by the host. When it is not present (normal
 * browser, `vite dev`, static build) we provide a localStorage-backed
 * implementation so the app always runs.
 */

function createLocalStorageShim() {
  const prefix = "kv__";
  return {
    async get(key) {
      try {
        const value = window.localStorage.getItem(prefix + key);
        return value === null ? null : { value };
      } catch {
        return null;
      }
    },
    async set(key, value) {
      window.localStorage.setItem(prefix + key, String(value));
      return true;
    },
    async delete(key) {
      window.localStorage.removeItem(prefix + key);
      return true;
    },
    async keys() {
      const out = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(prefix)) out.push(k.slice(prefix.length));
      }
      return out;
    },
    __local: true,
  };
}

if (typeof window !== "undefined" && !window.storage) {
  window.storage = createLocalStorageShim();
}

export const storage =
  typeof window !== "undefined" ? window.storage : createLocalStorageShim();
