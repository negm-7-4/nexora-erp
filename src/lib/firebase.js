/*
 * Firebase initialization.
 *
 * Reads config from Vite env vars (VITE_FIREBASE_*). When the config is not
 * present, Firebase stays disabled and the app falls back to local storage.
 * This lets the product run out of the box and switch to real cloud
 * multi-tenancy by dropping in a .env file — no code changes required.
 *
 * .env example:
 *   VITE_FIREBASE_API_KEY=...
 *   VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
 *   VITE_FIREBASE_PROJECT_ID=your-app
 *   VITE_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
 *   VITE_FIREBASE_MESSAGING_SENDER_ID=...
 *   VITE_FIREBASE_APP_ID=...
 */
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import { idbSet, idbGet } from "./idb.js";
import { api, apiEnabled } from "./api.js";

// When a MongoDB backend is configured (VITE_API_URL) and the user holds a
// JWT, the app syncs through it instead of Firestore.
function mongoActive() {
  try {
    return apiEnabled && Boolean(localStorage.getItem("nile_token"));
  } catch {
    return apiEnabled;
  }
}

const env = import.meta.env || {};

/* Runtime config: read from localStorage first (set via the in-app "Connect
   Firebase" tool), then fall back to build-time env vars. This lets users
   connect their OWN Firebase project without rebuilding. */
function savedConfig() {
  try {
    const c = JSON.parse(localStorage.getItem("nx_firebase_config") || "null");
    if (c && c.apiKey && c.projectId) return c;
  } catch { /* ignore */ }
  return null;
}

// Default project (connected out of the box). A localStorage override or env
// vars still take priority if present.
const DEFAULT_CONFIG = {
  apiKey: "AIzaSyCr1ruWcNNbIJlSPL7bxWkkNpgKaohUz4Q",
  authDomain: "nile-erp.firebaseapp.com",
  databaseURL: "https://nile-erp-default-rtdb.firebaseio.com",
  projectId: "nile-erp",
  storageBucket: "nile-erp.firebasestorage.app",
  messagingSenderId: "503929658707",
  appId: "1:503929658707:web:7fa754063ae584b8a655a6",
  measurementId: "G-CEXCJNV8RF",
};

const envConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};
const hasEnv = Boolean(envConfig.apiKey && envConfig.projectId);

const firebaseConfig = savedConfig() || (hasEnv ? envConfig : DEFAULT_CONFIG);

export const firebaseEnabled = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId
);

let app = null;
let firebaseAuth = null;
let firestore = null;

if (firebaseEnabled) {
  try {
    app = initializeApp(firebaseConfig);
    firebaseAuth = getAuth(app);
    // ignoreUndefinedProperties: the dataset routinely carries undefined
    // fields (optional form inputs); without this every setDoc() throws and
    // nothing ever reaches Firestore.
    firestore = initializeFirestore(app, { ignoreUndefinedProperties: true });
  } catch (e) {
    console.warn("Firebase init failed, falling back to local storage:", e);
  }
}

// Create auth wrapper that handles null case
export const auth = firebaseAuth || {
  currentUser: null,
  // Fallback implementation when Firebase is not available
  onAuthStateChanged(callback) {
    try {
      const stored = localStorage.getItem('user_session');
      if (stored) {
        const session = JSON.parse(stored);
        callback(session);
      } else {
        callback(null);
      }
    } catch {
      callback(null);
    }
    // Return unsubscribe function
    return () => {};
  },

  async signOut() {
    localStorage.removeItem('user_session');
    return Promise.resolve();
  },

  // Mock setPersistence - no-op when Firebase is unavailable
  setPersistence() {
    return Promise.resolve();
  }
};

export { app, firestore };

// Database wrapper with fallback for when Firebase is not available
export const db = {
  // Load session from local storage or Firebase
  loadSession() {
    try {
      const stored = localStorage.getItem('user_session');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Error loading session:', e);
    }
    return null;
  },

  // Save session to local storage or Firebase
  saveSession(sessionData) {
    try {
      localStorage.setItem('user_session', JSON.stringify(sessionData));
    } catch (e) {
      console.warn('Error saving session:', e);
    }
  },

  // Clear session
  clearSession() {
    try {
      localStorage.removeItem('user_session');
    } catch (e) {
      console.warn('Error clearing session:', e);
    }
  },

  // Get underlying Firestore instance if available
  getFirestore() {
    return firestore;
  },

  // Check if Firebase is enabled
  isEnabled() {
    return firebaseEnabled;
  },

  /* ── Workspace data persistence ── */
  // Which Firestore document holds this account's data. Tenant impersonation
  // (super admin) overrides it; otherwise it's the signed-in user's uid.
  _docId() {
    // Data is isolated PER TENANT. The active tenant is resolved at login and
    // stored in nile_tenant_id; super-admin impersonation overrides it.
    const impersonated = localStorage.getItem("nile_impersonated_tenant");
    if (impersonated) return impersonated;
    return localStorage.getItem("nile_tenant_id")
      || (firebaseAuth && firebaseAuth.currentUser && firebaseAuth.currentUser.uid)
      || "local";
  },

  // Persist the whole dataset. App.jsx expects `true` on success, `false` on a
  // cloud failure (data stays safe locally) and `'RACE_CONDITION'` when the
  // server holds a newer copy.
  async save(data) {
    // Always keep a local copy for offline resilience.
    try { await idbSet("nile_data_cache", data); } catch { /* ignore */ }
    if (mongoActive()) {
      try {
        const tenantId = localStorage.getItem("nile_impersonated_tenant") || undefined;
        const ep = tenantId ? `/data?tenantId=${encodeURIComponent(tenantId)}` : "/data";
        const res = await api.put(ep, { data });
        if (res && res.stale) return "RACE_CONDITION"; // server copy is newer
        return true;
      } catch (e) {
        console.warn("MongoDB save failed (kept local copy):", e.message);
        return false;
      }
    }
    if (firebaseEnabled && firestore) {
      try {
        const fs = await import("firebase/firestore");
        // Full replace (no merge): deletions — removed rows, cleared
        // attendance days, dropped keys — must reach the other devices too.
        await fs.setDoc(fs.doc(firestore, "appData", this._docId()), data);
        return true;
      } catch (e) {
        console.warn("Firestore save failed (kept local copy):", e);
        // A locally signed-in user (no Firebase auth) can't pass the security
        // rules; for them local persistence IS the expected success path.
        return firebaseAuth && firebaseAuth.currentUser ? false : true;
      }
    }
    return true;
  },

  // Realtime feed. App.jsx expects this to return a Promise that resolves to an
  // unsubscribe function. In Firebase mode it's a live Firestore listener; in
  // local mode it emits the cached snapshot once (a new account gets `null`).
  subscribe(callback) {
    const emitLocal = async () => {
      try {
        let c = await idbGet("nile_data_cache");
        if (!c) {
          const old = localStorage.getItem("nile_data_cache");
          if (old) c = JSON.parse(old);
        }
        callback(c ? c : null);
      } catch {
        callback(null);
      }
    };

    // MongoDB backend: no realtime channel, so fetch once and poll for changes.
    if (mongoActive()) {
      let stopped = false;
      let lastSeen = -1;
      const tenantId = localStorage.getItem("nile_impersonated_tenant") || undefined;
      const ep = tenantId ? `/data?tenantId=${encodeURIComponent(tenantId)}` : "/data";
      const pull = async () => {
        try {
          const res = await api.get(ep);
          if (stopped) return;
          const lm = Number(res.lastModified || 0);
          if (lm !== lastSeen) {
            lastSeen = lm;
            callback(res.data || null);
          }
        } catch (e) {
          if (!stopped) console.warn("MongoDB subscribe poll failed:", e.message);
        }
      };
      pull();
      const timer = setInterval(pull, 15000);
      return Promise.resolve(() => { stopped = true; clearInterval(timer); });
    }

    if (firebaseEnabled && firestore) {
      const docId = this._docId();
      return import("firebase/firestore")
        .then((fs) => fs.onSnapshot(
          fs.doc(firestore, "appData", docId),
          (snap) => callback(snap.exists() ? snap.data() : null),
          (err) => { console.warn("Firestore subscribe error:", err); callback({ _connectionError: true }); }
        ))
        .catch((e) => { console.warn("Firestore subscribe failed, using local cache:", e); emitLocal(); return () => {}; });
    }

    return new Promise((resolve) => {
      setTimeout(() => { emitLocal(); resolve(() => {}); }, 0);
    });
  },

  // Convert a File/Blob to a base64 data URL (used for logos & avatars).
  async uploadFile(file) {
    if (!file) return "";
    if (typeof file === "string") return file;
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });
  },

  async saveDeviceToken() { return true; },

  /* ── Multi-tenant registry (local mode) ── */
  _tenants() {
    try { return JSON.parse(localStorage.getItem("nile_tenants") || "[]"); } catch { return []; }
  },
  _saveTenants(list) { localStorage.setItem("nile_tenants", JSON.stringify(list)); },

  // Resolve which tenant (company workspace) a user belongs to. Returns a
  // valid object always, so login never crashes. Provisioned customers are
  // matched by email; everyone else gets their own workspace keyed by uid.
  async getUserTenant(email, uid) {
    const fallback = {
      tenantId: uid || ("user_" + String(email || "anon").replace(/[^a-z0-9]/gi, "")),
      status: "active",
      isOwner: true,
    };
    if (firebaseEnabled && firestore && email) {
      try {
        const fs = await import("firebase/firestore");
        const snap = await fs.getDocs(fs.query(fs.collection(firestore, "tenants"), fs.where("email", "==", email)));
        if (!snap.empty) {
          const d = snap.docs[0];
          return { tenantId: d.id, status: d.data().status || "active", isOwner: true };
        }
      } catch (e) { console.warn("getUserTenant failed, using own workspace:", e); }
    }
    return fallback;
  },

  async getAllTenants() {
    if (mongoActive()) {
      try {
        const res = await api.get("/admin/tenants");
        return res.tenants || [];
      } catch (e) { console.warn("getAllTenants (mongo) failed:", e.message); return []; }
    }
    if (firebaseEnabled && firestore) {
      try {
        const fs = await import("firebase/firestore");
        const snap = await fs.getDocs(fs.collection(firestore, "tenants"));
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      } catch (e) { console.warn("getAllTenants firestore failed:", e); }
    }
    return this._tenants();
  },

  async createNewTenant(name, email, plan = "free", domain = "") {
    const tenant = { name, email, plan, domain, status: "active", createdAt: Date.now() };
    if (firebaseEnabled && firestore) {
      try {
        const fs = await import("firebase/firestore");
        const ref = await fs.addDoc(fs.collection(firestore, "tenants"), tenant);
        return { id: ref.id, ...tenant };
      } catch (e) { console.warn("createNewTenant firestore failed:", e); }
    }
    const id = "t_" + Date.now().toString(36);
    const list = this._tenants();
    list.push({ id, ...tenant });
    this._saveTenants(list);
    return { id, ...tenant };
  },

  async _patchTenant(id, patch) {
    if (mongoActive()) {
      try {
        await api.put(`/admin/tenants/${encodeURIComponent(id)}`, patch, { method: "PATCH" });
        return true;
      } catch (e) { console.warn("patchTenant (mongo) failed:", e.message); return false; }
    }
    if (firebaseEnabled && firestore) {
      try {
        const fs = await import("firebase/firestore");
        await fs.updateDoc(fs.doc(firestore, "tenants", id), patch);
        return true;
      } catch (e) { console.warn("patchTenant firestore failed:", e); }
    }
    this._saveTenants(this._tenants().map((t) => (t.id === id ? { ...t, ...patch } : t)));
    return true;
  },
  updateTenantStatus(id, status) { return this._patchTenant(id, { status }); },
  updateTenantPlan(id, plan) { return this._patchTenant(id, { plan }); },

  async deleteTenant(id) {
    if (mongoActive()) {
      try {
        await api.delete(`/admin/tenants/${encodeURIComponent(id)}`);
        return true;
      } catch (e) { console.warn("deleteTenant (mongo) failed:", e.message); return false; }
    }
    if (firebaseEnabled && firestore) {
      try {
        const fs = await import("firebase/firestore");
        await fs.deleteDoc(fs.doc(firestore, "tenants", id));
        return true;
      } catch (e) { console.warn("deleteTenant firestore failed:", e); }
    }
    this._saveTenants(this._tenants().filter((t) => t.id !== id));
    return true;
  },

  async inviteUserToTenant() { return true; },
};

// Set tenant ID for multi-tenancy support
export function setTenantId(tenantId) {
  try {
    sessionStorage.setItem('tenantId', tenantId);
    if (auth && auth.currentUser) {
      // Store in local session data as well
      const session = db.loadSession() || {};
      session.tenantId = tenantId;
      db.saveSession(session);
    }
  } catch (e) {
    console.warn('Error setting tenant ID:', e);
  }
}
