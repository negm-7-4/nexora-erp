/*
 * Power Tools — a fully self-contained widget mounted in its OWN React root
 * (see main.jsx). It never touches the main <App/> tree, so it cannot break
 * the app. Provides:
 *   • Accent theme picker (body.accent-*) + Dark/Light toggle
 *   • Alt+K command palette / global search (drives the existing sidebar)
 *   • Keyboard shortcuts (Esc to close, Alt+K to open)
 *
 * It interacts with the running app only through the DOM (clicking existing
 * nav items / buttons), keeping it loosely coupled and safe.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { idbGet, idbSet } from "../lib/idb.js";
import { saveTextFile } from "../lib/native.js";

const ACCENTS = [
  { id: "", label: "Default", dot: "#2563eb" },
  { id: "violet", label: "Violet", dot: "#7c3aed" },
  { id: "emerald", label: "Emerald", dot: "#10b981" },
  { id: "rose", label: "Rose", dot: "#f43f5e" },
  { id: "amber", label: "Amber", dot: "#f59e0b" },
  { id: "cyan", label: "Cyan", dot: "#06b6d4" },
  { id: "indigo", label: "Indigo", dot: "#4f46e5" },
];

function applyAccent(id) {
  document.body.classList.remove(...ACCENTS.filter((a) => a.id).map((a) => "accent-" + a.id));
  if (id) document.body.classList.add("accent-" + id);
  try { localStorage.setItem("nx_accent", id); } catch { /* ignore */ }
}

/* Parse a pasted Firebase config (JS object literal OR JSON) into an object. */
function parseFirebaseConfig(text) {
  let t = (text || "").trim();
  t = t.replace(/^\s*(?:export\s+)?(?:const|let|var)\s+\w+\s*=\s*/, "").replace(/;\s*$/, "");
  const m = t.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("Could not find a config object { ... }");
  // eslint-disable-next-line no-new-func
  const obj = Function("return (" + m[0] + ")")();
  if (!obj || !obj.apiKey || !obj.projectId) throw new Error("Config must include apiKey and projectId");
  return obj;
}

/* Download the current workspace data as a JSON backup file.
   The live cache moved from localStorage to IndexedDB, so read IndexedDB
   first — the old localStorage key is only a legacy fallback. */
async function backupData() {
  try {
    let data = await idbGet("nile_data_cache");
    if (!data) {
      const raw = localStorage.getItem("nile_data_cache");
      data = raw ? JSON.parse(raw) : null;
    }
    if (!data) { alert("No data to back up yet."); return; }
    await saveTextFile(
      `nexora_backup_${new Date().toISOString().split("T")[0]}.json`,
      JSON.stringify(data),
      "application/json"
    );
  } catch (e) { alert("Backup failed: " + e.message); }
}

/* Restore workspace data from an uploaded JSON backup (then reload). */
function restoreData() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json,.json";
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || typeof data !== "object") throw new Error("Invalid file");
        if (!confirm("This will replace your current data with the backup. Continue?")) return;
        // The app reads the IndexedDB cache first (and syncs by lastModified),
        // so write there and stamp the copy as newest or the restore is ignored.
        data.lastModified = Date.now();
        await idbSet("nile_data_cache", data);
        try { localStorage.removeItem("nile_data_cache"); } catch { /* ignore */ }
        location.reload();
      } catch (e) { alert("Restore failed: " + e.message); }
    };
    reader.readAsText(file);
  };
  input.click();
}

/* Collect navigable actions from the live DOM (sidebar + bottom nav). */
function collectNavActions() {
  const seen = new Set();
  const out = [];
  document.querySelectorAll(".nav-item, .bn-item").forEach((el) => {
    const label = (el.textContent || "").trim().replace(/\s+/g, " ");
    if (!label || seen.has(label)) return;
    seen.add(label);
    out.push({ type: "nav", label, run: () => el.click() });
  });
  return out;
}

export default function PowerTools() {
  const [open, setOpen] = useState(false);       // settings panel
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [accent, setAccent] = useState(() => { try { return localStorage.getItem("nx_accent") || ""; } catch { return ""; } });
  const [actions, setActions] = useState([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const [fbOpen, setFbOpen] = useState(false);
  const [fbText, setFbText] = useState("");
  const [fbErr, setFbErr] = useState("");
  const fbConnected = (() => { try { return !!JSON.parse(localStorage.getItem("nx_firebase_config") || "null"); } catch { return false; } })();

  const connectFirebase = () => {
    try {
      const cfg = parseFirebaseConfig(fbText);
      localStorage.setItem("nx_firebase_config", JSON.stringify(cfg));
      alert("✅ Firebase connected! The app will reload in cloud mode.\nProject: " + cfg.projectId);
      location.reload();
    } catch (e) { setFbErr(e.message); }
  };
  const disconnectFirebase = () => {
    if (!confirm("Disconnect Firebase and return to local mode?")) return;
    localStorage.removeItem("nx_firebase_config");
    location.reload();
  };

  // Apply saved accent on mount.
  useEffect(() => { applyAccent(accent); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const quickActions = useCallback(() => ([
    { type: "action", label: "🌗 Toggle Dark / Light", run: () => {
        const lightBtn = [...document.querySelectorAll(".tb-btn")].find((b) => /☀|🌙/.test(b.textContent));
        if (lightBtn) lightBtn.click(); else document.body.classList.toggle("light-mode");
      } },
    { type: "action", label: "🌐 Toggle Language (AR / EN)", run: () => {
        const langBtn = [...document.querySelectorAll(".tb-btn, .btn")].find((b) => /^(EN|ع|AR)$/.test(b.textContent.trim()));
        if (langBtn) langBtn.click();
      } },
    { type: "action", label: "🖨 Print current page", run: () => window.print() },
    { type: "action", label: "🤖 Open AI Copilot", run: () => { const f = document.querySelector(".copilot-fab, .ai-fab"); if (f) f.click(); } },
    { type: "action", label: "📊 Open Finance & Reports (P&L, Balance, Aging…)", run: () => window.dispatchEvent(new Event("nx-open-finance")) },
    { type: "action", label: "💾 Backup data (download JSON)", run: backupData },
    { type: "action", label: "♻️ Restore data (upload JSON)", run: restoreData },
    { type: "action", label: "🔥 Connect Firebase (cloud sync)", run: () => { setOpen(false); setFbErr(""); setFbOpen(true); } },
    { type: "action", label: "🗄 Connect MongoDB server (API URL)", run: () => {
        const current = (() => { try { return localStorage.getItem("nile_api_url") || ""; } catch { return ""; } })();
        const url = prompt("Server API URL (e.g. https://my-server.com/api).\nLeave empty to disconnect:", current);
        if (url === null) return; // cancelled
        try {
          if (url.trim()) localStorage.setItem("nile_api_url", url.trim());
          else localStorage.removeItem("nile_api_url");
          alert(url.trim() ? "✅ Server connected — reloading." : "Server disconnected — reloading.");
          location.reload();
        } catch (e) { alert("Failed to save: " + e.message); }
      } },
    { type: "action", label: "↕️ Toggle compact density", run: () => { document.body.classList.toggle("nx-density-compact"); try { localStorage.setItem("nx_density", document.body.classList.contains("nx-density-compact") ? "compact" : ""); } catch { /* */ } } },
    { type: "action", label: "⬆️ Scroll to top", run: () => window.scrollTo({ top: 0, behavior: "smooth" }) },
    { type: "action", label: "🎨 Open Appearance settings", run: () => setOpen(true) },
  ]), []);

  // Open palette: snapshot current actions.
  const openPalette = useCallback(() => {
    setActions([...collectNavActions(), ...quickActions()]);
    setQuery(""); setActive(0); setPaletteOpen(true);
    setTimeout(() => inputRef.current?.focus(), 30);
  }, [quickActions]);

  // Global keyboard shortcuts.
  useEffect(() => {
    const onKey = (e) => {
      // Alt+K opens the command palette (Chrome doesn't use Alt+K, unlike Ctrl+K).
      if (e.altKey && (e.code === "KeyK" || e.key.toLowerCase() === "k")) {
        e.preventDefault(); paletteOpen ? setPaletteOpen(false) : openPalette();
      } else if (e.key === "Escape") { setPaletteOpen(false); setOpen(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paletteOpen, openPalette]);

  const filtered = actions.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()));

  const runAction = (a) => { setPaletteOpen(false); setTimeout(() => a.run(), 10); };

  const onPaletteKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (filtered[active]) runAction(filtered[active]); }
  };

  return (
    <>
      {/* No floating launcher — open via Alt + K (command palette). */}

      {/* Settings panel */}
      {open && (
        <div onClick={(e) => e.target === e.currentTarget && setOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 601, display: "flex", alignItems: "flex-end", justifyContent: "flex-start" }}>
          <div style={{
            margin: 18, marginBottom: 80, width: 300, maxWidth: "calc(100vw - 36px)",
            background: "linear-gradient(160deg,#0d1b34,#10243e)", border: "1px solid rgba(120,160,220,.25)",
            borderRadius: 18, padding: 18, boxShadow: "0 28px 70px rgba(0,0,0,.6)", color: "#f0f6ff",
            animation: "nx-pop .25s ease both",
          }}>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>⚡ Power Tools</div>
            <div style={{ fontSize: 11, color: "#5b7ca6", marginBottom: 14 }}>Press <b style={{ color: "#93c5fd" }}>Alt + K</b> anywhere for the command palette.</div>

            <div style={{ fontSize: 11, color: "#94b4d8", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Accent color</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {ACCENTS.map((a) => (
                <button key={a.id || "def"} title={a.label}
                  onClick={() => { setAccent(a.id); applyAccent(a.id); }}
                  style={{
                    width: 30, height: 30, borderRadius: 10, cursor: "pointer",
                    border: accent === a.id ? "2px solid #fff" : "1px solid rgba(255,255,255,.15)",
                    background: a.dot, boxShadow: accent === a.id ? `0 0 12px ${a.dot}` : "none",
                  }} />
              ))}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button className="nx-btn nx-btn-ghost" style={btn} onClick={() => { const b = [...document.querySelectorAll(".tb-btn")].find((x) => /☀|🌙/.test(x.textContent)); if (b) b.click(); else document.body.classList.toggle("light-mode"); }}>🌗 Theme</button>
              <button className="nx-btn nx-btn-primary" style={{ ...btn, background: "linear-gradient(135deg,#2563eb,#1e4d9e)", color: "#fff" }} onClick={openPalette}>Alt+K Search</button>
            </div>

            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(120,160,220,.15)" }}>
              <div style={{ fontSize: 11, color: "#94b4d8", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                ☁️ Cloud (Firebase) <span style={{ fontSize: 10, color: fbConnected ? "#34d399" : "#5b7ca6" }}>● {fbConnected ? "Connected" : "Local mode"}</span>
              </div>
              {fbConnected
                ? <button style={{ ...btn, width: "100%" }} onClick={disconnectFirebase}>Disconnect cloud</button>
                : <button style={{ ...btn, width: "100%", background: "linear-gradient(135deg,#f59e0b,#f97316)", color: "#000", border: "none" }} onClick={() => { setOpen(false); setFbErr(""); setFbOpen(true); }}>🔥 Connect Firebase</button>}
            </div>
          </div>
        </div>
      )}

      {/* Firebase connect modal */}
      {fbOpen && (
        <div onClick={(e) => e.target === e.currentTarget && setFbOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 750, background: "rgba(0,0,0,.65)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ width: 540, maxWidth: "100%", background: "linear-gradient(160deg,#0d1b34,#10243e)", border: "1px solid rgba(120,160,220,.3)", borderRadius: 16, padding: 22, color: "#f0f6ff", boxShadow: "0 30px 80px rgba(0,0,0,.7)", animation: "nx-pop .25s ease both" }}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>🔥 Connect your Firebase project</div>
            <div style={{ fontSize: 12, color: "#94b4d8", lineHeight: 1.6, marginBottom: 12 }}>
              In Firebase Console → Project settings → <b>Your apps → SDK config</b>, copy the <b>firebaseConfig</b> object and paste it below.
              Then enable <b>Authentication → Email/Password</b> and create a <b>Firestore</b> database.
            </div>
            <textarea value={fbText} onChange={(e) => { setFbText(e.target.value); setFbErr(""); }} spellCheck={false}
              placeholder={`const firebaseConfig = {\n  apiKey: "AIza...",\n  authDomain: "your-app.firebaseapp.com",\n  projectId: "your-app",\n  storageBucket: "your-app.appspot.com",\n  messagingSenderId: "...",\n  appId: "1:...:web:..."\n};`}
              style={{ width: "100%", minHeight: 170, background: "rgba(8,15,30,.8)", border: "1px solid rgba(120,160,220,.25)", borderRadius: 10, color: "#dbeafe", fontFamily: "monospace", fontSize: 12, padding: 12, outline: "none", resize: "vertical" }} />
            {fbErr && <div style={{ color: "#fb7185", fontSize: 12, marginTop: 8 }}>⚠ {fbErr}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button onClick={connectFirebase} style={{ ...btn, flex: 1, background: "linear-gradient(135deg,#f59e0b,#f97316)", color: "#000", border: "none" }}>🔥 Connect & Reload</button>
              <button onClick={() => setFbOpen(false)} style={{ ...btn, flex: 0, padding: "9px 16px" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Command palette */}
      {paletteOpen && (
        <div onClick={(e) => e.target === e.currentTarget && setPaletteOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 700, background: "rgba(0,0,0,.6)", backdropFilter: "blur(6px)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "12vh" }}>
          <div style={{ width: 560, maxWidth: "calc(100vw - 32px)", background: "linear-gradient(160deg,#0d1b34,#10243e)", border: "1px solid rgba(120,160,220,.3)", borderRadius: 16, overflow: "hidden", boxShadow: "0 30px 80px rgba(0,0,0,.7)", animation: "nx-pop .2s ease both" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid rgba(120,160,220,.15)" }}>
              <span style={{ fontSize: 16, opacity: .7 }}>🔎</span>
              <input ref={inputRef} value={query} onChange={(e) => { setQuery(e.target.value); setActive(0); }} onKeyDown={onPaletteKey}
                placeholder="Search pages & actions…  (↑↓ to move, Enter to run)"
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#f0f6ff", fontSize: 15, fontFamily: "inherit" }} />
              <kbd style={kbd}>ESC</kbd>
            </div>
            <div style={{ maxHeight: 360, overflowY: "auto", padding: 8 }}>
              {filtered.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: "#5b7ca6", fontSize: 13 }}>No matches</div>
              ) : filtered.map((a, i) => (
                <div key={i} onClick={() => runAction(a)} onMouseEnter={() => setActive(i)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderRadius: 10, cursor: "pointer",
                    background: i === active ? "linear-gradient(90deg,rgba(37,99,235,.25),transparent)" : "transparent",
                    color: i === active ? "#dbeafe" : "#94b4d8", fontSize: 14,
                  }}>
                  <span style={{ fontSize: 13, opacity: .6, width: 56, color: "#5b7ca6" }}>{a.type === "nav" ? "PAGE" : "ACTION"}</span>
                  <span style={{ fontWeight: 600 }}>{a.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const btn = { flex: 1, justifyContent: "center", padding: "9px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.06)", color: "#cfe0f5", cursor: "pointer", fontWeight: 700, fontSize: 12 };
const kbd = { fontSize: 10, color: "#5b7ca6", border: "1px solid rgba(120,160,220,.3)", borderRadius: 6, padding: "2px 6px", fontFamily: "monospace" };
