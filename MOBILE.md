# 📱 Nexora — Mobile & Desktop App

Nexora runs **three ways** from the same codebase:

## 1) Web (any browser) — desktop & mobile
```bash
npm run dev      # development
npm run build    # production build → dist/
```

## 2) Installable PWA (no app store needed) ✅ ready now
The app is a full **Progressive Web App**:
- **Desktop (Chrome/Edge):** open the site → click the **Install** icon in the address bar.
- **Android (Chrome):** menu → **Add to Home screen / Install app**.
- **iPhone (Safari):** Share → **Add to Home Screen**.

It then launches full-screen like a native app and **works offline** (service worker).

## 3) Native Android app (APK / Play Store) — via Capacitor
Capacitor is configured (`capacitor.config.json`, appId `com.nexora.erp`).

**One-time setup** (already partly done):
```bash
npm install            # installs @capacitor/* (already in package.json)
npm run android:add    # creates the native /android project (run once)
```

**Build the app** (whenever you change the web code):
```bash
npm run android:sync   # builds the web app + copies it into /android
npm run android:open   # opens the project in Android Studio
```
Then in **Android Studio**: Build → **Build APK** (or Run on a device/emulator).
Requires [Android Studio](https://developer.android.com/studio) + JDK installed.

> iOS: `npm i @capacitor/ios && npx cap add ios && npx cap open ios` (needs a Mac + Xcode).

---
Tip: `npm run android:sync` after every web change keeps the native app up to date.

## Connecting the installed app to your backend
An installed APK/PWA can't read build-time `.env` values, so both cloud
backends are configured **at runtime** from inside the app (press `Alt+K` on
desktop, or use the command palette):

- **🔥 Connect Firebase** — paste your Firebase config object.
- **🗄 Connect MongoDB server** — enter your server's API URL
  (e.g. `https://my-server.com/api`). Leave empty to disconnect.

Exports (Excel/CSV/JSON backup) on Android open the system **share sheet**
so you can save to Downloads or send the file anywhere.
