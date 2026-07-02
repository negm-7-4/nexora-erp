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

/*
 * Save/share a text file on any platform.
 *
 * The browser `<a download>` + blob trick silently does nothing inside the
 * Capacitor Android WebView, so on native we write the file to the app cache
 * with the Filesystem plugin and hand it to the system share sheet instead
 * (which lets the user save it to Downloads, WhatsApp it, email it, …).
 */
export async function saveTextFile(filename, content, mime = "text/plain") {
  const plugins = typeof window !== "undefined" && window.Capacitor && window.Capacitor.Plugins;
  if (Capacitor.isNativePlatform() && plugins && plugins.Filesystem) {
    const { Filesystem, Share } = plugins;
    const res = await Filesystem.writeFile({
      path: filename,
      data: content,
      directory: "CACHE",
      encoding: "utf8",
    });
    if (Share) {
      await Share.share({ title: filename, url: res.uri });
    }
    return true;
  }
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}
