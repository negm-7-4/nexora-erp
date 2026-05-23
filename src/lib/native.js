/*
 * Web-safe shims for Capacitor native APIs.
 *
 * The app targets the browser/PWA here (no native runtime), but App.jsx still
 * references `Capacitor` and `PushNotifications` for the mobile build. These
 * no-op shims keep the web build from crashing; on a real native build you can
 * swap these for the actual @capacitor/* packages.
 */
export const Capacitor =
  (typeof window !== "undefined" && window.Capacitor) || {
    isNativePlatform: () => false,
    getPlatform: () => "web",
    isPluginAvailable: () => false,
  };

export const PushNotifications =
  (typeof window !== "undefined" && window.PushNotifications) || {
    async requestPermissions() { return { receive: "denied" }; },
    async register() {},
    addListener() { return { remove() {} }; },
    async removeAllListeners() {},
    async checkPermissions() { return { receive: "denied" }; },
  };
