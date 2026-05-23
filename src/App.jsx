import React, { useState, useEffect, useRef, useCallback, createContext, useContext, useMemo, useReducer, useDeferredValue, memo, Suspense, lazy, startTransition } from "react";
import { createPortal } from "react-dom";
import { db, auth, setTenantId, firebaseEnabled } from "./lib/firebase.js";
import { idbGet, idbSet, idbDel } from "./lib/idb.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail, createUserWithEmailAndPassword, updateProfile, setPersistence, browserLocalPersistence, browserSessionPersistence, updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider, GoogleAuthProvider, OAuthProvider, signInWithPopup, signInWithRedirect, getAdditionalUserInfo } from "firebase/auth";
import { LanguageProvider, useLanguage, DynText } from "./context/LanguageContext.jsx";
import { useAppStore, EMPTY_DATA } from './lib/store.js';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, Legend, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import { api } from './lib/api.js'; // API client (MongoDB backend, optional)
import { Capacitor, PushNotifications } from './lib/native.js'; // web-safe native shims

/* ═══════════════════════════════════════════════════════
   GLOBAL STYLES
═══════════════════════════════════════════════════════ */
const GlobalStyle = memo(() => (
  <style>{`
    :root {
      --deep:#080f1e;--dark:#0d1b34;--navy:#10243e;--blue:#1a3a6e;
      --mid:#1e4d9e;--bright:#2563eb;--sky:#3b82f6;--light:#60a5fa;--pale:#93c5fd;
      --gold:#f59e0b;--gold-l:#fbbf24;--gold-p:#fde68a;
      --em:#10b981;--em-l:#34d399;--rose:#f43f5e;--rose-l:#fb7185;
      --vio:#7c3aed;--vio-l:#a78bfa;--cyan:#06b6d4;--cyan-l:#22d3ee;--orange:#f97316;
      --tp:#f0f6ff;--ts:#94b4d8;--tm:#5b7ca6;
      --border:rgba(59,130,246,.15);--border-b:rgba(59,130,246,.35);
      --glass:rgba(13,27,52,.7);--glass-b:rgba(26,58,110,.5);
      --bg-grad:radial-gradient(ellipse 80% 60% at 20% -10%,rgba(37,99,235,.12) 0%,transparent 60%),radial-gradient(ellipse 60% 40% at 80% 100%,rgba(124,58,237,.08) 0%,transparent 50%),var(--deep);
    }
    /* ⚡⚡⚡ SUPER CHARGED ANIMATIONS ⚡⚡⚡ */
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(50px) scale(0.9); } to { opacity: 1; transform: translateY(0) scale(1); } }
    @keyframes popIn { 0% { opacity: 0; transform: scale(0.6); } 70% { transform: scale(1.05); } 100% { opacity: 1; transform: scale(1); } }
    @keyframes slideInRight { from { opacity: 0; transform: translateX(-60px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
    @keyframes pulse-glow { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.75; transform: scale(1.08); } }
    @keyframes pageIn { from { opacity: 0; transform: scale(0.98) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    @keyframes shine { 0% { transform: translateX(-100%); opacity: 0; } 50% { opacity: 0.5; } 100% { transform: translateX(100%); opacity: 0; } }
    
    /* Global Smoothness */
    .btn, .fi, .nav-item, .stat-card, .user-acc-card, .mobile-card, .tab-btn, .toggle-wrap, .todo-item, .audit-row {
      transition: transform 0.2s cubic-bezier(0.25, 0.8, 0.25, 1), background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease, opacity 0.3s ease;
    }
    .card { transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.3s ease, border-color 0.3s ease; }
    body, #root, .wrap, .sidebar, .topbar, .main { transition: background-color 0.5s ease, color 0.5s ease, border-color 0.5s ease; }
    /* Staggered Delays for Grids */
    .stats-grid > *:nth-child(1) { animation-delay: 0.05s; } .stats-grid > *:nth-child(2) { animation-delay: 0.1s; } .stats-grid > *:nth-child(3) { animation-delay: 0.15s; }
    .stats-grid > *:nth-child(4) { animation-delay: 0.2s; } .stats-grid > *:nth-child(5) { animation-delay: 0.25s; } .stats-grid > *:nth-child(6) { animation-delay: 0.3s; }
    .dgrid > *:nth-child(1) { animation-delay: 0.2s; } .dgrid > *:nth-child(2) { animation-delay: 0.3s; } .dgrid > *:nth-child(3) { animation-delay: 0.4s; }
    
    /* Staggered Table Rows (Ultra Cool) */
    tr { animation: slideInRight 0.4s ease backwards; }
    tbody tr:nth-child(1) { animation-delay: 0.05s; } tbody tr:nth-child(2) { animation-delay: 0.1s; }
    tbody tr:nth-child(3) { animation-delay: 0.15s; } tbody tr:nth-child(4) { animation-delay: 0.2s; }
    tbody tr:nth-child(5) { animation-delay: 0.25s; } tbody tr:nth-child(6) { animation-delay: 0.3s; }
    tbody tr:nth-child(7) { animation-delay: 0.35s; } tbody tr:nth-child(8) { animation-delay: 0.4s; }
    tbody tr:nth-child(9) { animation-delay: 0.45s; } tbody tr:nth-child(10) { animation-delay: 0.5s; }

    body.light-mode {
      --deep:#f8fafc;--dark:#ffffff;--navy:#f1f5f9;--blue:#e2e8f0;
      --tp:#0f172a;--ts:#334155;--tm:#64748b;
      --border:rgba(0,0,0,.08);--border-b:rgba(0,0,0,.15);
      --glass:rgba(255,255,255,.8);--glass-b:rgba(255,255,255,.5);
      --bg-grad:radial-gradient(ellipse 80% 60% at 20% -10%,rgba(37,99,235,.05) 0%,transparent 60%),radial-gradient(ellipse 60% 40% at 80% 100%,rgba(124,58,237,.05) 0%,transparent 50%),var(--deep);
    }
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
    html, body { min-height: 100vh; min-height: 100dvh; margin: 0; padding: 0; display: flex; flex-direction: column; width: 100%; }
    body,#root{background:var(--bg-grad);color:var(--tp);font-family:'Cairo',sans-serif;overflow-x:hidden;max-width:100vw}
    #root { display: flex; flex-direction: column; flex: 1; min-height: 100vh; min-height: 100dvh; }
    /* Protect screen edges (notch) in landscape */
    #root { padding-left: env(safe-area-inset-left); padding-right: env(safe-area-inset-right); }
    /* Living Background for Dark Mode */
    body:not(.light-mode) #root {
      background: linear-gradient(-45deg, #050a14, #0d1b34, #10243e, #0f2044);
      background-size: 400% 400%;
    }
    ::-webkit-scrollbar{width:5px;height:5px}
    ::-webkit-scrollbar-track{background:var(--dark)}
    ::-webkit-scrollbar-thumb{background:linear-gradient(180deg, var(--mid), var(--bright));border-radius:3px}
    ::-webkit-scrollbar-thumb:hover{background:var(--bright)}

    .toast-container{position:fixed;top:18px;left:50%;transform:translateX(-50%);z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none;min-width:300px}
    .toast{display:flex;align-items:center;gap:10px;padding:13px 18px;border-radius:12px;font-size:13px;font-weight:600;font-family:'Cairo',sans-serif;pointer-events:all;animation:toastIn .25s ease;box-shadow:0 8px 32px rgba(0,0,0,.5);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid;min-width:280px}
    .toast-success{background:rgba(16,185,129,.18);border-color:rgba(16,185,129,.45);color:#34d399}
    .toast-error{background:rgba(244,63,94,.18);border-color:rgba(244,63,94,.45);color:#fb7185}
    .toast-warning{background:rgba(245,158,11,.18);border-color:rgba(245,158,11,.45);color:#fbbf24}
    .toast-info{background:rgba(59,130,246,.18);border-color:rgba(59,130,246,.45);color:#93c5fd}
    .toast-exit{animation:toastOut .22s ease forwards}
    @keyframes toastIn{from{opacity:0;transform:translateY(-20px) scale(.8);}to{opacity:1;transform:translateY(0) scale(1);}}
    @keyframes toastOut{to{opacity:0;transform:translateY(-10px) scale(.95)}}
    .toast-close{margin-right:auto;opacity:.6;cursor:pointer;font-size:14px;background:none;border:none;color:inherit;padding:0 2px;line-height:1}
    .toast-close:hover{opacity:1}

    .confirm-ov{position:fixed;inset:0;background:rgba(0,0,0,.8);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;z-index:2000;padding:20px}
    .confirm-box{background:linear-gradient(135deg,var(--dark),var(--navy));border:1px solid var(--border-b);border-radius:16px;padding:28px 24px;max-width:380px;width:100%;text-align:center;box-shadow:0 25px 60px rgba(0,0,0,.7)}
    .confirm-icon{font-size:44px;margin-bottom:12px}
    .confirm-title{font-size:15px;font-weight:800;color:var(--tp);margin-bottom:8px}
    .confirm-msg{font-size:13px;color:var(--tm);line-height:1.6;margin-bottom:22px;animation:slideInRight 0.3s ease}
    .confirm-btns{display:flex;gap:10px;justify-content:center}

    .watermark{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-25deg);pointer-events:none;z-index:0;text-align:center;opacity:.04;user-select:none;white-space:nowrap;line-height:1.5}
    .wm1{font-size:68px;font-weight:900;color:#fff;display:block}
    .wm2{font-size:42px;font-weight:700;color:#fff;display:block}

    .readonly-badge{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:8px;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.3);color:var(--gold-l);font-size:11px;font-weight:700}

    .toggle-wrap{display:flex;align-items:center;gap:8px;cursor:pointer;user-select:none}
    .toggle-track{width:40px;height:22px;border-radius:11px;background:rgba(59,130,246,.12);border:1px solid var(--border);transition:all .25s;position:relative;flex-shrink:0}
    .toggle-track.on{background:linear-gradient(135deg,var(--em),#059669);border-color:var(--em);box-shadow:0 0 8px rgba(16,185,129,.3)}
    .toggle-thumb{width:16px;height:16px;border-radius:50%;background:#fff;position:absolute;top:2px;right:2px;transition:all .25s;box-shadow:0 2px 4px rgba(0,0,0,.3)}
    .toggle-track.on .toggle-thumb{right:calc(100% - 18px)}
    .toggle-label{font-size:12px;font-weight:600;color:var(--ts)}
    .toggle-track.on + .toggle-label{color:var(--em-l)}

    .perm-section{border:1px solid var(--border);border-radius:12px;overflow:hidden;margin-bottom:14px}
    .perm-section-hdr{padding:12px 16px;background:linear-gradient(135deg,rgba(37,99,235,.18),rgba(59,130,246,.08));display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border)}
    .perm-section-title{font-size:13px;font-weight:700;color:var(--tp);display:flex;align-items:center;gap:8px}
    .perm-toggles{padding:14px 16px;display:flex;flex-wrap:wrap;gap:18px;background:rgba(13,27,52,.4)}

    .user-acc-card{background:linear-gradient(135deg,var(--dark),var(--navy));border:1px solid var(--border-b);border-radius:14px;padding:20px;margin-bottom:16px;position:relative;overflow:hidden}
    .user-acc-card.disabled-card{opacity:.6;border-color:rgba(244,63,94,.3)}
    .user-acc-card::before{content:'';position:absolute;top:0;right:0;left:0;height:3px}
    .user-acc-card.active-card::before{background:linear-gradient(90deg,var(--em),var(--cyan))}
    .user-acc-card.disabled-card::before{background:linear-gradient(90deg,var(--rose),var(--vio))}
    .acc-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700}
    .acc-badge.active{background:rgba(16,185,129,.15);color:var(--em-l);border:1px solid rgba(16,185,129,.25)}
    .acc-badge.inactive{background:rgba(244,63,94,.15);color:var(--rose-l);border:1px solid rgba(244,63,94,.25)}

    .wrap{display:flex;flex:1;min-height:100vh;min-height:100dvh;background:var(--bg-grad);position:relative;width:100%}
    .sidebar{width:255px;height:100vh;height:100dvh;background:linear-gradient(180deg,var(--dark) 0%,var(--deep) 100%);display:flex;flex-direction:column;position:fixed;top:0;bottom:0;z-index:100;transition:transform .3s ease, background 0.5s ease, border-color 0.5s ease}
    [dir='rtl'] .sidebar { right:0; border-left:1px solid var(--border-b); box-shadow:-4px 0 40px rgba(0,0,0,.4); }
    [dir='ltr'] .sidebar { left:0; border-right:1px solid var(--border-b); box-shadow:4px 0 40px rgba(0,0,0,.4); }
    .sb-logo{padding:20px 18px;border-bottom:1px solid var(--border);background:linear-gradient(135deg,var(--navy),var(--dark))}
    .sb-title{font-size:18px;font-weight:900;background:linear-gradient(135deg,var(--gold-l),var(--pale));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;line-height:1.2}
    .sb-sub{font-size:10px;color:var(--tm);margin-top:3px;letter-spacing:1px}
    .sb-badge{display:inline-flex;align-items:center;gap:4px;background:linear-gradient(135deg,var(--gold),var(--orange));color:#000;font-size:9px;font-weight:700;padding:2px 8px;border-radius:20px;margin-top:5px}
    .sb-nav{flex:1;padding:12px 10px;overflow-y:auto}
    .sb-section{font-size:9px;font-weight:700;color:var(--tm);letter-spacing:2px;padding:8px 12px 5px;text-transform:uppercase}
    .nav-item{display:flex;align-items:center;gap:9px;padding:9px 12px;border-radius:9px;cursor:pointer;transition:all .2s;margin-bottom:2px;color:var(--ts);font-size:13px;font-weight:500;position:relative;overflow:hidden}
    [dir='rtl'] .nav-item:hover{background:var(--glass-b);color:var(--pale);transform:translateX(-8px);padding-right:18px}
    [dir='ltr'] .nav-item:hover{background:var(--glass-b);color:var(--pale);transform:translateX(8px);padding-left:18px}
    .nav-item.active{background:linear-gradient(135deg,rgba(37,99,235,.3),rgba(59,130,246,.12));color:var(--light);border:1px solid rgba(59,130,246,.22);box-shadow:0 0 20px rgba(37,99,235,.1)}
    [dir='rtl'] .nav-item.active::before{content:'';position:absolute;right:0;top:0;bottom:0;width:3px;background:linear-gradient(180deg,var(--bright),var(--cyan));border-radius:2px}
    [dir='ltr'] .nav-item.active::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:linear-gradient(180deg,var(--bright),var(--cyan));border-radius:2px}
    .nav-icon{width:30px;height:30px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
    .nav-badge{margin-inline-start:auto;background:var(--rose);color:#fff;font-size:10px;font-weight:700;padding:1px 6px;border-radius:10px;animation:pulse-glow 1.5s infinite}
    .sb-footer{padding:14px;border-top:1px solid var(--border)}
    .user-card{display:flex;align-items:center;gap:9px;padding:9px 11px;border-radius:9px;background:var(--glass);border:1px solid var(--border)}
    .user-av{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--bright),var(--vio));display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
    .user-name{font-size:12px;font-weight:600;color:var(--tp)}
    .user-role{font-size:10px;color:var(--gold);font-weight:500}

    .topbar{height:62px;background:rgba(8,15,30,.9);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 24px;position:sticky;top:0;z-index:50;-webkit-app-region:drag}
    .topbar-title{font-size:17px;font-weight:700;color:var(--tp)}
    .topbar-actions{display:flex;align-items:center;gap:10px}
    .hamburger{display:none;background:var(--glass);border:1px solid var(--border);border-radius:8px;padding:8px;cursor:pointer;font-size:18px;color:var(--tp);line-height:1}
    .global-search{position:relative;margin-left:15px}
    .gs-input{background:rgba(0,0,0,.2);border:1px solid var(--border);border-radius:20px;padding:6px 12px 6px 30px;color:var(--tp);font-family:'Cairo';font-size:12px;width:180px;transition:width .4s}
    .gs-input:focus{width:260px;border-color:var(--bright);outline:none;box-shadow:0 0 15px rgba(37,99,235,.3)}
    .gs-icon{position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:12px;color:var(--tm);pointer-events:none}
    .gs-results{position:absolute;top:100%;left:0;width:100%;background:var(--navy);border:1px solid var(--border);border-radius:8px;margin-top:5px;overflow:hidden;z-index:200;box-shadow:0 10px 30px rgba(0,0,0,.5)}
    .sidebar-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}

    .topbar-actions, .hamburger, .global-search, .win-controls {-webkit-app-region:no-drag}
    .tb-btn{display:flex;align-items:center;gap:6px;padding:9px 16px;border-radius:9px;border:1px solid var(--border-b);background:var(--glass);color:var(--ts);cursor:pointer;font-size:14px;font-weight:700;font-family:'Cairo',sans-serif;transition:all .2s;position:relative}
    .tb-btn:hover{background:var(--glass-b);color:var(--light);transform:translateY(-2px);box-shadow:0 5px 15px rgba(0,0,0,0.2)}
    .tb-btn.primary{background:linear-gradient(135deg,var(--bright),var(--mid));border-color:var(--bright);color:#fff;box-shadow:0 4px 15px rgba(37,99,235,.3)}
    .tb-btn.primary:hover{opacity:.9;transform:translateY(-1px)}
    .notif-dot{width:9px;height:9px;background:var(--rose);border-radius:50%;position:absolute;top:-3px;left:-3px;animation:pulse-glow 1.5s infinite;border:2px solid var(--deep)}
    @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(.9)}}
    .notif-wrap{position:relative}
    .notif-panel{position:absolute;top:calc(100% + 8px);left:0;width:310px;background:linear-gradient(135deg,var(--dark),var(--navy));border:1px solid var(--border-b);border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.7);z-index:300;overflow:hidden}
    .notif-hdr{padding:13px 16px;border-bottom:1px solid var(--border);font-size:13px;font-weight:700;color:var(--tp);display:flex;align-items:center;justify-content:space-between}
    .notif-item{display:flex;gap:10px;padding:12px 16px;border-bottom:1px solid rgba(59,130,246,.06);align-items:flex-start}
    .notif-item:hover{background:var(--glass-b)}
    .notif-empty{text-align:center;padding:24px 16px;color:var(--tm);font-size:12px}
    .notif-icon{font-size:20px;flex-shrink:0;margin-top:1px}
    .notif-title{font-size:12px;font-weight:700}
    .notif-desc{font-size:11px;color:var(--tm);margin-top:2px}

    .main{flex:1;min-height:100vh;min-height:100dvh;display:flex;flex-direction:column;position:relative;z-index:1;transition:margin 0.3s cubic-bezier(0.4, 0, 0.2, 1);}
    [dir='rtl'] .main { margin-right: 255px; }
    [dir='ltr'] .main { margin-left: 255px; }
    .page{padding:22px;animation:pageIn 0.6s cubic-bezier(0.22, 1, 0.36, 1); content-visibility: auto; contain-intrinsic-size: 1000px;}

    .stats-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(145px,1fr));gap:14px;margin-bottom:22px}
    .stat-card{background:linear-gradient(135deg,var(--dark) 0%,var(--navy) 100%);border:1px solid var(--border);border-radius:14px;padding:16px;position:relative;overflow:hidden;transition:transform .2s,box-shadow .2s;animation:popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) backwards; content-visibility: auto;}
    .stat-card:hover{transform:translateY(-8px) scale(1.03);box-shadow:0 20px 40px rgba(0,0,0,.4);z-index:2;border-color:var(--bright)}
    .stat-card:hover .sc-icon{animation:float 2s ease-in-out infinite;transform:scale(1.1)}
    .stat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px}
    .sc-blue::before{background:linear-gradient(90deg,var(--bright),var(--cyan))}
    .sc-gold::before{background:linear-gradient(90deg,var(--gold),var(--orange))}
    .sc-em::before{background:linear-gradient(90deg,var(--em),var(--cyan))}
    .sc-rose::before{background:linear-gradient(90deg,var(--rose),var(--vio))}
    .sc-vio::before{background:linear-gradient(90deg,var(--vio),var(--bright))}
    .sc-cyan::before{background:linear-gradient(90deg,var(--cyan),var(--em))}
    .sc-glow{position:absolute;bottom:-20px;left:-20px;width:70px;height:70px;border-radius:50%;opacity:.08;filter:blur(25px)}
    .sc-blue .sc-glow{background:var(--bright)}.sc-gold .sc-glow{background:var(--gold)}.sc-em .sc-glow{background:var(--em)}.sc-rose .sc-glow{background:var(--rose)}.sc-vio .sc-glow{background:var(--vio)}.sc-cyan .sc-glow{background:var(--cyan)}
    .sc-icon{width:38px;height:38px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:18px;margin-bottom:10px}
    .sc-blue .sc-icon{background:rgba(37,99,235,.15)}.sc-gold .sc-icon{background:rgba(245,158,11,.15)}.sc-em .sc-icon{background:rgba(16,185,129,.15)}.sc-rose .sc-icon{background:rgba(244,63,94,.15)}.sc-vio .sc-icon{background:rgba(124,58,237,.15)}.sc-cyan .sc-icon{background:rgba(6,182,212,.15)}
    .sc-label{font-size:11px;color:var(--tm);font-weight:500;margin-bottom:3px}
    .sc-value{font-size:20px;font-weight:800;color:var(--tp);line-height:1}
    .sc-sub{font-size:11px;color:var(--tm);margin-top:5px}

    .card{background:var(--glass);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid var(--border);border-radius:18px;overflow:hidden;margin-bottom:18px;animation:fadeInUp 0.6s ease-out backwards;box-shadow:0 8px 32px rgba(0,0,0,0.2); content-visibility: auto; contain-intrinsic-size: 300px;}
    .card:hover{transform:translateY(-3px);box-shadow:0 15px 40px rgba(0,0,0,0.35);border-color:rgba(59,130,246,0.4)}
    .card-hdr{padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:rgba(16,36,62,.5);flex-wrap:wrap;gap:10px}
    .card-title{font-size:14px;font-weight:700;color:var(--tp);display:flex;align-items:center;gap:7px}
    .card-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}

    table{width:100%;border-collapse:collapse}
    thead tr{border-bottom:1px solid var(--border)}
    th{padding:11px 14px;text-align:right;font-size:11px;font-weight:600;color:var(--tm);letter-spacing:.5px;text-transform:uppercase;white-space:nowrap}
    [dir='ltr'] th{text-align:left;}
    th.sortable{cursor:pointer;user-select:none;transition:color .2s}
    th.sortable:hover{color:var(--tp);background:rgba(255,255,255,.03)}
    td{padding:10px 14px;font-size:12px;color:var(--ts);border-bottom:1px solid rgba(59,130,246,.04);white-space:nowrap}
    tr{transition:transform 0.2s ease, background-color 0.2s ease}
    tr:hover{transform:scale(1.01) translateX(-5px);background:rgba(255,255,255,0.03);position:relative;z-index:10;border-radius:4px;box-shadow:0 4px 10px rgba(0,0,0,0.1)}
    tr:last-child td{border-bottom:none}
    .table-scroll{overflow-x:auto}

    .badge{display:inline-flex;align-items:center;gap:3px;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:600}
    .b-ok{background:rgba(16,185,129,.15);color:var(--em-l);border:1px solid rgba(16,185,129,.2)}
    .b-warn{background:rgba(245,158,11,.15);color:var(--gold-l);border:1px solid rgba(245,158,11,.2)}
    .b-err{background:rgba(244,63,94,.15);color:var(--rose-l);border:1px solid rgba(244,63,94,.2)}
    .b-info{background:rgba(59,130,246,.15);color:var(--light);border:1px solid rgba(59,130,246,.2)}
    .b-vio{background:rgba(124,58,237,.15);color:var(--vio-l);border:1px solid rgba(124,58,237,.2)}
    .pill{display:inline-flex;align-items:center;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:700}
    .pill-sm{font-size:9px;padding:1px 6px}
    .p-blue{background:rgba(59,130,246,.15);color:var(--light)}
    .p-gold{background:rgba(245,158,11,.15);color:var(--gold-l)}
    .p-em{background:rgba(16,185,129,.15);color:var(--em-l)}
    .p-rose{background:rgba(244,63,94,.15);color:var(--rose-l)}

    .btn{display:inline-flex;align-items:center;gap:5px;padding:8px 14px;border-radius:8px;border:none;cursor:pointer;font-family:'Cairo',sans-serif;font-size:13px;font-weight:600;transition:all .3s ease;position:relative;overflow:hidden}
    .btn::after{content:'';position:absolute;top:0;left:0;transform:translateX(-100%);width:100%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent);transition:none}
    .btn:hover::after{animation:shine 0.8s ease}
    .btn:hover{transform:translateY(-2px);filter:brightness(1.1);box-shadow:0 8px 20px rgba(0,0,0,0.3)}
    .btn:active{transform:scale(0.96)}
    .btn:disabled{opacity:.55;cursor:not-allowed;transform:none!important}
    .btn-p{background:linear-gradient(135deg,var(--bright),var(--mid));color:#fff;box-shadow:0 4px 15px rgba(37,99,235,.25)}
    .btn-p:hover{box-shadow:0 6px 20px rgba(37,99,235,.35)}
    .btn-s{background:linear-gradient(135deg,var(--em),#059669);color:#fff;box-shadow:0 4px 15px rgba(16,185,129,.25)}
    .btn-gold{background:linear-gradient(135deg,var(--gold),var(--orange));color:#000;box-shadow:0 4px 15px rgba(245,158,11,.25)}
    .btn-d{background:linear-gradient(135deg,var(--rose),#e11d48);color:#fff;box-shadow:0 4px 15px rgba(244,63,94,.25)}
    .btn-g{background:var(--glass);color:var(--ts);border:1px solid var(--border)}
    .btn-g:hover{background:var(--glass-b);color:var(--tp)}
    .btn-sm{padding:4px 9px;font-size:11px;border-radius:6px}
    .btn-icon{padding:7px;border-radius:7px}

    .form-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(185px,1fr));gap:12px}
    .fg{display:flex;flex-direction:column;gap:5px}
    .fg.full{grid-column:1/-1}
    .fl{font-size:11px;font-weight:600;color:var(--tm);letter-spacing:.5px}
    .fi{background:rgba(8,15,30,.7);border:1px solid var(--border);border-radius:8px;padding:9px 12px;color:var(--tp);font-family:'Cairo',sans-serif;font-size:13px;outline:none;transition:all .3s ease;direction:rtl;width:100%}
    .fi:focus{border-color:var(--bright);box-shadow:0 0 0 3px rgba(37,99,235,.25);background:rgba(13,27,52,0.95)}
    .fi.fi-err{border-color:rgba(244,63,94,.6)!important}
    .fi::placeholder{color:var(--tm)}
    select.fi{cursor:pointer}
    option{background:var(--dark)}
    .field-err{font-size:10px;color:var(--rose-l);margin-top:2px}

    .modal-ov{position:fixed;inset:0;background:rgba(0,0,0,.75);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:1000;padding:10px;overflow:hidden}
    .modal{display:flex;flex-direction:column;background:linear-gradient(135deg,var(--dark) 0%,var(--navy) 100%);border:1px solid var(--border-b);border-radius:24px;width:100%;max-width:560px;max-height:calc(100% - 20px);box-shadow:0 30px 80px rgba(0,0,0,.8);animation:popIn 0.4s ease-out;border-top:1px solid rgba(255,255,255,0.1)}
    .modal-hdr{flex-shrink:0;padding:18px 22px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
    .modal-title{font-size:15px;font-weight:700;color:var(--tp)}
    .modal-body{flex:1 1 auto;overflow-y:auto;padding:18px 22px;min-height:0}
    .modal-footer{flex-shrink:0;padding:14px 22px 18px;display:flex;gap:9px;border-top:1px solid var(--border);background:rgba(0,0,0,.15)}

    .alert-bar{border-radius:9px;padding:11px 14px;display:flex;align-items:center;gap:9px;margin-bottom:12px;animation:slideInRight 0.5s ease backwards}
    .alert-bar.err{background:linear-gradient(90deg,rgba(244,63,94,.12),transparent);border:1px solid rgba(244,63,94,.35)}
    .alert-bar.warn{background:linear-gradient(90deg,rgba(245,158,11,.12),transparent);border:1px solid rgba(245,158,11,.35)}
    .tabs{display:flex;gap:3px;background:var(--glass);border-radius:9px;padding:3px}
    .tab-btn{flex:1;padding:7px 11px;border-radius:7px;border:none;cursor:pointer;font-family:'Cairo',sans-serif;font-size:12px;font-weight:600;transition:all .2s;color:var(--tm);background:transparent;white-space:nowrap}
    .tab-btn.active{background:linear-gradient(135deg,var(--bright),var(--mid));color:#fff;box-shadow:0 4px 12px rgba(37,99,235,.3)}
    .tab-btn:hover:not(.active){color:var(--tp);background:var(--glass-b)}
    .prog-bar{height:7px;border-radius:4px;background:rgba(59,130,246,.1);overflow:hidden}
    .prog-fill{height:100%;width:100%;border-radius:4px;transition:transform .4s ease}
    [dir='rtl'] .prog-fill { transform-origin: right; }
    [dir='ltr'] .prog-fill { transform-origin: left; }
    .search-box{position:relative;display:flex;align-items:center}
    .search-icon{position:absolute;right:9px;color:var(--tm);font-size:13px;pointer-events:none}
    .search-box .fi{padding-right:30px}
    .divider{height:1px;background:linear-gradient(90deg,transparent,var(--border-b),transparent);margin:14px 0}
    .dgrid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
    @media(max-width:700px){.dgrid{grid-template-columns:1fr}}
    .fr{display:flex;align-items:center;gap:9px;flex-wrap:wrap}
    .fb{display:flex;align-items:center;justify-content:space-between}
    .mt2{margin-top:8px}.mt3{margin-top:12px}.mt4{margin-top:16px}
    .fw7{font-weight:700}.fw8{font-weight:800}
    .tmt{color:var(--tm)}.t-ok{color:var(--em-l)}.t-err{color:var(--rose-l)}.t-gold{color:var(--gold-l)}.t-info{color:var(--light)}
    .ts{font-size:12px}.txs{font-size:11px}
    .empty{text-align:center;padding:48px 20px;color:var(--tm)}
    .empty-icon{font-size:44px;opacity:.4;margin-bottom:10px}
    .empty-txt{font-size:13px;font-weight:500}
    .sumrow{background:rgba(37,99,235,.07);border:1px solid rgba(37,99,235,.18);border-radius:8px;padding:12px}
    .detail-hdr{display:flex;align-items:center;gap:12px;padding:18px 22px;background:rgba(16,36,62,.4);border-bottom:1px solid var(--border);flex-wrap:wrap}
    .detail-av{width:48px;height:48px;border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
    .loading-screen{min-height:100vh;min-height:100dvh;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;background:var(--deep)}
    .spinner{width:48px;height:48px;border:3px solid rgba(37,99,235,.3);border-top-color:var(--bright);border-radius:50%;animation:spin .8s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .login-screen{min-height:100vh;min-height:100dvh;display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse 100% 80% at 50% -10%,rgba(37,99,235,.28) 0%,transparent 60%),radial-gradient(ellipse 70% 60% at 80% 110%,rgba(6,182,212,.2) 0%,transparent 50%),var(--deep);padding:20px}
    .login-card{width:100%;max-width:420px;background:linear-gradient(145deg,rgba(13,27,52,.97),rgba(16,36,62,.92));border:1px solid var(--border-b);border-radius:26px;padding:44px 38px;box-shadow:0 40px 80px rgba(0,0,0,.7),0 0 60px rgba(37,99,235,.12);position:relative;overflow:hidden}
    .login-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--mid),var(--bright),var(--cyan))}
    .login-logo{text-align:center;margin-bottom:36px}
    .login-ico{width:76px;height:76px;border-radius:22px;background:linear-gradient(135deg,var(--mid),var(--cyan));display:flex;align-items:center;justify-content:center;font-size:34px;margin:0 auto 16px;box-shadow:0 12px 40px rgba(37,99,235,.45)}
    .login-title{font-size:26px;font-weight:900;background:linear-gradient(135deg,var(--light),var(--pale));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
    .login-sub{font-size:12px;color:var(--tm);margin-top:6px;line-height:1.5}
    .login-form{display:flex;flex-direction:column;gap:15px}
    .login-label{font-size:12px;font-weight:600;color:var(--ts);margin-bottom:6px;display:block}
    .login-input{width:100%;background:rgba(8,15,30,.8);border:1px solid rgba(59,130,246,.25);border-radius:11px;padding:13px 15px;color:var(--tp);font-family:'Cairo',sans-serif;font-size:14px;outline:none;transition:all .2s;direction:rtl}
    .login-input:focus{border-color:var(--bright);box-shadow:0 0 0 3px rgba(37,99,235,.15)}
    .login-input::placeholder{color:var(--tm)}
    .login-btn{width:100%;padding:14px;border:none;border-radius:11px;cursor:pointer;background:linear-gradient(135deg,var(--bright),var(--mid));color:#fff;font-family:'Cairo',sans-serif;font-size:16px;font-weight:800;transition:all .2s;box-shadow:0 4px 20px rgba(37,99,235,.4)}
    .login-btn:hover{box-shadow:0 6px 28px rgba(37,99,235,.55);transform:translateY(-1px)}
    .login-btn:disabled{opacity:.7;cursor:not-allowed;transform:none}
    .login-err{background:rgba(244,63,94,.12);border:1px solid rgba(244,63,94,.35);border-radius:9px;padding:11px 14px;font-size:12px;color:var(--rose-l);text-align:center}
    .mfilter{display:flex;align-items:center;gap:12px;flex-wrap:wrap;background:var(--glass);border:1px solid var(--border);border-radius:11px;padding:13px 18px;margin-bottom:18px}
    .mfilter label{font-size:12px;color:var(--tm);font-weight:600}
    .saving-badge{font-size:11px;color:var(--gold-l);animation:pulse 1s infinite}
    .saved-badge{font-size:11px;color:var(--em-l)}
    .audit-row{font-size:11px;padding:8px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;color:var(--ts);animation:slideInRight 0.4s ease backwards}
    .todo-item{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);font-size:12px;animation:fadeInUp 0.4s ease backwards}
    .todo-check{cursor:pointer;color:var(--tm);transition:color .2s}
    .todo-check.checked{color:var(--em);text-decoration:line-through;opacity:.6}
    .print-only{display:none!important}
    
    /* New invoice design */
    .inv-paper{background:#fff;color:#000;padding:40px;width:100%;max-width:210mm;margin:0 auto;font-family:'Cairo',sans-serif;direction:rtl;min-height:297mm;display:flex;flex-direction:column}
    .inv-header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #000;padding-bottom:20px;margin-bottom:30px}
    .inv-logo-area{display:flex;flex-direction:column}
    .inv-title{font-size:32px;font-weight:900;color:#000;line-height:1.2}
    .inv-sub{font-size:14px;color:#555}
    .inv-meta{text-align:left}
    .inv-label{font-size:12px;color:#666;font-weight:bold}
    .inv-val{font-size:16px;font-weight:700;margin-bottom:8px}
    .inv-grid{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-bottom:30px}
    .inv-box{border:1px solid #ddd;border-radius:8px;padding:15px}
    .inv-box-hdr{font-size:14px;font-weight:bold;background:#f9f9f9;padding:5px 10px;margin:-15px -15px 15px;border-bottom:1px solid #ddd;border-radius:8px 8px 0 0}
    .inv-table{width:100%;border-collapse:collapse;margin-bottom:30px}
    .inv-table th{background:#eee;color:#000;font-weight:800;padding:12px 15px;border:1px solid #ccc;font-size:13px}
    .inv-table td{padding:12px 15px;border:1px solid #ccc;font-size:14px}
    .inv-summary{display:flex;justify-content:flex-end}
    .inv-sum-box{width:300px}
    .inv-sum-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;font-size:14px}
    .inv-total{font-size:22px;font-weight:900;border-top:2px solid #000;border-bottom:2px solid #000;margin-top:10px;padding:10px 0}
    .inv-footer{margin-top:auto;text-align:center;border-top:1px solid #ddd;padding-top:20px;font-size:12px;color:#777}
    
    .bottom-nav{display:none;position:fixed;bottom:0;left:0;right:0;height:65px;background:rgba(13,27,52,.95);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-top:1px solid var(--border);z-index:900;justify-content:space-around;align-items:center;padding-bottom:env(safe-area-inset-bottom)}
    .bn-item{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;color:var(--tm);font-size:10px;font-weight:600;width:100%;height:100%;cursor:pointer;transition:all .2s;background:transparent;border:none}
    .bn-item:hover{background:rgba(255,255,255,.05)}
    .bn-item.active{color:var(--bright)}
    .bn-icon{font-size:20px;margin-bottom:2px;transition:transform .2s}
    .bn-item.active .bn-icon{transform:translateY(-3px)}

    @media(max-width:900px){
      .sidebar{transform:translateX(100%);z-index:200}
      [dir='ltr'] .sidebar{transform:translateX(-100%);}
      .sidebar.mobile-open{transform:translateX(0)}
      [dir='ltr'] .sidebar.mobile-open{transform:translateX(0)}
      .sidebar-overlay{display:block}
      .main{margin-right:0!important;margin-left:0!important;padding-bottom:70px}
      .hamburger{display:none}
      .topbar{padding:0 14px}
      .page{padding:14px}
      .topbar-actions .tb-btn span:not(:first-child){display:none}
      .bottom-nav{display:flex}
    }
    /* Calculator Widget */
    .calc-widget{background:rgba(0,0,0,.2);border-radius:12px;padding:10px;margin:15px 10px;border:1px solid var(--border)}
    .calc-disp{background:rgba(0,0,0,.3);color:#fff;padding:6px 10px;border-radius:6px;text-align:right;font-family:'Courier New',monospace;margin-bottom:8px;font-size:14px;min-height:30px;overflow:hidden;white-space:nowrap;direction:ltr}
    .calc-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}
    .calc-btn{border:none;border-radius:5px;padding:6px 0;cursor:pointer;font-weight:bold;background:rgba(255,255,255,.05);color:var(--ts);font-size:12px;transition:all .1s}
    .calc-btn:hover{background:rgba(255,255,255,.1);color:#fff}
    .calc-btn.c-op{color:var(--gold);background:rgba(245,158,11,.1)}
    .calc-btn.c-eq{background:linear-gradient(135deg,var(--bright),var(--mid));color:#fff}
    .calc-btn.c-clr{grid-column:span 4;background:rgba(244,63,94,.15);color:var(--rose-l);margin-bottom:4px}

    .mobile-card{background:linear-gradient(145deg,rgba(13,27,52,.6),rgba(16,36,62,.4));border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:12px;position:relative;transition:transform .2s;animation:fadeInUp 0.5s ease backwards}
    .mobile-card:active{transform:scale(0.96)}
    .mc-hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid var(--border)}
    .mc-title{font-size:14px;font-weight:700;color:var(--tp)}
    .mc-sub{font-size:11px;color:var(--tm);margin-top:2px}
    .mc-row{display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px}
    .mc-val{font-weight:600;color:var(--ts)}
    .fab{position:fixed;bottom:85px;left:20px;width:54px;height:54px;border-radius:50%;background:linear-gradient(135deg,var(--bright),var(--mid));color:#fff;display:flex;align-items:center;justify-content:center;font-size:26px;box-shadow:0 4px 20px rgba(37,99,235,.5);z-index:90;border:none;cursor:pointer;transition:transform .2s;animation:popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)}
    .fab:hover{transform:scale(1.1) rotate(90deg)}
    .fab:active{transform:scale(0.9)}
    @media(max-width:768px){
      .page{padding:10px}
      .stats-grid{grid-template-columns:repeat(2,1fr);gap:8px}
      .stat-card{padding:12px}
      .sc-icon{width:32px;height:32px;font-size:16px;margin-bottom:6px}
      .sc-value{font-size:17px}
      .sc-label{font-size:10px}
      .card{margin-bottom:10px;border-radius:10px}
      .card-hdr{padding:10px 12px;min-height:46px}
      .card-title{font-size:13px}
      .btn{padding:7px 12px;font-size:12px}
      .fi{padding:8px;font-size:13px}
      .table-scroll th, .table-scroll td{padding:8px;font-size:11px}
      .mobile-card{padding:12px;margin-bottom:8px}
      .mc-title{font-size:13px}
      .mc-val{font-size:12px}
      .modal{width:100%;margin:0;max-height:calc(100% - 10px);border-radius:18px}
      .topbar{height:54px;padding:0 12px}
      .topbar-title{font-size:15px}
      .global-search .gs-input{width:120px;font-size:11px;padding:5px 10px 5px 26px}
      .global-search .gs-input:focus{width:160px}

      /* Mobile performance boost */
      /* Disable heavy blur & shadow effects (very GPU-costly on mobile) */
      .card, .topbar, .bottom-nav, .modal-ov, .confirm-ov, .toast { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
      .card { background: var(--dark) !important; box-shadow: 0 4px 10px rgba(0,0,0,0.15) !important; animation: none !important; }
      .topbar, .bottom-nav { background: var(--deep) !important; }
      .modal-ov, .confirm-ov { background: rgba(0,0,0,0.95) !important; }
      /* Disable complex, chained table animations to speed up scrolling */
      tr { animation: none !important; }
      .stat-card { animation: none !important; box-shadow: none !important; }
      .sc-glow { display: none !important; }
    }
    /* Skeleton Loading */
    .skeleton {
      background: var(--dark);
      position: relative;
      overflow: hidden;
    }
    .skeleton::after {
      content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      background: linear-gradient(90deg, transparent, var(--navy), transparent);
      transform: translateX(-100%);
      animation: shimmer 2s infinite linear;
    }
    @keyframes shimmer { 100% { transform: translateX(100%); } }
    @media print{
      @page { size: auto; margin: 0mm; }
      .sidebar, .topbar, .topbar-actions, .btn, .card-actions, 
      .bottom-nav, .watermark, .fab, .modal-ov, .alert-bar, 
      .stats-grid, .dgrid, .calc-widget, .mobile-card, .toggle-wrap, .mfilter, .pull-refresh { display:none!important }
      .card:not(.print-card) { display:none!important }
      .main{margin-right:0!important; width:100%!important}
      body{background:#fff!important;color:#000!important}
      .page{padding:0!important}
      .print-only{display:block!important}
      .inv-paper{min-height:auto!important;height:auto!important;padding:20px!important;margin:0!important;width:100%!important;max-width:none!important;overflow:visible!important}
      tr { page-break-inside: avoid; }
      thead { display: table-header-group; }
    }
    /* Ripple Effect */
    span.ripple { position: absolute; border-radius: 50%; transform: scale(0); animation: ripple 0.6s linear; background-color: currentColor; opacity: 0.35; pointer-events: none; }
    @keyframes ripple { to { transform: scale(4); opacity: 0; } }

    /* Sidebar Collapse Styles (Desktop Only) */
    @media (min-width: 901px) {
      .sidebar { transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s ease; }
      .sidebar.collapsed { width: 76px; }
      .main { transition: margin 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
      [dir='rtl'] .main.collapsed { margin-right: 76px; }
      [dir='ltr'] .main.collapsed { margin-left: 76px; }
      
      .sidebar.collapsed .sb-title, 
      .sidebar.collapsed .sb-sub, 
      .sidebar.collapsed .sb-badge, 
      .sidebar.collapsed .sb-section, 
      .sidebar.collapsed .nav-item span,
      .sidebar.collapsed .nav-badge, 
      .sidebar.collapsed .user-name, 
      .sidebar.collapsed .user-role,
      .sidebar.collapsed .calc-widget,
      .sidebar.collapsed .saving-badge,
      .sidebar.collapsed .saved-badge,
      .sidebar.collapsed .sb-footer .txs { display: none !important; }
      
      .sidebar.collapsed .sb-logo { padding: 15px 0; }
      .sidebar.collapsed .nav-item { justify-content: center; padding: 12px; margin: 4px 8px; }
      .sidebar.collapsed .nav-item:hover { padding-right: 12px; background: rgba(255,255,255,0.1); transform: none; }
      .sidebar.collapsed .user-card { padding: 0; border: none; background: transparent; justify-content: center; }
      .sidebar.collapsed .user-av { margin: 0; width: 38px; height: 38px; }
      .sidebar.collapsed .sb-footer { padding: 15px 5px; text-align: center; }
      .sidebar.collapsed .sb-footer button { margin: 10px auto 0; display: block; }
      .sidebar.collapsed .collapse-btn { top: 85px; left: 50%; transform: translateX(-50%) rotate(180deg); }
      [dir='ltr'] .sidebar.collapsed .collapse-btn { transform: translateX(-50%) rotate(0deg); }
    }
    .collapse-btn { position: absolute; top: 22px; left: 16px; width: 26px; height: 26px; border-radius: 50%; background: rgba(255,255,255,0.08); border: 1px solid var(--border); color: var(--ts); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; z-index: 10; }
    .collapse-btn:hover { background: var(--bright); color: #fff; border-color: var(--bright); }
    @media (max-width: 900px) { .collapse-btn { display: none; } }

    /* ✨ AI Copilot Widget Styles */
    .ai-panel { position:fixed; background:linear-gradient(135deg,var(--dark),var(--navy)); border:1px solid var(--border-b); border-radius:20px; box-shadow:0 20px 40px rgba(0,0,0,.6), 0 0 40px rgba(139,92,246,.2); z-index:9999; display:flex; flex-direction:column; overflow:hidden; animation:fadeInUp 0.3s ease; }
    .ai-resize-handle { position:absolute; bottom:0; width:20px; height:20px; display:flex; align-items:flex-end; justify-content:flex-end; padding:3px; opacity:0.5; transition:0.2s; z-index:10000; color: var(--ts); }
    .ai-resize-handle:hover { opacity:1; color: var(--bright); }
    [dir='ltr'] .ai-resize-handle { right:0; cursor:nwse-resize; }
    [dir='rtl'] .ai-resize-handle { left:0; cursor:nesw-resize; transform: scaleX(-1); }
    .ai-hdr { background:rgba(139,92,246,.15); padding:14px 18px; border-bottom:1px solid rgba(139,92,246,.2); display:flex; justify-content:space-between; align-items:center; user-select:none; }
    .ai-body { flex:1; min-height:0; overflow-y:auto; padding:20px 16px; display:flex; flex-direction:column; gap:8px; background:rgba(0,0,0,0.15); }
    .ai-msg { padding:10px 16px; border-radius:16px; font-size:13px; line-height:1.5; max-width:85%; animation:popIn 0.3s ease; position:relative; box-shadow:0 2px 5px rgba(0,0,0,0.2); margin-bottom:4px; }
    .ai-msg.user { background:linear-gradient(135deg, var(--em), #059669); color:#fff; align-self:flex-end; border-start-end-radius:4px; }
    .ai-msg.bot { background:linear-gradient(135deg, var(--navy), var(--dark)); border:1px solid var(--border); color:var(--tp); align-self:flex-start; border-start-start-radius:4px; }
    .ai-footer { padding:14px; border-top:1px solid var(--border); display:flex; gap:8px; background:rgba(0,0,0,.2); }
    .ai-mic { width:42px; height:42px; border-radius:50%; background:linear-gradient(135deg,var(--rose),#e11d48); color:#fff; border:none; cursor:pointer; font-size:20px; display:flex; align-items:center; justify-content:center; transition:0.2s; flex-shrink:0; box-shadow:0 4px 15px rgba(244,63,94,.4); }
    .ai-mic.listening { animation:pulse-glow 1s infinite; background:linear-gradient(135deg,var(--rose-l),var(--rose)); }
    .ai-input { flex:1; background:var(--glass); border:1px solid var(--border); border-radius:20px; padding:0 14px; color:var(--tp); font-family:inherit; font-size:13px; outline:none; transition:0.2s; }
    .ai-input:focus { border-color:var(--vio-l); box-shadow:0 0 0 3px rgba(139,92,246,.2); }
    @media(max-width:768px) { .ai-panel { top:auto!important; bottom:0!important; right:0!important; left:0!important; width:100%!important; height:85vh!important; border-radius:20px 20px 0 0; z-index:10000; transform:none!important; } .ai-resize-handle { display:none; } }
  `}</style>
));

/* ═══════════════════════════════════════════════════════
   PROFILE PAGE (Account Settings)
═══════════════════════════════════════════════════════ */
function ProfilePage({ data, setData, user }) {
  const toast = useToast();
  const [name, setName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const currentUserEntry = data.systemUsers.find(u => String(u.email || '').toLowerCase() === String(user.email || '').toLowerCase()) || {};
  const [jobTitle, setJobTitle] = useState(currentUserEntry.jobTitle || '');

  const isOAuth = auth.currentUser?.providerData?.some(p => p.providerId === 'google.com' || p.providerId === 'apple.com');
  const isLocal = !auth.currentUser && user?.isLocal;

  const handleSave = async () => {
    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      
      if (isLocal) {
         if (!name.trim() || !email.trim()) { toast.error('Name and email are required.'); setLoading(false); return; }
         
         let newPermsLocal = currentUserEntry?.perms || DEFAULT_USER_PERMS;
         if (jobTitle === 'Warehouse Worker' || jobTitle === 'Worker') {
             newPermsLocal = { ...newPermsLocal, inventory: { ...newPermsLocal.inventory, edit: true } };
         }

         setData(d => ({
           ...d,
           systemUsers: d.systemUsers.map(u => 
             String(u.email || '').toLowerCase() === String(user.email || '').toLowerCase() ? { ...u, name: name.trim(), email: email.trim(), jobTitle, perms: newPermsLocal } : u
           ),
           auditLog: [createLog(user, 'Account Settings', 'Update account data (locally)'), ...d.auditLog].slice(0, 100)
         }));
         toast.success('Updated locally (offline) ✅');
         setLoading(false); return;
      }

      let emailChanged = email.trim() !== (currentUser?.email || '');
      let passwordChanged = newPassword.length > 0;
      
      if (isOAuth && (emailChanged || passwordChanged)) {
        toast.error('Email/password cannot be changed for Google/Apple accounts.');
        setLoading(false); return;
      }

      if (!name.trim() || !email.trim()) {
        toast.error('Name and email are required.');
        setLoading(false); return;
      }

      // 1. Re-authenticate for sensitive operations
      if (emailChanged || passwordChanged) {
        if (!currentPassword) {
          toast.error('Enter your current password to change email or password.');
          setLoading(false); return;
        }
        const cred = EmailAuthProvider.credential(currentUser.email, currentPassword);
        await reauthenticateWithCredential(currentUser, cred);
      }

      // 2. Update name
      if (name.trim() !== user.name) {
        try {
          await updateProfile(currentUser, { displayName: name.trim() });
        } catch (err) {
          console.warn("Ignoring name update error:", err);
          // Try clearing the broken old URL that blocks the update
          try { await updateProfile(currentUser, { displayName: name.trim(), photoURL: "" }); } catch (e) {}
        }
      }

      // 3. Update picture
      let newPhotoURL = user.photoURL || null;
      if (file) {
        const compressed = await compressImage(file, 400, 0.7); // compress image to 400x400
        newPhotoURL = await db.uploadFile(compressed);
        
        try {
          // Avoid a Firebase Auth error by keeping the URL under the allowed length (2000 chars)
          if (newPhotoURL && newPhotoURL.length < 2000) {
            await updateProfile(currentUser, { photoURL: newPhotoURL });
          }
        } catch (err) {
          console.warn("Ignoring photo update error:", err);
        }
      }

      // 4. Update email
      if (emailChanged) {
        await updateEmail(currentUser, email.trim());
      }

      // 5. Update password
      if (passwordChanged) {
        if (newPassword !== confirmNewPassword) {
          toast.error('New passwords do not match.');
          setLoading(false); return;
        }
        if (newPassword.length < 6) {
          toast.error('New password must be at least 6 characters.');
          setLoading(false); return;
        }
        await updatePassword(currentUser, newPassword);
      }

      // 6. Update local database (permissions & user data)
      let newPerms = currentUserEntry?.perms || DEFAULT_USER_PERMS;
      if (jobTitle === 'Warehouse Worker' || jobTitle === 'Worker') {
         newPerms = { ...newPerms, inventory: { ...newPerms.inventory, edit: true } };
      }

      setData(d => ({
        ...d,
        systemUsers: d.systemUsers.map(u => 
          String(u.email || '').toLowerCase() === String(user.email || '').toLowerCase() 
            ? { ...u, name: name.trim(), email: email.trim(), photoURL: newPhotoURL, jobTitle, perms: newPerms } 
            : u
        ),
        auditLog: [createLog(user, 'Account Settings', 'Update personal account data'), ...d.auditLog].slice(0, 100)
      }));

      // 7. Update saved local credentials if present
      if (passwordChanged || emailChanged) {
        const creds = JSON.parse(localStorage.getItem('nile_local_creds') || '{}');
        delete creds[user.email];
              creds[email.trim()] = await hashPassword(passwordChanged ? newPassword : currentPassword);
        localStorage.setItem('nile_local_creds', JSON.stringify(creds));
      }

      toast.success('Data updated successfully ✅');
      setCurrentPassword(''); setNewPassword(''); setConfirmNewPassword(''); setFile(null);
    } catch (error) {
      console.error(error);
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') toast.error('Current password is incorrect.');
      else if (error.code === 'auth/requires-recent-login') toast.error('Please log out and back in to apply these changes.');
      else if (error.code === 'auth/email-already-in-use') toast.error('The new email is already in use.');
      else toast.error('Error while saving data: ' + error.message);
    }
    setLoading(false);
  };

  return (
    <div className="page">
      <div className="card">
        <div className="card-hdr"><div className="card-title">👤 <DynText>Personal Account Settings</DynText></div></div>
        <div className="dgrid" style={{padding:24, gap:30}}>
          <div style={{textAlign:'center'}}>
            <div style={{width:110, height:110, borderRadius:'50%', margin:'0 auto 15px', overflow:'hidden', border:'3px solid var(--border)', background:'var(--glass)', display:'flex', alignItems:'center', justifyContent:'center'}}>
              {file ? <img src={URL.createObjectURL(file)} alt="Profile picture" style={{width:'100%', height:'100%', objectFit:'cover'}} /> : user.photoURL ? <img src={user.photoURL} alt="Profile picture" style={{width:'100%', height:'100%', objectFit:'cover'}} /> : <span style={{fontSize:45}}>👤</span>}
            </div>
            <input type="file" accept="image/*" aria-label="Change picture" id="profile-upload" name="profileUpload" style={{display:'none'}} onChange={e=>setFile(e.target.files[0])} />
            <label htmlFor="profile-upload" className="btn btn-g btn-sm" style={{cursor:'pointer', marginBottom:20}}>📷 <DynText>Change Picture</DynText></label>
            <div className="form-grid" style={{textAlign:'right'}}>
              <FormField label="Full Name"><input id="profileName" name="name" className="fi" value={name} onChange={e=>setName(e.target.value)} /></FormField>
              <FormField label="Job Title (auto-grants permissions)">
                <select className="fi" value={jobTitle} onChange={e=>setJobTitle(e.target.value)}>
                  <option value=""><DynText>Not specified</DynText></option>
                  <option value="Worker"><DynText>Warehouse Worker (Inventory Add)</DynText></option>
                  <option value="Production Worker"><DynText>Production Worker</DynText></option>
                  <option value="Sales Rep"><DynText>Sales Rep</DynText></option>
                  <option value="Accountant"><DynText>Accountant</DynText></option>
                </select>
              </FormField>
            </div>
          </div>
          <form onSubmit={e => e.preventDefault()}>
            {isOAuth ? (
              <div className="alert-bar info" style={{marginBottom:15}}><span>ℹ️</span><span className="ts"><DynText>Your account is registered via Google/Apple — you cannot change the email or password here.</DynText></span></div>
            ) : (
              <div className="alert-bar warn" style={{marginBottom:15}}><span>⚠️</span><span className="ts"><DynText>To change your email or password, enter your current password first.</DynText></span></div>
            )}
            <div className="form-grid">
              <FormField label="Email" full><input id="profileEmail" name="email" className="fi" value={email} onChange={e=>setEmail(e.target.value)} style={{direction:'ltr', textAlign:'left'}} disabled={isOAuth} /></FormField>
              {!isOAuth && (
                <>
                  <FormField label="New Password">
                    <div style={{position:'relative'}}>
                      <input type={showNew ? "text" : "password"} id="profileNewPassword" name="newPassword" autoComplete="new-password" className="fi" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="Enter new password (optional)" style={{paddingLeft: 35}} />
                      <span onClick={()=>setShowNew(!showNew)} style={{position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', cursor:'pointer', color:'var(--tm)', fontSize:16, userSelect:'none'}}>{showNew ? '🙈' : '👁️'}</span>
                    </div>
                  </FormField>
                  <FormField label="Confirm Password">
                    <div style={{position:'relative'}}>
                      <input type={showConfirm ? "text" : "password"} id="profileConfirmPassword" name="confirmPassword" autoComplete="new-password" className="fi" value={confirmNewPassword} onChange={e=>setConfirmNewPassword(e.target.value)} placeholder="Re-enter password" style={{paddingLeft: 35}} />
                      <span onClick={()=>setShowConfirm(!showConfirm)} style={{position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', cursor:'pointer', color:'var(--tm)', fontSize:16, userSelect:'none'}}>{showConfirm ? '🙈' : '👁️'}</span>
                    </div>
                  </FormField>
                  <FormField label="Current Password (for security) *" full>
                    <div style={{position:'relative'}}>
                      <input type={showCurrent ? "text" : "password"} id="profileCurrentPassword" name="currentPassword" autoComplete="current-password" className="fi" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} placeholder="••••••••" style={{paddingLeft: 35}} />
                      <span onClick={()=>setShowCurrent(!showCurrent)} style={{position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', cursor:'pointer', color:'var(--tm)', fontSize:16, userSelect:'none'}}>{showCurrent ? '🙈' : '👁️'}</span>
                    </div>
                  </FormField>
                </>
              )}
            </div>
          </form>
        </div>
        <div style={{padding:18, borderTop:'1px solid var(--border)', display:'flex', justifyContent:'flex-end'}}>
           <button className="btn btn-p" onClick={handleSave} disabled={loading}>{loading ? <DynText>⏳ Saving...</DynText> : <DynText>✅ Save Changes</DynText>}</button>
        </div>
      </div>
    </div>
  );
}

const StatisticsPage = lazy(() => import('./pages/StatisticsPage.jsx'));
const SalesPage = lazy(() => import('./pages/SalesPage.jsx'));
const ManufacturingPage = lazy(() => import('./pages/ManufacturingPage.jsx'));

/* ═══════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════ */
const DEFAULT_USER_PERMS = {
  incoming:   { view:true,  add:false, edit:false, del:false },
  sales:      { view:true,  add:false, del:false,  pay:false },
  clients:    { view:true,  add:false, del:false,  pay:false },
  workers:    { view:true,  add:false, del:false,  pay:false },
  suppliers:  { view:true,  add:false, del:false,  pay:false },
  inventory:  { view:true,  edit:false },
  expenses:   { view:true,  add:false,  del:false },
  statistics: { view:true },
  logistics:  { view:true,  add:false,  del:false },
  treasury:   { view:true,  add:false,  del:false },
  hr:         { view:true,  add:false,  edit:false, del:false },
  crm:        { view:true,  add:false,  edit:false, del:false },
  manufacturing:{ view:true,  add:false,  edit:false, del:false, viewCosts:false },
  integrations:{ view:true, exec:false },
  finance:    { viewCosts: false, viewReports: false },
};

const FULL_PERMS = {
  incoming:{view:true,add:true,edit:true,del:true}, sales:{view:true,add:true,del:true,pay:true},
  clients:{view:true,add:true,del:true,pay:true}, workers:{view:true,add:true,del:true,pay:true},
  suppliers:{view:true,add:true,del:true,pay:true}, inventory:{view:true,edit:true},
  expenses:{view:true,add:true,del:true}, statistics:{view:true},
  logistics:{view:true,add:true,del:true}, treasury:{view:true,add:true,del:true},
  hr:{view:true,add:true,edit:true,del:true}, crm:{view:true,add:true,edit:true,del:true},
  manufacturing:{view:true,add:true,edit:true,del:true,viewCosts:true},
  integrations:{view:true,exec:true},
  finance:    { viewCosts: true, viewReports: true },
};

/* ═══════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════ */
// Initialized from localStorage so fmt() is correct even before LanguageProvider mounts
window.__nexoraLang = localStorage.getItem('nexora_lang') || 'en';
const _l = () => window.__nexoraLang === 'ar' ? 'ar-EG' : 'en-US';
export const fmt = n => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
export const fmtD = d => d ? new Date(d + 'T00:00:00').toLocaleDateString(_l()) : "—";
export const today = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split("T")[0];
};
export const n = v => parseFloat(v) || 0;

export async function hashPassword(password) {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const MONTH_NAMES_AR = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const compressImage = (file, maxWidth = 800, quality = 0.8) => {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith('image/')) return resolve(file);
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const cvs = document.createElement('canvas');
      let w = img.width, h = img.height;
      if (w > maxWidth) { h = Math.round((h * maxWidth) / w); w = maxWidth; }
      cvs.width = w; cvs.height = h;
      cvs.getContext('2d').drawImage(img, 0, 0, w, h);
      cvs.toBlob(b => resolve(b || file), 'image/webp', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
};

// Guard to stop Firebase from turning arrays into objects
const ensureArray = (arr) => Array.isArray(arr) ? arr : (arr ? Object.values(arr) : []);

function mergeWithDefaults(saved) {
  if (!saved) return { ...EMPTY_DATA };
  
  let inv = saved.inventory || {};
  let items = inv.items;
  // Migrate legacy inventory if not already in the new shape
  if (!items || !Array.isArray(items)) {
     items = [{
       id: 'prod_1',
       name: saved.appLabels?.pellets || 'Pellet',
       quantity: inv.pellets || 0,
       threshold: inv.threshold || 0,
       waste: inv.waste || 0,
       unit: saved.appLabels?.mainUnit || 'pcs'
     }];
  }

  return {
    ...EMPTY_DATA,
    ...saved,
    incoming: ensureArray(saved.incoming),
    sales: ensureArray(saved.sales),
    clients: ensureArray(saved.clients).map(c => ({...c, transactions: ensureArray(c.transactions)})),
    workers: ensureArray(saved.workers).map(w => ({...w, records: ensureArray(w.records)})),
    suppliers: ensureArray(saved.suppliers).map(s => ({...s, payments: ensureArray(s.payments).map(p => ({...p, id: p.id || Date.now() + Math.random()})), records: ensureArray(s.records)})),
    inventory: { ...EMPTY_DATA.inventory, ...inv, items, log: ensureArray(inv.log) },
    expenses: ensureArray(saved.expenses),
    expenseTypes: ensureArray(saved.expenseTypes).length ? ensureArray(saved.expenseTypes) : EMPTY_DATA.expenseTypes,
                bom: ensureArray(saved.bom),
                manufacturingOrders: ensureArray(saved.manufacturingOrders),
    todos: ensureArray(saved.todos),
    attendance: saved.attendance || {},
    auditLog: ensureArray(saved.auditLog),
    vehicles: ensureArray(saved.vehicles),
    vehicleLog: ensureArray(saved.vehicleLog),
    treasuryMoves: ensureArray(saved.treasuryMoves),
    employees: ensureArray(saved.employees),
    crmLeads: ensureArray(saved.crmLeads),
    systemUsers: ensureArray(saved.systemUsers),
    bannedEmails: ensureArray(saved.bannedEmails),
    appLabels: (() => {
      const al = { ...EMPTY_DATA.appLabels, ...(saved.appLabels || {}) };
      const CURR_MAP = { 'ج.م': 'EGP', 'ج': 'EGP', 'جنيه': 'EGP', 'ريال': 'SAR', 'درهم': 'AED', 'دولار': 'USD', 'يورو': 'EUR' };
      if (CURR_MAP[al.currency]) al.currency = CURR_MAP[al.currency];
      // English-first: migrate any label still holding Arabic text back to its
      // English default (custom English labels are preserved untouched).
      const hasArabic = (s) => typeof s === 'string' && /[؀-ۿ]/.test(s);
      Object.keys(EMPTY_DATA.appLabels).forEach((k) => {
        if (k !== 'currency' && hasArabic(al[k])) al[k] = EMPTY_DATA.appLabels[k];
      });
      return al;
    })(),
    companyInfo: (() => {
      const ci = { ...EMPTY_DATA.companyInfo, ...(saved.companyInfo || {}) };
      const OLD_NAMES = ['Nile Company', 'Nile', 'Nile', 'Nile System', 'Nile Co', 'Nile Company'];
      if (OLD_NAMES.some(old => ci.name === old)) ci.name = 'Nexora';
      return ci;
    })(),
    lastModified: saved.lastModified || 0,
  };
}

/* ═══════════════════════════════════════════════════════
   REDUCER
═══════════════════════════════════════════════════════ */
function appReducer(state, action) {
  switch (action.type) {
    case 'REPLACE':
      return action.noMerge ? { ...EMPTY_DATA, ...action.payload } : mergeWithDefaults(action.payload);
    case 'UPDATE': {
      const nextState = typeof action.updater === 'function' ? action.updater(state) : action.updater;
      const overrideMod = nextState._forceLastModified;
      if (overrideMod) delete nextState._forceLastModified;
      const newLastModified = overrideMod || Math.max(Date.now(), (state?.lastModified || 0) + 1);
      // Perf: skip mergeWithDefaults during normal updates
      // to avoid rebuilding every array and forcing a full stats recompute (re-render)
      const finalState = { ...nextState, lastModified: newLastModified };
      return finalState;
    }
    default:
      return state;
  }
}

/* ═══════════════════════════════════════════════════════
   HOOKS
═══════════════════════════════════════════════════════ */
export function useSort(data, config = { key: null, direction: 'asc' }) {
  const [sortConfig, setSortConfig] = useState(config);
  const sortedItems = useMemo(() => {
    let sortableItems = [...data];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aVal = a[sortConfig.key] ?? '';
        let bVal = b[sortConfig.key] ?? '';
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [data, sortConfig]);
  const requestSort = key => setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
  return { items: sortedItems, requestSort, sortConfig };
}

export function usePagination(data, itemsPerPage = 10) {
  const [currentPage, setCurrentPage] = useState(1);
  const maxPage = Math.ceil(data.length / itemsPerPage) || 1;

  useEffect(() => {
    if (currentPage > maxPage) setCurrentPage(maxPage);
  }, [maxPage, currentPage]);

  const currentData = useMemo(() => {
    const begin = (currentPage - 1) * itemsPerPage;
    const end = begin + itemsPerPage;
    return data.slice(begin, end);
  }, [data, currentPage, itemsPerPage]);

  const jump = (page) => {
    const pageNumber = Math.max(1, Math.min(page, maxPage));
    setCurrentPage(pageNumber);
  };

  return { next: () => jump(currentPage + 1), prev: () => jump(currentPage - 1), jump, currentData, curr: currentPage, max: maxPage };
}

export function PaginationControl({ curr, max, next, prev }) {
  if (max <= 1) return null;
  return (
    <div className="fb" style={{ justifyContent: 'center', gap: 10, marginTop: 14 }}>
      <button className="btn btn-g btn-sm" disabled={curr === 1} onClick={prev}><DynText>Previous</DynText></button>
      <span className="ts"><DynText>Page</DynText> {curr} <DynText>of</DynText> {max}</span>
      <button className="btn btn-g btn-sm" disabled={curr === max} onClick={next}><DynText>Next</DynText></button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   HELPER: AUDIT LOGGER
═══════════════════════════════════════════════════════ */
export const createLog = (user, action, details) => {
  return { id: Date.now(), date: new Date().toISOString(), user: user?.name || 'System', action, details };
};

const createTreasuryLog = (user, form, amount) => {
  return { id: Date.now() + Math.floor(Math.random() * 1000), ...form, amount, user: user?.name || 'System' };
};

/* ═══════════════════════════════════════════════════════
   TOAST CONTEXT
═══════════════════════════════════════════════════════ */
const ToastCtx = createContext(null);
let toastId = 0;

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const remove = useCallback(id => setToasts(t => t.filter(x => x.id !== id)), []);
  const add = useCallback((msg, type = 'success', dur = 3000) => {
    const id = ++toastId;
    setToasts(t => {
      if (t.some(x => x.msg === msg)) return t; // avoid duplicate messages at the same time
      setTimeout(() => remove(id), dur);
      return [...t, { id, msg, type }];
    });
    return id;
  }, [remove]);
  const toast = useMemo(() => ({
    success: m => add(m, 'success'),
    error:   m => add(m, 'error', 4000),
    warning: m => add(m, 'warning', 3500),
    info:    m => add(m, 'info'),
  }), [add]);
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span>{t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : t.type === 'warning' ? '⚠️' : 'ℹ️'}</span>
            <span><DynText>{t.msg}</DynText></span>
            <button className="toast-close" onClick={() => remove(t.id)}>✕</button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

/* ═══════════════════════════════════════════════════════
   CONFIRM DIALOG
═══════════════════════════════════════════════════════ */
function ConfirmDialog({ open, title, msg, confirmLabel = 'Delete', confirmClass = 'btn-d', onConfirm, onCancel }) {
  if (!open) return null;
  return createPortal(
    <div className="confirm-ov" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="confirm-box">
        <div className="confirm-icon">🗑️</div>
        <div className="confirm-title"><DynText>{title || 'Confirm Delete'}</DynText></div>
        <div className="confirm-msg"><DynText>{msg || 'Are you sure? This action cannot be undone.'}</DynText></div>
        <div className="confirm-btns">
          <button className={`btn ${confirmClass}`} onClick={onConfirm}><DynText>{confirmLabel}</DynText></button>
          <button className="btn btn-g" onClick={onCancel}><DynText>Cancel</DynText></button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function useConfirm() {
  const [state, setState] = useState({ open: false });
  const confirm = (title, msg, opts = {}) => new Promise(resolve => {
    setState({ open: true, title, msg, ...opts, resolve });
  });
      const handle = ok => { state.resolve?.(ok); setState(prev => ({ ...prev, open: false })); };
  const dialog = (
    <ConfirmDialog
      open={state.open} title={state.title} msg={state.msg}
      confirmLabel={state.confirmLabel} confirmClass={state.confirmClass}
      onConfirm={() => handle(true)} onCancel={() => handle(false)}
    />
  );
  return { confirm, dialog };
}

/* ═══════════════════════════════════════════════════════
   SKELETON LOADER
═══════════════════════════════════════════════════════ */
function SkeletonLoader() {
  return (
    <div className="wrap">
      <div className="sidebar">
        <div className="sb-logo" style={{height:88,display:'flex',flexDirection:'column',justifyContent:'center',gap:8}}>
          <div className="skeleton" style={{width:'60%',height:24,borderRadius:4}}/>
          <div className="skeleton" style={{width:'40%',height:12,borderRadius:4}}/>
        </div>
        <div className="sb-nav" style={{padding:12}}>
          {[1,2,3,4,5,6].map(i=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
              <div className="skeleton" style={{width:32,height:32,borderRadius:8}}/>
              <div className="skeleton" style={{width:'60%',height:14,borderRadius:4}}/>
            </div>
          ))}
        </div>
      </div>
      <main className="main">
        <div className="topbar">
          <div className="skeleton" style={{width:120,height:24,borderRadius:4}}/>
          <div style={{display:'flex',gap:12}}>
             <div className="skeleton" style={{width:32,height:32,borderRadius:8}}/>
             <div className="skeleton" style={{width:32,height:32,borderRadius:8}}/>
          </div>
        </div>
        <div className="page">
          <div className="stats-grid">
            {[1,2,3,4].map(i=>(
              <div key={i} className="stat-card" style={{height:110}}>
                <div className="skeleton" style={{width:38,height:38,borderRadius:8,marginBottom:12}}/>
                <div className="skeleton" style={{width:'50%',height:10,borderRadius:4,marginBottom:8}}/>
                <div className="skeleton" style={{width:'70%',height:20,borderRadius:4}}/>
              </div>
            ))}
          </div>
          <div className="dgrid">
            <div className="card" style={{height:300,padding:18}}>
              <div className="skeleton" style={{width:'40%',height:20,borderRadius:4,marginBottom:24}}/>
              {[1,2,3,4].map(i=><div key={i} className="skeleton" style={{width:'100%',height:40,borderRadius:6,marginBottom:12}}/>)}
            </div>
            <div className="card" style={{height:300,padding:18}}>
              <div className="skeleton" style={{width:'40%',height:20,borderRadius:4,marginBottom:24}}/>
              {[1,2,3,4].map(i=><div key={i} className="skeleton" style={{width:'100%',height:40,borderRadius:6,marginBottom:12}}/>)}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   ERROR BOUNDARY
═══════════════════════════════════════════════════════ */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    // Log error details for debugging
    console.error("Error Details:", { error, errorInfo });
  }
  render() {
    if (this.state.hasError) {
      return <div className="card" style={{margin:'20px',padding:'40px',textAlign:'center'}}><h2 style={{color:'var(--rose-l)'}}>⚠️ <DynText>An unexpected error occurred</DynText></h2><button className="btn btn-p mt3" onClick={()=>window.location.reload()}><DynText>Refresh Page</DynText></button></div>;
    }
    return this.props.children;
  }
}

/* ═══════════════════════════════════════════════════════
   REUSABLE COMPONENTS
═══════════════════════════════════════════════════════ */
export const StatCard = memo(({ c, icon, label, value, sub }) => {
  return (
    <div className={"stat-card sc-" + c}>
      <div className="sc-glow" />
      <div className="sc-icon">{icon}</div>
      <div className="sc-label"><DynText>{label}</DynText></div>
      <div className="sc-value">{value}</div>
      {sub && <div className="sc-sub"><DynText>{sub}</DynText></div>}
    </div>
  );
});

export function Modal({ open, onClose, title, children, footer, wide }) {
  if (!open) return null;
  return createPortal(
    <div className="modal-ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={wide ? { maxWidth: 720 } : {}}>
        <div className="modal-hdr">
          <div className="modal-title"><DynText>{title}</DynText></div>
          <button className="btn btn-g btn-icon btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

export function SumBox({ children }) { return <div className="sumrow mt3">{children}</div>; }

export function SearchableSelect({ options, value, onChange, placeholder, disabled, error, noTrans }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const filtered = options.filter(o => {
     const label = typeof o === 'string' ? o : o.label;
     return label.toLowerCase().includes(query.toLowerCase());
  });

  const selectedLabel = useMemo(() => {
     const sel = options.find(o => (typeof o === 'string' ? o : o.value) === value);
     return sel ? (typeof sel === 'string' ? sel : sel.label) : '';
  }, [value, options]);

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%', flex: 1 }}>
      <div
        className={`fi ${error ? 'fi-err' : ''}`}
        style={{
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: open ? 'var(--glass-b)' : '',
          minHeight: 38,
          padding: '9px 12px'
        }}
        onClick={() => !disabled && setOpen(!open)}
      >
        <span style={{ color: selectedLabel ? 'var(--tp)' : 'var(--tm)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          {selectedLabel ? (noTrans && value !== '' ? selectedLabel : <DynText>{selectedLabel}</DynText>) : <DynText>{placeholder || 'Select...'}</DynText>}
        </span>
        <span style={{ fontSize: 10, color: 'var(--tm)' }}>▼</span>
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
          background: 'var(--navy)', border: '1px solid var(--border)',
          borderRadius: 8, margin: '4px 0', overflow: 'hidden',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
        }}>
          <div style={{ padding: 6, borderBottom: '1px solid var(--border)' }}>
            <input
              autoFocus
              className="fi"
              style={{ padding: '6px 10px', fontSize: 12 }}
              placeholder="Search..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '10px', textAlign: 'center', fontSize: 12, color: 'var(--tm)' }}><DynText>No results</DynText></div>
            ) : filtered.map((o, i) => {
              const val = typeof o === 'string' ? o : o.value;
              const lbl = typeof o === 'string' ? o : o.label;
              return (
                <div
                  key={val || i}
                  style={{
                    padding: '8px 12px', fontSize: 13, cursor: 'pointer',
                    background: value === val ? 'rgba(59,130,246,0.1)' : 'transparent',
                    color: value === val ? 'var(--light)' : 'var(--tp)'
                  }}
                  onMouseEnter={e => e.target.style.background = 'var(--glass-b)'}
                  onMouseLeave={e => e.target.style.background = value === val ? 'rgba(59,130,246,0.1)' : 'transparent'}
                  onClick={() => {
                    onChange({ target: { value: val } });
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  {noTrans && val !== '' ? lbl : <DynText>{lbl}</DynText>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function FormField({ label, error, children, full }) {
  return (
    <label className={"fg" + (full ? " full" : "")} style={{ cursor: 'inherit' }}>
      <div className="fl">{typeof label === 'string' ? <DynText>{label}</DynText> : label}</div>
      {children}
      {error && <div className="field-err">⚠ <DynText>{error}</DynText></div>}
    </label>
  );
}

export function ReadOnlyBanner() {
  return (
    <div className="alert-bar warn" style={{ marginBottom: 18 }}>
      <span style={{ fontSize: 20 }}>👁</span>
      <div>
        <div className="fw7 ts" style={{ color: 'var(--gold-l)' }}><DynText>View-Only Mode</DynText></div>
        <div className="txs tmt"><DynText>You're signed in as a user — view-only access</DynText></div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   VALIDATION HELPERS
═══════════════════════════════════════════════════════ */
export function validate(rules, form) {
  const errs = {};
  for (const [field, checks] of Object.entries(rules)) {
    const valValue = form[field];
    const isStr = typeof valValue === 'string';
    // Ensure the text isn't only spaces, and the value isn't null / undefined / NaN
    const isEmpty = isStr ? valValue.trim() === '' : (valValue === null || valValue === undefined || (typeof valValue === 'number' && isNaN(valValue)));
    for (const [type, val] of Object.entries(checks)) {
      if (type === 'required' && val && isEmpty) { errs[field] = 'This field is required'; break; }
      if (type === 'positive' && val && n(valValue) <= 0) { errs[field] = 'Must be greater than zero'; break; }
      if (type === 'nonNegative' && val && n(valValue) < 0) { errs[field] = 'Cannot be a negative number'; break; }
    }
  }
  return errs;
}

/* ═══════════════════════════════════════════════════════
   EXCEL EXPORT
═══════════════════════════════════════════════════════ */
function exportExcel(data) {
  const esc = v => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const now = new Date();
  const monthName = MONTH_NAMES_AR[now.getMonth()];
  const year = now.getFullYear();
  const monthLabel = `${monthName} ${year}`;
  const curM = String(now.getMonth() + 1).padStart(2, '0');
  const curY = String(year);
  const inMonth = ds => { if (!ds) return false; return ds.startsWith(`${curY}-${curM}`); };
  const salesM = data.sales.filter(r => inMonth(r.date));
  const incM   = data.incoming.filter(r => inMonth(r.date));
  
  const compName = data.companyInfo?.name || 'Company';
  
  const totalExpensesM = incM.reduce((s,r) => s + r.totalExpenses, 0) + data.expenses.reduce((s,e) => s + (inMonth(e.date) ? e.amount : 0), 0);
  const totalSalesM = salesM.reduce((s,r) => s + r.totalAmount, 0);

  const STYLES = `<Styles>
<Style ss:ID="def"><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><Font ss:FontName="Arial" ss:Size="11"/></Style>
<Style ss:ID="sTitle"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="0"/><Font ss:Bold="1" ss:Color="#000000" ss:Size="14" ss:FontName="Arial"/><Interior ss:Color="#FFFF00" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#000000"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#000000"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/></Borders></Style>
<Style ss:ID="sHdr"><Alignment ss:Horizontal="Right" ss:Vertical="Center" ss:WrapText="1"/><Font ss:Bold="1" ss:Color="#000000" ss:Size="11" ss:FontName="Arial"/><Interior ss:Color="#FFCC00" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/></Borders></Style>
<Style ss:ID="sHdr2"><Alignment ss:Horizontal="Right" ss:Vertical="Center" ss:WrapText="1"/><Font ss:Bold="1" ss:Color="#FFFFFF" ss:Size="11" ss:FontName="Arial"/><Interior ss:Color="#1E4D9E" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#3B82F6"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#3B82F6"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#3B82F6"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#3B82F6"/></Borders></Style>
<Style ss:ID="sLabel"><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><Font ss:Bold="1" ss:Color="#000000" ss:Size="11" ss:FontName="Arial"/><Interior ss:Color="#FFFF99" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/></Borders></Style>
<Style ss:ID="sEven"><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><Font ss:Color="#1E293B" ss:Size="11" ss:FontName="Arial"/><Interior ss:Color="#FFF8E7" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CCCCCC"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CCCCCC"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CCCCCC"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CCCCCC"/></Borders></Style>
<Style ss:ID="sOdd"><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><Font ss:Color="#1E293B" ss:Size="11" ss:FontName="Arial"/><Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CCCCCC"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CCCCCC"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CCCCCC"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CCCCCC"/></Borders></Style>
<Style ss:ID="sEven2"><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><Font ss:Color="#1E293B" ss:Size="11" ss:FontName="Arial"/><Interior ss:Color="#EFF6FF" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BFDBFE"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BFDBFE"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BFDBFE"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BFDBFE"/></Borders></Style>
<Style ss:ID="sOdd2"><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><Font ss:Color="#1E293B" ss:Size="11" ss:FontName="Arial"/><Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders></Style>
<Style ss:ID="sTot"><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><Font ss:Bold="1" ss:Color="#000000" ss:Size="11" ss:FontName="Arial"/><Interior ss:Color="#90EE90" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#000000"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#000000"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/></Borders></Style>
<Style ss:ID="sTot2"><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><Font ss:Bold="1" ss:Color="#1E293B" ss:Size="11" ss:FontName="Arial"/><Interior ss:Color="#FDE68A" ss:Pattern="Solid"/><Borders><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#F59E0B"/><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#F59E0B"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F59E0B"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F59E0B"/></Borders></Style>
<Style ss:ID="sInfo"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:Color="#64748B" ss:Size="9" ss:FontName="Arial"/><Interior ss:Color="#0D1B34" ss:Pattern="Solid"/></Style>
<Style ss:ID="sTitleDark"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:Bold="1" ss:Color="#FBBF24" ss:Size="14" ss:FontName="Arial"/><Interior ss:Color="#0F2044" ss:Pattern="Solid"/></Style>
</Styles>`;

  const C = (v, sid) => {
    const t = typeof v === 'number' ? 'Number' : 'String';
    return `<Cell ss:StyleID="${sid}"><Data ss:Type="${t}">${esc(v ?? '')}</Data></Cell>`;
  };
  const EC = sid => `<Cell ss:StyleID="${sid ?? 'sOdd'}"/>`;

  const buildGeneralSheet = () => {
    const NCOLS = 6;
    let s = `<Worksheet ss:Name="General Report"><Table ss:DefaultColumnWidth="100">`;
    s += `<Column ss:Width="170"/><Column ss:Width="125"/><Column ss:Width="125"/><Column ss:Width="115"/><Column ss:Width="115"/><Column ss:Width="145"/>`;
    s += `<Row ss:Height="36"><Cell ss:MergeAcross="${NCOLS-1}" ss:StyleID="sTitle"><Data ss:Type="String">General Statistics - ${compName} - ${monthLabel}</Data></Cell></Row>`;
    s += `<Row ss:Height="26">`;
    s += EC('sHdr'); s += C('Total Expenses','sHdr'); s += C('Sales Value','sHdr');
    s += C('Inventory Items Count','sHdr'); s += C('Total Client Debt','sHdr'); s += C('Total Supplier Debt','sHdr');
    s += `</Row>`;
    s += `<Row ss:Height="24">`;
    s += C('Workshop Accounts','sLabel'); s += C(totalExpensesM,'sEven'); s += C(totalSalesM,'sEven');
    s += C((data.inventory?.items||[]).length,'sEven'); s += C(data.clients.reduce((sum,c)=>sum+(c.remaining||0),0),'sEven'); s += C(data.suppliers.reduce((sum,sp)=>sum+(sp.remaining||0),0),'sEven');
    s += `</Row>`;
    s += `<Row ss:Height="14">${Array(NCOLS).fill(EC('def')).join('')}</Row>`;
    s += `<Row ss:Height="14">${Array(NCOLS).fill(EC('def')).join('')}</Row>`;
    s += `<Row ss:Height="32"><Cell ss:MergeAcross="4" ss:StyleID="sTitle"><Data ss:Type="String">Client Accounts ${monthLabel}</Data></Cell>${EC('def')}</Row>`;
    s += `<Row ss:Height="26">`;
    s += EC('sHdr'); s += C('Total Purchases','sHdr'); s += C('Total Paid','sHdr');
    s += C('Account Balance','sHdr'); s += EC('def'); s += EC('def');
    s += `</Row>`;
    let cB=0,cP=0,cR=0,cT=0;
    data.clients.forEach((c,i) => {
      const st = i%2===0?'sEven':'sOdd';
      cB+=c.totalBought; cP+=c.totalPaid; cR+=c.remaining;
      s += `<Row ss:Height="22">${C(c.name,'sLabel')}${C(c.totalBought,st)}${C(c.totalPaid,st)}${C(c.remaining,st)}${EC('def')}${EC('def')}</Row>`;
    });
    s += `<Row ss:Height="26">${C('Total','sTot')}${C(cB,'sTot')}${C(cP,'sTot')}${C(cR,'sTot')}${EC('def')}${EC('def')}</Row>`;
    s += `<Row ss:Height="14">${Array(NCOLS).fill(EC('def')).join('')}</Row>`;
    s += `<Row ss:Height="14">${Array(NCOLS).fill(EC('def')).join('')}</Row>`;
    s += `<Row ss:Height="32"><Cell ss:MergeAcross="3" ss:StyleID="sTitle"><Data ss:Type="String">Supplier Accounts ${monthLabel}</Data></Cell>${EC('def')}${EC('def')}</Row>`;
    s += `<Row ss:Height="26">`;
    s += EC('sHdr'); s += C('Supply Amounts','sHdr');
    s += C('Amounts Paid','sHdr'); s += C('Remaining Debt','sHdr');
    s += EC('def'); s += EC('def');
    s += `</Row>`;
    let sS=0,sP=0,sR=0;
    data.suppliers.forEach((sp,i) => {
      const st = i%2===0?'sEven':'sOdd';
      sS+=sp.totalSupplied; sP+=sp.totalPaid; sR+=sp.remaining;
      s += `<Row ss:Height="22">${C(sp.name,'sLabel')}${C(sp.totalSupplied,st)}${C(sp.totalPaid,st)}${C(sp.remaining,st)}${EC('def')}${EC('def')}</Row>`;
    });
    s += `<Row ss:Height="26">${C('Total','sTot')}${C(sS,'sTot')}${C(sP,'sTot')}${C(sR,'sTot')}${EC('def')}${EC('def')}</Row>`;
    s += `</Table></Worksheet>`;
    return s;
  };

  const tSales = data.sales.reduce((s,r)=>s+r.totalAmount,0);
  const tPaid  = data.sales.reduce((s,r)=>s+r.paid,0);
  const tRem   = data.sales.reduce((s,r)=>s+r.remaining,0);
  const tInc   = data.incoming.reduce((s,r)=>s+r.totalExpenses,0);
  const tWork  = data.workers.reduce((s,w)=>s+w.totalEarned,0);

  const buildSheet = (name, title, hdrs, rows, tots) => {
    const nc = hdrs.length;
    let s = `<Worksheet ss:Name="${esc(name)}"><Table ss:DefaultColumnWidth="115">`;
    hdrs.forEach(()=>{s+=`<Column ss:Width="120"/>`;});
    s += `<Row ss:Height="34"><Cell ss:MergeAcross="${nc-1}" ss:StyleID="sTitleDark"><Data ss:Type="String">${esc(title)}</Data></Cell></Row>`;
    s += `<Row ss:Height="16"><Cell ss:MergeAcross="${nc-1}" ss:StyleID="sInfo"><Data ss:Type="String">${esc(compName)} — Export date: ${today()}</Data></Cell></Row>`;
    s += `<Row ss:Height="28">${hdrs.map(h=>C(h,'sHdr2')).join('')}</Row>`;
    rows.forEach((row,i)=>{
      const st = i%2===0?'sEven2':'sOdd2';
      s += `<Row>${row.map(v=>C(v??'',st)).join('')}</Row>`;
    });
    if (tots) s += `<Row>${tots.map(v=>C(v??'','sTot2')).join('')}</Row>`;
    return s + `</Table></Worksheet>`;
  };

  const sheets = [
    buildGeneralSheet(),
    buildSheet('Purchases',`Purchases Log — ${compName}`,
      ['Date','Item','Supplier','Quantity','Unit','Unit Price','Total Price','Shipping','Total Expenses','Production'],
      data.incoming.map(r=>[r.date,r.category,r.supplier,r.weight,r.unit,r.unitPrice,r.totalPrice||0,r.transportPrice,r.totalExpenses,r.production]),
      ['Total','','',data.incoming.reduce((s,r)=>s+r.weight,0),'','',data.incoming.reduce((s,r)=>s+(r.totalPrice||0),0),data.incoming.reduce((s,r)=>s+r.transportPrice,0),tInc,data.incoming.reduce((s,r)=>s+r.production,0)]),
    buildSheet('Sales',`Sales Log — ${compName}`,
      ['Date','Product','Client','Quantity','Unit','Unit Price','Shipping','Total','Paid','Remaining'],
      data.sales.map(r=>[r.date,r.product,r.client,r.quantity,r.unit,r.unitPrice,r.transportPrice,r.totalAmount,r.paid,r.remaining]),
      ['Total','','','','','','',tSales,tPaid,tRem]),
    buildSheet('Clients',`Clients Log — ${compName}`,
      ['Name','Phone','City','Purchases','Paid','Remaining'],
      data.clients.map(c=>[c.name,c.phone||'',c.city||'',c.totalBought,c.totalPaid,c.remaining]),
      ['Total','','',data.clients.reduce((s,c)=>s+c.totalBought,0),data.clients.reduce((s,c)=>s+c.totalPaid,0),data.clients.reduce((s,c)=>s+c.remaining,0)]),
    buildSheet('Workers',`Workers Log — ${compName}`,
      ['Name','Due','Received','Advances','Remaining'],
      data.workers.map(w=>[w.name,w.totalEarned,w.received,w.advance,w.remaining]),
      ['Total',tWork,data.workers.reduce((s,w)=>s+w.received,0),data.workers.reduce((s,w)=>s+w.advance,0),data.workers.reduce((s,w)=>s+w.remaining,0)]),
    buildSheet('Suppliers',`Suppliers Log — ${compName}`,
      ['Name','Phone','City','Supplies','Paid','Remaining'],
      data.suppliers.map(sp=>[sp.name,sp.phone||'',sp.city||'',sp.totalSupplied,sp.totalPaid,sp.remaining]),
      ['Total','','',data.suppliers.reduce((s,sp)=>s+sp.totalSupplied,0),data.suppliers.reduce((s,sp)=>s+sp.totalPaid,0),data.suppliers.reduce((s,sp)=>s+sp.remaining,0)]),
    buildSheet('Expenses',`Expenses Log — ${compName}`,
      ['Date','Type','Description','Amount'],
      data.expenses.map(e=>[e.date,e.type,e.description||'',e.amount]),
      ['Total','','',data.expenses.reduce((s,e)=>s+e.amount,0)]),
  ];

  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<?mso-application progid="Excel.Sheet"?>`,
    `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"`,
    ` xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"`,
    ` xmlns:x="urn:schemas-microsoft-com:office:excel">`,
    `<DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">`,
    `<Author>${esc(compName)}</Author></DocumentProperties>`,
    STYLES,
    sheets.join(''),
    `</Workbook>`
  ].join('\n');

  const blob = new Blob(['\uFEFF' + xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `Report_${compName.replace(/\s+/g, '_')}_${today()}.xls`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

function exportCSV(data) {
  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const rows = [
    ['Type', 'Date', 'Item', 'Amount', 'Total'].map(escapeCsv),
    ...data.sales.map(s => ['Sale', s.date, s.product, s.quantity, s.totalAmount].map(escapeCsv)),
    ...data.incoming.map(i => ['Incoming', i.date, i.category, i.weight, i.totalExpenses].map(escapeCsv)),
    ...data.expenses.map(e => ['Expense', e.date, e.type, '-', e.amount].map(escapeCsv))
  ];
  const csvContent = "\uFEFF" + rows.map(e => e.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${data?.companyInfo?.name || 'company'}_data_${today()}.csv`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
}

/* ═══════════════════════════════════════════════════════
   REUSABLE MINI CHART CARD (used across all pages)
═══════════════════════════════════════════════════════ */
const CHART_PALETTE = ['#3b82f6','#10b981','#f59e0b','#f43f5e','#7c3aed','#06b6d4','#fb7185','#34d399','#a78bfa','#fbbf24'];
const chartTip = { background:'rgba(13,27,52,.97)', border:'1px solid rgba(59,130,246,.35)', borderRadius:10, color:'#f0f6ff', fontSize:12 };
const MiniChartCard = memo(function MiniChartCard({ title, icon, data, type = 'bar', color = '#3b82f6', height = 240 }) {
  const valid = (data || []).filter(d => d && d.value > 0);
  if (!valid.length) return (
    <div className="card">
      <div className="card-hdr"><div className="card-title">{icon} <DynText>{title}</DynText></div></div>
      <div className="empty" style={{ height, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div className="empty-icon">📊</div><div className="empty-txt"><DynText>No data yet</DynText></div>
      </div>
    </div>
  );
  return (
    <div className="card">
      <div className="card-hdr"><div className="card-title">{icon} <DynText>{title}</DynText></div></div>
      <div style={{ padding: 16, height }}>
        <ResponsiveContainer width="99%" height="100%" minWidth={10} minHeight={10} initialDimension={{ width: 10, height: 10 }}>
          {type === 'donut' ? (
            <PieChart>
              <Pie data={valid} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="82%" paddingAngle={2} stroke="var(--deep)" strokeWidth={2}>
                {valid.map((d, i) => <Cell key={i} fill={d.color || CHART_PALETTE[i % CHART_PALETTE.length]} />)}
              </Pie>
              <Tooltip contentStyle={chartTip} /><Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          ) : type === 'area' ? (
            <AreaChart data={valid} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
              <defs><linearGradient id={`mg-${title}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={color} stopOpacity={0.5} /><stop offset="95%" stopColor={color} stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(59,130,246,.08)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#5b7ca6' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#5b7ca6' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={chartTip} />
              <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} fill={`url(#mg-${title})`} />
            </AreaChart>
          ) : (
            <BarChart data={valid} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(59,130,246,.08)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#5b7ca6' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#5b7ca6' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={chartTip} cursor={{ fill: 'rgba(59,130,246,.06)' }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={46}>
                {valid.map((d, i) => <Cell key={i} fill={d.color || CHART_PALETTE[i % CHART_PALETTE.length]} />)}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
});

/* ═══════════════════════════════════════════════════════
   DASHBOARD PAGE
═══════════════════════════════════════════════════════ */
const DashboardPage = memo(function DashboardPage({ data, setData, navTo, isAdmin, user, perms }) {
  const fp = isAdmin ? FULL_PERMS.finance : (user?.perms?.finance || DEFAULT_USER_PERMS.finance);
  const { t, lang } = useLanguage();
  const currency = data.appLabels?.currency || t('currency');
  const { tSales, totalIn, totalOut, tRem, supDbt, balance } = useMemo(() => {
    const tSales = data.sales.reduce((s, r) => s + r.totalAmount, 0);
    const tRem   = data.clients.reduce((s, c) => s + c.remaining, 0);
    const supDbt = data.suppliers.reduce((s, sp) => s + sp.remaining, 0);

    // 1. Total incoming money (receipts)
    let clientsPaid = 0;
    data.clients.forEach(c => {
      (c.transactions || []).forEach(t => { if (t.paid && !t.type?.includes('Settlement')) clientsPaid += t.paid; });
    });
    const treasuryIn = data.treasuryMoves.filter(m => m.type === 'deposit').reduce((s, m) => s + m.amount, 0);
    const totalIn = clientsPaid + treasuryIn;

    // 2. Total outgoing money (payments)
    let suppliersPaid = 0;
    data.suppliers.forEach(s => {
      (s.records || []).forEach(r => { if (r.paid) suppliersPaid += r.paid; });
      (s.payments || []).forEach(p => { if (p.amount && !p.notes?.includes('Settlement')) suppliersPaid += p.amount; });
    });
    const workersPaid = data.workers.reduce((s, w) => s + (w.received||0) + (w.advance||0), 0);
    const generalExp = data.expenses.reduce((s, e) => s + e.amount, 0);
    const logisticsExp = data.vehicleLog.reduce((s, l) => s + l.cost, 0);
    const treasuryOut = data.treasuryMoves.filter(m => m.type === 'withdraw').reduce((s, m) => s + m.amount, 0);
    const totalOut = suppliersPaid + workersPaid + generalExp + logisticsExp + treasuryOut;

    // 3. Actual balance (liquidity)
    const balance = totalIn - totalOut;

    return { tSales, totalIn, totalOut, tRem, supDbt, balance };
  }, [data.sales, data.clients, data.suppliers, data.treasuryMoves, data.workers, data.expenses, data.vehicleLog]);

  const expenseBreakdown = useMemo(() => {
    const list = (data.expenseTypes || []).map(t => ({
      type: t,
      amount: data.expenses.filter(e => e.type === t).reduce((s, e) => s + e.amount, 0)
    }));

    // Merge other costs (purchases, workers, transport) into expenses
    const incomingPaid = data.incoming.reduce((s, r) => s + (r.paid || 0), 0);
    if (incomingPaid > 0) list.push({ type: 'Purchase Costs (Goods)', amount: incomingPaid });

    let totalSuppliersPaid = 0;
    data.suppliers.forEach(s => {
      (s.records || []).forEach(r => { if (r.paid) totalSuppliersPaid += r.paid; });
      (s.payments || []).forEach(p => { if (p.amount && !p.notes?.includes('Settlement')) totalSuppliersPaid += p.amount; });
    });
    const laterSupplierPayments = Math.max(0, totalSuppliersPaid - incomingPaid);
    if (laterSupplierPayments > 0) list.push({ type: 'Supplier Payment (Credit)', amount: laterSupplierPayments });

    const workersPaid = data.workers.reduce((s, w) => s + (w.received||0) + (w.advance||0), 0);
    if (workersPaid > 0) list.push({ type: 'Wages & Labor', amount: workersPaid });

    const logisticsExp = data.vehicleLog.reduce((s, l) => s + l.cost, 0);
    if (logisticsExp > 0) list.push({ type: 'Transport & Maintenance', amount: logisticsExp });

    return list.filter(x => x.amount > 0).sort((a, b) => b.amount - a.amount);
  }, [data.expenseTypes, data.expenses, data.incoming, data.suppliers, data.workers, data.vehicleLog]);

  const [newTodo, setNewTodo] = useState('');
  
  const { chartData, salesExpData } = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }
    const cData = []; const sData = [];
    days.forEach(date => {
      let dailyIn = 0;
      data.clients.forEach(c => { (c.transactions || []).forEach(t => { if (t.date === date && !t.type?.includes('Settlement')) dailyIn += (t.paid || 0); }); });
      data.treasuryMoves.forEach(m => { if (m.date === date && m.type === 'deposit') dailyIn += m.amount; });
      let dailyOut = 0;
      data.expenses.forEach(e => { if (e.date === date) dailyOut += e.amount; });
      data.suppliers.forEach(s => {
         (s.records || []).forEach(r => { if (r.date === date) dailyOut += (r.paid || 0); });
         (s.payments || []).forEach(p => { if (p.date === date && !p.notes?.includes('Settlement')) dailyOut += (p.amount || 0); });
      });
      data.vehicleLog.forEach(l => { if (l.date === date) dailyOut += l.cost; });
      data.treasuryMoves.forEach(m => { if (m.date === date && m.type === 'withdraw') dailyOut += m.amount; });
      let dailySales = 0; data.sales.forEach(s => { if (s.date === date) dailySales += s.totalAmount; });
      let generalExp = 0; data.expenses.forEach(e => { if (e.date === date) generalExp += e.amount; });
      const dateObj = new Date(date);
      const dayName = dateObj.toLocaleDateString(lang === 'en' ? 'en-US' : 'ar-EG', { weekday: 'short' });
      cData.push({ name: dayName, date: date, 'Purchases': dailyIn, 'Expenses': dailyOut });
      sData.push({ name: dayName, date: date, 'Sales': dailySales, 'Expenses': generalExp });
    });
    return { chartData: cData, salesExpData: sData };
  }, [data.clients, data.treasuryMoves, data.expenses, data.suppliers, data.vehicleLog, data.sales, lang]);

  const topProducts = useMemo(() => {
    const productSales = {};
    data.sales.forEach(s => {
      if (!productSales[s.product]) productSales[s.product] = 0;
      productSales[s.product] += s.totalAmount;
    });
    return Object.entries(productSales).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 5);
  }, [data.sales]);

  const alerts = useMemo(() => {
    const arr = [];
    (data.inventory?.items || []).forEach(item => {
      if (item.threshold > 0 && item.quantity < item.threshold)
        arr.push({ type:'err', icon:'⚠️', title: <><DynText>{item.name}</DynText> - {t('alert_lowStockTitle')}</>, desc: t('alert_lowStockDesc').replace('{0}', fmt(item.quantity)).replace('{1}', item.unit).replace('{2}', fmt(item.threshold)) });
    });
    data.clients.forEach(c => { if (c.remaining > 5000) arr.push({ type:'warn', icon:'💰', title:<>{t('alert_debtTitle')} {c.name}</>, desc: t('alert_debtDesc').replace('{0}', fmt(c.remaining)).replace('{1}', t('currency')) }); });
    return arr;
  }, [data.inventory.items, data.clients, t]);
  
  const addTodo = () => {
    if(!newTodo.trim()) return;
    setData(d => ({...d, todos: [...d.todos, {id:Date.now(), txt:newTodo, done:false}]}));
    setNewTodo('');
  };
  const toggleTodo = (id) => {
    setData(d => ({...d, todos: d.todos.map(t => t.id === id ? {...t, done: !t.done} : t)}));
  };
  
  const handleDragStart = (e, index) => {
    e.dataTransfer.setData("dragIndex", index);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    const dragIndex = Number(e.dataTransfer.getData("dragIndex"));
    if (isNaN(dragIndex) || dragIndex === dropIndex) return;
    if (dragIndex < 0 || dragIndex >= data.todos.length || dropIndex < 0 || dropIndex >= data.todos.length) return;
    const newTodos = [...data.todos];
    const [removed] = newTodos.splice(dragIndex, 1);
    newTodos.splice(dropIndex, 0, removed);
    setData(d => ({ ...d, todos: newTodos }));
  };

  return (
    <div className="page">
      {isAdmin && (
        <div className="alert-bar" style={{background: 'linear-gradient(135deg, var(--bright), var(--mid))', color: '#fff', border: 'none', boxShadow: '0 4px 15px rgba(37,99,235,0.3)', marginBottom: 22}}>
          <span style={{ fontSize: 24 }}>👋</span>
          <div>
                <div className="fw7 ts" style={{ fontSize: 14 }}><DynText>{t('dashboard_welcomeTitle')}</DynText> {user?.name}!</div>
                <div className="txs" style={{ color: 'var(--pale)', marginTop: 2 }}><DynText>{t('dashboard_welcomeSub')}</DynText></div>
          </div>
        </div>
      )}
      {alerts.map((a,i) => (
        <div key={i} className={"alert-bar " + a.type}>
          <span style={{ fontSize:22 }}>{a.icon}</span>
          <div><div className="fw7 ts" style={{ color: a.type==='err' ? 'var(--rose-l)' : 'var(--gold-l)' }}><DynText>{a.title}</DynText></div><div className="txs tmt mt2"><DynText>{a.desc}</DynText></div></div>
        </div>
      ))}
      <div className="stats-grid">
        <StatCard c="blue" icon="📦" label={<DynText>Inventory Items</DynText>} value={<>{(data.inventory?.items||[]).length} <DynText>items</DynText></>} />
        <StatCard c="em"   icon="💰" label={<DynText>{t('totalSales')}</DynText>} value={<>{fmt(tSales)} <DynText>{t('currency')}</DynText></>} />
        {fp?.viewCosts && <StatCard c="rose" icon="📤" label={<DynText>{t('totalExpenses')}</DynText>} value={<>{fmt(totalOut)} <DynText>{t('currency')}</DynText></>} sub={<DynText>{t('expensesSub')}</DynText>} />}
        {fp?.viewCosts && <StatCard c={balance>=0?'em':'rose'} icon="⚖️" label={<DynText>{t('currentLiquidity')}</DynText>} value={<>{fmt(balance)} <DynText>{t('currency')}</DynText></>} sub={<DynText>{balance>=0?t('availableBalance'):t('liquidityDeficit')}</DynText>} />}
        <StatCard c="gold" icon="⏳" label={<DynText>{t('debtsForUs')}</DynText>} value={<>{fmt(tRem)} <DynText>{t('currency')}</DynText></>} />
        <StatCard c="vio"  icon="📉" label={<DynText>{t('debtsOnUs')}</DynText>} value={<>{fmt(supDbt)} <DynText>{t('currency')}</DynText></>} />
      </div>
      {fp?.viewCosts && <AdvancedAnalytics data={data} />}
      
      <div className="dgrid" style={{marginTop: 18}}>
        {fp?.viewCosts && <div className="card" style={{marginBottom: 0}}>
          <div className="card-hdr"><div className="card-title">📈 <DynText>Treasury Activity (Last 7 Days)</DynText></div></div>
          <div style={{ height: 260, padding: '20px 15px 10px 0', direction: 'ltr' }}>
            <ResponsiveContainer width="99%" height="100%" minWidth={10} minHeight={10} initialDimension={{ width: 10, height: 10 }}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--em-l)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--em-l)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--rose-l)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--rose-l)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="var(--tm)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--tm)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => val > 0 ? `${val/1000}k` : 0} />
                <Tooltip contentStyle={{ background: 'var(--glass)', borderColor: 'var(--border)', borderRadius: 12, color: 'var(--tp)' }} itemStyle={{fontWeight: 'bold'}} />
                <Area type="monotone" name={lang === 'en' ? 'Income' : 'Purchases'} dataKey="Purchases" stroke="var(--em-l)" strokeWidth={3} fillOpacity={1} fill="url(#colorIn)" />
                <Area type="monotone" name={lang === 'en' ? 'Expenses' : 'Expenses'} dataKey="Expenses" stroke="var(--rose-l)" strokeWidth={3} fillOpacity={1} fill="url(#colorOut)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>}

        {fp?.viewCosts && <div className="card" style={{marginBottom: 0}}>
          <div className="card-hdr"><div className="card-title">📊 <DynText>Sales & Expenses (Last 7 Days)</DynText></div></div>
          <div style={{ height: 260, padding: '20px 15px 10px 0', direction: 'ltr' }}>
            <ResponsiveContainer width="99%" height="100%" minWidth={10} minHeight={10} initialDimension={{ width: 10, height: 10 }}>
              <AreaChart data={salesExpData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--light)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--light)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorGenExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--gold)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--gold)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="var(--tm)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--tm)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => val > 0 ? `${val/1000}k` : 0} />
                <Tooltip contentStyle={{ background: 'var(--glass)', borderColor: 'var(--border)', borderRadius: 12, color: 'var(--tp)' }} itemStyle={{fontWeight: 'bold'}} />
                <Area type="monotone" name={lang === 'en' ? 'Sales' : 'Sales'} dataKey="Sales" stroke="var(--light)" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                <Area type="monotone" name={lang === 'en' ? 'Expenses' : 'Expenses'} dataKey="Expenses" stroke="var(--gold)" strokeWidth={3} fillOpacity={1} fill="url(#colorGenExp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>}
        
        {topProducts.length > 0 && (
          <div className="card" style={{marginBottom: 0, gridColumn: '1 / -1'}}>
            <div className="card-hdr"><div className="card-title">🔥 <DynText>Top Selling Products</DynText></div></div>
            <div style={{ height: 260, padding: '20px 15px 10px 0', direction: 'ltr' }}>
              <ResponsiveContainer width="99%" height="100%" minWidth={10} minHeight={10} initialDimension={{ width: 10, height: 10 }}>
                <BarChart data={topProducts} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} layout="vertical">
                  <XAxis type="number" stroke="var(--tm)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => val > 0 ? `${val/1000}k` : 0} />
                  <YAxis dataKey="name" type="category" stroke="var(--tm)" fontSize={11} tickLine={false} axisLine={false} width={100} />
                  <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ background: 'var(--glass)', borderColor: 'var(--border)', borderRadius: 12, color: 'var(--tp)' }} itemStyle={{fontWeight: 'bold'}} />
                  <Bar dataKey="value" name={lang === 'en' ? 'Sales' : 'Sales'} fill="var(--gold-l)" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-hdr"><div className="card-title"><DynText>{t('quickActions')}</DynText></div></div>
        <div style={{padding:18,display:'flex',gap:10,flexWrap:'wrap'}}>
          <button className="btn btn-p" onClick={()=>navTo('sales')}><DynText>{t('newSaleBtn')}</DynText></button>
          <button className="btn btn-s" onClick={()=>navTo('incoming')}><DynText>{t('newIncomingBtn')}</DynText></button>
          <button className="btn btn-gold" onClick={()=>navTo('expenses')}><DynText>{t('newExpenseBtn')}</DynText></button>
          {fp?.viewCosts && <button className="btn btn-g" onClick={() => {
             const tDay = today();
             const dSales = data.sales.filter(s => s.date === tDay).reduce((s,x)=>s+x.totalAmount,0);
             const text = `📊 Daily Summary (${tDay}):\n- Today's Sales: ${fmt(dSales)} ${currency}\n- Available Treasury Balance: ${fmt(balance)} ${currency}`;
             window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
          }}>📱 <DynText>Share Today's Summary</DynText></button>}
        </div>
      </div>
      {fp?.viewCosts && expenseBreakdown.length > 0 && (
        <div className="card">
          <div className="card-hdr"><div className="card-title"><DynText>{t('expensesAnalysis')}</DynText></div></div>
          <div style={{padding:18, display:'flex', gap:15, flexWrap:'wrap'}}>
            {expenseBreakdown.map((e, i) => {
              const translateExpType = (type) => {
                const expMap = {
                  'Workshop Expenses': t('workshopExp'),
                  'Utility Bills': t('utilityExp'),
                  'Rent': t('rentExp'),
                  'Petty Cash': t('pettyExp'),
                  'Purchase Costs (Goods)': t('incomingExpenses'),
                  'Supplier Payment (Credit)': t('supplierPaymentsDeferred'),
                  'Wages & Labor': t('wagesAndLabor'),
                  'Transport & Maintenance': t('transportAndMaintenance')
                };
                return expMap[type] || type;
              };
              return (
              <div key={i} style={{flex:1, minWidth:140, background:'var(--glass)', padding:12, borderRadius:10, border:'1px solid var(--border)'}}>
                <div className="ts tmt"><DynText>{translateExpType(e.type)}</DynText></div>
                <div className="fw7 t-err" style={{fontSize:16}}>{fmt(e.amount)} <DynText>{t('currency')}</DynText></div>
                <div className="prog-bar mt2" style={{height:4}}><div className="prog-fill" style={{transform:`scaleX(${totalOut > 0 ? Math.min(1, e.amount/totalOut) : 0})`, background:'var(--rose)'}} /></div>
              </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="dgrid">
        <div className="card">
          <div className="card-hdr"><div className="card-title"><DynText>{t('latestIncoming')}</DynText></div></div>
          {data.incoming.length === 0 ? <div className="empty"><div className="empty-icon">📭</div><div className="empty-txt"><DynText>{t('noData')}</DynText></div></div> :
            <table><thead><tr><th><DynText>{t('category')}</DynText></th><th><DynText>{t('date')}</DynText></th><th><DynText>{t('weight')}</DynText></th><th><DynText>{t('total')}</DynText></th></tr></thead>
              <tbody>{data.incoming.slice(-5).reverse().map(r => (
                <tr key={r.id}><td><span className="badge b-info"><DynText>{r.category}</DynText></span></td><td className="tmt">{fmtD(r.date)}</td>
                  <td><span className="pill p-blue">{fmt(r.weight)} <DynText>{r.unit}</DynText></span></td><td className="t-gold fw7">{fmt(r.totalExpenses)} <DynText>{t('currency')}</DynText></td></tr>
              ))}</tbody></table>}
        </div>
        <div className="card">
          <div className="card-hdr"><div className="card-title"><DynText>{t('latestSales')}</DynText></div></div>
          {data.sales.length === 0 ? <div className="empty"><div className="empty-icon">📭</div><div className="empty-txt"><DynText>{t('noData')}</DynText></div></div> :
            <table><thead><tr><th><DynText>{t('product')}</DynText></th><th><DynText>{t('client')}</DynText></th><th><DynText>{t('total')}</DynText></th><th><DynText>{t('status')}</DynText></th></tr></thead>
              <tbody>{data.sales.slice(-5).reverse().map(r => (
                <tr key={r.id}><td><DynText>{r.product}</DynText></td><td className="t-info">{r.client}</td><td className="t-gold fw7">{fmt(r.totalAmount)} <DynText>{t('currency')}</DynText></td>
                  <td><span className={"badge " + (r.remaining===0?'b-ok':'b-warn')}><DynText>{r.remaining===0?t('paid'):t('partial')}</DynText></span></td></tr>
              ))}</tbody></table>}
        </div>
        <div className="card">
          <div className="card-hdr"><div className="card-title"><DynText>{t('managerTasks')}</DynText></div></div>
          <div style={{padding:18}}>
            <div style={{display:'flex',gap:8,marginBottom:12}}>
              <input id="newTodoInput" name="newTodo" className="fi" placeholder={t('newTaskPlaceholder')} value={newTodo} onChange={e=>setNewTodo(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addTodo()} />
              <button className="btn btn-s btn-sm" onClick={addTodo}>+</button>
            </div>
            <div style={{maxHeight:200,overflowY:'auto'}}>
              {data.todos.map((t, i) => (
                <div key={t.id} className="todo-item" draggable onDragStart={(e) => handleDragStart(e, i)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, i)} style={{cursor:'grab'}}>
                  <span className={"todo-check "+(t.done?'checked':'')} onClick={()=>toggleTodo(t.id)}>
                    {t.done?'✅':'⬜'} {t.txt}
                  </span>
                  <button className="btn btn-d btn-icon btn-sm" style={{marginRight:'auto',padding:2}} onClick={()=>setData(d => ({...d, todos: d.todos.filter(x=>x.id!==t.id)}))}>✕</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

/* ═══════════════════════════════════════════════════════
   INCOMING PAGE
═══════════════════════════════════════════════════════ */
const IncomingPage = memo(function IncomingPage({ data, setData, isAdmin, perms, user, isMobile }) {
  const ip = perms?.incoming || {};
  const { t } = useLanguage();
  const currency = data.appLabels?.currency || t('currency');
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [show, setShow] = useState(false);
  const [editRec, setEditRec] = useState(null);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [errs, setErrs] = useState({});
  const blank = { date:today(), category:'', weight:'', unit:'kg', unitPrice:'', transportPrice:'', discount:'', production:'', supplier:'', batchNo:'', quality:'Approved', paid:'' };
  const [form, setForm] = useState(blank);
  const sf = f => setForm(p => ({...p,...f}));
  const fil = useMemo(() => data.incoming.filter(r => {
    const matchText = (r.category||'').toLowerCase().includes(deferredSearch.toLowerCase()) || (r.supplier||'').toLowerCase().includes(deferredSearch.toLowerCase());
    const matchFrom = !dateFrom || r.date >= dateFrom;
    const matchTo = !dateTo || r.date <= dateTo;
    const matchSupplierFilter = !supplierFilter || r.supplier === supplierFilter;
    return matchText && matchFrom && matchTo && matchSupplierFilter;
  }), [data.incoming, deferredSearch, dateFrom, dateTo, supplierFilter]);
  const cT = n(form.weight)*n(form.unitPrice);
  const cE = cT+n(form.transportPrice)-n(form.discount);
  const { items: sortedFil, requestSort, sortConfig } = useSort(fil, { key: 'date', direction: 'desc' });
  const getSortIcon = key => sortConfig.key === key ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : '';
  const { currentData, curr, max, next, prev } = usePagination(sortedFil, 15);

  const clearFilters = () => { setSearch(''); setDateFrom(''); setDateTo(''); setSupplierFilter(''); };
  const openAdd  = () => { setForm(blank); setErrs({}); setEditRec(null); setShow(true); };
  const openEdit = rec => { setForm({...rec}); setErrs({}); setEditRec(rec); setShow(true); };
  const handleSave = () => {
    const e = validate({category:{required:true},supplier:{required:true},weight:{positive:true},unitPrice:{positive:true}},form);
    if (Object.keys(e).length) { setErrs(e); return; }
    const w=n(form.weight),up=n(form.unitPrice),tr=n(form.transportPrice),disc=n(form.discount);
    const total=w*up, exp=total+tr-disc, prod=form.production!==''?n(form.production):w;
    const pd=n(form.paid);
    const rem=exp-pd;

    if (editRec) {
      const prodDiff = prod - (editRec.production || 0);
      const oldExp = editRec.totalExpenses || 0;
      const oldPaid = editRec.paid || 0;
      const oldRem = editRec.remaining !== undefined ? editRec.remaining : oldExp;
      
      const supplierChanged = editRec.supplier !== form.supplier;
      const isInvItem = (data.inventory?.items || []).some(i => i.name === form.category);

      setData(d=>({...d,
        incoming:d.incoming.map(r=>r.id===editRec.id?{...r,...form,weight:w,unitPrice:up,transportPrice:tr,discount:disc,totalPrice:total,totalExpenses:exp,production:prod,paid:pd,remaining:rem}:r),
        inventory: {
           ...d.inventory,
           items: (d.inventory?.items || []).map(item => {
              if (editRec.category === item.name && form.category !== item.name) return { ...item, quantity: item.quantity - (editRec.production || 0) };
              if (form.category === item.name) return { ...item, quantity: item.quantity + (editRec.category === form.category ? prodDiff : prod) };
              return item;
           }),
           log: prodDiff!==0 ? [{id: Date.now(), date:new Date().toISOString(), action:`Edit purchase (${form.category})`, amount:prodDiff, user:user?.name || 'System'}, ...(d.inventory.log||[])].slice(0,50) : d.inventory.log
        },
        suppliers: d.suppliers.map(s => {
          if (supplierChanged && s.name === editRec.supplier) {
          return { ...s, totalSupplied: Math.max(0, s.totalSupplied - oldExp), totalPaid: Math.max(0, s.totalPaid - oldPaid), remaining: s.remaining - oldRem, records: (s.records||[]).filter(r => r.incomingId !== editRec.id) };
          }
          if (s.name === form.supplier) {
          const newRecord = { incomingId: editRec.id, date: form.date, category: form.category, weight: w, total: exp, paid: pd, remaining: rem };
            if (supplierChanged) {
            return { ...s, totalSupplied: s.totalSupplied + exp, totalPaid: s.totalPaid + pd, remaining: s.remaining + rem, records: [...(s.records||[]), newRecord] };
            } else {
            return { ...s, totalSupplied: s.totalSupplied + (exp - oldExp), totalPaid: s.totalPaid + (pd - oldPaid), remaining: s.remaining + (rem - oldRem), records: (s.records||[]).map(r => r.incomingId === editRec.id ? newRecord : r) };
            }
          }
          return s;
        }),
        auditLog: [createLog(user, 'Edit Purchase', `Edit purchase from ${form.supplier} - ${fmt(w)} kg`), ...d.auditLog].slice(0, 100)
      }));
      toast.success('Purchase record updated ✏️');
    } else {
      const recId = Date.now() + Math.floor(Math.random()*1000);
      const rec={id:recId,...form,weight:w,unitPrice:up,transportPrice:tr,discount:disc,totalPrice:total,totalExpenses:exp,production:prod,paid:pd,remaining:rem};
      const isInvItem = (data.inventory?.items || []).some(i => i.name === form.category);
      setData(d=>({...d,
        incoming:[...d.incoming,rec],
        suppliers:d.suppliers.map(s=>s.name===form.supplier?{...s,totalSupplied:s.totalSupplied+exp,totalPaid:s.totalPaid+pd,remaining:s.remaining+rem,records:[...(s.records||[]),{incomingId:recId,date:form.date,category:form.category,weight:w,total:exp,paid:pd,remaining:rem}]}:s),
        inventory: isInvItem ? {...d.inventory, items: (d.inventory?.items || []).map(i => i.name === form.category ? {...i, quantity: i.quantity + prod} : i), log: [{id: Date.now(), date:new Date().toISOString(), action:`Purchase production (${form.category})`, amount:prod, user:user?.name || 'System'}, ...(d.inventory.log||[])].slice(0,50)} : d.inventory,
        auditLog: [createLog(user, 'Add Purchase', `Add purchase from ${form.supplier} - ${fmt(w)} kg`), ...d.auditLog].slice(0, 100)
      }));
      toast.success('Purchase added successfully 📥');
    }
    setShow(false);
  };
  const handleDelete = async rec => {
    // Inventory protection logic on delete
    const ok = await confirm('Delete Purchase Record',`"${rec.category}" will be deleted and ${fmt(rec.production)} removed from inventory.`);
    if (!ok) return;
    const isInvItem = (data.inventory?.items || []).some(i => i.name === rec.category);
    setData(d=>({...d,
      incoming:d.incoming.filter(x=>x.id!==rec.id),
      inventory: isInvItem ? {...d.inventory, items: (d.inventory?.items || []).map(i => i.name === rec.category ? {...i, quantity: i.quantity - (rec.production||0)} : i), log: [{id: Date.now(), date:new Date().toISOString(), action:`Delete purchase (${rec.category})`, amount:-(rec.production||0), user:user?.name || 'System'}, ...(d.inventory.log||[])].slice(0,50)} : d.inventory,
      suppliers:d.suppliers.map(s=>s.name===rec.supplier?{...s,totalSupplied:Math.max(0,s.totalSupplied-rec.totalExpenses),totalPaid:Math.max(0,s.totalPaid-(rec.paid||0)),remaining:s.remaining-(rec.remaining!==undefined?rec.remaining:rec.totalExpenses),records:(s.records||[]).filter(r=>r.incomingId!==rec.id)}:s),
      auditLog: [createLog(user, 'Delete Purchase', `Delete purchase from ${rec.supplier}`), ...d.auditLog].slice(0, 100)
    }));
    toast.success('Record deleted and balances updated');
  };
  return (
    <div className="page">
      {dialog}
      {!ip.add && !ip.edit && !ip.del && <ReadOnlyBanner />}
      <div className="stats-grid">
        <StatCard c="blue" icon="📥" label="Total Weight"       value={<>{fmt(fil.reduce((s,r)=>s+r.weight,0))} <DynText>kg</DynText></>} />
        <StatCard c="gold" icon="💵" label="Total Expenses"   value={<>{fmt(fil.reduce((s,r)=>s+r.totalExpenses,0))} {currency}</>} />
        <StatCard c="em"   icon="🏭" label="Total Production"     value={<>{fmt(fil.reduce((s,r)=>s+r.production,0))} <DynText>kg</DynText></>} />
      </div>
      <div className="dgrid">
        <MiniChartCard title="Purchase Cost by Item" icon="📦" color="#06b6d4" data={[...new Set(fil.map(r=>r.category))].map(c=>({name:c,value:fil.filter(r=>r.category===c).reduce((s,r)=>s+(r.totalExpenses||0),0)})).slice(0,8)} />
        <MiniChartCard title="Monthly Purchases" icon="📈" type="area" color="#06b6d4" data={(()=>{const o=[];const now=new Date();for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;o.push({name:d.toLocaleDateString('en-US',{month:'short'}),value:(data.incoming||[]).filter(r=>(r.date||'').startsWith(k)).reduce((s,r)=>s+(r.totalExpenses||0),0)});}return o;})()} />
      </div>
      <div className="card">
        <div className="card-hdr">
          <div className="card-title">📥 <DynText>Purchase Log</DynText></div>
          <div className="card-actions" id="nav-incoming">
            <input type="date" id="incomingDateFrom" name="incomingDateFrom" aria-label="From date" className="fi" style={{width:130,padding:'6px'}} value={dateFrom} onChange={e=>setDateFrom(e.target.value)} title="From date" />
            <span style={{color:'var(--tm)'}}>←</span>
            <input type="date" id="incomingDateTo" name="incomingDateTo" aria-label="To date" className="fi" style={{width:130,padding:'6px'}} value={dateTo} onChange={e=>setDateTo(e.target.value)} title="To date" />
            <div style={{width:160}}>
              <SearchableSelect
                options={[{value:'', label:'All Suppliers'}, ...data.suppliers.map(s=>({value: s.name, label: s.name}))]}
                value={supplierFilter}
                placeholder="All suppliers"
                onChange={e=>setSupplierFilter(e.target.value)}
              />
            </div>
            <div className="search-box"><span className="search-icon">🔍</span><input id="incomingSearch" name="incomingSearch" aria-label="Search purchases" className="fi" placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} style={{width:150}} /></div>
            {(search||dateFrom||dateTo||supplierFilter) && <button className="btn btn-g btn-icon" onClick={clearFilters} title="Clear filters">✕</button>}
            {ip.add && <button className="btn btn-p" onClick={openAdd}>+ <DynText>Add Purchase</DynText></button>}
          </div>
        </div>
        <div className="table-scroll"><table>
          <thead><tr><th><DynText>#</DynText></th>
            <th className="sortable" onClick={()=>requestSort('date')}><DynText>Date</DynText>{getSortIcon('date')}</th>
            <th className="sortable" onClick={()=>requestSort('category')}><DynText>Category</DynText>{getSortIcon('category')}</th>
            <th className="sortable" onClick={()=>requestSort('supplier')}><DynText>Supplier</DynText>{getSortIcon('supplier')}</th>
            <th className="sortable" onClick={()=>requestSort('weight')}><DynText>Weight</DynText>{getSortIcon('weight')}</th>
            <th className="sortable" onClick={()=>requestSort('unitPrice')}><DynText>Unit Price</DynText>{getSortIcon('unitPrice')}</th>
            <th className="sortable" onClick={()=>requestSort('totalExpenses')}><DynText>Total Cost</DynText>{getSortIcon('totalExpenses')}</th>
            <th><DynText>Quality</DynText></th>
            <th className="sortable" onClick={()=>requestSort('production')}><DynText>Production</DynText>{getSortIcon('production')}</th>
            <th><DynText>Actions</DynText></th>
          </tr></thead>
          <tbody>
            {fil.length===0?<tr><td colSpan={10}><div className="empty"><div className="empty-icon">📭</div><div className="empty-txt"><DynText>No data available</DynText></div></div></td></tr>
              :currentData.map((r,i)=>(
                <tr key={r.id}>
                  <td className="tmt">{i+1}</td><td className="tmt">{fmtD(r.date)}</td>
                  <td><span className="badge b-info"><DynText>{r.category}</DynText></span></td>
                  <td className="t-info"><DynText>{r.supplier}</DynText></td>
                  <td><span className="pill p-blue">{fmt(r.weight)} <DynText>{r.unit}</DynText></span></td>
                  <td>{fmt(r.unitPrice)} {currency}</td>
                  <td className="fw7 t-err">{fmt(r.totalExpenses)} {currency}</td>
                  <td><span className={"badge "+(r.quality==='Rejected'?'b-err':'b-ok')}><DynText>{r.quality||'Accepted'}</DynText></span></td>
                  <td><span className="pill p-em">{fmt(r.production)} <DynText>{r.unit}</DynText></span></td>
                  <td><div style={{display:'flex',gap:4}}><button className="btn btn-g btn-sm" title="Print invoice" onClick={()=>window.dispatchEvent(new CustomEvent("nx-print-doc",{detail:{kind:"purchase",rec:r}}))}>🧾</button>{ip.edit&&<button className="btn btn-g btn-sm" onClick={()=>openEdit(r)}>✏️</button>}{ip.del&&<button className="btn btn-d btn-sm" onClick={()=>handleDelete(r)}>🗑</button>}</div></td>
                </tr>
              ))}
            {fil.length>0 && <tr style={{background:'rgba(59,130,246,.1)',fontWeight:'800'}}>
              <td colSpan={4} style={{textAlign:'center'}}>Total ({fil.length})</td>
              <td style={{color:'var(--light)'}}>{fmt(fil.reduce((s,r)=>s+r.weight,0))}</td>
              <td>-</td>
              <td style={{color:'var(--rose-l)'}}>{fmt(fil.reduce((s,r)=>s+r.totalExpenses,0))} {currency}</td>
              <td style={{color:'var(--em-l)'}}>{fmt(fil.reduce((s,r)=>s+r.production,0))}</td>
              {(ip.edit||ip.del)&&<td></td>}
            </tr>}
          </tbody>
        </table></div>
        <PaginationControl curr={curr} max={max} next={next} prev={prev} />
      </div>
      {isMobile && ip.add && <button className="fab" onClick={openAdd}>+</button>}
      <Modal open={show} onClose={()=>setShow(false)} title={editRec?"✏️ Edit Purchase Record":"➕ Add New Purchase"}
        footer={<><button className="btn btn-p" onClick={handleSave}>✅ <DynText>{editRec?'Save Changes':'Add'}</DynText></button><button className="btn btn-g" onClick={()=>setShow(false)}><DynText>Cancel</DynText></button></>}>
        <div className="form-grid">
          <FormField label="Date *"><input type="date" className="fi" value={form.date} onChange={e=>sf({date:e.target.value})} /></FormField>
          <FormField label="Category *" error={errs.category}>
             <div style={{display:'flex',gap:8}}>
                <input
                   className={`fi${errs.category ? ' fi-err' : ''}`}
                   value={form.category}
                   placeholder="Type or select category..."
                   list="incoming-categories-list"
                   onChange={e=>{
                      const val = e.target.value;
                      const itm = (data.inventory?.items || []).find(i=>i.name===val);
                      sf({category:val, unit: itm ? itm.unit : form.unit || 'kg'});
                      setErrs(v=>({...v,category:''}));
                   }}
                />
                <datalist id="incoming-categories-list">
                   {(data.inventory?.items || []).map((i, idx) => <option key={idx} value={i.name} />)}
                </datalist>
             </div>
          </FormField>
          <FormField label="Supplier *" error={errs.supplier}>
            <SearchableSelect
               options={data.suppliers.map(s=>s.name)}
               value={form.supplier}
               placeholder="Select supplier"
               error={errs.supplier}
               disabled={!!editRec}
               onChange={e=>{sf({supplier:e.target.value});setErrs(v=>({...v,supplier:''}));}}
            />
          </FormField>
          <FormField label="Weight / Quantity *" error={errs.weight}><input type="number" min="0" className={`fi${errs.weight?' fi-err':''}`} placeholder="0" value={form.weight} onChange={e=>{sf({weight:e.target.value});setErrs(v=>({...v,weight:''}));}} /></FormField>
          <FormField label="Unit"><select className="fi" value={form.unit} onChange={e=>sf({unit:e.target.value})}><option value="kg"><DynText>kg</DynText></option><option value="ton"><DynText>ton</DynText></option><option value="pcs"><DynText>count</DynText></option></select></FormField>
          <FormField label="Unit Price *" error={errs.unitPrice}><input type="number" min="0" className={`fi${errs.unitPrice?' fi-err':''}`} placeholder="0.00" value={form.unitPrice} onChange={e=>{sf({unitPrice:e.target.value});setErrs(v=>({...v,unitPrice:''}));}} /></FormField>
          <FormField label="Transport Cost"><input type="number" min="0" className="fi" placeholder="0" value={form.transportPrice} onChange={e=>sf({transportPrice:e.target.value})} /></FormField>
          <FormField label="Discount"><input type="number" min="0" className="fi" placeholder="0" value={form.discount} onChange={e=>sf({discount:e.target.value})} /></FormField>
          <FormField label="Batch Number"><input className="fi" value={form.batchNo} onChange={e=>sf({batchNo:e.target.value})} /></FormField>
          <FormField label="Paid"><input type="number" min="0" className="fi" placeholder="0" value={form.paid} onChange={e=>sf({paid:e.target.value})} /></FormField>
          <FormField label="Quality Check"><select className="fi" value={form.quality} onChange={e=>sf({quality:e.target.value})}><option value="Approved"><DynText>Accepted</DynText></option><option value="Rejected"><DynText>Rejected</DynText></option><option value="Under Review"><DynText>Under Review</DynText></option></select></FormField>
          <FormField label="Expected Production (auto = same quantity)"><input type="number" min="0" className="fi" placeholder="Auto-calculated" value={form.production} onChange={e=>sf({production:e.target.value})} /></FormField>
        </div>
        {form.weight&&form.unitPrice&&<SumBox>
          <div className="fb ts"><span className="tmt"><DynText>Total Price:</DynText></span><span className="t-gold fw7">{fmt(cT)} {currency}</span></div>
          {n(form.discount)>0&&<div className="fb ts mt2"><span className="tmt"><DynText>Discount:</DynText></span><span className="t-err fw7">− {fmt(n(form.discount))} {currency}</span></div>}
          <div className="fb ts mt2"><span className="tmt"><DynText>Total Cost:</DynText></span><span className="t-err fw7">{fmt(cE)} {currency}</span></div>
          <div className="fb ts mt2"><span className="tmt"><DynText>Owed to Supplier:</DynText></span><span className="t-err fw7">{fmt(cE - n(form.paid))} {currency}</span></div>
          <div className="fb ts mt2"><span className="tmt"><DynText>Expected Production:</DynText></span><span className="t-ok fw7">{fmt(n(form.production)||n(form.weight))} <DynText>{form.unit}</DynText></span></div>
        </SumBox>}
      </Modal>
    </div>
  );
});

/* ═══════════════════════════════════════════════════════
   ADVANCED ANALYTICS COMPONENT (NEW)
   Adds a professional touch and precise financial analysis to the dashboard
 ═══════════════════════════════════════════════════════ */
const AdvancedAnalytics = memo(({ data }) => {
  const { t, lang } = useLanguage();
  const { growth, lowStockCount } = useMemo(() => {
    const now = new Date();
    const thisMonth = now.toISOString().slice(0, 7);
    // Safely compute last month to avoid the 'Feb 31' problem
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = lastMonthDate.toISOString().slice(0, 7);
    
    const salesThis = data.sales.filter(s => s.date && s.date.startsWith(thisMonth)).reduce((a, b) => a + b.totalAmount, 0);
    const salesLast = data.sales.filter(s => s.date && s.date.startsWith(lastMonth)).reduce((a, b) => a + b.totalAmount, 0);
    const growth = salesLast > 0 ? ((salesThis - salesLast) / salesLast) * 100 : (salesThis > 0 ? 100 : 0);
    
    const lowStockCount = (data.inventory?.items || []).filter(i => i.threshold > 0 && i.quantity < i.threshold).length;
    return { growth, lowStockCount };
  }, [data.sales, data.inventory.items]);

  return (
    <div className="card" style={{background:'linear-gradient(135deg, var(--dark), var(--navy))', border:'1px solid var(--border-b)'}}>
      <div className="card-hdr" style={{background:'transparent'}}><div className="card-title"><DynText>{t('smartKPIs')}</DynText></div></div>
      <div className="dgrid" style={{padding:18, gap:20}}>
        <div style={{background:'rgba(16,185,129,0.05)', padding:15, borderRadius:12, border:'1px solid rgba(16,185,129,0.1)'}}>
          <div className="ts tmt"><DynText>{t('salesGrowthMonthly')}</DynText></div>
          <div className="fb mt2">
            <span style={{fontSize:24, fontWeight:900, color: growth >= 0 ? 'var(--em-l)' : 'var(--rose-l)'}}>
              {growth > 0 ? '+' : ''}{growth.toFixed(1)}%
            </span>
            <span style={{fontSize:30}}>{growth >= 0 ? '📈' : '📉'}</span>
          </div>
          <div className="txs tmt mt2"><DynText>{growth >= 0 ? t('excellentPerformance') : t('salesDecline')}</DynText></div>
        </div>
        <div style={{background:'rgba(59,130,246,0.05)', padding:15, borderRadius:12, border:'1px solid rgba(59,130,246,0.1)'}}>
          <div className="ts tmt"><DynText>Low Stock Items</DynText></div>
          <div className="fb mt2"><span style={{fontSize:24, fontWeight:900, color: lowStockCount > 0 ? 'var(--rose-l)' : 'var(--light)'}}>{lowStockCount} <DynText>items</DynText></span><span style={{fontSize:30}}>⚠️</span></div>
          <div className="txs tmt mt2"><DynText>Items below alert threshold</DynText></div>
        </div>
      </div>
    </div>
  );
});

/* ═══════════════════════════════════════════════════════
   CLIENTS PAGE
═══════════════════════════════════════════════════════ */
const ClientsPage = memo(function ClientsPage({ data, setData, isAdmin, perms, user, isMobile }) {
  const cp = perms?.clients || {};
  const { t } = useLanguage();
  const currency = data.appLabels?.currency || t('currency');
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [sel, setSel] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [printClient, setPrintClient] = useState(null);
  const [showPay, setShowPay] = useState(false);
  const [fil, setFil] = useState('all');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [form, setForm] = useState({name:'',phone:'',city:'',notes:''});
  const [errs, setErrs] = useState({});
  const [payForm, setPayForm] = useState({date:today(),amount:''});
  const list = useMemo(() => data.clients.filter(c => {
    const ms=(c.name||'').toLowerCase().includes(deferredSearch.toLowerCase())||(c.city||'').toLowerCase().includes(deferredSearch.toLowerCase());
    const mf=fil==='all'||(fil==='pending'&&c.remaining>0)||(fil==='settled'&&c.remaining===0);
    return ms&&mf;
  }), [data.clients, deferredSearch, fil]);
  const { currentData, curr, max, next, prev } = usePagination(list, 15);
  const client = useMemo(() => sel ? data.clients.find(c => c.id === sel) : null, [sel, data.clients]);
  const linkedSupplier = useMemo(() => client ? data.suppliers.find(s => s.name === client.name) : null, [client, data.suppliers]);

  const clientChartData = useMemo(() => {
    if (!client || !client.transactions) return [];
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthStr = d.toISOString().slice(0, 7);
      const monthName = d.toLocaleDateString(_l(), { month: 'short' }) + ' ' + d.getFullYear().toString().slice(-2);
      let monthSales = 0; let monthPaid = 0;
      client.transactions.forEach(t => {
        if (t.date && t.date.startsWith(monthStr)) {
          if (t.total && (!t.type || !t.type.includes('Return'))) monthSales += t.total;
          if (t.paid) monthPaid += t.paid;
          if (t.type && t.type.includes('Return') && t.total) monthSales += t.total;
        }
      });
      months.push({ name: monthName, Purchases: monthSales, Payments: monthPaid });
    }
    return months;
  }, [client]);

  useEffect(() => {
    if (sel && !client) setSel(null);
  }, [sel, client]);

  // Print Effect
  useEffect(() => {
    if (printClient) {
      const handleAfterPrint = () => setPrintClient(null);
      window.addEventListener("afterprint", handleAfterPrint);
      const timer = setTimeout(() => window.print(), 500);
      return () => { window.removeEventListener("afterprint", handleAfterPrint); clearTimeout(timer); };
    }
  }, [printClient]);

  const handleSettlement = async () => {
    if (!linkedSupplier) return;
    const amount = Math.min(client.remaining, linkedSupplier.remaining);
    if (amount <= 0) { toast.info('No common balance to settle'); return; }
    
    const ok = await confirm('Account Settlement (Netting)', `${fmt(amount)} ${currency} will be deducted from both the client and supplier accounts to settle the balances.`);
    if (!ok) return;

    setData(d => ({
      ...d,
      clients: d.clients.map(c => c.id === client.id ? {
        ...c,
        totalPaid: c.totalPaid + amount,
        remaining: c.remaining - amount,
        transactions: [...(c.transactions || []), { date: today(), type: 'Settlement (Netting)', paid: amount, remaining: c.remaining - amount }]
      } : c),
      suppliers: d.suppliers.map(s => s.id === linkedSupplier.id ? {
        ...s,
        totalPaid: s.totalPaid + amount,
        remaining: s.remaining - amount,
        payments: [...(s.payments||[]), {id:Date.now(), date:today(), amount:amount, notes:`Settlement (netting) with client ${client.name}`}]
      } : s),
      auditLog: [createLog(user, 'Settlement', `Netting ${fmt(amount)} ${currency} with ${client.name}`), ...d.auditLog].slice(0, 100)
    }));
    toast.success('Settled successfully ✅');
  };

  const handleAdd = () => {
    const e=validate({name:{required:true}},form);
    if (Object.keys(e).length){setErrs(e);return;}
    if (data.clients.some(c=>c.name===form.name.trim())){toast.error('A client with this name exists');return;}
    setData(d=>({...d,
      clients:[...d.clients,{id:Date.now() + Math.floor(Math.random()*1000),...form,name:form.name.trim(),totalBought:0,totalPaid:0,remaining:0,transactions:[]}],
      auditLog: [createLog(user, 'Add Client', `Add client ${form.name}`), ...d.auditLog].slice(0, 100)
    }));
    toast.success('Client added 👥');
    setShowAdd(false);setForm({name:'',phone:'',city:'',notes:''});setErrs({});
  };
  const handlePay = () => {
    const amt=n(payForm.amount);
    if (amt<=0){toast.error('Enter a valid amount');return;}
    setData(d=>({...d,
      clients:d.clients.map(c=>c.id===sel?{...c,totalPaid:c.totalPaid+amt,remaining:c.remaining-amt,transactions:[...(c.transactions || []),{date:payForm.date,type:'Payment',paid:amt,remaining:c.remaining-amt}]}:c),
      auditLog: [createLog(user, 'Collection', `Collect ${fmt(amt)} ${currency} from ${client.name}`), ...d.auditLog].slice(0, 100)
    }));
    toast.success(`Payment of ${fmt(amt)} ${currency} recorded ✅`);
    setShowPay(false);setPayForm({date:today(),amount:''});
  };
  const handleClearAccount = async () => {
    const amount = client.remaining;
    if (Math.abs(amount) < 0.01) { toast.info('Account already settled'); return; }
    const isOwedToClient = amount < 0;
    const absAmount = Math.abs(amount);
    const actionName = isOwedToClient ? 'Settle Credit Balance (Client)' : 'Settle Account (Final)';
    const confirmMsg = isOwedToClient 
      ? `The client has a credit balance of ${fmt(absAmount)} ${currency}. The account will be settled.`
      : `A payment of ${fmt(absAmount)} ${currency} will be recorded to settle the client account.`;
    const ok = await confirm('Settle Account', confirmMsg);
    if (!ok) return;
    setData(d=>({...d,
      clients:d.clients.map(c=>c.id===sel?{...c,totalPaid:c.totalPaid+amount,remaining:0,transactions:[...(c.transactions || []),{date:today(),type:actionName,paid:amount,remaining:0}]}:c),
      auditLog: [createLog(user, 'Settle Account', `Settle client account ${client.name}`), ...d.auditLog].slice(0, 100)
    }));
    toast.success('Account settled ✅');
  };
  const handleDeleteClient = async c => {
    // Prevent deleting a client who still owes money, to keep accounts consistent
    if (Math.abs(c.remaining) > 0.01) { toast.error('❌ Cannot delete a client with an open (unsettled) account. Settle it first.'); return; }
    const ok=await confirm('Delete Client',`"${c.name}" will be permanently deleted.`,{confirmLabel:'Permanent Delete',confirmClass:'btn-d'});
    if (!ok) return;
    setData(d=>({...d,
      clients:d.clients.filter(x=>x.id!==c.id),
      auditLog: [createLog(user, 'Delete Client', `Delete client ${c.name}`), ...d.auditLog].slice(0, 100)
    }));
    if (sel===c.id) setSel(null);
    toast.success('Client deleted');
  };
  if (!sel) return (
    <div className="page">
      {dialog}
      {!cp.add && !cp.del && !cp.pay && <ReadOnlyBanner />}
      <div className="stats-grid">
        <StatCard c="blue" icon="👥" label="Clients Count"       value={data.clients.length} />
        <StatCard c="gold" icon="💰" label="Total Sales"   value={<>{fmt(data.clients.reduce((s,c)=>s+c.totalBought,0))} <DynText>{currency}</DynText></>} />
        <StatCard c="em"   icon="✅" label="Total Received"    value={<>{fmt(data.clients.reduce((s,c)=>s+c.totalPaid,0))} <DynText>{currency}</DynText></>} />
        <StatCard c="rose" icon="⏳" label="Total Remaining"    value={<>{fmt(data.clients.reduce((s,c)=>s+c.remaining,0))} <DynText>{currency}</DynText></>} />
      </div>
      <div className="dgrid">
        <MiniChartCard title="Top Debtors" icon="⏳" color="#f43f5e" data={[...data.clients].sort((a,b)=>(b.remaining||0)-(a.remaining||0)).slice(0,7).map(c=>({name:c.name,value:c.remaining||0}))} />
        <MiniChartCard title="Top Clients by Sales" icon="🏆" type="donut" data={[...data.clients].sort((a,b)=>(b.totalBought||0)-(a.totalBought||0)).slice(0,6).map(c=>({name:c.name,value:c.totalBought||0}))} />
      </div>
      <div className="card">
        <div className="card-hdr">
          <div className="card-title">👥 <DynText>Clients</DynText></div>
          <div className="card-actions">
            <div className="tabs">{[['all','All'],['pending','In Debt'],['settled','Settled']].map(([v,l])=><button key={v} className={"tab-btn "+(fil===v?'active':'')} onClick={()=>setFil(v)}><DynText>{l}</DynText></button>)}</div>
            <div className="search-box"><span className="search-icon">🔍</span><input id="clientsSearch" name="clientsSearch" aria-label="Search clients" className="fi" placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} style={{width:130}} /></div>
            {cp.add && <button className="btn btn-p" onClick={()=>{setForm({name:'',phone:'',city:''});setErrs({});setShowAdd(true);}}>+ <DynText>New Client</DynText></button>}
          </div>
        </div>
        <table><thead><tr><th><DynText>Name</DynText></th><th><DynText>Phone</DynText></th><th><DynText>City</DynText></th><th><DynText>Purchases</DynText></th><th><DynText>Paid</DynText></th><th><DynText>Remaining</DynText></th><th><DynText>Status</DynText></th><th><DynText>Actions</DynText></th></tr></thead>
          <tbody>
            {currentData.length===0?<tr><td colSpan={8}><div className="empty"><div className="empty-icon">👥</div><div className="empty-txt"><DynText>No clients</DynText></div></div></td></tr>
              :currentData.map(c=>{
                const isLinked = data.suppliers.some(s=>s.name===c.name);
                return (
                <tr key={c.id} style={{cursor:'pointer'}} onClick={()=>setSel(c.id)}>
                  <td className="fw7">{c.name} {isLinked && <span title="Also a supplier" style={{fontSize:12}}>🔄</span>}</td>
                  <td className="tmt">{c.phone}</td><td className="tmt"><DynText>{c.city}</DynText></td>
                  <td><span className="pill p-blue">{fmt(c.totalBought)} <DynText>{currency}</DynText></span></td>
                  <td><span className="pill p-em">{fmt(c.totalPaid)} <DynText>{currency}</DynText></span></td>
                  <td><span className={"pill "+(c.remaining>0?'p-rose':'p-em')}>{fmt(c.remaining)} <DynText>{currency}</DynText></span></td>
                  <td><span className={"badge "+(c.remaining===0?'b-ok':c.remaining>5000?'b-err':'b-warn')}><DynText>{c.remaining===0?'Cleared':c.remaining>5000?'Overdue':'Partial'}</DynText></span></td>
                  <td><div style={{display:'flex',gap:4}} onClick={e=>e.stopPropagation()}>
                    <button className="btn btn-g btn-sm" title="Statement / Invoice" onClick={()=>window.dispatchEvent(new CustomEvent("nx-print-doc",{detail:{kind:"client",rec:c}}))}>🧾</button>
                    <button className="btn btn-s btn-sm" title="WhatsApp" onClick={()=>{const co=data.companyInfo||{};const msg=`${co.name||''} - Account Statement\n${c.name}\nPurchases: ${fmt(c.totalBought)} ${currency}\nPaid: ${fmt(c.totalPaid)} ${currency}\nBalance: ${fmt(c.remaining)} ${currency}`;window.open(`https://wa.me/${String(c.phone||'').replace(/[^\d]/g,'')}?text=${encodeURIComponent(msg)}`,'_blank');}}>📱</button>
                    <button className="btn btn-g btn-sm" onClick={()=>setSel(c.id)}><DynText>View</DynText></button>
                    {cp.del&&<button className="btn btn-d btn-sm" onClick={()=>handleDeleteClient(c)}>🗑</button>}
                  </div></td>
                </tr>
              )})}
          </tbody></table>
          <PaginationControl curr={curr} max={max} next={next} prev={prev} />
      </div>
      {isMobile && cp.add && <button className="fab" onClick={()=>{setForm({name:'',phone:'',city:''});setErrs({});setShowAdd(true);}}>+</button>}
      {cp.add && <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="➕ Add New Client"
        footer={<><button className="btn btn-p" onClick={handleAdd}>✅ <DynText>Add</DynText></button><button className="btn btn-g" onClick={()=>setShowAdd(false)}><DynText>Cancel</DynText></button></>}>
        <div className="form-grid">
          <FormField label="Name *" error={errs.name} full><input className={`fi${errs.name?' fi-err':''}`} value={form.name} onChange={e=>{setForm(f=>({...f,name:e.target.value}));setErrs(v=>({...v,name:''}));}} /></FormField>
          <FormField label="Phone"><input className="fi" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} /></FormField>
          <FormField label="City"><input className="fi" value={form.city} onChange={e=>setForm(f=>({...f,city:e.target.value}))} /></FormField>
          <FormField label="Notes" full><input className="fi" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} /></FormField>
        </div>
      </Modal>}
    </div>
  );
  return client ? (
    <div className="page">
      {dialog}
      <div className="card" style={{marginBottom:18}}>
        <div className="detail-hdr">
          <button className="btn btn-g btn-sm" onClick={()=>setSel(null)}>← Back</button>
          <div className="detail-av" style={{background:'linear-gradient(135deg,var(--bright),var(--vio))'}}>👤</div>
          <div><div style={{fontSize:17,fontWeight:800}}>{client.name}</div><div className="tmt txs">{client.phone} • <DynText>{client.city}</DynText> • <DynText>Last purchase:</DynText> {fmtD(client.lastPurchase)}</div></div>
          <div style={{marginRight:'auto',display:'flex',gap:6}}>
            <button className="btn btn-g btn-sm" onClick={()=>setPrintClient(client)}>🖨 <DynText>Print Statement</DynText></button>
            <button className="btn btn-s btn-sm" onClick={() => {
              const text = `Hello ${client.name},\nAccount statement from ${data.companyInfo.name}:\n- Purchases: ${fmt(client.totalBought)} ${currency}\n- Paid: ${fmt(client.totalPaid)} ${currency}\n- Outstanding balance: ${fmt(client.remaining)} ${currency}\n\nDate: ${fmtD(today())}`;
            let phone = client.phone ? String(client.phone).replace(/\D/g, '') : '';
            if (phone.startsWith('00')) phone = phone.substring(2);
            else if (phone.startsWith('0')) phone = '2' + phone;
              const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
              window.open(url, '_blank');
            }}>📱 <DynText>WhatsApp</DynText></button>
            {cp.pay&&<button className="btn btn-p btn-sm" onClick={handleClearAccount}>✨ <DynText>Clear Account</DynText></button>}
            {cp.pay&&<button className="btn btn-gold btn-sm" onClick={()=>setShowPay(true)}>💰 <DynText>Record Payment</DynText></button>}
          </div>
        </div>
        <div className="stats-grid" style={{padding:'16px 18px 0'}}>
          <StatCard c="blue" icon="🛒" label="Total Purchases" value={<>{fmt(client.totalBought)} <DynText>{currency}</DynText></>} />
          <StatCard c="em"   icon="✅" label="Paid"            value={<>{fmt(client.totalPaid)} <DynText>{currency}</DynText></>} />
          <StatCard c={client.remaining>0?'rose':'em'} icon="⏳" label="Remaining" value={<>{fmt(client.remaining)} <DynText>{currency}</DynText></>} />
        </div>
        <div className="card">
          <div className="card-hdr"><div className="card-title">📊 <DynText>Purchases & Payments (Last 6 Months)</DynText></div></div>
          <div style={{ height: 200, padding: '20px 15px 10px 0', direction: 'ltr' }}>
            <ResponsiveContainer width="99%" height="100%" minWidth={10} minHeight={10} initialDimension={{ width: 10, height: 10 }}>
              <BarChart data={clientChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="var(--tm)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--tm)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => val > 0 ? `${val/1000}k` : 0} />
                <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ background: 'var(--glass)', borderColor: 'var(--border)', borderRadius: 12, color: 'var(--tp)' }} itemStyle={{fontWeight: 'bold'}} />
                <Legend wrapperStyle={{fontSize: 12}} />
                <Bar dataKey="Purchases" fill="var(--light)" radius={[4, 4, 0, 0]} barSize={15} />
                <Bar dataKey="Payments" fill="var(--em-l)" radius={[4, 4, 0, 0]} barSize={15} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        {linkedSupplier && (
          <div style={{margin:'18px 18px 0',padding:14,background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.3)',borderRadius:12}}>
            <div className="fb">
              <div className="fw7 t-gold-l" style={{display:'flex',alignItems:'center',gap:6}}>🔗 <DynText>This client is also a supplier</DynText></div>
              <button className="btn btn-gold btn-sm" onClick={handleSettlement}>⚖️ <DynText>Settlement (Offset)</DynText></button>
            </div>
            <div className="dgrid mt2" style={{gap:10}}>
              <div className="ts"><DynText>Our balance with him (as supplier):</DynText> <span className="fw7 t-err">{fmt(linkedSupplier.remaining)} <DynText>{currency}</DynText></span></div>
              <div className="ts"><DynText>His balance with us (as client):</DynText> <span className="fw7 t-err">{fmt(client.remaining)} <DynText>{currency}</DynText></span></div>
            </div>
          </div>
        )}
        <div style={{padding:'14px 20px'}}>
          <div className="prog-bar"><div className="prog-fill" style={{transform:`scaleX(${client.totalBought>0?Math.min(1, client.totalPaid/client.totalBought):0})`,background:'linear-gradient(90deg,var(--em),var(--cyan))'}} /></div>
          <div className="tmt txs mt2">{client.totalBought>0?Math.round((client.totalPaid/client.totalBought)*100):0}% <DynText>Paid</DynText></div>
          {client.notes && <div className="alert-bar warn" style={{marginTop:10,fontSize:12}}>📝 <DynText>Notes:</DynText> <DynText>{client.notes}</DynText></div>}
        </div>
      </div>
      <div className="card">
        <div className="card-hdr"><div className="card-title">📋 <DynText>Transactions Log</DynText></div></div>
        {client.transactions.length===0?<div className="empty"><div className="empty-icon">📋</div><div className="empty-txt"><DynText>No transactions</DynText></div></div>:
          <table><thead><tr><th><DynText>Date</DynText></th><th><DynText>Product / Type</DynText></th><th><DynText>Quantity</DynText></th><th><DynText>Unit Price</DynText></th><th><DynText>Total</DynText></th><th><DynText>Paid</DynText></th><th><DynText>Remaining</DynText></th></tr></thead>
            <tbody>{[...client.transactions].sort((a,b)=>b.date.localeCompare(a.date)).map((t,i)=>(
              <tr key={i}><td className="tmt">{fmtD(t.date)}</td><td><DynText>{t.product||t.type}</DynText></td>
                <td>{t.quantity?`${fmt(t.quantity)} `:''}{t.quantity?<DynText>{t.unit}</DynText>:'-'}</td>
                <td className="ts">{t.price ? fmt(t.price) : '-'}</td>
                <td className="t-gold fw7">{fmt(t.total)} <DynText>{currency}</DynText></td>
                <td className="t-ok">{fmt(t.paid)} <DynText>{currency}</DynText></td>
                <td className={t.remaining>0?'t-err':'t-ok'}>{fmt(t.remaining)} <DynText>{currency}</DynText></td></tr>
            ))}</tbody></table>}
      </div>
      {cp.pay && <Modal open={showPay} onClose={()=>setShowPay(false)} title="💰 Record Payment"
        footer={<><button className="btn btn-s" onClick={handlePay}>✅ <DynText>Save</DynText></button><button className="btn btn-g" onClick={()=>setShowPay(false)}><DynText>Cancel</DynText></button></>}>
        <div className="form-grid">
          <FormField label="Date"><input type="date" className="fi" value={payForm.date} onChange={e=>setPayForm(f=>({...f,date:e.target.value}))} /></FormField>
          <FormField label={`Amount (${currency})`}><input type="number" min="0" className="fi" placeholder="0" value={payForm.amount} onChange={e=>setPayForm(f=>({...f,amount:e.target.value}))} /></FormField>
        </div>
        <div className="tmt ts mt3"><DynText>Owed by</DynText> {client.name}: <span className="t-err fw7">{fmt(client.remaining)} <DynText>{currency}</DynText></span></div>
      </Modal>}
      
      {/* Print Ledger View */}
      {printClient && (
        <div className="print-only inv-paper">
          <div className="inv-header">
            <div className="inv-logo-area">
              {data.companyInfo.logo && <img src={data.companyInfo.logo} alt="Company Logo" style={{maxHeight:80,maxWidth:180,objectFit:'contain',marginBottom:10}} />}
              <div className="inv-title"><DynText>{data.companyInfo.name}</DynText></div>
              <div className="inv-sub"><DynText>Client Statement Report</DynText></div>
            </div>
            <div className="inv-meta">
              <div className="inv-label"><DynText>Report Date</DynText></div>
              <div className="inv-val">{fmtD(today())}</div>
            </div>
          </div>

          <div className="inv-grid">
            <div className="inv-box">
              <div className="inv-box-hdr"><DynText>Client Information</DynText></div>
            <div style={{fontWeight:'bold',fontSize:16}}>{printClient.name}</div>
              <div>{printClient.phone}</div>
              <div><DynText>{printClient.city}</DynText></div>
            </div>
            <div className="inv-box">
              <div className="inv-box-hdr"><DynText>Account Summary</DynText></div>
              <div className="fb" style={{marginBottom:5}}><span><DynText>Total Purchases:</DynText></span><b>{fmt(printClient.totalBought)} <DynText>{currency}</DynText></b></div>
              <div className="fb" style={{marginBottom:5}}><span><DynText>Total Paid:</DynText></span><b>{fmt(printClient.totalPaid)} <DynText>{currency}</DynText></b></div>
              <div className="fb" style={{borderTop:'1px solid #ddd',paddingTop:5}}><span><DynText>Current Balance:</DynText></span><b style={{color:'red'}}>{fmt(printClient.remaining)} <DynText>{currency}</DynText></b></div>
            </div>
          </div>

          <div className="inv-box-hdr" style={{marginBottom:10}}><DynText>Transaction Details</DynText></div>
          <table className="inv-table">
            <thead><tr><th><DynText>Date</DynText></th><th><DynText>Description / Operation</DynText></th><th><DynText>Debit</DynText></th><th><DynText>Credit</DynText></th><th><DynText>Balance</DynText></th></tr></thead>
            <tbody>
              {printClient.transactions.map((t, i) => (
                <tr key={i}>
                  <td>{fmtD(t.date)}</td>
              <td><DynText>{t.product ? `Purchase ${t.product} (${fmt(t.quantity)} ${t.unit} × ${fmt(t.price)} ${currency})` : t.type}</DynText></td>
                  <td>{t.total ? fmt(t.total) : '-'}</td>
                  <td>{t.paid ? fmt(t.paid) : '-'}</td>
                  <td style={{fontWeight:'bold'}}>{fmt(t.remaining)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  ) : null;
});

/* ═══════════════════════════════════════════════════════
   WORKERS PAGE
═══════════════════════════════════════════════════════ */
const WorkersPage = memo(function WorkersPage({ data, setData, isAdmin, perms, user, isMobile }) {
  const wp = perms?.workers || {};
  const { t } = useLanguage();
  const currency = data.appLabels?.currency || t('currency');
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [sel, setSel] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showProd, setShowProd] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [nm, setNm] = useState('');
  const [addToInv, setAddToInv] = useState(true);
  const [pf, setPf] = useState({date:today(),category:'',quantity:'',unit:'pcs',unitPrice:''});
  const [payF, setPayF] = useState({date:today(),amount:'',type:'Received'});
  const [errs, setErrs] = useState({});
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [workerFilter, setWorkerFilter] = useState('');
  const [attDate, setAttDate] = useState(today());
  const [prodDateFrom, setProdDateFrom] = useState('');
  const [prodDateTo, setProdDateTo] = useState('');
  
  const list = useMemo(() => {
    return (data.workers || []).filter(w => {
       const matchText = (w.name || '').toLowerCase().includes(deferredSearch.toLowerCase());
       const matchWorker = !workerFilter || w.name === workerFilter;
       return matchText && matchWorker;
    });
  }, [data.workers, deferredSearch, workerFilter]);

  const { currentData, curr, max, next, prev } = usePagination(list, 15);
  const worker = useMemo(() => sel ? data.workers.find(w => w.id === sel) : null, [sel, data.workers]);
  
  const filteredRecords = useMemo(() => {
    if (!worker) return [];
    return worker.records.filter(r => {
      const matchFrom = !prodDateFrom || r.date >= prodDateFrom;
      const matchTo = !prodDateTo || r.date <= prodDateTo;
      return matchFrom && matchTo;
    });
  }, [worker, prodDateFrom, prodDateTo]);

  const workerAttendanceData = useMemo(() => {
    if (!worker) return [];
    const days = [];
    for (let i = 14; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const status = data.attendance?.[dateStr]?.[worker.id];
      days.push({
        name: dateStr.slice(5),
        date: dateStr,
        Present: status === 'present' ? 1 : 0,
        Absent: status === 'absent' ? 1 : 0
      });
    }
    return days;
  }, [data.attendance, worker]);

  const exportWorkerRecords = () => {
    const esc = v => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    let s = `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Production Log"><Table>`;
    s += `<Row><Cell><Data ss:Type="String">Date</Data></Cell><Cell><Data ss:Type="String">Item</Data></Cell><Cell><Data ss:Type="String">Quantity</Data></Cell><Cell><Data ss:Type="String">Unit</Data></Cell><Cell><Data ss:Type="String">Unit Price</Data></Cell><Cell><Data ss:Type="String">Total</Data></Cell></Row>`;
    filteredRecords.forEach(r => {
      s += `<Row><Cell><Data ss:Type="String">${r.date}</Data></Cell><Cell><Data ss:Type="String">${esc(r.category)}</Data></Cell><Cell><Data ss:Type="Number">${r.quantity}</Data></Cell><Cell><Data ss:Type="String">${esc(r.unit)}</Data></Cell><Cell><Data ss:Type="Number">${r.unitPrice}</Data></Cell><Cell><Data ss:Type="Number">${r.total}</Data></Cell></Row>`;
    });
    s += `</Table></Worksheet></Workbook>`;
    const blob = new Blob(['\uFEFF' + s], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `Production_${worker.name.replace(/\s+/g, '_')}_${today()}.xls`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (sel && !worker) setSel(null);
  }, [sel, worker]);

  const handleAddW = () => {
    if (!nm.trim()){toast.error('Enter worker name');return;}
    if (data.workers.some(w=>w.name===nm.trim())){toast.error('A worker with this name exists');return;}
    setData(d=>({...d,
      workers:[...d.workers,{id:Date.now() + Math.floor(Math.random()*1000),name:nm.trim(),totalEarned:0,received:0,advance:0,remaining:0,records:[]}],
      auditLog: [createLog(user, 'Add Worker', `Add worker ${nm}`), ...d.auditLog].slice(0, 100)
    }));
    toast.success('Worker added 👷');
    setShowAdd(false);setNm('');
  };
  const handleProd = () => {
    const e=validate({category:{required:true},quantity:{positive:true},unitPrice:{positive:true}},pf);
    if (Object.keys(e).length){setErrs(e);return;}
    const qty=n(pf.quantity),up=n(pf.unitPrice),total=qty*up;
    const isInvItem = (data.inventory?.items || []).some(i => i.name === pf.category);
    setData(d=>({...d,
      workers:d.workers.map(w=>w.id===sel?{...w,totalEarned:w.totalEarned+total,remaining:w.remaining+total,records:[...(w.records || []),{...pf,quantity:qty,unitPrice:up,total,addedToInv:addToInv&&isInvItem}]}:w),
      inventory: (addToInv && isInvItem) ? { ...d.inventory, items: (d.inventory?.items || []).map(i => i.name === pf.category ? {...i, quantity: i.quantity + qty} : i), log: [{id: Date.now(), date:new Date().toISOString(), action:`Worker production (${worker.name})`, amount:qty, user:user?.name || 'System'}, ...(d.inventory.log||[])].slice(0,50) } : d.inventory,
      auditLog: [createLog(user, 'Log Production', `Production of ${fmt(qty)} ${pf.unit} for ${worker.name}`), ...d.auditLog].slice(0, 100)
    }));
    toast.success(addToInv && isInvItem ? 'Production logged and added to inventory ✅' : 'Production logged ✅');
    setShowProd(false);setPf({date:today(),category:'',quantity:'',unit:'pcs',unitPrice:''});setErrs({});
  };
  const handlePay = () => {
    const amt=n(payF.amount);
    if (amt<=0){toast.error('Enter a valid amount');return;}
    // Advance Limit Check (e.g., max 50% of remaining)
    if (payF.type === 'Advance' && amt > worker.remaining * 0.8 && !isAdmin) {
      toast.error('⛔ Advance exceeds the allowed limit (80% of remaining)'); return;
    }
    setData(d=>({...d,workers:d.workers.map(w=>w.id===sel?{...w,received:payF.type==='Received'?w.received+amt:w.received,advance:payF.type==='Advance'?w.advance+amt:w.advance,remaining:w.remaining-amt}:w),
      auditLog: [createLog(user, 'Cash Payout', `Pay ${fmt(amt)} ${currency} (${payF.type}) to worker ${worker.name}`), ...d.auditLog].slice(0, 100)
    }));
    toast.success(`Paid ${fmt(amt)} ${currency} to worker`);
    setShowPay(false);setPayF({date:today(),amount:'',type:'Received'});
  };
  const handleDeleteWorker = async w => {
    // Prevent deleting a worker who has dues or advances
    if (Math.abs(w.remaining) > 0.01) { toast.error('❌ Cannot delete a worker with an open account. Settle the account first.'); return; }
    const ok=await confirm('Delete Worker',`"${w.name}" will be deleted.`);
    if (!ok) return;
    setData(d=>({...d,
      workers:d.workers.filter(x=>x.id!==w.id),
      auditLog: [createLog(user, 'Delete Worker', `Delete worker ${w.name}`), ...d.auditLog].slice(0, 100)
    }));
    if (sel===w.id) setSel(null);
    toast.success('Worker deleted');
  };
  const toggleAtt = (wid) => {
    const d = attDate;
    const old = data.attendance[d]?.[wid];
    const newVal = old==='present'?'absent':'present';
    setData(prev=>({...prev, attendance:{...prev.attendance, [d]:{...(prev.attendance[d]||{}), [wid]:newVal}}}));
  };
  if (!sel) return (
    <div className="page">
      {dialog}
      {!wp.add && !wp.del && !wp.pay && <ReadOnlyBanner />}
      <div className="stats-grid">
        <StatCard c="blue" icon="👷" label="Workers Count"        value={data.workers.length} />
        <StatCard c="gold" icon="💵" label="Total Receivables" value={<>{fmt(data.workers.reduce((s,w)=>s+w.totalEarned,0))} <DynText>{currency}</DynText></>} />
        <StatCard c="em"   icon="✅" label="Paid"            value={<>{fmt(data.workers.reduce((s,w)=>s+(w.received||0)+(w.advance||0),0))} <DynText>{currency}</DynText></>} />
        <StatCard c="rose" icon="⏳" label="Remaining"            value={<>{fmt(data.workers.reduce((s,w)=>s+w.remaining,0))} <DynText>{currency}</DynText></>} />
      </div>
      <MiniChartCard title="Workers by Remaining Dues" icon="⏳" color="#f59e0b" data={[...data.workers].sort((a,b)=>(b.remaining||0)-(a.remaining||0)).slice(0,8).map(w=>({name:w.name,value:w.remaining||0}))} />
      <div className="card">
        <div className="card-hdr"><div className="card-title">📊 <DynText>Worker Attendance (Last 15 Days)</DynText></div></div>
        <div style={{ height: 200, padding: '20px 15px 10px 0', direction: 'ltr' }}>
          <ResponsiveContainer width="99%" height="100%" minWidth={10} minHeight={10} initialDimension={{ width: 10, height: 10 }}>
            <BarChart data={workerAttendanceData} margin={{ top: 10, right: 10, left: -30, bottom: 0 }}>
              <XAxis dataKey="name" stroke="var(--tm)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--tm)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => v===1?'✓':''} domain={[0, 1]} ticks={[0, 1]} />
              <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ background: 'var(--glass)', borderColor: 'var(--border)', borderRadius: 12, color: 'var(--tp)' }} formatter={(value, name, props) => [value === 1 ? 'Yes' : 'No', name]} />
              <Bar dataKey="Present" stackId="a" fill="var(--em-l)" radius={[4, 4, 4, 4]} barSize={15} />
              <Bar dataKey="Absent" stackId="a" fill="var(--rose-l)" radius={[4, 4, 4, 4]} barSize={15} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="card">
        <div className="card-hdr">
          <div className="card-title">👷 <DynText>Factory Workers</DynText></div>
          <div className="card-actions">
            <div style={{display:'flex', alignItems:'center', gap:8}}>
              <input type="date" className="fi" style={{width:130, padding:'6px'}} value={attDate} onChange={e=>setAttDate(e.target.value)} title="Attendance date" />
            </div>
            <div style={{width:160}}>
              <SearchableSelect
                options={[{value:'', label:'All Workers'}, ...(data.workers || []).map(w=>({value: w.name, label: w.name}))]}
                value={workerFilter}
                placeholder="All workers"
                onChange={e=>setWorkerFilter(e.target.value)}
              />
            </div>
            <div className="search-box"><span className="search-icon">🔍</span><input aria-label="Search workers" className="fi" placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} style={{width:130}} /></div>
            {(search||workerFilter) && <button className="btn btn-g btn-icon" onClick={()=>{setSearch(''); setWorkerFilter('');}} title="Clear filters">✕</button>}
            {wp.add&&<button className="btn btn-p" onClick={()=>setShowAdd(true)}>+ <DynText>Add Worker</DynText></button>}
          </div>
        </div>
        <table><thead><tr><th><DynText>Name</DynText></th><th><DynText>Attendance</DynText></th><th><DynText>Earned</DynText></th><th><DynText>Received</DynText></th><th><DynText>Advances</DynText></th><th><DynText>Remaining</DynText></th><th aria-label="Actions"></th></tr></thead>
          <tbody>
            {currentData.length===0?<tr><td colSpan={6}><div className="empty"><div className="empty-icon">👷</div><div className="empty-txt"><DynText>No workers added</DynText></div></div></td></tr>
              :currentData.map(w=>(
                <tr key={w.id}><td className="fw7"><DynText>{w.name}</DynText></td>
                  <td><button className={"btn btn-sm "+(data.attendance[attDate]?.[w.id]==='present'?'btn-s':'btn-g')} onClick={()=>toggleAtt(w.id)}><DynText>{data.attendance[attDate]?.[w.id]==='present'?'✅ Present':'Absent'}</DynText></button></td>
                  <td className="t-gold fw7">{fmt(w.totalEarned)} <DynText>{currency}</DynText></td>
                  <td className="t-ok">{fmt(w.received)} <DynText>{currency}</DynText></td><td><span className="badge b-warn">{fmt(w.advance)} <DynText>{currency}</DynText></span></td>
                  <td className={w.remaining>0?'t-err':'t-ok'}>{fmt(w.remaining)} <DynText>{currency}</DynText></td>
                  <td><div style={{display:'flex',gap:4}}>
                    <button className="btn btn-g btn-sm" onClick={()=>setSel(w.id)}><DynText>View</DynText></button>
                    {wp.del&&<button className="btn btn-d btn-sm" onClick={()=>handleDeleteWorker(w)}>🗑</button>}
                  </div></td>
                </tr>
              ))}
          </tbody></table>
          <PaginationControl curr={curr} max={max} next={next} prev={prev} />
      </div>
      {isMobile && wp.add && <button className="fab" onClick={()=>setShowAdd(true)}>+</button>}
      {wp.add && <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="➕ Add Worker"
        footer={<><button className="btn btn-p" onClick={handleAddW}>✅ <DynText>Add</DynText></button><button className="btn btn-g" onClick={()=>setShowAdd(false)}><DynText>Cancel</DynText></button></>}>
        <div className="fg"><label className="fl">Worker Name *</label><input id="workerName" name="workerName" className="fi" placeholder="Full name" value={nm} onChange={e=>setNm(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleAddW()} /></div>
      </Modal>}
    </div>
  );
  return worker ? (
    <div className="page">
      {dialog}
      <div className="card" style={{marginBottom:18}}>
        <div className="detail-hdr">
          <button className="btn btn-g btn-sm" onClick={()=>setSel(null)}>← Back</button>
          <div className="detail-av" style={{background:'linear-gradient(135deg,var(--orange),var(--gold))'}}>👷</div>
          <div><div style={{fontSize:17,fontWeight:800}}><DynText>{worker.name}</DynText></div><div className="tmt txs"><DynText>Production Worker</DynText></div></div>
          <div style={{marginRight:'auto',display:'flex',gap:8}}>
            {wp.pay&&<><button className="btn btn-p btn-sm" onClick={()=>{setErrs({});setShowProd(true);}}>+ <DynText>Production</DynText></button><button className="btn btn-gold btn-sm" onClick={()=>setShowPay(true)}>💰 <DynText>Pay</DynText></button></>}
          </div>
        </div>
        <div className="stats-grid" style={{padding:'16px 18px 0'}}>
          <StatCard c="gold" icon="💵" label="Total Due" value={<>{fmt(worker.totalEarned)} <DynText>{currency}</DynText></>} />
          <StatCard c="em"   icon="✅" label="Received"          value={<>{fmt(worker.received)} <DynText>{currency}</DynText></>} />
          <StatCard c="vio"  icon="💳" label="Advances"            value={<>{fmt(worker.advance)} <DynText>{currency}</DynText></>} />
          <StatCard c="rose" icon="⏳" label="Remaining"           value={<>{fmt(worker.remaining)} <DynText>{currency}</DynText></>} />
        </div>
      </div>
      <div className="card">
        <div className="card-hdr">
          <div className="card-title">📋 <DynText>Production Log</DynText></div>
          <div className="card-actions">
            <input type="date" className="fi" style={{width:130,padding:'6px'}} value={prodDateFrom} onChange={e=>setProdDateFrom(e.target.value)} title="From date" />
            <span style={{color:'var(--tm)'}}>←</span>
            <input type="date" className="fi" style={{width:130,padding:'6px'}} value={prodDateTo} onChange={e=>setProdDateTo(e.target.value)} title="To date" />
            {(prodDateFrom||prodDateTo) && <button className="btn btn-g btn-icon" onClick={()=>{setProdDateFrom(''); setProdDateTo('');}} title="Clear filters">✕</button>}
            <button className="btn btn-s btn-sm" onClick={exportWorkerRecords}>⬇ <DynText>Export Excel</DynText></button>
          </div>
        </div>
        {filteredRecords.length===0?<div className="empty"><div className="empty-icon">📋</div><div className="empty-txt"><DynText>No records</DynText></div></div>:
          <table><thead><tr><th><DynText>Date</DynText></th><th><DynText>Category</DynText></th><th><DynText>Quantity</DynText></th><th><DynText>Unit Price</DynText></th><th><DynText>Total</DynText></th>{wp.del && <th><DynText>Actions</DynText></th>}</tr></thead>
            <tbody>{filteredRecords.map((r,i)=>(
              <tr key={i}><td className="tmt">{fmtD(r.date)}</td><td><DynText>{r.category}</DynText></td><td>{fmt(r.quantity)} <DynText>{r.unit}</DynText></td><td>{fmt(r.unitPrice)} <DynText>{currency}</DynText></td><td className="t-gold fw7">{fmt(r.total)} <DynText>{currency}</DynText></td>
                {wp.del && <td>
                  <button className="btn btn-d btn-sm btn-icon" onClick={async () => {
                    if (!await confirm('Delete Production Record', `Delete record of ${fmt(r.total)} ${currency}?`)) return;
                    const isInvItem = (data.inventory?.items || []).some(it => it.name === r.category);
                    const realIdx = worker.records.indexOf(r);
                    setData(d => ({
                      ...d, 
                      workers: d.workers.map(w => w.id === sel ? {...w, totalEarned: w.totalEarned - r.total, remaining: w.remaining - r.total, records: w.records.filter((_, idx) => idx !== realIdx)} : w), 
                      inventory: (r.addedToInv && isInvItem) ? { ...d.inventory, items: (d.inventory?.items || []).map(it => it.name === r.category ? {...it, quantity: it.quantity - r.quantity} : it), log: [{id: Date.now(), date:new Date().toISOString(), action:`Delete production (${worker.name})`, amount:-r.quantity, user:user?.name || 'System'}, ...(d.inventory.log||[])].slice(0,50) } : d.inventory,
                      auditLog: [createLog(user, 'Delete Production', `Delete production record for ${worker.name}`), ...d.auditLog].slice(0, 100)
                    }));
                    toast.success('Deleted');
                  }}>🗑</button>
                </td>}
              </tr>
            ))}</tbody></table>}
      </div>
      {wp.pay && <Modal open={showProd} onClose={()=>setShowProd(false)} title="➕ Add Production"
          footer={<><button className="btn btn-p" onClick={handleProd}>✅ <DynText>Save</DynText></button><button className="btn btn-g" onClick={()=>setShowProd(false)}><DynText>Cancel</DynText></button></>}>
          <div className="form-grid">
            <FormField label="Date"><input type="date" className="fi" value={pf.date} onChange={e=>setPf(f=>({...f,date:e.target.value}))} /></FormField>
            <FormField label="Category *" error={errs.category}>
               <div style={{display:'flex',gap:8}}>
                  <SearchableSelect
                     options={(data.inventory?.items || []).map(i=>i.name)}
                     value={pf.category}
                     placeholder="Select product..."
                     error={errs.category}
                     onChange={e=>{
                        const itm = (data.inventory?.items || []).find(i=>i.name===e.target.value);
                        setPf(f=>({...f,category:e.target.value, unit: itm ? itm.unit : 'pcs'}));
                        setErrs(v=>({...v,category:''}));
                     }}
                  />
               </div>
            </FormField>
            <FormField label="Quantity *" error={errs.quantity}><input type="number" min="0" className={`fi${errs.quantity?' fi-err':''}`} value={pf.quantity} onChange={e=>{setPf(f=>({...f,quantity:e.target.value}));setErrs(v=>({...v,quantity:''}));}} /></FormField>
          <FormField label="Unit"><select className="fi" value={pf.unit} onChange={e=>setPf(f=>({...f,unit:e.target.value}))}><option value="pcs"><DynText>count</DynText></option><option value="kg"><DynText>kg</DynText></option><option value="ton"><DynText>ton</DynText></option></select></FormField>
            <FormField label={`Unit Price (${currency}) *`} error={errs.unitPrice}><input type="number" min="0" className={`fi${errs.unitPrice?' fi-err':''}`} value={pf.unitPrice} onChange={e=>{setPf(f=>({...f,unitPrice:e.target.value}));setErrs(v=>({...v,unitPrice:''}));}} /></FormField>
            <FormField label="Add to Inventory" full>
              <div style={{display:'flex', alignItems:'center', gap:8, marginTop:5}}>
                <input type="checkbox" id="add-inv" name="addToInv" checked={addToInv} onChange={e=>setAddToInv(e.target.checked)} style={{width:16,height:16,accentColor:'var(--bright)'}} />
                <span style={{fontSize:12,cursor:'pointer',color:'var(--ts)'}}><DynText>Auto-add produced quantity to inventory</DynText></span>
              </div>
            </FormField>
          </div>
          {pf.quantity&&pf.unitPrice&&<SumBox><div className="fb ts"><span className="tmt"><DynText>Total:</DynText></span><span className="t-gold fw7">{fmt(n(pf.quantity)*n(pf.unitPrice))} <DynText>{currency}</DynText></span></div></SumBox>}
        </Modal>}
      {wp.pay && <Modal open={showPay} onClose={()=>setShowPay(false)} title="💰 Pay Worker"
          footer={<><button className="btn btn-s" onClick={handlePay}>✅ <DynText>Save</DynText></button><button className="btn btn-g" onClick={()=>setShowPay(false)}><DynText>Cancel</DynText></button></>}>
          <div className="form-grid">
            <FormField label="Date"><input type="date" className="fi" value={payF.date} onChange={e=>setPayF(f=>({...f,date:e.target.value}))} /></FormField>
            <FormField label="Type"><select className="fi" value={payF.type} onChange={e=>setPayF(f=>({...f,type:e.target.value}))}><option value="Received"><DynText>Received</DynText></option><option value="Advance"><DynText>Advance</DynText></option></select></FormField>
            <FormField label={`Amount (${currency})`}><input type="number" min="0" className="fi" value={payF.amount} onChange={e=>setPayF(f=>({...f,amount:e.target.value}))} /></FormField>
          </div>
          <div className="tmt ts mt3"><DynText>Owed to</DynText> <DynText>{worker.name}</DynText>: <span className="t-err fw7">{fmt(worker.remaining)} <DynText>{currency}</DynText></span></div>
        </Modal>}
    </div>
  ) : null;
});

/* ═══════════════════════════════════════════════════════
   SUPPLIERS PAGE
═══════════════════════════════════════════════════════ */
const SuppliersPage = memo(function SuppliersPage({ data, setData, isAdmin, perms, user, isMobile }) {
  const supp = perms?.suppliers || {};
  const { t } = useLanguage();
  const currency = data.appLabels?.currency || t('currency');
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [sel, setSel] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [showEditPay, setShowEditPay] = useState(false);
  const [editPayData, setEditPayData] = useState(null);
  const [editPayF, setEditPayF] = useState({date:'', amount:'', notes:''});
  const [printSupplier, setPrintSupplier] = useState(null);
  const [printAction, setPrintAction] = useState(null);
  const [form, setForm] = useState({name:'',phone:'',city:'',notes:''});
  const [errs, setErrs] = useState({});
  const [payF, setPayF] = useState({date:today(),amount:''});
  
  const { currentData, curr, max, next, prev } = usePagination(data.suppliers, 15);
  const supplier = useMemo(() => sel ? data.suppliers.find(s => s.id === sel) : null, [sel, data.suppliers]);

  const supplierChartData = useMemo(() => {
    if (!supplier) return [];
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthStr = d.toISOString().slice(0, 7);
      const monthName = d.toLocaleDateString(_l(), { month: 'short' }) + ' ' + d.getFullYear().toString().slice(-2);
      let monthSupplied = 0; let monthPaid = 0;
      (supplier.records || []).forEach(r => {
        if (r.date && r.date.startsWith(monthStr)) {
          if (r.total) monthSupplied += r.total;
          if (r.paid) monthPaid += r.paid;
        }
      });
      (supplier.payments || []).forEach(p => {
        if (p.date && p.date.startsWith(monthStr)) {
          if (p.amount) monthPaid += p.amount;
        }
      });
      months.push({ name: monthName, Supplies: monthSupplied, Payments: monthPaid });
    }
    return months;
  }, [supplier]);
  
  useEffect(() => {
    if (sel && !supplier) setSel(null);
  }, [sel, supplier]);

  // Print Effect
  useEffect(() => {
    if (printSupplier && printAction === 'print') {
      const handleAfterPrint = () => { setPrintSupplier(null); setPrintAction(null); };
      window.addEventListener("afterprint", handleAfterPrint);
      const timer = setTimeout(() => window.print(), 500);
      return () => { window.removeEventListener("afterprint", handleAfterPrint); clearTimeout(timer); };
    }
  }, [printSupplier, printAction]);
  
  const handleAdd = () => {
    const e=validate({name:{required:true}},form);
    if (Object.keys(e).length){setErrs(e);return;}
    if (data.suppliers.some(s=>s.name===form.name.trim())){toast.error('A supplier with this name exists');return;}
    setData(d=>({...d,
      suppliers:[...d.suppliers,{id:Date.now() + Math.floor(Math.random()*1000),...form,name:form.name.trim(),totalSupplied:0,totalPaid:0,remaining:0,payments:[],records:[]}],
      auditLog: [createLog(user, 'Add Supplier', `Add supplier ${form.name}`), ...d.auditLog].slice(0, 100)
    }));
    toast.success('Supplier added 🏪');
    setShowAdd(false);setForm({name:'',phone:'',city:'',notes:''});setErrs({});
  };
  const handlePay = () => {
    const amt=n(payF.amount);
    if (amt<=0){toast.error('Enter a valid amount');return;}
    setData(d=>({...d,
      suppliers:d.suppliers.map(s=>s.id===sel?{...s,totalPaid:s.totalPaid+amt,remaining:s.remaining-amt,payments:[...(s.payments||[]), {id: Date.now() + Math.floor(Math.random()*1000), date: payF.date, amount: amt, notes: 'Cash Payment'}]}:s),
      auditLog: [createLog(user, 'Pay Supplier', `Pay ${fmt(amt)} ${currency} to supplier ${supplier.name}`), ...d.auditLog].slice(0, 100)
    }));
    toast.success(`Payment of ${fmt(amt)} ${currency} to supplier recorded 💰`);
    setShowPay(false);setPayF({date:today(),amount:''});
  };
  const handleDeletePay = async (pay) => {
    const ok = await confirm('Delete Payment', `Delete payment of ${fmt(pay.amount)} ${currency}? The balance will be adjusted.`);
    if (!ok) return;
    setData(d => ({
      ...d,
      suppliers: d.suppliers.map(s => s.id === sel ? {
        ...s,
        totalPaid: s.totalPaid - pay.amount,
        remaining: s.remaining + pay.amount,
        payments: (s.payments || []).filter(p => p.id !== pay.id)
      } : s),
      auditLog: [createLog(user, 'Delete Payment', `Delete payment ${fmt(pay.amount)} to supplier ${supplier.name}`), ...d.auditLog].slice(0, 100)
    }));
    toast.success('Payment deleted and balance updated');
  };
  const handleSaveEditPay = () => {
    const amt = n(editPayF.amount);
    if (amt <= 0) { toast.error('Enter a valid amount'); return; }
    const diff = amt - editPayData.amount;
    setData(d => ({
      ...d,
      suppliers: d.suppliers.map(s => s.id === sel ? {
        ...s, totalPaid: s.totalPaid + diff, remaining: s.remaining - diff,
        payments: (s.payments || []).map(p => p.id === editPayData.id ? { ...p, ...editPayF, amount: amt } : p)
      } : s),
      auditLog: [createLog(user, 'Edit Payment', `Edit payment to supplier ${supplier.name}`), ...d.auditLog].slice(0, 100)
    }));
    toast.success('Payment updated'); setShowEditPay(false);
  };
  const handleClearAccount = async () => {
    const amount = supplier.remaining;
    if (Math.abs(amount) < 0.01) { toast.info('Account already settled'); return; }
    const isOwedToUs = amount < 0;
    const absAmount = Math.abs(amount);
    const actionName = isOwedToUs ? 'Settle Credit Balance (Us)' : 'Settle Account (Final)';
    const confirmMsg = isOwedToUs 
      ? `The supplier has a credit balance (ours) of ${fmt(absAmount)} ${currency}. The account will be settled.`
      : `A payment of ${fmt(absAmount)} ${currency} will be recorded to settle the supplier account.`;
    const ok = await confirm('Settle Account', confirmMsg);
    if (!ok) return;
    setData(d => ({
      ...d,
      suppliers: d.suppliers.map(s => s.id === sel ? {
        ...s, totalPaid: s.totalPaid + amount, remaining: 0,
        payments: [...(s.payments||[]), {id: Date.now() + Math.floor(Math.random()*1000), date: today(), amount: amount, notes: actionName}]
      } : s),
      auditLog: [createLog(user, 'Settle Account', `Settle supplier account ${supplier.name}`), ...d.auditLog].slice(0, 100)
    }));
    toast.success('Account settled ✅');
  };
  const handleDeleteSupplier = async s => {
    // Prevent deleting a supplier with an open balance
    if (Math.abs(s.remaining) > 0.01) { toast.error('❌ Cannot delete a supplier with an open account. Settle the account first.'); return; }
    const ok=await confirm('Delete Supplier',`"${s.name}" will be permanently deleted.`);
    if (!ok) return;
    setData(d=>({...d,
      suppliers:d.suppliers.filter(x=>x.id!==s.id),
      auditLog: [createLog(user, 'Delete Supplier', `Delete supplier ${s.name}`), ...d.auditLog].slice(0, 100)
    }));
    if (sel===s.id) setSel(null);
    toast.success('Supplier deleted');
  };

  const supplyRecs = useMemo(() => supplier ? data.incoming.filter(r => r.supplier === supplier.name).sort((a,b)=>b.date.localeCompare(a.date)) : [], [data.incoming, supplier]);
  const payRecs = useMemo(() => supplier ? [...(supplier.payments || [])].sort((a,b)=>b.date.localeCompare(a.date)) : [], [supplier]);

  if (!sel) return (
    <div className="page">
      {dialog}
      {!supp.add && !supp.del && !supp.pay && <ReadOnlyBanner />}
      <div className="stats-grid">
        <StatCard c="vio"  icon="🏪" label="Suppliers Count"      value={data.suppliers.length} />
        <StatCard c="gold" icon="💵" label="Total Supplies"  value={<>{fmt(data.suppliers.reduce((s,sp)=>s+sp.totalSupplied,0))} <DynText>{currency}</DynText></>} />
        <StatCard c="em"   icon="✅" label="Paid to Suppliers"  value={<>{fmt(data.suppliers.reduce((s,sp)=>s+sp.totalPaid,0))} <DynText>{currency}</DynText></>} />
        <StatCard c="rose" icon="⏳" label="Supplier Debt"  value={<>{fmt(data.suppliers.reduce((s,sp)=>s+sp.remaining,0))} <DynText>{currency}</DynText></>} />
      </div>
      <div className="dgrid">
        <MiniChartCard title="Top Supplier Debt" icon="⏳" color="#7c3aed" data={[...data.suppliers].sort((a,b)=>(b.remaining||0)-(a.remaining||0)).slice(0,7).map(s=>({name:s.name,value:s.remaining||0}))} />
        <MiniChartCard title="Suppliers by Volume" icon="📦" type="donut" data={[...data.suppliers].sort((a,b)=>(b.totalSupplied||0)-(a.totalSupplied||0)).slice(0,6).map(s=>({name:s.name,value:s.totalSupplied||0}))} />
      </div>
      <div className="card">
        <div className="card-hdr"><div className="card-title">🏪 <DynText>Suppliers</DynText></div>{supp.add&&<button className="btn btn-p" onClick={()=>{setForm({name:'',phone:'',city:''});setErrs({});setShowAdd(true);}}>+ <DynText>New Supplier</DynText></button>}</div>
        <table><thead><tr><th><DynText>Name</DynText></th><th><DynText>Phone</DynText></th><th><DynText>City</DynText></th><th><DynText>Supplied</DynText></th><th><DynText>Paid</DynText></th><th><DynText>Remaining</DynText></th><th aria-label="Actions"></th></tr></thead>
          <tbody>
            {currentData.length===0?<tr><td colSpan={7}><div className="empty"><div className="empty-icon">🏪</div><div className="empty-txt"><DynText>No suppliers added</DynText></div></div></td></tr>
              :currentData.map(s=>(
                <tr key={s.id}>
                  <td className="fw7"><DynText>{s.name}</DynText> <span style={{fontSize:9}}>{s.totalSupplied > 100000 ? '⭐⭐⭐' : s.totalSupplied > 50000 ? '⭐⭐' : '⭐'}</span></td>
                  <td className="tmt">{s.phone}</td><td className="tmt"><DynText>{s.city}</DynText></td>
                  <td className="t-gold fw7">{fmt(s.totalSupplied)} <DynText>{currency}</DynText></td><td className="t-ok">{fmt(s.totalPaid)} <DynText>{currency}</DynText></td>
                  <td className={s.remaining>0?'t-err':'t-ok'}>{fmt(s.remaining)} <DynText>{currency}</DynText></td>
                  <td><div style={{display:'flex',gap:4}}>
                    <button className="btn btn-g btn-sm" title="Statement / Invoice" onClick={()=>window.dispatchEvent(new CustomEvent("nx-print-doc",{detail:{kind:"supplier",rec:s}}))}>🧾</button>
                    <button className="btn btn-s btn-sm" title="WhatsApp" onClick={()=>{const co=data.companyInfo||{};const msg=`${co.name||''} - Account Statement\n${s.name}\nSupplied: ${fmt(s.totalSupplied)} ${currency}\nPaid: ${fmt(s.totalPaid)} ${currency}\nBalance: ${fmt(s.remaining)} ${currency}`;window.open(`https://wa.me/${String(s.phone||'').replace(/[^\d]/g,'')}?text=${encodeURIComponent(msg)}`,'_blank');}}>📱</button>
                    <button className="btn btn-g btn-sm" onClick={()=>setSel(s.id)}><DynText>View</DynText></button>
                    {supp.del&&<button className="btn btn-d btn-sm" onClick={()=>handleDeleteSupplier(s)}>🗑</button>}
                  </div></td>
                </tr>
              ))}
          </tbody></table>
          <PaginationControl curr={curr} max={max} next={next} prev={prev} />
      </div>
      {isMobile && supp.add && <button className="fab" onClick={()=>{setForm({name:'',phone:'',city:''});setErrs({});setShowAdd(true);}}>+</button>}
      {supp.add && <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="➕ Add New Supplier"
        footer={<><button className="btn btn-p" onClick={handleAdd}>✅ <DynText>Add</DynText></button><button className="btn btn-g" onClick={()=>setShowAdd(false)}><DynText>Cancel</DynText></button></>}>
        <div className="form-grid">
          <FormField label="Supplier Name *" error={errs.name} full><input className={`fi${errs.name?' fi-err':''}`} value={form.name} onChange={e=>{setForm(f=>({...f,name:e.target.value}));setErrs(v=>({...v,name:''}));}} /></FormField>
          <FormField label="Phone"><input className="fi" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} /></FormField>
          <FormField label="City"><input className="fi" value={form.city} onChange={e=>setForm(f=>({...f,city:e.target.value}))} /></FormField>
          <FormField label="Notes"><input className="fi" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} /></FormField>
        </div>
      </Modal>}
    </div>
  );
  
  return supplier ? (
    <div className="page">
      {dialog}
      <div className="card" style={{marginBottom:18}}>
        <div className="detail-hdr">
          <button className="btn btn-g btn-sm" onClick={()=>setSel(null)}>← Back</button>
          <div className="detail-av" style={{background:'linear-gradient(135deg,var(--vio),var(--bright))'}}>🏪</div>
          <div><div style={{fontSize:17,fontWeight:800}}><DynText>{supplier.name}</DynText></div><div className="tmt txs">{supplier.phone} • <DynText>{supplier.city}</DynText></div></div>
          <div style={{marginRight:'auto',display:'flex',gap:6}}>
            <button className="btn btn-g btn-sm" onClick={()=>{setPrintAction('print');setPrintSupplier(supplier);}}>🖨 Print Statement</button>
            <button className="btn btn-s btn-sm" onClick={() => {
              const text = `Hello ${supplier.name},\nAccount statement from ${data.companyInfo.name}:\n- Total supplies: ${fmt(supplier.totalSupplied)} ${currency}\n- Total paid: ${fmt(supplier.totalPaid)} ${currency}\n- Outstanding balance: ${fmt(supplier.remaining)} ${currency}\n\nDate: ${fmtD(today())}`;
            let phone = supplier.phone ? String(supplier.phone).replace(/\D/g, '') : '';
            if (phone.startsWith('00')) phone = phone.substring(2);
            else if (phone.startsWith('0')) phone = '2' + phone;
              const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
              window.open(url, '_blank');
            }}>📱 WhatsApp</button>
            {supp.pay&&<button className="btn btn-p btn-sm" onClick={handleClearAccount}>✨ <DynText>Clear Account</DynText></button>}
            {supp.pay&&<button className="btn btn-gold btn-sm" onClick={()=>setShowPay(true)}>💰 <DynText>Record Payment</DynText></button>}
          </div>
        </div>
        <div className="stats-grid" style={{padding:'16px 18px 0'}}>
          <StatCard c="vio"  icon="📦" label="Total Supplies" value={<>{fmt(supplier.totalSupplied)} <DynText>{currency}</DynText></>} />
          <StatCard c="em"   icon="✅" label="Paid"            value={<>{fmt(supplier.totalPaid)} <DynText>{currency}</DynText></>} />
          <StatCard c="rose" icon="⏳" label="Remaining"            value={<>{fmt(supplier.remaining)} <DynText>{currency}</DynText></>} />
        </div>
        <div className="card">
          <div className="card-hdr"><div className="card-title">📊 <DynText>Supplies & Payments (Last 6 Months)</DynText></div></div>
          <div style={{ height: 200, padding: '20px 15px 10px 0', direction: 'ltr' }}>
            <ResponsiveContainer width="99%" height="100%" minWidth={10} minHeight={10} initialDimension={{ width: 10, height: 10 }}>
              <BarChart data={supplierChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="var(--tm)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--tm)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => val > 0 ? `${val/1000}k` : 0} />
                <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ background: 'var(--glass)', borderColor: 'var(--border)', borderRadius: 12, color: 'var(--tp)' }} itemStyle={{fontWeight: 'bold'}} />
                <Legend wrapperStyle={{fontSize: 12}} />
                <Bar dataKey="Supplies" fill="var(--vio-l)" radius={[4, 4, 0, 0]} barSize={15} />
                <Bar dataKey="Payments" fill="var(--em-l)" radius={[4, 4, 0, 0]} barSize={15} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        {supplier.notes && <div style={{padding:'0 20px 14px',fontSize:12,color:'var(--tm)'}}>📝 <DynText>{supplier.notes}</DynText></div>}
      </div>
      <div className="card">
        <div className="card-hdr"><div className="card-title">📦 <DynText>Supply Log (Inbound)</DynText></div></div>
        {supplyRecs.length===0?<div className="empty"><div className="empty-icon">📦</div><div className="empty-txt"><DynText>No records</DynText></div></div>:
          <table><thead><tr><th><DynText>Date</DynText></th><th><DynText>Category</DynText></th><th><DynText>Weight</DynText></th><th><DynText>Total</DynText></th><th><DynText>Paid</DynText></th><th><DynText>Remaining</DynText></th></tr></thead>
            <tbody>{supplyRecs.map((r,i)=>(
              <tr key={i}><td className="tmt">{fmtD(r.date)}</td><td><DynText>{r.category}</DynText></td><td>{fmt(r.weight)} <DynText>kg</DynText></td>
                <td className="t-gold fw7">{fmt(r.total)} <DynText>{currency}</DynText></td><td className="t-ok">{fmt(r.paid)} <DynText>{currency}</DynText></td>
                <td className={r.remaining>0?'t-err':'t-ok'}>{fmt(r.remaining)} <DynText>{currency}</DynText></td></tr>
            ))}</tbody></table>}
      </div>
      <div className="card">
        <div className="card-hdr"><div className="card-title">💰 <DynText>Cash Payments Log</DynText></div></div>
        {payRecs.length===0?<div className="empty"><div className="empty-icon">💸</div><div className="empty-txt"><DynText>No cash payments recorded</DynText></div></div>:
          <table><thead><tr><th><DynText>Date</DynText></th><th><DynText>Amount</DynText></th><th><DynText>Notes</DynText></th>{supp.pay&&<th><DynText>Actions</DynText></th>}</tr></thead>
            <tbody>{payRecs.map((r,i)=>(
              <tr key={r.id||i}><td className="tmt">{fmtD(r.date)}</td><td className="t-ok fw7">{fmt(r.amount)} <DynText>{currency}</DynText></td><td className="ts"><DynText>{r.notes||'Cash Payment'}</DynText></td>
                {supp.pay&&<td><div style={{display:'flex',gap:4}}>
                  <button className="btn btn-g btn-sm" onClick={()=>{setEditPayData(r);setEditPayF({date:r.date,amount:r.amount,notes:r.notes||''});setShowEditPay(true);}}>✏️</button>
                  <button className="btn btn-d btn-sm" onClick={()=>handleDeletePay(r)}>🗑</button>
                </div></td>}
              </tr>
            ))}</tbody></table>}
      </div>
      {supp.pay && <Modal open={showPay} onClose={()=>setShowPay(false)} title="💰 Record Supplier Payment"
        footer={<><button className="btn btn-s" onClick={handlePay}>✅ <DynText>Save</DynText></button><button className="btn btn-g" onClick={()=>setShowPay(false)}><DynText>Cancel</DynText></button></>}>
        <div className="form-grid">
          <FormField label="Date"><input type="date" className="fi" value={payF.date} onChange={e=>setPayF(f=>({...f,date:e.target.value}))} /></FormField>
          <FormField label={`Amount (${currency})`}><input type="number" min="0" className="fi" value={payF.amount} onChange={e=>setPayF(f=>({...f,amount:e.target.value}))} /></FormField>
        </div>
        <div className="tmt ts mt3"><DynText>Owed to</DynText> <DynText>{supplier.name}</DynText>: <span className="t-err fw7">{fmt(supplier.remaining)} <DynText>{currency}</DynText></span></div>
      </Modal>}
      {supp.pay && <Modal open={showEditPay} onClose={()=>setShowEditPay(false)} title="✏️ Edit Payment"
        footer={<><button className="btn btn-p" onClick={handleSaveEditPay}>✅ <DynText>Save Changes</DynText></button><button className="btn btn-g" onClick={()=>setShowEditPay(false)}><DynText>Cancel</DynText></button></>}>
        <div className="form-grid">
          <FormField label="Date"><input type="date" className="fi" value={editPayF.date} onChange={e=>setEditPayF(f=>({...f,date:e.target.value}))} /></FormField>
          <FormField label={`Amount (${currency})`}><input type="number" min="0" className="fi" value={editPayF.amount} onChange={e=>setEditPayF(f=>({...f,amount:e.target.value}))} /></FormField>
          <FormField label="Notes"><input className="fi" value={editPayF.notes} onChange={e=>setEditPayF(f=>({...f,notes:e.target.value}))} /></FormField>
        </div>
      </Modal>}
      
      {/* Print Ledger View */}
      {printSupplier && (
        <div className="print-only inv-paper" id="print-supplier-ledger">
          <div className="inv-header">
            <div className="inv-logo-area">
              {data.companyInfo.logo && <img src={data.companyInfo.logo} alt="Company Logo" style={{maxHeight:80,maxWidth:180,objectFit:'contain',marginBottom:10}} />}
              <div className="inv-title"><DynText>{data.companyInfo.name}</DynText></div>
              <div className="inv-sub"><DynText>Supplier Statement Report</DynText></div>
            </div>
            <div className="inv-meta">
              <div className="inv-label"><DynText>Report Date</DynText></div>
              <div className="inv-val">{fmtD(today())}</div>
            </div>
          </div>
          <div className="inv-grid">
            <div className="inv-box">
              <div className="inv-box-hdr"><DynText>Supplier Information</DynText></div>
              <div style={{fontWeight:'bold',fontSize:16}}><DynText>{printSupplier.name}</DynText></div>
              <div>{printSupplier.phone}</div><div>{printSupplier.city}</div>
            </div>
            <div className="inv-box">
              <div className="inv-box-hdr"><DynText>Account Summary</DynText></div>
              <div className="fb" style={{marginBottom:5}}><span><DynText>Total Supplied:</DynText></span><b>{fmt(printSupplier.totalSupplied)} <DynText>{currency}</DynText></b></div>
              <div className="fb" style={{marginBottom:5}}><span><DynText>Total Paid:</DynText></span><b>{fmt(printSupplier.totalPaid)} <DynText>{currency}</DynText></b></div>
              <div className="fb" style={{borderTop:'1px solid #ddd',paddingTop:5}}><span><DynText>Current Balance (Owed):</DynText></span><b style={{color:'red'}}>{fmt(printSupplier.remaining)} <DynText>{currency}</DynText></b></div>
            </div>
          </div>
          <div className="inv-box-hdr" style={{marginBottom:10}}><DynText>Supply & Payment Details</DynText></div>
          <table className="inv-table">
            <thead><tr><th><DynText>Date</DynText></th><th><DynText>Description</DynText></th><th><DynText>Credit</DynText></th><th><DynText>Debit</DynText></th></tr></thead>
            <tbody>
              {[...(printSupplier.records||[]).map(r=>({...r, isRec:true})), ...(printSupplier.payments||[]).map(p=>({...p, isRec:false}))]
                .sort((a,b)=>a.date.localeCompare(b.date))
                .map((t, i) => {
                  const totalDebt = t.isRec ? t.total : 0; const totalPaid = !t.isRec ? t.amount : 0;
                  return (
                <tr key={i}><td>{fmtD(t.date)}</td><td><DynText>{t.isRec ? `Supply ${t.category} (${fmt(t.weight)} kg${t.total ? ` × ${fmt(t.total/t.weight)} ${currency}` : ''})` : (t.notes || 'Cash Payment')}</DynText></td><td>{totalDebt ? fmt(totalDebt) : '-'}</td><td>{totalPaid ? fmt(totalPaid) : '-'}</td></tr>
                  );
              })}
            </tbody>
          </table>
          <div className="inv-footer" style={{marginTop: 30}}>
            <div>{data.companyInfo.footer || `Thank you for your business with ${data.companyInfo.name}`}</div>
            <div style={{marginTop:5}}>Address: {data.companyInfo.address} - Phone: {data.companyInfo.phone}</div>
          </div>
        </div>
      )}
    </div>
  ) : null;
});

/* ═══════════════════════════════════════════════════════
   INVENTORY PAGE
═══════════════════════════════════════════════════════ */
const InventoryPage = memo(function InventoryPage({ data, setData, isAdmin, perms, user }) {
  const invp = perms?.inventory || {};
  const { t } = useLanguage();
  const currency = data.appLabels?.currency || t('currency');
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  
  const [selItem, setSelItem] = useState(null);
  const [act, setAct] = useState(''); // 'add', 'ded', 'waste', 'edit'
  const [amt, setAmt] = useState('');

  const handleAction = async () => {
     const val = n(amt);
     if (val <= 0 && act !== 'edit') return toast.error('Enter a valid quantity');
     if ((act === 'ded' || act === 'waste') && val > selItem.quantity) {
        const ok = await confirm('Insufficient balance', `Quantity exceeds current stock. Continue?`, {confirmLabel:'Follow up', confirmClass:'btn-d'});
        if (!ok) return;
     }
     setData(d => {
        const items = (d.inventory?.items || []).map(i => {
           if (i.id !== selItem.id) return i;
           if (act === 'add') return { ...i, quantity: i.quantity + val };
           if (act === 'ded') return { ...i, quantity: i.quantity - val };
           if (act === 'waste') return { ...i, quantity: i.quantity - val, waste: (i.waste||0) + val };
           return i;
        });
        const logAct = act === 'add' ? 'Manual Add' : act === 'ded' ? 'Manual Deduction' : 'Log Waste';
        const logAmt = (act === 'ded' || act === 'waste') ? -val : (act === 'add' ? val : 0);
        return {
           ...d,
           inventory: { ...d.inventory, items, log: act!=='edit' ? [{id: Date.now(), date:new Date().toISOString(), action:`${logAct} (${selItem.name})`, amount:logAmt, user:user?.name||'System'}, ...(d.inventory.log||[])].slice(0,50) : d.inventory.log },
           auditLog: [createLog(user, logAct, `${logAct} for ${selItem.name}`), ...d.auditLog].slice(0,100)
        };
     });
     toast.success('Operation successful');
     setSelItem(null); setAct(''); setAmt('');
  };

  return (
    <div className="page">
      {dialog}
      {!invp.edit && <ReadOnlyBanner />}
      <div className="card">
         <div className="card-hdr">
            <div className="card-title">📦 <DynText>Inventory Management</DynText></div>
            {invp.edit && <div className="txs tmt"><DynText>Manage products from Settings</DynText> ⚙️</div>}
         </div>
         <div className="dgrid" style={{padding: 18}}>
            {(data.inventory?.items || []).map(item => {
               const isLow = item.threshold > 0 && item.quantity < item.threshold;
               return (
               <div key={item.id} className="card" style={{marginBottom:0, border: isLow ? '1px solid var(--rose-l)' : '1px solid var(--border)'}}>
                  <div style={{padding: 14, borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                     <div style={{display:'flex', alignItems:'center', gap:10}}>
                        {item.image ? <img src={item.image} style={{width:32, height:32, borderRadius:6, objectFit:'cover'}} alt={item.name} /> : <div style={{width:32, height:32, borderRadius:6, background:'rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16}}>📦</div>}
                        <div className="fw7" style={{fontSize: 16}}><DynText>{item.name}</DynText></div>
                     </div>
                  </div>
                  <div style={{padding: 14, textAlign:'center'}}>
                     <div style={{fontSize: 32, fontWeight: 900, color: isLow ? 'var(--rose-l)' : 'var(--light)'}}>{fmt(item.quantity)}</div>
                     <div className="ts tmt"><DynText>{item.unit}</DynText></div>
                     {isLow && <div className="txs t-err mt2">⚠️ <DynText>Low stock (Threshold: </DynText> {fmt(item.threshold)})</div>}
                  </div>
                  {invp.edit && <div style={{display:'flex', gap: 6, padding: 14, borderTop:'1px solid var(--border)'}}>
                     <button className="btn btn-s btn-sm" style={{flex:1}} onClick={()=>{setSelItem(item); setAct('add');}}>➕ <DynText>Add</DynText></button>
                     <button className="btn btn-d btn-sm" style={{flex:1}} onClick={()=>{setSelItem(item); setAct('ded');}}>➖ <DynText>Deduct</DynText></button>
                     <button className="btn btn-g btn-sm" style={{flex:1}} onClick={()=>{setSelItem(item); setAct('waste');}}>⚠️ <DynText>Waste</DynText></button>
                  </div>}
               </div>
            )})}
         </div>
      </div>

      {invp.edit && selItem && act !== 'edit' && <Modal open={!!act} onClose={()=>{setAct('');setSelItem(null);}} title={act==='add'?'➕ Add to Balance':act==='ded'?'➖ Deduct from Balance':'⚠️ Log Waste'}
        footer={<><button className={`btn ${act==='add'?'btn-s':act==='ded'?'btn-d':'btn-g'}`} onClick={handleAction}>✅ <DynText>Execute</DynText></button><button className="btn btn-g" onClick={()=>{setAct('');setSelItem(null);}}><DynText>Cancel</DynText></button></>}>
        <div className="form-grid">
          <FormField label="Category"><input className="fi" value={selItem.name} disabled /></FormField>
          <FormField label="Quantity"><input type="number" min="0" className="fi" value={amt} onChange={e=>setAmt(e.target.value)} autoFocus onKeyDown={e=>e.key==='Enter'&&handleAction()} /></FormField>
        </div>
      </Modal>}

      <div className="card">
        <div className="card-hdr"><div className="card-title">📋 <DynText>Inventory Log (Last 50 Operations)</DynText></div></div>
        <div style={{maxHeight:300,overflowY:'auto'}}>
          {(data.inventory.log||[]).map((l,i)=>(
            <div key={i} className="audit-row" style={{padding:'10px 18px'}}><span className="tmt">{new Date(l.date).toLocaleString(_l())}</span><span>{l.user}</span><span className={l.amount>0?'t-ok':'t-err'}><DynText>{l.action}</DynText>: {fmt(Math.abs(l.amount))}</span></div>
          ))}
        </div>
      </div>
    </div>
  );
});

/* ═══════════════════════════════════════════════════════
   EXPENSES PAGE
═══════════════════════════════════════════════════════ */
const ExpensesPage = memo(function ExpensesPage({ data, setData, isAdmin, perms, user, isMobile }) {
  const ep = perms?.expenses || {};
  const { t } = useLanguage();
  const currency = data.appLabels?.currency || t('currency');
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [show, setShow] = useState(false);
  const [errs, setErrs] = useState({});
  const [form, setForm] = useState({date:today(),type:'Workshop Expenses',amount:'',description:''});
  const TYPES = data.expenseTypes || ['Workshop Expenses','Utility Bills','Rent','Petty Cash'];
  const ICONS = {'Workshop Expenses':'🔧','Utility Bills':'⚡','Rent':'🏠','Petty Cash':'💼','Wages & Labor':'👷','Transport & Maintenance':'🚚','Salaries':'💵','Marketing':'📣','Taxes':'🧾','Supplies':'📦','Other':'💸'};
  const COLORS = {'Workshop Expenses':'blue','Utility Bills':'gold','Rent':'vio','Petty Cash':'cyan','Wages & Labor':'em','Transport & Maintenance':'rose','Salaries':'em','Marketing':'gold','Taxes':'rose','Supplies':'blue','Other':'gold'};
  const BCOLS = {'Workshop Expenses':'b-info','Utility Bills':'b-warn','Rent':'b-vio','Petty Cash':'b-ok','Wages & Labor':'b-ok','Transport & Maintenance':'b-err','Other':'b-info'};
  const expIcon = (t) => ICONS[t] || '💸';
  const expColor = (t) => COLORS[t] || 'gold';
  const { currentData, curr, max, next, prev } = usePagination(data.expenses, 15);
  const handleAdd = () => {
    const e=validate({amount:{positive:true}},form);
    if (Object.keys(e).length){setErrs(e);return;}
    setData(d=>({...d,
      expenses:[...d.expenses,{id:Date.now() + Math.floor(Math.random()*1000),...form,amount:n(form.amount)}],
      auditLog: [createLog(user, 'Add Expense', `Expense ${form.type} - ${fmt(form.amount)} ${currency}`), ...d.auditLog].slice(0, 100)
    }));
    toast.success('Expense added ✅');
    setShow(false);setForm({date:today(),type:'Workshop Expenses',amount:'',description:''});setErrs({});
  };
  const handleDelete = async exp => {
    const ok=await confirm('Delete Expense',`Delete "${exp.type}" — ${fmt(exp.amount)} ${currency}?`);
    if (!ok) return;
    setData(d=>({...d,
      expenses:d.expenses.filter(x=>x.id!==exp.id),
      auditLog: [createLog(user, 'Delete Expense', `Delete expense ${exp.type}`), ...d.auditLog].slice(0, 100)
    }));
    toast.success('Expense deleted');
  };
  return (
    <div className="page">
      {dialog}
      {!ep.add && !ep.del && <ReadOnlyBanner />}
      <div className="stats-grid">{TYPES.map(t=><StatCard key={t} c={expColor(t)} icon={expIcon(t)} label={<DynText>{t}</DynText>} value={<>{fmt(data.expenses.filter(e=>e.type===t).reduce((s,e)=>s+e.amount,0))} <DynText>{currency}</DynText></>} />)}</div>
      <div className="dgrid">
        <MiniChartCard title="Expenses by Type" icon="🍩" type="donut" data={[...new Set(data.expenses.map(e=>e.type))].map(ty=>({name:ty,value:data.expenses.filter(e=>e.type===ty).reduce((s,e)=>s+e.amount,0)}))} />
        <MiniChartCard title="Monthly Expenses" icon="📈" type="area" color="#f43f5e" data={(()=>{const o=[];const now=new Date();for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;o.push({name:d.toLocaleDateString('en-US',{month:'short'}),value:data.expenses.filter(e=>(e.date||'').startsWith(k)).reduce((s,e)=>s+e.amount,0)});}return o;})()} />
      </div>
      <div className="card">
        <div className="card-hdr"><div className="card-title">💼 <DynText>General Expenses</DynText></div>{ep.add&&<button className="btn btn-p" onClick={()=>{setForm({date:today(),type:'Workshop Expenses',amount:'',description:''});setErrs({});setShow(true);}}>+ <DynText>Add Expense</DynText></button>}</div>
        <table><thead><tr><th><DynText>Date</DynText></th><th><DynText>Type</DynText></th><th><DynText>Description</DynText></th><th><DynText>Amount</DynText></th>{ep.del&&<th><DynText>Delete</DynText></th>}</tr></thead>
          <tbody>
            {currentData.length===0?<tr><td colSpan={5}><div className="empty"><div className="empty-icon">💼</div><div className="empty-txt"><DynText>No expenses</DynText></div></div></td></tr>
              :currentData.map(e=>(
                <tr key={e.id}><td className="tmt">{fmtD(e.date)}</td><td><span className={"badge "+(BCOLS[e.type]||'b-info')}><DynText>{e.type}</DynText></span></td>
                  <td><DynText>{e.description}</DynText></td><td className="t-err fw7">{fmt(e.amount)} <DynText>{currency}</DynText></td>
                  {ep.del&&<td><button className="btn btn-d btn-sm" onClick={()=>handleDelete(e)}>🗑</button></td>}</tr>
              ))}
          </tbody></table>
          <PaginationControl curr={curr} max={max} next={next} prev={prev} />
      </div>
      {isMobile && ep.add && <button className="fab" onClick={()=>{setForm({date:today(),type:'Workshop Expenses',amount:'',description:''});setErrs({});setShow(true);}}>+</button>}
      {ep.add && <Modal open={show} onClose={()=>setShow(false)} title="➕ Add Expense"
        footer={<><button className="btn btn-p" onClick={handleAdd}>✅ <DynText>Save</DynText></button><button className="btn btn-g" onClick={()=>setShow(false)}><DynText>Cancel</DynText></button></>}>
        <div className="form-grid">
          <FormField label="Date"><input type="date" className="fi" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} /></FormField>
          <FormField label="Type"><select className="fi" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>{TYPES.map(t=><option key={t} value={t}><DynText>{t}</DynText></option>)}</select></FormField>
          <FormField label={`Amount (${currency}) *`} error={errs.amount}><input type="number" min="0" className={`fi${errs.amount?' fi-err':''}`} value={form.amount} onChange={e=>{setForm(f=>({...f,amount:e.target.value}));setErrs(v=>({...v,amount:''}));}} /></FormField>
          <FormField label="Description" full><input className="fi" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} /></FormField>
        </div>
      </Modal>}
    </div>
  );
});

/* ═══════════════════════════════════════════════════════
   LOGISTICS PAGE (NEW MODULE)
═══════════════════════════════════════════════════════ */
const LogisticsPage = memo(function LogisticsPage({ data, setData, isAdmin, perms, user, isMobile }) {
  const lp = perms?.logistics || {};
  const { t } = useLanguage();
  const currency = data.appLabels?.currency || t('currency');
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [showAdd, setShowAdd] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [selVeh, setSelVeh] = useState(null);
  const [form, setForm] = useState({ name: '', number: '', driver: '' });
  const [logForm, setLogForm] = useState({ date: today(), type: 'Maintenance', cost: '', notes: '' });
  const { currentData, curr, max, next, prev } = usePagination(data.vehicles, 10);

  const handleAddVehicle = () => {
    if (!form.name || !form.number) { toast.error('Complete the data'); return; }
    setData(d => ({
      ...d,
      vehicles: [...d.vehicles, { id: Date.now() + Math.floor(Math.random()*1000), ...form, status: 'Active' }],
      auditLog: [createLog(user, 'Add Vehicle', `Add ${form.name} - ${form.number}`), ...d.auditLog].slice(0, 100)
    }));
    toast.success('Added 🚛'); setShowAdd(false); setForm({ name: '', number: '', driver: '' });
  };

  const handleAddLog = () => {
    const cost = n(logForm.cost);
    if (cost <= 0) { toast.error('Invalid amount'); return; }
    setData(d => ({
      ...d,
      vehicleLog: [...d.vehicleLog, { id: Date.now() + Math.floor(Math.random()*1000), vehicleId: selVeh.id, ...logForm, cost }],
      auditLog: [createLog(user, 'Vehicle Maintenance', `${logForm.type} for ${selVeh.name} at ${fmt(cost)}`), ...d.auditLog].slice(0, 100)
    }));
    toast.success('Transaction recorded ✅'); setShowLog(false); setLogForm({ date: today(), type: 'Maintenance', cost: '', notes: '' });
  };

  const handleDelete = async (v) => {
    // Financial warning when deleting an asset
    if (!await confirm('Delete Vehicle', 'Warning: deleting the vehicle will delete its expense records and change past profit reports. Are you sure?', {confirmClass:'btn-d'})) return;
    setData(d => ({
      ...d,
      vehicles: d.vehicles.filter(x => x.id !== v.id),
      vehicleLog: d.vehicleLog.filter(x => x.vehicleId !== v.id)
    }));
    toast.success('Deleted');
  };

  return (
    <div className="page">
      {dialog}
      {!lp.add && !lp.del && <ReadOnlyBanner />}
      <div className="stats-grid">
        <StatCard c="blue" icon="🚛" label={<DynText>Vehicle Count</DynText>} value={data.vehicles.length} />
        <StatCard c="rose" icon="🔧" label={<DynText>Maintenance Cost</DynText>} value={<>{fmt(data.vehicleLog.reduce((s, l) => s + l.cost, 0))} <DynText>{currency}</DynText></>} />
      </div>
      <MiniChartCard title="Cost by Vehicle" icon="🚛" color="#1a3a6e" data={(data.vehicles||[]).map(v=>({name:v.name,value:(data.vehicleLog||[]).filter(l=>l.vehicleId===v.id||l.vehicle===v.name).reduce((s,l)=>s+(l.cost||0),0)}))} />
      <div className="card">
        <div className="card-hdr">
          <div className="card-title">🚛 <DynText>Fleet</DynText></div>
          {lp.add && <button className="btn btn-p" onClick={() => setShowAdd(true)}>+ <DynText>New Vehicle</DynText></button>}
        </div>
        <div className="dgrid" style={{ padding: 18 }}>
          {currentData.map(v => {
            const logs = data.vehicleLog.filter(l => l.vehicleId === v.id);
            const totalCost = logs.reduce((s, l) => s + l.cost, 0);
            return (
              <div key={v.id} className="card" style={{ marginBottom: 0, border: '1px solid var(--border)' }}>
                <div style={{ padding: 14, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                  <div className="fw7"><DynText>{v.name}</DynText> <span className="badge b-info"><DynText>{v.number}</DynText></span></div>
                  {lp.del && <button className="btn btn-d btn-sm btn-icon" onClick={() => handleDelete(v)}>🗑</button>}
                </div>
                <div style={{ padding: 14 }}>
                  <div className="ts tmt"><DynText>Driver:</DynText> <DynText>{v.driver || 'Not assigned'}</DynText></div>
                  <div className="ts tmt mt2"><DynText>Total Expenses:</DynText> <span className="t-err fw7">{fmt(totalCost)} <DynText>{currency}</DynText></span></div>
                  <div className="divider" />
                  <div style={{ maxHeight: 100, overflowY: 'auto', fontSize: 11 }}>
                    {logs.map(l => <div key={l.id} className="fb" style={{ marginBottom: 4 }}><span><DynText>{l.type}</DynText> ({fmtD(l.date)})</span><span className="t-err">{fmt(l.cost)}</span></div>)}
                  </div>
                  {lp.add && <button className="btn btn-g btn-sm mt3" style={{ width: '100%' }} onClick={() => { setSelVeh(v); setShowLog(true); }}>+ <DynText>Log Maintenance / Fuel</DynText></button>}
                </div>
              </div>
            );
          })}
        </div>
        <PaginationControl curr={curr} max={max} next={next} prev={prev} />
      </div>
      {isMobile && lp.add && <button className="fab" onClick={() => setShowAdd(true)}>+</button>}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="🚛 New Vehicle" footer={<><button className="btn btn-p" onClick={handleAddVehicle}><DynText>Save</DynText></button><button className="btn btn-g" onClick={() => setShowAdd(false)}><DynText>Cancel</DynText></button></>}>
        <div className="form-grid">
          <FormField label="Vehicle Type"><input className="fi" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Chevrolet Jumbo" /></FormField>
          <FormField label="Plate Number"><input className="fi" value={form.number} onChange={e => setForm({ ...form, number: e.target.value })} /></FormField>
          <FormField label="Driver Name"><input className="fi" value={form.driver} onChange={e => setForm({ ...form, driver: e.target.value })} /></FormField>
        </div>
      </Modal>
      <Modal open={showLog} onClose={() => setShowLog(false)} title={`🔧 Log expense for ${selVeh?.name}`} footer={<><button className="btn btn-p" onClick={handleAddLog}><DynText>Save</DynText></button><button className="btn btn-g" onClick={() => setShowLog(false)}><DynText>Cancel</DynText></button></>}>
        <div className="form-grid">
          <FormField label="Date"><input type="date" className="fi" value={logForm.date} onChange={e => setLogForm({ ...logForm, date: e.target.value })} /></FormField>
          <FormField label="Type"><select className="fi" value={logForm.type} onChange={e => setLogForm({ ...logForm, type: e.target.value })}><option value="Maintenance"><DynText>Maintenance</DynText></option><option value="Fuel"><DynText>Fuel</DynText></option><option value="Oil"><DynText>Oil</DynText></option><option value="Fines"><DynText>Fines</DynText></option><option value="License"><DynText>License</DynText></option></select></FormField>
          <FormField label="Cost"><input type="number" className="fi" value={logForm.cost} onChange={e => setLogForm({ ...logForm, cost: e.target.value })} /></FormField>
          <FormField label="Notes"><input className="fi" value={logForm.notes} onChange={e => setLogForm({ ...logForm, notes: e.target.value })} /></FormField>
        </div>
      </Modal>
    </div>
  );
});

/* ═══════════════════════════════════════════════════════
   TREASURY PAGE (NEW MODULE)
═══════════════════════════════════════════════════════ */
const TreasuryPage = memo(function TreasuryPage({ data, setData, isAdmin, perms, user, isMobile }) {
  const tp = perms?.treasury || {};
  const { t } = useLanguage();
  const currency = data.appLabels?.currency || t('currency');
  const toast = useToast();
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ date: today(), type: 'deposit', amount: '', reason: '' });
  const { currentData, curr, max, next, prev } = usePagination(data.treasuryMoves, 15);

  // Live Calculation of Cash Flow
  const { income, expenses, workersPaid, suppliersPaid, logisticsCost, manualDep, manualWith, totalIn, totalOut, balance } = useMemo(() => {
    let income = 0;
    data.clients.forEach(c => {
      (c.transactions || []).forEach(t => { if (t.paid && !t.type?.includes('Settlement')) income += t.paid; });
    });
    
    const expenses = data.expenses.reduce((s, e) => s + e.amount, 0);
    const workersPaid = data.workers.reduce((s, w) => s + (w.received||0) + (w.advance||0), 0);
    let suppliersPaid = 0;
    data.suppliers.forEach(s => {
      (s.records || []).forEach(r => { if (r.paid) suppliersPaid += r.paid; });
      (s.payments || []).forEach(p => { if (p.amount && !p.notes?.includes('Settlement')) suppliersPaid += p.amount; });
    });
    const logisticsCost = data.vehicleLog.reduce((s, l) => s + l.cost, 0);
    
    const manualDep = data.treasuryMoves.filter(m => m.type === 'deposit').reduce((s, m) => s + m.amount, 0);
    const manualWith = data.treasuryMoves.filter(m => m.type === 'withdraw').reduce((s, m) => s + m.amount, 0);

    const totalIn = income + manualDep;
    const totalOut = expenses + workersPaid + suppliersPaid + logisticsCost + manualWith;
    const balance = totalIn - totalOut;
    return { income, expenses, workersPaid, suppliersPaid, logisticsCost, manualDep, manualWith, totalIn, totalOut, balance };
  }, [data.clients, data.expenses, data.workers, data.suppliers, data.vehicleLog, data.treasuryMoves]);

  const handleAdd = () => {
    const amt = n(form.amount);
    if (amt <= 0) { toast.error('Invalid amount'); return; }
    setData(d => ({
      ...d,
      treasuryMoves: [createTreasuryLog(user, form, amt), ...d.treasuryMoves],
      auditLog: [createLog(user, form.type === 'deposit' ? 'Treasury Deposit' : 'Treasury Withdrawal', `${fmt(amt)} ${currency} - ${form.reason}`), ...d.auditLog].slice(0, 100)
    }));
    toast.success('Operation successful 💰'); setShow(false); setForm({ date: today(), type: 'deposit', amount: '', reason: '' });
  };

  return (
    <div className="page">
      {!tp.add && <ReadOnlyBanner />}
      <MiniChartCard title="Monthly Cash Flow" icon="💰" type="area" color="#10b981" data={(()=>{const o=[];const now=new Date();const mv=data.treasuryMoves||[];for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;const net=mv.filter(m=>(m.date||'').startsWith(k)).reduce((s,m)=>s+(m.type==='deposit'?(m.amount||0):-(m.amount||0)),0);o.push({name:d.toLocaleDateString('en-US',{month:'short'}),value:Math.abs(net)});}return o;})()} />
      <div className="card">
        <div className="card-hdr"><div className="card-title">💰 <DynText>Central Treasury</DynText></div>{tp.add && <button className="btn btn-p" onClick={() => setShow(true)}>+ <DynText>Manual Transaction</DynText></button>}</div>
        <div style={{ padding: 24, textAlign: 'center' }}>
          <div className="ts tmt"><DynText>Current Balance (Cash)</DynText></div>
          <div style={{ fontSize: 48, fontWeight: 900, color: balance >= 0 ? 'var(--em-l)' : 'var(--rose-l)', margin: '10px 0' }}>{fmt(balance)} {currency}</div>
          <div className="dgrid" style={{ maxWidth: 600, margin: '20px auto 0', gap: 10 }}>
            <div style={{ background: 'rgba(16,185,129,.1)', padding: 10, borderRadius: 8 }}>
              <div className="ts t-ok"><DynText>Total Receipts</DynText></div><div className="fw7">{fmt(totalIn)} <DynText>{currency}</DynText></div>
            </div>
            <div style={{ background: 'rgba(244,63,94,.1)', padding: 10, borderRadius: 8 }}>
              <div className="ts t-err"><DynText>Total Payments</DynText></div><div className="fw7">{fmt(totalOut)} <DynText>{currency}</DynText></div>
            </div>
          </div>
        </div>
      </div>
      <div className="dgrid">
        <div className="card">
          <div className="card-hdr"><div className="card-title">📊 <DynText>Payment Details</DynText></div></div>
          <div style={{ padding: 18 }}>
            {[
              ['General Expenses', expenses], ['Wages & Advances', workersPaid], ['Suppliers', suppliersPaid],
              ['Logistics & Transport', logisticsCost], ['Manual Withdrawals', manualWith]
            ].map(([l, v], i) => (
              <div key={i} className="fb" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span className="ts"><DynText>{l}</DynText></span><span className="fw7 t-err">{fmt(v)} <DynText>{currency}</DynText></span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-hdr"><div className="card-title">📜 <DynText>Manual Transactions Log</DynText></div></div>
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {data.treasuryMoves.length === 0 ? <div className="empty txs"><DynText>No manual transactions</DynText></div> :
              currentData.map(m => (
                <div key={m.id} className="audit-row" style={{ padding: '12px 18px' }}>
                  <div style={{ width: 90 }}>{fmtD(m.date)}</div>
                  <div style={{ width: 80 }}><span className={"badge " + (m.type === 'deposit' ? 'b-ok' : 'b-err')}><DynText>{m.type === 'deposit' ? 'Deposit' : 'Withdraw'}</DynText></span></div>
                  <div style={{ flex: 1 }}><DynText>{m.reason}</DynText> <span className="txs tmt">({m.user})</span></div>
                  <div className="fw7">{fmt(m.amount)} <DynText>{currency}</DynText></div>
                  {tp.del && (
                    <div style={{marginInlineStart: 10}}>
                      <button className="btn btn-d btn-sm btn-icon" onClick={async () => {
                        if (!await confirm('Delete Transaction', 'Are you sure you want to delete this treasury transaction?')) return;
                        setData(d => ({ ...d, treasuryMoves: d.treasuryMoves.filter(x => x.id !== m.id), auditLog: [createLog(user, 'Delete Treasury Transaction', `Cancel ${m.type === 'deposit' ? 'Deposit' : 'Withdraw'} of ${fmt(m.amount)} ${currency}`), ...d.auditLog].slice(0, 100) }));
                        toast.success('Deleted');
                      }}>🗑</button>
                    </div>
                  )}
                </div>
              ))}
              <PaginationControl curr={curr} max={max} next={next} prev={prev} />
          </div>
        </div>
      </div>
      {isMobile && tp.add && <button className="fab" onClick={() => setShow(true)}>+</button>}
      <Modal open={show} onClose={() => setShow(false)} title="💰 Manual Treasury Transaction" footer={<><button className="btn btn-p" onClick={handleAdd}><DynText>Execute</DynText></button><button className="btn btn-g" onClick={() => setShow(false)}><DynText>Cancel</DynText></button></>}>
        <div className="form-grid">
          <FormField label="Date"><input type="date" className="fi" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></FormField>
          <FormField label="Type"><select className="fi" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option value="deposit"><DynText>Deposit (capital / other)</DynText></option><option value="withdraw"><DynText>Withdraw (profit / other)</DynText></option></select></FormField>
          <FormField label="Amount"><input type="number" className="fi" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></FormField>
          <FormField label="Reason / Description"><input className="fi" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} /></FormField>
        </div>
      </Modal>
    </div>
  );
});

/* ═══════════════════════════════════════════════════════
   HR PAGE (NEW MODULE)
═══════════════════════════════════════════════════════ */
const HRPage = memo(function HRPage({ data, setData, isAdmin, perms, user, isMobile }) {
  const hp = perms?.hr || {};
  const { t } = useLanguage();
  const currency = data.appLabels?.currency || t('currency');
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [show, setShow] = useState(false);
  const [showLeaves, setShowLeaves] = useState(false);
  const [selEmp, setSelEmp] = useState(null);
  const [form, setForm] = useState({ name: '', role: '', salary: '', phone: '', joinDate: today() });
  const [leaveForm, setLeaveForm] = useState({ startDate: today(), endDate: today(), type: 'Normal', status: 'Approved', notes: '' });
  const { currentData, curr, max, next, prev } = usePagination(data.employees, 10);

  const getLeaveDays = (start, end) => Math.max(1, Math.ceil((new Date(end) - new Date(start)) / 86400000) + 1);

  const handleAdd = () => {
    if (!form.name || !form.salary) { toast.error('Complete the data'); return; }
    setData(d => ({
      ...d,
      employees: [...d.employees, { id: Date.now() + Math.floor(Math.random()*1000), ...form, active: true, leaves: [] }],
      auditLog: [createLog(user, 'Add Employee', `Assign ${form.name}`), ...d.auditLog].slice(0, 100)
    }));
    toast.success('Employee assigned 👔'); setShow(false); setForm({ name: '', role: '', salary: '', phone: '', joinDate: today() });
  };

  const handleDelete = async (emp) => {
    if (!await confirm('Delete Employee', `Are you sure you want to delete "${emp.name}"? Their payroll record will be deleted.`)) return;
    setData(d => ({ ...d, employees: d.employees.filter(e => e.id !== emp.id), auditLog: [createLog(user, 'Delete Employee', `Employee ${emp.name} deleted`), ...d.auditLog].slice(0, 100) }));
    toast.success('Deleted');
  };

  const handleAddLeave = () => {
    if (!leaveForm.startDate || !leaveForm.endDate) { toast.error('Enter dates'); return; }
    if (new Date(leaveForm.endDate) < new Date(leaveForm.startDate)) { toast.error('End date must be after start date'); return; }
    setData(d => ({
      ...d,
      employees: d.employees.map(e => e.id === selEmp.id ? { ...e, leaves: [{ id: Date.now() + Math.floor(Math.random()*1000), ...leaveForm }, ...(e.leaves || [])] } : e),
      auditLog: [createLog(user, 'Log Leave', `${leaveForm.type} leave for ${selEmp.name}`), ...d.auditLog].slice(0, 100)
    }));
    toast.success('Leave logged successfully 🏖️');
    setLeaveForm({ startDate: today(), endDate: today(), type: 'Normal', status: 'Approved', notes: '' });
  };

  const handleDeleteLeave = async (leaveId) => {
    if (!await confirm('Delete Leave', 'Are you sure you want to delete this record?')) return;
    setData(d => ({
      ...d,
      employees: d.employees.map(e => e.id === selEmp.id ? { ...e, leaves: (e.leaves || []).filter(l => l.id !== leaveId) } : e),
      auditLog: [createLog(user, 'Delete Leave', `Cancel leave for ${selEmp.name}`), ...d.auditLog].slice(0, 100)
    }));
    toast.success('Deleted');
  };

  return (
    <div className="page">
      {dialog}
      {!hp.add && !hp.del && <ReadOnlyBanner />}
      <div className="card">
        <div className="card-hdr">
          <div className="card-title">👔 <DynText>Human Resources</DynText> (HR)</div>
          {hp.add && <button className="btn btn-p" onClick={() => setShow(true)}>+ <DynText>New Employee</DynText></button>}
        </div>
        <div className="table-scroll">
          <table>
            <thead><tr><th><DynText>Name</DynText></th><th><DynText>Position</DynText></th><th><DynText>Salary</DynText></th><th><DynText>Hire Date</DynText></th><th><DynText>Annual Leaves</DynText></th><th><DynText>Actions</DynText></th></tr></thead>
            <tbody>
              {currentData.map(e => {
                const yearLeaves = (e.leaves||[]).filter(l => l.startDate.startsWith(new Date().getFullYear().toString()) && l.status === 'Approved').reduce((sum, l) => sum + getLeaveDays(l.startDate, l.endDate), 0);
                return (
                <tr key={e.id}>
                  <td className="fw7"><DynText>{e.name}</DynText></td>
                  <td><span className="badge b-info"><DynText>{e.role}</DynText></span></td>
                  <td className="t-gold fw7">{fmt(e.salary)} <DynText>{currency}</DynText></td>
                  <td className="tmt">{fmtD(e.joinDate)}</td>
                  <td><span className="pill p-em">{yearLeaves} <DynText>days</DynText></span></td>
                  <td><div style={{display:'flex',gap:4}}>
                    <button className="btn btn-g btn-sm" onClick={() => { setSelEmp(e); setShowLeaves(true); }} title="Leave records">🏖️</button>
                    {hp.del && <button className="btn btn-d btn-sm" onClick={() => handleDelete(e)}>🗑</button>}
                  </div></td>
                </tr>
              )})}
            </tbody>
          </table>
          <PaginationControl curr={curr} max={max} next={next} prev={prev} />
        </div>
      </div>
      {isMobile && hp.add && <button className="fab" onClick={() => setShow(true)}>+</button>}
      <Modal open={show} onClose={() => setShow(false)} title="👔 Hire New Employee" footer={<><button className="btn btn-p" onClick={handleAdd}><DynText>Save</DynText></button><button className="btn btn-g" onClick={() => setShow(false)}><DynText>Cancel</DynText></button></>}>
        <div className="form-grid">
          <FormField label="Name"><input className="fi" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></FormField>
          <FormField label="Position"><input className="fi" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} placeholder="e.g. Accountant" /></FormField>
          <FormField label="Monthly Salary"><input type="number" className="fi" value={form.salary} onChange={e => setForm({ ...form, salary: e.target.value })} /></FormField>
          <FormField label="Phone"><input className="fi" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></FormField>
          <FormField label="Hire Date"><input type="date" className="fi" value={form.joinDate} onChange={e => setForm({ ...form, joinDate: e.target.value })} /></FormField>
        </div>
      </Modal>
      <Modal open={showLeaves} onClose={() => { setShowLeaves(false); setSelEmp(null); }} title={`🏖️ Leave log: ${selEmp?.name}`} wide footer={<button className="btn btn-g" onClick={() => { setShowLeaves(false); setSelEmp(null); }}><DynText>Close</DynText></button>}>
        {hp.add && <div className="form-grid" style={{marginBottom: 20}}>
          <FormField label="From date"><input type="date" className="fi" value={leaveForm.startDate} onChange={e => setLeaveForm({...leaveForm, startDate: e.target.value})} /></FormField>
          <FormField label="To date"><input type="date" className="fi" value={leaveForm.endDate} onChange={e => setLeaveForm({...leaveForm, endDate: e.target.value})} /></FormField>
          <FormField label="Leave Type"><select className="fi" value={leaveForm.type} onChange={e => setLeaveForm({...leaveForm, type: e.target.value})}><option value="Normal"><DynText>Regular</DynText></option><option value="Satisfactory"><DynText>Sick</DynText></option><option value="Beam"><DynText>Casual</DynText></option><option value="Unpaid"><DynText>Unpaid</DynText></option></select></FormField>
          <FormField label="Status"><select className="fi" value={leaveForm.status} onChange={e => setLeaveForm({...leaveForm, status: e.target.value})}><option value="Approved"><DynText>Accepted</DynText></option><option value="Pending"><DynText>Pending</DynText></option><option value="Rejected"><DynText>Rejected</DynText></option></select></FormField>
          <FormField label="Notes" full><div style={{display:'flex',gap:10}}><input className="fi" style={{flex:1}} value={leaveForm.notes} onChange={e => setLeaveForm({...leaveForm, notes: e.target.value})} /><button className="btn btn-p" onClick={handleAddLeave}>+ <DynText>Add Leave</DynText></button></div></FormField>
        </div>}
        <div className="table-scroll" style={{maxHeight: 250, borderTop: '1px solid var(--border)'}}>
          <table>
            <thead><tr><th><DynText>of</DynText></th><th><DynText>To</DynText></th><th><DynText>Duration</DynText></th><th><DynText>Type</DynText></th><th><DynText>Status</DynText></th><th><DynText>Notes</DynText></th>{hp.del && <th></th>}</tr></thead>
            <tbody>
              {!(data.employees.find(e => e.id === selEmp?.id)?.leaves?.length) ? <tr><td colSpan={7} className="empty"><DynText>No leaves recorded</DynText></td></tr> :
                (data.employees.find(e => e.id === selEmp.id)?.leaves || []).map(l => (
                  <tr key={l.id}>
                    <td className="tmt">{fmtD(l.startDate)}</td><td className="tmt">{fmtD(l.endDate)}</td>
                    <td className="fw7">{getLeaveDays(l.startDate, l.endDate)} <DynText>days</DynText></td>
                    <td><span className="badge b-info"><DynText>{l.type}</DynText></span></td>
                    <td><span className={`badge ${l.status==='Approved'?'b-ok':l.status==='Rejected'?'b-err':'b-warn'}`}><DynText>{l.status}</DynText></span></td>
                    <td className="ts">{l.notes}</td>
                    {hp.del && <td><button className="btn btn-d btn-icon btn-sm" onClick={()=>handleDeleteLeave(l.id)}>🗑</button></td>}
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  );
});

/* ═══════════════════════════════════════════════════════
   CRM PAGE (NEW MODULE)
═══════════════════════════════════════════════════════ */
const CRMPage = memo(function CRMPage({ data, setData, isAdmin, perms, user, isMobile }) {
  const cp = perms?.crm || {};
  const toast = useToast();
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', status: 'new', notes: '' });

  const handleAdd = () => {
    if (!form.name) { toast.error('Name is required'); return; }
    setData(d => ({
      ...d,
      crmLeads: [...d.crmLeads, { id: Date.now() + Math.floor(Math.random()*1000), ...form, date: today() }],
      auditLog: [createLog(user, 'Add Lead', `Add ${form.name}`), ...d.auditLog].slice(0, 100)
    }));
    toast.success('Added 🤝'); setShow(false); setForm({ name: '', phone: '', status: 'new', notes: '' });
  };

  const updateStatus = (id, status) => {
    setData(d => {
      const lead = d.crmLeads.find(l => l.id === id);
      const statusMap = {'new':'New', 'contacted':'Contacted', 'qualified':'Interested', 'won':'Won', 'lost':'Lost'};
      return { ...d, crmLeads: d.crmLeads.map(l => l.id === id ? { ...l, status } : l), auditLog: [createLog(user, 'Update CRM', `Update lead ${lead?.name} status to ${statusMap[status]}`), ...d.auditLog].slice(0, 100) };
    });
  };

  return (
    <div className="page">
      {!cp.add && <ReadOnlyBanner />}
      <div className="card">
        <div className="card-hdr">
          <div className="card-title">🤝 <DynText>Customer Relationship Management</DynText> (CRM)</div>
          {cp.add && <button className="btn btn-p" onClick={() => setShow(true)}>+ <DynText>New Lead</DynText></button>}
        </div>
        <div style={{ padding: 16 }}>
          <MiniChartCard title="Leads by Status" icon="🤝" type="donut" height={220} data={[...new Set((data.crmLeads||[]).map(l=>l.status))].map(st=>({name:st,value:(data.crmLeads||[]).filter(l=>l.status===st).length}))} />
        </div>
        <div className="dgrid" style={{ padding: 18 }}>
          {['new|New|b-info', 'contacted|Contacted|b-warn', 'qualified|Interested|b-vio', 'won|Won|b-ok', 'lost|Lost|b-err'].map(str => {
            const [k, l, c] = str.split('|');
            return (
            <div key={k} className="card" style={{ border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)' }}>
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', fontWeight: 'bold' }} className={c.replace('b-', 't-')}><DynText>{l}</DynText></div>
              <div style={{ padding: 10, minHeight: 50 }}>
                {data.crmLeads.filter(x => x.status === k).map(lead => (
                  <div key={lead.id} style={{ background: 'var(--glass)', padding: 8, marginBottom: 8, borderRadius: 6, fontSize: 12 }}>
                    <div className="fw7">{lead.name}</div>
                    <div className="tmt"><DynText>{lead.notes}</DynText></div>
                    <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
                      {k !== 'won' && <button className="btn btn-s btn-sm" onClick={() => updateStatus(lead.id, 'won')}>✅</button>}
                      {k !== 'lost' && <button className="btn btn-d btn-sm" onClick={() => updateStatus(lead.id, 'lost')}>❌</button>}
                      {k === 'new' && <button className="btn btn-g btn-sm" onClick={() => updateStatus(lead.id, 'contacted')}>📞</button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )})}
        </div>
      </div>
      {isMobile && cp.add && <button className="fab" onClick={() => setShow(true)}>+</button>}
      <Modal open={show} onClose={() => setShow(false)} title="🤝 New Lead" footer={<><button className="btn btn-p" onClick={handleAdd}><DynText>Save</DynText></button><button className="btn btn-g" onClick={() => setShow(false)}><DynText>Cancel</DynText></button></>}>
        <div className="form-grid">
          <FormField label="Name"><input className="fi" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></FormField>
          <FormField label="Phone"><input className="fi" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></FormField>
          <FormField label="Notes"><input className="fi" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></FormField>
        </div>
      </Modal>
    </div>
  );
});

/* ═══════════════════════════════════════════════════════
   INTEGRATIONS PAGE (REST & GRAPHQL)
═══════════════════════════════════════════════════════ */
const IntegrationsPage = memo(function IntegrationsPage({ data, setData, user, perms }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const ip = perms?.integrations || {};

  const importRest = async () => {
    if (!ip.exec) { toast.error("You don't have permission to perform this action"); return; }
    setLoading(true);
    try {
      // Simulation of fetching leads from an external REST API
      const res = await fetch('https://jsonplaceholder.typicode.com/users');
      const json = await res.json();
      const newLeads = json.slice(0, 5).map(u => ({
        id: Date.now() + Math.ceil(Math.random()*10000),
        name: u.name,
        phone: u.phone,
        status: 'new',
        notes: `REST Import: ${u.company.name}`,
        date: today()
      }));
      setData(d => ({
        ...d,
        crmLeads: [...d.crmLeads, ...newLeads],
        auditLog: [createLog(user, 'API Import', `Import ${newLeads.length} leads via REST`), ...d.auditLog].slice(0, 100)
      }));
      toast.success(`Imported ${newLeads.length} leads successfully 🌐`);
    } catch (e) { toast.error('API connection failed'); }
    setLoading(false);
  };

  const importGQL = async () => {
    if (!ip.exec) { toast.error("You don't have permission to perform this action"); return; }
    setLoading(true);
    try {
      // Simulation of a GraphQL query (using a public countries API as an example for Suppliers)
      const query = `query { countries(filter: { code: { in: ["EG", "SA", "AE", "KW"] } }) { name emoji currency } }`;
      const res = await fetch('https://countries.trevorblades.com/', {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query })
      });
      const { data: gqlData } = await res.json();
      const newSuppliers = gqlData.countries.map(c => ({
        id: Date.now() + Math.ceil(Math.random()*10000),
        name: `International supplier - ${c.name} ${c.emoji}`,
        phone: '-',
        city: 'International',
        totalSupplied: 0, totalPaid: 0, remaining: 0, records: [],
        notes: `GraphQL Import: Currency ${c.currency}`
      }));
       setData(d => ({
        ...d,
        suppliers: [...d.suppliers, ...newSuppliers],
        auditLog: [createLog(user, 'API Import', `Import ${newSuppliers.length} suppliers via GraphQL`), ...d.auditLog].slice(0, 100)
      }));
      toast.success(`Imported ${newSuppliers.length} suppliers successfully 🚀`);
    } catch (e) { toast.error('GraphQL connection failed'); console.log(e);}
    setLoading(false);
  };

  return (
    <div className="page">
      {!ip.exec && <ReadOnlyBanner />}
      <div className="card">
        <div className="card-hdr"><div className="card-title">🔌 <DynText>Integrations & Services</DynText> (API Integrations)</div></div>
        <div style={{padding:24}}>
          <div className="dgrid">
            <div style={{border:'1px solid var(--border)',borderRadius:12,padding:20,background:'rgba(59,130,246,.05)'}}>
              <div className="fb">
                <div>
                  <div className="fw7" style={{fontSize:16,marginBottom:6}}>☁️ <DynText>Import Clients</DynText> (REST API)</div>
                  <div className="ts tmt"><DynText>Fetch lead data from an external system via standard REST protocol.</DynText></div>
                </div>
                <div style={{fontSize:32}}>🌐</div>
              </div>
              <button className="btn btn-p mt3" onClick={importRest} disabled={loading}>{loading?<DynText>Connecting...</DynText>:<DynText>Start Import</DynText>}</button>
            </div>
            <div style={{border:'1px solid var(--border)',borderRadius:12,padding:20,background:'rgba(236,72,153,.05)'}}>
              <div className="fb">
                <div>
                  <div className="fw7" style={{fontSize:16,marginBottom:6}}>🚀 <DynText>Import Suppliers</DynText> (GraphQL)</div>
                  <div className="ts tmt"><DynText>Fetch international supplier data using flexible GraphQL queries.</DynText></div>
                </div>
                <div style={{fontSize:32}}>⚛️</div>
              </div>
              <button className="btn btn-s mt3" onClick={importGQL} disabled={loading}>{loading?<DynText>Connecting...</DynText>:<DynText>Start Import</DynText>}</button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="card">
        <div className="card-hdr"><div className="card-title">⌨️ <DynText>Keyboard Shortcuts</DynText></div></div>
        <div style={{padding:18}}>
          <div className="dgrid" style={{gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))'}}>
            <div className="alert-bar warn"><span className="badge b-warn">Alt + 1</span> <span className="ts"><DynText>Dashboard</DynText></span></div>
            <div className="alert-bar warn"><span className="badge b-warn">Alt + 2</span> <span className="ts"><DynText>Sales</DynText></span></div>
            <div className="alert-bar warn"><span className="badge b-warn">Alt + 3</span> <span className="ts"><DynText>Purchasing</DynText></span></div>
            <div className="alert-bar warn"><span className="badge b-warn">Alt + 4</span> <span className="ts"><DynText>Inventory</DynText></span></div>
            <div className="alert-bar warn"><span className="badge b-warn">Alt + S</span> <span className="ts"><DynText>Settings</DynText></span></div>
          </div>
        </div>
      </div>
    </div>
  );
});


/* ═══════════════════════════════════════════════════════
   REPORTS PAGE
═══════════════════════════════════════════════════════ */
const ReportsPage = memo(function ReportsPage({ data }) {
  const [type, setType] = useState('sales');
  const { t, lang } = useLanguage();
  const currency = data.appLabels?.currency || t('currency');
  const [from, setFrom] = useState(today().slice(0, 8) + '01'); // start of the current month
  const [to, setTo] = useState(today());
  const [productFilter, setProductFilter] = useState('');

  const { rows, cols, title, total, totalLabel } = useMemo(() => {
    const inRange = d => {
      if (!d) return false;
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    };

    let r = [], c = [], t = "", tot = 0, tl = "Total";

    if (type === 'sales') {
      t = "Sales Report";
      r = data.sales.filter(x => inRange(x.date) && (!productFilter || x.product === productFilter));
      c = [
        { h: 'Date', k: 'date', f: fmtD },
        { h: 'Client', k: 'client', noTrans: true },
        { h: 'Product', k: 'product' },
        { h: 'Quantity', v: x => `${fmt(x.quantity)} ${x.unit}` },
        { h: 'Unit Price', k: 'unitPrice', f: v => `${fmt(v)} ${currency}` },
        { h: 'Total', k: 'totalAmount', f: v => `${fmt(v)} ${currency}` }
      ];
      tot = r.reduce((s, x) => s + x.totalAmount, 0);
    } else if (type === 'incoming') {
      t = "Purchases Report";
      r = data.incoming.filter(x => inRange(x.date));
      c = [
        { h: 'Date', k: 'date', f: fmtD },
        { h: 'Supplier', k: 'supplier' },
        { h: 'Item', k: 'category' },
        { h: 'Weight', v: x => `${fmt(x.weight)} ${x.unit}` },
        { h: 'Expenses', k: 'totalExpenses', f: v => `${fmt(v)} ${currency}` }
      ];
      tot = r.reduce((s, x) => s + x.totalExpenses, 0);
    } else if (type === 'expenses') {
      t = "Expenses Report";
      r = data.expenses.filter(x => inRange(x.date));
      c = [
        { h: 'Date', k: 'date', f: fmtD },
        { h: 'Type', k: 'type' },
        { h: 'Description', k: 'description' },
        { h: 'Amount', k: 'amount', f: v => `${fmt(v)} ${currency}` }
      ];
      tot = r.reduce((s, x) => s + x.amount, 0);
    } else if (type === 'settlements') {
      t = "Balance Settlements Report (Clients & Suppliers)";
      r = data.clients.filter(cl => data.suppliers.some(s => s.name === cl.name)).map(cl => {
        const rawS = data.suppliers.find(x => x.name === cl.name);
        const suppBal = rawS ? rawS.remaining : 0;
        return { name: cl.name, clientBal: cl.remaining, suppBal: suppBal, net: cl.remaining - suppBal };
      });
      c = [
        { h: 'Common Name', k: 'name', noTrans: true },
        { h: 'Balance as client (ours)', k: 'clientBal', f: v => `${fmt(v)} ${currency}` },
        { h: 'Balance as supplier (ours)', k: 'suppBal', f: v => `${fmt(v)} ${currency}` },
        { h: 'Net Settlement', k: 'net', f: v => (v >= 0 ? 'Owed to us ' : 'We owe ') + `${fmt(Math.abs(v))} ${currency}` }
      ];
      const netTotal = r.reduce((s, x) => s + x.net, 0);
      tl = netTotal >= 0 ? "Net in company favor" : "Net in suppliers favor";
      tot = Math.abs(netTotal);
    } else if (type === 'tax') {
      t = "Tax Filing (VAT)";
      r = data.sales.filter(x => inRange(x.date) && n(x.vat) > 0);
      c = [
        { h: 'Date', k: 'date', f: fmtD },
        { h: 'Invoice', k: 'invoiceId' },
        { h: 'Client', k: 'client', noTrans: true },
        { h: 'Basic', v: x => `${fmt(x.totalPrice + n(x.transportPrice) - n(x.discount))} ${currency}` },
        { h: 'Tax (%)', v: x => `${x.vat}%` },
        { h: 'Tax Amount', v: x => `${fmt((x.totalPrice + n(x.transportPrice) - n(x.discount)) * (n(x.vat)/100))} ${currency}` },
        { h: 'Total', k: 'totalAmount', f: v => `${fmt(v)} ${currency}` }
      ];
      tot = r.reduce((s, x) => s + ((x.totalPrice + n(x.transportPrice) - n(x.discount)) * (n(x.vat)/100)), 0);
      tl = "Total Tax Collected";
    }
    return { rows: r, cols: c, title: t, total: tot, totalLabel: tl };
  }, [data.sales, data.incoming, data.expenses, data.clients, data.suppliers, type, from, to, productFilter]);

  return (
    <div className="page">
      <div className="card no-print">
        <div className="card-hdr">
          <div className="card-title">📄 <DynText>Report Setup</DynText></div>
          <div className="card-actions">
            <select id="reportType" name="reportType" className="fi" style={{width:140}} value={type} onChange={e => setType(e.target.value)}>
              <option value="sales"><DynText>Sales</DynText></option>
              <option value="incoming"><DynText>Purchasing</DynText></option>
              <option value="expenses"><DynText>Expenses</DynText></option>
              <option value="settlements"><DynText>Settlements (Clients & Suppliers)</DynText></option>
              <option value="tax"><DynText>Tax Filing (VAT)</DynText></option>
            </select>
            {type === 'sales' && (
              <div style={{width:160}}>
                <SearchableSelect
                  options={[{value:'', label:'All Products'}, ...(data.inventory?.items || []).map(i=>({value: i.name, label: i.name}))]}
                  value={productFilter}
                  placeholder="All products"
                  onChange={e => setProductFilter(e.target.value)}
                />
              </div>
            )}
              <input id="reportDateFrom" name="reportDateFrom" aria-label="From date" type="date" className="fi" style={{width:130}} value={from} onChange={e => setFrom(e.target.value)} />
            <span className="tmt">←</span>
              <input id="reportDateTo" name="reportDateTo" aria-label="To date" type="date" className="fi" style={{width:130}} value={to} onChange={e => setTo(e.target.value)} />
            <button className="btn btn-p" onClick={() => window.print()}>🖨 <DynText>Print / PDF</DynText></button>
          </div>
        </div>
      </div>

      <div className="card print-card">
        <div style={{padding:20, textAlign:'center', borderBottom:'1px solid var(--border)'}}>
          {data?.companyInfo?.logo && <img src={data.companyInfo.logo} alt="Company Logo" style={{maxHeight:80, maxWidth:200, objectFit:'contain', marginBottom:15}} />}
          <h2 style={{margin:0, color:'var(--tp)'}}><DynText>{title}</DynText></h2>
          <div className="tmt ts" style={{marginTop:5}}><DynText>Period from</DynText> {fmtD(from)} <DynText>To</DynText> {fmtD(to)}</div>
        </div>
        <table>
          <thead><tr>{cols.map((c, i) => <th key={i}><DynText>{c.h}</DynText></th>)}</tr></thead>
          <tbody>
            {rows.length === 0 ? <tr><td colSpan={cols.length} className="empty"><DynText>No data available</DynText></td></tr> :
              rows.map((r, i) => (
                <tr key={i} style={type==='settlements' ? {backgroundColor:r.net>0?'rgba(16,185,129,.15)':r.net<0?'rgba(244,63,94,.15)':'transparent'} : {}}>
              {cols.map((c, j) => <td key={j}>{c.v ? (c.noTrans ? c.v(r) : <DynText>{c.v(r)}</DynText>) : (c.f ? (c.noTrans ? c.f(r[c.k]) : <DynText>{c.f(r[c.k])}</DynText>) : (c.noTrans ? r[c.k] : <DynText>{r[c.k]}</DynText>))}</td>)}
                </tr>
              ))}
            {rows.length > 0 && (
              <tr style={{background:'rgba(59,130,246,.1)', fontWeight:'bold'}}>
                <td colSpan={cols.length - 1} style={{textAlign:'left'}}><DynText>{totalLabel}</DynText></td>
                <td>{fmt(total)} <DynText>{currency}</DynText></td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="print-only" style={{marginTop:20, textAlign:'center', fontSize:11, color:'#666'}}>
          <DynText>Report generated by</DynText> {data?.companyInfo?.name || 'Nexora'} ERP — {new Date().toLocaleString(lang === 'en' ? 'en-US' : 'ar-EG')}
        </div>
      </div>
    </div>
  );
});

/* ═══════════════════════════════════════════════════════
   TOGGLE SWITCH
═══════════════════════════════════════════════════════ */
function Toggle({ on, onChange, label }) {
  return (
    <div className="toggle-wrap" onClick={() => onChange(!on)}>
      <div className={"toggle-track" + (on ? ' on' : '')}>
        <div className="toggle-thumb" />
      </div>
      <span className="toggle-label"><DynText>{label}</DynText></span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   USER MANAGEMENT PAGE
═══════════════════════════════════════════════════════ */
const UserManagementPage = memo(function UserManagementPage({ data, setData, user }) {
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  // Default to the current user's account instead of skipping it
  const [selectedEmail, setSelectedEmail] = useState(user?.email || data.systemUsers[0]?.email || '');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) { toast.error('Enter a valid email'); return; }
    setInviting(true);
    try {
      await db.inviteUserToTenant(inviteEmail);
      setData(d => ({
        ...d,
        systemUsers: [...d.systemUsers, { email: inviteEmail.trim(), name: "Pending login...", role: 'User', active: true, perms: DEFAULT_USER_PERMS }]
      }));
      toast.success('Employee invited successfully! They can now create an account and join your company.');
      setInviteEmail('');
    } catch (e) {
      if (e.message === 'ALREADY_ASSIGNED') toast.error('❌ This email is already registered with another company');
      else if (e.message === 'ALREADY_IN_THIS_TENANT') toast.error('ℹ️ This email was already invited to your company');
      else toast.error('❌ Error during invitation');
    }
    setInviting(false);
  };
  
  const currentUserEmailLower = String(user?.email || '').toLowerCase();
  const isOwner = user?.isOwner === true || localStorage.getItem('nile_is_owner') === 'true';
  const isSuperAdmin = currentUserEmailLower === 'negm@nile.com' || currentUserEmailLower === 'aboalaa@nile.com' || isOwner;

  const targetUser = data.systemUsers.find(u => u.email === selectedEmail) || data.systemUsers[0];
  
  if (!targetUser) return <div className="card"><div style={{padding:20,textAlign:'center'}}><DynText>No users</DynText></div></div>;
  
  const isTargetMainOwner = String(targetUser?.email || '').toLowerCase() === 'negm@nile.com' || String(targetUser?.email || '').toLowerCase() === 'aboalaa@nile.com';
  const isTargetProtected = isTargetMainOwner || (targetUser?.role === 'Admin' && !isSuperAdmin);
  const perms = targetUser.perms || DEFAULT_USER_PERMS;

  const setPerm = (section, key, val) => {
    if (isTargetProtected) return;
    setData(d => ({
      ...d,
      systemUsers: d.systemUsers.map(u => u.email === selectedEmail ? {
        ...u, perms: { ...u.perms, [section]: { ...(u.perms?.[section] || DEFAULT_USER_PERMS[section]), [key]: val } }
      } : u)
    }));
    toast.success('Permission updated ✅');
  };

  const toggleAdminRole = () => {
    if (isTargetProtected) return;
    const newRole = targetUser.role === 'Admin' ? 'User' : 'Admin';
    setData(d => ({
      ...d,
      systemUsers: d.systemUsers.map(u => u.email === selectedEmail ? {
        ...u, 
        role: newRole,
        perms: newRole === 'Admin' ? FULL_PERMS : DEFAULT_USER_PERMS 
      } : u)
    }));
    toast.success(newRole === 'Admin' ? 'Promoted to Admin 👑' : 'Changed to regular user (view mode) 👁️');
  };

  const handleDeleteUser = async () => {
    if (isTargetProtected) { toast.error('Cannot delete the admin account'); return; }
    if (targetUser.email === auth.currentUser?.email) { toast.error('You cannot delete your current account'); return; }

    const ok = await confirm('Delete User', `"${targetUser.name}" will be permanently deleted from the system.`, { confirmLabel: 'Permanent Delete', confirmClass: 'btn-d' });
    if (!ok) return;

    setData(d => ({
      ...d,
      systemUsers: d.systemUsers.filter(u => u.email !== selectedEmail),
      bannedEmails: [...(d.bannedEmails || []), selectedEmail.toLowerCase()] // add to the banned list to block sign-in
    }));
    setSelectedEmail('');
    toast.success('User deleted successfully 🗑');
  };

  const toggleAccount = async () => {
    if (isTargetProtected) { toast.error('Cannot disable the admin account'); return; }
    
    // Fix: Prevent self-lockout
    if (targetUser.email === auth.currentUser?.email) { toast.error('Cannot disable your current account'); return; }

    if (targetUser.active) {
      const ok = await confirm('Disable Account',`"${targetUser.name}" will be blocked from signing in. Do you want to continue?`,{ confirmLabel:'Disable', confirmClass:'btn-d' });
      if (!ok) return;
    }
    setData(d => ({
      ...d,
      systemUsers: d.systemUsers.map(u => u.email === selectedEmail ? { ...u, active: !u.active } : u)
    }));
    toast.success(targetUser.active ? '⛔ Account disabled' : '✅ Account activated');
  };

  const resetPerms = () => {
    if (isTargetProtected) return;
    setData(d => ({
      ...d,
      systemUsers: d.systemUsers.map(u => u.email === selectedEmail ? { ...u, perms: DEFAULT_USER_PERMS } : u)
    }));
    toast.success('Account switched to view-only 👁️');
  };

  const grantAll = () => {
    if (isTargetProtected) return;
    const full = {
      incoming:{view:true,add:true,edit:true,del:true},sales:{view:true,add:true,del:true,pay:true},
      clients:{view:true,add:true,del:true,pay:true},workers:{view:true,add:true,del:true,pay:true},
      suppliers:{view:true,add:true,del:true,pay:true},inventory:{view:true,edit:true},
      expenses:{view:true,add:true,del:true},statistics:{view:true},
    };
    setData(d => ({
      ...d,
      systemUsers: d.systemUsers.map(u => u.email === selectedEmail ? { ...u, perms: full } : u)
    }));
    toast.success('All permissions granted');
  };

  const SECTIONS = [
    {key:'incoming',icon:'📥',label:'Purchases',toggles:[{k:'view',l:'View'},{k:'add',l:'Add'},{k:'edit',l:'Edit'},{k:'del',l:'Delete'}]},
    {key:'sales',icon:'💳',label:'Sales',toggles:[{k:'view',l:'View'},{k:'add',l:'Add / Edit'},{k:'del',l:'Delete'},{k:'pay',l:'Record Payment'}]},
    {key:'clients',icon:'👥',label:'Clients',toggles:[{k:'view',l:'View'},{k:'add',l:'Add Client'},{k:'del',l:'Delete'},{k:'pay',l:'Record Payment'}]},
    {key:'workers',icon:'👷',label:'Workers',toggles:[{k:'view',l:'View'},{k:'add',l:'Add Worker'},{k:'del',l:'Delete'},{k:'pay',l:'Issue / Production'}]},
    {key:'suppliers',icon:'🏪',label:'Suppliers',toggles:[{k:'view',l:'View'},{k:'add',l:'Add Supplier'},{k:'del',l:'Delete'},{k:'pay',l:'Record Payment'}]},
    {key:'inventory',icon:'📦',label:'Inventory',toggles:[{k:'view',l:'View'},{k:'edit',l:'Add / Deduct'}]},
    {key:'expenses',icon:'💼',label:'Expenses',toggles:[{k:'view',l:'View'},{k:'add',l:'Add'},{k:'del',l:'Delete'}]},
    {key:'logistics',icon:'🚛',label:'Movement',toggles:[{k:'view',l:'View'},{k:'add',l:'Add'},{k:'del',l:'Delete'}]},
    {key:'treasury',icon:'💰',label:'Treasury',toggles:[{k:'view',l:'View'},{k:'add',l:'Deposit / Withdraw'}]},
    {key:'hr',icon:'👔',label:'HR',toggles:[{k:'view',l:'View'},{k:'add',l:'Add'},{k:'del',l:'Delete'}]},
    {key:'crm',icon:'🤝',label:'CRM',toggles:[{k:'view',l:'View'},{k:'add',l:'Add'}]},
    {key:'manufacturing',icon:'🏭',label:'Manufacturing & Production',toggles:[{k:'view',l:'View'},{k:'add',l:'Add & Start'},{k:'del',l:'Delete'},{k:'viewCosts',l:'View Costs'}]},
    {key:'finance',icon:'💹',label:'Finance & Profit',toggles:[{k:'viewCosts',l:'View Costs & Profits'},{k:'viewReports',l:'View Reports & Taxes'}]},
    {key:'statistics',icon:'📈',label:'Statistics',toggles:[{k:'view',l:'View'}]},
  ];

  return (
    <div className="page">
      {dialog}
      <div className="card" style={{marginBottom:22}}>
        <div className="card-hdr"><div className="card-title">👤 <DynText>Accounts Management</DynText></div></div>
        <div style={{padding:18}}>
          <div style={{display:'flex', gap:8, marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid var(--border)'}}>
             <input type="email" className="fi" placeholder="Email of the new employee (to add to your company)..." value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} />
             <button className="btn btn-p" onClick={handleInvite} disabled={inviting}>{inviting ? <DynText>⏳...</DynText> : <DynText>+ Invite Employee</DynText>}</button>
          </div>
          {data.systemUsers.map(u => {
            const isProtectedUI = u.role === 'Admin' || String(u.email || '').toLowerCase() === 'aboalaa@nile.com';
            return (
            <div key={u.email} className={"user-acc-card " + (selectedEmail === u.email ? "active-card " : "") + (u.active ? "" : "disabled-card")}
                 style={{cursor:'pointer',borderWidth:selectedEmail===u.email?2:1}}
                 onClick={() => setSelectedEmail(u.email)}>
              <div style={{display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}>
                <div style={{width:44,height:44,borderRadius:12,background:isProtectedUI?'linear-gradient(135deg,var(--bright),var(--vio))':'linear-gradient(135deg,var(--gold),var(--orange))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0,overflow:'hidden'}}>
                  {u.photoURL ? <img src={u.photoURL} alt={`${u.name} photo`} style={{width:'100%',height:'100%',objectFit:'cover'}} /> : (isProtectedUI?'⭐':'👤')}
                </div>
                <div style={{flex:1}}><div style={{fontSize:15,fontWeight:800,color:'var(--tp)'}}>{u.name}</div><div style={{fontSize:11,color:'var(--tm)',marginTop:3}}>{u.email || 'No email'}</div></div>
                <span className={"acc-badge "+(u.active?'active':'inactive')}><DynText>{isProtectedUI?'System Admin':u.active?'✅ Active':'⛔ Disabled'}</DynText></span>
                {selectedEmail === u.email && !isProtectedUI && (
                  <div style={{display:'flex',gap:5}}>
                    <button className={"btn btn-sm "+(u.active?'btn-d':'btn-s')} onClick={(e)=>{e.stopPropagation();toggleAccount();}}><DynText>{u.active?'Disable':'Enable'}</DynText></button>
                    <button className="btn btn-sm btn-d btn-icon" onClick={(e)=>{e.stopPropagation();handleDeleteUser();}} title="Delete permanently">🗑</button>
                  </div>
                )}
              </div>
            </div>
          )})}
        </div>
      </div>
      
      {selectedEmail && (
      <div className="card">
        <div className="card-hdr">
          <div className="card-title">🔐 <DynText>Permissions:</DynText> {targetUser.name}</div>
          {!isTargetProtected && (
            <div className="card-actions">
              <button className={`btn btn-sm ${targetUser.role === 'Admin' ? 'btn-d' : 'btn-gold'}`} onClick={toggleAdminRole}>
                <DynText>{targetUser.role === 'Admin' ? 'Revoke Admin 👤' : 'Promote to Admin 👑'}</DynText>
              </button>
              <button className="btn btn-s btn-sm" onClick={grantAll}>✅ <DynText>Grant All</DynText></button>
              <button className="btn btn-g btn-sm" onClick={resetPerms}>👁️ <DynText>View-Only Mode</DynText></button>
            </div>
          )}
        </div>
        <div style={{padding:18}}>
          {isTargetProtected ? (
            <div style={{padding:'40px 20px', textAlign:'center'}}>
              <div style={{fontSize:48, marginBottom:16}}>🛡️</div>
              <h3 style={{color:'var(--tp)', marginBottom:8}}><DynText>Protected Admin Account</DynText></h3>
              <p className="ts tmt"><DynText>This account belongs to the system admin</DynText> ({targetUser.name}) <DynText>and has all permissions by default. Permissions cannot be restricted or disabled.</DynText></p>
            </div>
          ) : (
            <>
              {targetUser.role === 'Admin' && !isTargetMainOwner && (
                <div className="alert-bar info" style={{marginBottom:18}}><span>👑</span><span className="ts"><DynText>This user has system admin permissions (full access). To customize permissions or set view-only mode, revoke admin first.</DynText></span></div>
              )}
              {!targetUser.active&&<div className="alert-bar warn" style={{marginBottom:18}}><span>⚠️</span><span className="ts">Account disabled — permissions are saved and applied on activation</span></div>}
              <div style={{fontSize:12,color:'var(--tm)',marginBottom:16,padding:'10px 14px',background:'rgba(37,99,235,.06)',borderRadius:9,border:'1px solid var(--border)'}}>
                💡 <strong style={{color:'var(--light)'}}><DynText>Note:</DynText></strong> <DynText>The admin always has full permissions. These settings only apply to regular users.</DynText>
              </div>
              {SECTIONS.map(sec => {
                const sp = perms?.[sec.key] || {};
                return (
                  <div key={sec.key} className="perm-section">
                    <div className="perm-section-hdr">
                      <div className="perm-section-title"><span style={{fontSize:18}}>{sec.icon}</span><span>{sec.label}</span></div>
                      <span className={"badge "+(sec.toggles.every(t=>sp[t.k])?'b-ok':sp.view?'b-warn':'b-err')}>{sec.toggles.every(t=>sp[t.k])?'Full Access':sp.view?'View only':'Banned'}</span>
                    </div>
                    <div className="perm-toggles">
                      {sec.toggles.map(t=><Toggle key={t.k} on={!!sp[t.k]} label={t.l} onChange={v=>setPerm(sec.key,t.k,v)} />)}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
      )}
    </div>
  );
});

/* ═══════════════════════════════════════════════════════
   SIMPLE CROPPER COMPONENT
═══════════════════════════════════════════════════════ */
function SimpleCropper({ imageSrc, onCancel, onCrop }) {
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const imgRef = useRef(null);
  
  // Crop frame dimensions (roughly matches the invoice logo area ~2.3:1)
  const CROP_W = 280;
  const CROP_H = 120;

  const startDrag = (cx, cy) => { setDragging(true); setLastPos({ x: cx, y: cy }); };
  const moveDrag = (cx, cy) => {
    if (!dragging) return;
    setPos(p => ({ x: p.x + (cx - lastPos.x), y: p.y + (cy - lastPos.y) }));
    setLastPos({ x: cx, y: cy });
  };
  const stopDrag = () => setDragging(false);
  
  // Fine-tune controls
  const moveStep = (dx, dy) => setPos(p => ({ x: p.x + dx, y: p.y + dy }));
  const zoomStep = (val) => setZoom(z => Math.max(0.1, Math.min(3, z + val)));
  const centerImg = () => { setPos({x:0, y:0}); setZoom(1); };

  const doCrop = () => {
    const cvs = document.createElement('canvas');
    cvs.width = CROP_W; cvs.height = CROP_H;
    const ctx = cvs.getContext('2d');
    const img = imgRef.current;
    if (img) {
      ctx.drawImage(img, pos.x, pos.y, img.naturalWidth * zoom, img.naturalHeight * zoom);
      // Save image as Base64 for instant saves and to fully avoid Firebase Storage issues
      const b64 = cvs.toDataURL('image/webp', 0.85);
      onCrop(b64);
    }
  };

  return createPortal(
    <div className="modal-ov" style={{zIndex:3000}}>
      <div className="modal" style={{maxWidth:400}}>
        <div className="modal-hdr"><div className="modal-title">✂️ <DynText>Crop & Edit Logo</DynText></div><button className="btn btn-g btn-sm" onClick={centerImg}>↺ <DynText>Reset</DynText></button></div>
        <div className="modal-body" style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
          <div style={{
              width:CROP_W, height:CROP_H, border:'2px dashed var(--bright)', overflow:'hidden', position:'relative',
              cursor:dragging?'grabbing':'grab', touchAction:'none', // prevent the page from moving
              background:'repeating-linear-gradient(45deg,#eee,#eee 10px,#f9f9f9 10px,#f9f9f9 20px)'
            }}
            onMouseDown={e=>startDrag(e.clientX,e.clientY)} onMouseMove={e=>moveDrag(e.clientX,e.clientY)} onMouseUp={stopDrag} onMouseLeave={stopDrag}
            onTouchStart={e=>{e.preventDefault(); startDrag(e.touches[0].clientX,e.touches[0].clientY)}} 
            onTouchMove={e=>{e.preventDefault(); moveDrag(e.touches[0].clientX,e.touches[0].clientY)}} 
            onTouchEnd={stopDrag}>
            
            <img ref={imgRef} src={imageSrc} alt="Crop preview" draggable={false} style={{
              position:'absolute', top:0, left:0,
              transform:`translate(${pos.x}px,${pos.y}px) scale(${zoom})`, transformOrigin:'0 0',
              pointerEvents:'none', maxWidth:'none'
            }} />
            
            {/* Grid overlay to help with alignment */}
            <div style={{position:'absolute',inset:0,pointerEvents:'none',
              backgroundImage:`linear-gradient(rgba(59,130,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.3) 1px, transparent 1px)`,
              backgroundSize:'50% 50%', backgroundPosition:'center center', opacity:0.5}}>
              <div style={{position:'absolute',top:'50%',left:0,right:0,height:1,background:'rgba(244,63,94,0.6)'}}></div>
              <div style={{position:'absolute',left:'50%',top:0,bottom:0,width:1,background:'rgba(244,63,94,0.6)'}}></div>
            </div>
          </div>
          
          <div className="fb mt3" style={{width:'100%', gap:8}}>
            <button className="btn btn-g btn-sm" onClick={()=>zoomStep(-0.1)}>➖</button>
            <input type="range" min="0.1" max="3" step="0.05" value={zoom} onChange={e=>setZoom(parseFloat(e.target.value))} style={{flex:1}} />
            <button className="btn btn-g btn-sm" onClick={()=>zoomStep(0.1)}>➕</button>
          </div>

          <div className="fb mt2" style={{gap:10}}>
            <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:2}}>
               <div></div><button className="btn btn-g btn-sm" style={{padding:'2px 8px'}} onClick={()=>moveStep(0,-2)}>▲</button><div></div>
               <button className="btn btn-g btn-sm" style={{padding:'2px 8px'}} onClick={()=>moveStep(-2,0)}>◀</button>
               <div style={{textAlign:'center',fontSize:10}}>Position</div>
               <button className="btn btn-g btn-sm" style={{padding:'2px 8px'}} onClick={()=>moveStep(2,0)}>▶</button>
               <div></div><button className="btn btn-g btn-sm" style={{padding:'2px 8px'}} onClick={()=>moveStep(0,2)}>▼</button><div></div>
            </div>
            <div className="fg" style={{flex:1}}>
              <div className="txs tmt">💡 Use arrows for fine positioning</div>
              <div className="txs tmt">Red lines = invoice center</div>
            </div>
          </div>

        </div>
        <div className="modal-footer"><button className="btn btn-p" onClick={doCrop}>✅ <DynText>Crop & Apply</DynText></button><button className="btn btn-g" onClick={onCancel}><DynText>Cancel</DynText></button></div>
      </div>
    </div>,
    document.body
  );
}

/* ═══════════════════════════════════════════════════════
   SETTINGS PAGE (NEW)
═══════════════════════════════════════════════════════ */
const SettingsPage = memo(function SettingsPage({ data, setData, user }) {
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const { t } = useLanguage();
  const [newExp, setNewExp] = useState('');
  const [labels, setLabels] = useState(data.appLabels || EMPTY_DATA.appLabels);
  const [compInfo, setCompInfo] = useState(data.companyInfo || EMPTY_DATA.companyInfo);
  const [logoLoading, setLogoLoading] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [cropImg, setCropImg] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showProdModal, setShowProdModal] = useState(false);
  const [editProdId, setEditProdId] = useState(null);
  const [editProdForm, setEditProdForm] = useState({ name:'', unit:'pcs', quantity:'', threshold:'', price: '', image:null });
  const [editProdImageFile, setEditProdImageFile] = useState(null);
  const currency = labels.currency || t('currency');
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem('nile_gemini_key') || 'AIzaSyD9Mf5g6ZjQLdEDh8hrIhnmtSb38enBCNQ');
  
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetOpts, setResetOpts] = useState({
    sales: true, incoming: true, expenses: true, treasury: true,
    clients: false, suppliers: false, workers: false, inventory: false
  });
  
  // Refresh local data when the global data changes (after save)
  useEffect(() => {
    if (data.companyInfo) setCompInfo(data.companyInfo);
  }, [data.companyInfo]);

  const handleAddExpType = () => {
    if (!newExp.trim()) return;
    if (data.expenseTypes.includes(newExp.trim())) { toast.error('Already exists'); return; }
    setData(d => ({ ...d, expenseTypes: [...d.expenseTypes, newExp.trim()] }));
    setNewExp(''); toast.success('Added');
  };

  const saveLabels = () => {
    setData(d => ({ ...d, appLabels: labels }));
    toast.success('Labels updated ✅');
  };

  const saveCompInfo = async () => {
    if (logoLoading) return;
    if (!compInfo.name.trim()) { toast.error('Company name is required'); return; }
    setLogoLoading(true);
    try {
      let finalLogo = compInfo.logo;
      if (logoFile) {
        finalLogo = (typeof logoFile === 'string' && logoFile.startsWith('data:image')) ? logoFile : await db.uploadFile(logoFile);
      }
      const updatedInfo = { ...compInfo, logo: finalLogo };
      setData(d => ({ ...d, companyInfo: updatedInfo }));
      setLogoFile(null);
      toast.success('Company info updated ✅');
    } catch (err) {
      console.error(err);
      toast.error('Error while saving: ' + (err.message || ''));
    } finally {
      setLogoLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = () => setCropImg(reader.result);
      reader.readAsDataURL(e.target.files[0]);
      e.target.value = ''; // Reset input
    }
  };

  const downloadBackup = () => {
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `nile_backup_${today()}.json`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
  };

  const handleRestore = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed && Array.isArray(parsed.sales) && parsed.inventory) {
          const ok = await confirm('Restore Backup', 'Warning: all current data will be erased and replaced with the backup. Are you sure?', {confirmClass: 'btn-d'});
          if (!ok) return;
                  parsed._forceLastModified = Date.now() + 10000; // force the system & server to accept the restored copy
        setData(() => mergeWithDefaults(parsed));
          toast.success('Data restored successfully ♻️');
        } else { toast.error('Invalid backup file'); }
      } catch (err) { toast.error('Error reading file'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSaveProduct = async () => {
    if (!editProdForm.name.trim()) return toast.error('Enter product name');
    
    const newName = editProdForm.name.trim();
    const exists = (data.inventory?.items || []).some(i => i.name === newName && i.id !== editProdId);
    if (exists) return toast.error('A product with this name already exists');
    
    let uploadedUrl = editProdForm.image || null;
    if (editProdImageFile) {
       setLogoLoading(true);
       try {
         uploadedUrl = await db.uploadFile(editProdImageFile);
       } catch(e) { console.error(e); }
       setLogoLoading(false);
    }

    setData(d => {
      if (editProdId) {
        const oldItem = d.inventory.items.find(i => i.id === editProdId);
        if (!oldItem) return d;
        const oldName = oldItem.name;
        const newItems = (d.inventory?.items || []).map(i => i.id === editProdId ? { ...i, name: newName, unit: editProdForm.unit, threshold: n(editProdForm.threshold), price: n(editProdForm.price), image: uploadedUrl } : i);
        if (oldName !== newName) {
          return {
            ...d,
            inventory: { ...d.inventory, items: newItems },
            sales: (d.sales || []).map(s => s.product === oldName ? { ...s, product: newName } : s),
            incoming: (d.incoming || []).map(i => i.category === oldName ? { ...i, category: newName } : i),
            clients: (d.clients || []).map(c => ({...c, transactions: (c.transactions || []).map(t => t.product === oldName ? {...t, product: newName} : (t.category === oldName ? {...t, category: newName} : t))})),
            suppliers: (d.suppliers || []).map(s => ({...s, records: (s.records || []).map(r => r.category === oldName ? {...r, category: newName} : r)})),
            workers: (d.workers || []).map(w => ({...w, records: (w.records || []).map(r => r.category === oldName ? {...r, category: newName} : r)})),
            bom: (d.bom || []).map(b => ({...b, finalProduct: b.finalProduct === oldName ? newName : b.finalProduct, ingredients: (b.ingredients || []).map(ing => ing.product === oldName ? {...ing, product: newName} : ing)})),
            manufacturingOrders: (d.manufacturingOrders || []).map(mo => ({...mo, finalProduct: mo.finalProduct === oldName ? newName : mo.finalProduct})),
            auditLog: [createLog(user, 'Edit Product', `Renamed product from ${oldName} to ${newName}`), ...(d.auditLog || [])].slice(0, 100)
          };
        } else {
          return { ...d, inventory: { ...d.inventory, items: newItems } };
        }
      } else {
        return {
          ...d,
          inventory: { ...d.inventory, items: [...(d.inventory?.items || []), { id: Date.now().toString(), name: editProdForm.name.trim(), unit: editProdForm.unit, quantity: n(editProdForm.quantity), threshold: n(editProdForm.threshold), price: n(editProdForm.price), waste: 0, image: uploadedUrl }] },
          auditLog: [createLog(user, 'Add Product', `Add product ${editProdForm.name}`), ...d.auditLog].slice(0, 100)
        };
      }
    });
    toast.success('Saved successfully ✅');
    setShowProdModal(false);
  };

  const handleDeleteProduct = async (prod) => {
    const ok = await confirm('Delete Product Permanently ⚠️', `Are you sure you want to delete "${prod.name}"? It will be removed from all records (sales, purchases, workers) and linked accounts adjusted!`, { confirmLabel: 'Yes, delete permanently', confirmClass: 'btn-d' });
    if (!ok) return;
    setData(d => {
      const targetName = prod.name;
      const salesToRemove = (d.sales || []).filter(s => s.product === targetName);
      const saleIdsToRemove = salesToRemove.map(s => s.id);
      const incToRemove = (d.incoming || []).filter(i => i.category === targetName);
      const incIdsToRemove = incToRemove.map(i => i.id);
      return {
        ...d,
        inventory: { ...d.inventory, items: (d.inventory?.items || []).filter(i => i.id !== prod.id) },
        sales: (d.sales || []).filter(s => s.product !== targetName),
        incoming: (d.incoming || []).filter(i => i.category !== targetName),
        clients: (d.clients || []).map(c => { let tB = c.totalBought || 0, tP = c.totalPaid || 0, rem = c.remaining || 0; salesToRemove.forEach(s => { if(s.client === c.name) { tB -= s.totalAmount; tP -= (s.paid || 0); rem -= s.remaining; } }); return { ...c, totalBought: Math.max(0, tB), totalPaid: Math.max(0, tP), remaining: rem, transactions: (c.transactions || []).filter(t => !saleIdsToRemove.includes(t.saleId) && t.product !== targetName && t.category !== targetName) }; }),
        suppliers: (d.suppliers || []).map(s => { let tS = s.totalSupplied || 0, tP = s.totalPaid || 0, rem = s.remaining || 0; incToRemove.forEach(inc => { if(inc.supplier === s.name) { tS -= inc.totalExpenses; tP -= (inc.paid || 0); rem -= (inc.remaining !== undefined ? inc.remaining : inc.totalExpenses); } }); return { ...s, totalSupplied: Math.max(0, tS), totalPaid: Math.max(0, tP), remaining: rem, records: (s.records || []).filter(r => !incIdsToRemove.includes(r.incomingId) && r.category !== targetName) }; }),
        workers: (d.workers || []).map(w => { let tE = w.totalEarned || 0, rem = w.remaining || 0; (w.records || []).filter(r => r.category === targetName).forEach(r => { tE -= r.total; rem -= r.total; }); return { ...w, totalEarned: Math.max(0, tE), remaining: rem, records: (w.records || []).filter(r => r.category !== targetName) }; }),
        bom: (d.bom || []).filter(b => b.finalProduct !== targetName).map(b => ({...b, ingredients: (b.ingredients || []).filter(ing => ing.product !== targetName)})),
        auditLog: [createLog(user, 'Delete Product', `Product ${targetName} and all its records deleted`), ...(d.auditLog || [])].slice(0, 100)
      };
    });
    toast.success('Permanently deleted successfully 🗑️');
  };

  const handleFactoryReset = async () => {
    const ok = await confirm('Confirm Clear', 'Warning: the selected data will be permanently erased and cannot be undone. Are you sure?', { confirmLabel: 'Yes, clear', confirmClass: 'btn-d' });
    if (!ok) return;
    
    setData(d => {
      let newData = { ...d };

      // 1. Clear financial transactions & operations
      if (resetOpts.sales) {
        newData.sales = [];
        if (!resetOpts.clients) newData.clients = newData.clients.map(c => ({...c, totalBought:0, totalPaid:0, remaining:0, transactions:[]}));
      }
      if (resetOpts.incoming) {
        newData.incoming = [];
        if (!resetOpts.suppliers) newData.suppliers = newData.suppliers.map(s => ({...s, totalSupplied:0, totalPaid:0, remaining:0, payments:[], records:[]}));
      }
      if (resetOpts.expenses) newData.expenses = [];
      if (resetOpts.treasury) {
        newData.treasuryMoves = [];
        newData.manufacturingOrders = [];
        newData.vehicleLog = [];
      }

      // 2. Permanently clear entities & names
      if (resetOpts.clients) newData.clients = [];
      if (resetOpts.suppliers) newData.suppliers = [];
      if (resetOpts.workers) newData.workers = [];
      else if (resetOpts.sales || resetOpts.incoming) newData.workers = newData.workers.map(w => ({...w, totalEarned:0, received:0, advance:0, remaining:0, records:[]}));

      if (resetOpts.inventory) {
        newData.inventory = { items: [], log: [] };
        newData.bom = [];
      } else if (resetOpts.sales || resetOpts.incoming) {
        newData.inventory = { items: newData.inventory.items.map(i => ({...i, quantity: 0})), log: [] };
      }

      newData.auditLog = [createLog(user, 'Clear Data', 'Selected data cleared (partial factory reset)'), ...(newData.auditLog || [])].slice(0, 100);

      return newData;
    });
    
    setShowResetModal(false);
    toast.success('Factory reset successful ♻️');
  };

  const themes = [
    {n:'Blue (default)',v:'radial-gradient(ellipse 80% 60% at 20% -10%,rgba(37,99,235,.12) 0%,transparent 60%),radial-gradient(ellipse 60% 40% at 80% 100%,rgba(124,58,237,.08) 0%,transparent 50%),var(--deep)'},
    {n:'Dark',v:'#050505'},
    {n:'Royal Gold',v:'radial-gradient(circle at top, #1a1000, #000)'}
  ];

  // Mock preview data
  const previewLogo = logoFile ? logoFile : compInfo.logo;
  
  return (
    <div className="page">
      {dialog}
      {cropImg && <SimpleCropper imageSrc={cropImg} onCancel={()=>setCropImg(null)} onCrop={b=>{setLogoFile(b);setCropImg(null);}} />}
      
      {/* Invoice Preview Modal */}
      <Modal open={showPreview} onClose={()=>setShowPreview(false)} title="👁 Invoice Preview" wide footer={<button className="btn btn-g" onClick={()=>setShowPreview(false)}>Close</button>}>
        <div style={{background:'#eee', padding:20, borderRadius:8, maxHeight:'60vh', overflowY:'auto'}}>
          <div className="inv-paper" style={{transform:'scale(0.85)', transformOrigin:'top center', margin:'0 auto', minHeight:'auto'}}>
            <div className="inv-header">
              <div className="inv-logo-area">
                {previewLogo && <img src={previewLogo} alt="Company Logo" style={{maxHeight:80,maxWidth:180,objectFit:'contain',marginBottom:10}} />}
              <div className="inv-title"><DynText>{compInfo.name || 'Company'}</DynText></div>
              {compInfo.activity && <div className="inv-sub">{compInfo.activity}</div>}
              </div>
              <div className="inv-meta">
                <div className="inv-label">Invoice Number</div><div className="inv-val">#INV-123456</div>
                <div className="inv-label">Issue Date</div><div className="inv-val">{fmtD(today())}</div>
              </div>
            </div>
            <div className="inv-grid">
              <div className="inv-box">
                <div className="inv-box-hdr"><DynText>Client (Bill To)</DynText></div>
                <div style={{fontWeight:'bold',fontSize:16}}><DynText>Sample Client</DynText></div>
                <div style={{marginTop:5}}>01xxxxxxxxx</div>
                <div><DynText>Cairo, Egypt</DynText></div>
              </div>
              <div className="inv-box">
                <div className="inv-box-hdr"><DynText>Shipment Details</DynText></div>
                <div><DynText>Warehouse: Main</DynText></div>
                <div><DynText>Status: Fully Paid</DynText> ✅</div>
              </div>
            </div>
            <table className="inv-table">
              <thead><tr><th>#</th><th>Description / Product</th><th style={{textAlign:'center'}}>Quantity</th><th style={{textAlign:'center'}}>Unit</th><th style={{textAlign:'center'}}>Unit Price</th><th style={{textAlign:'center'}}>Total</th></tr></thead>
              <tbody>
                <tr><td>1</td><td style={{fontWeight:'bold'}}><DynText>{data.inventory?.items?.[0]?.name || 'Product 1'}</DynText></td><td style={{textAlign:'center'}}>1,000</td><td style={{textAlign:'center'}}><DynText>{data.inventory?.items?.[0]?.unit || 'count'}</DynText></td><td style={{textAlign:'center'}}>50</td><td style={{textAlign:'center',fontWeight:'bold'}}>50,000 {currency}</td></tr>
              </tbody>
            </table>
            <div className="inv-summary">
              <div className="inv-sum-box">
                <div className="inv-sum-row"><span><DynText>Subtotal</DynText></span><span>50,000 <DynText>{currency}</DynText></span></div>
                <div className="inv-sum-row"><span><DynText>Transport Cost</DynText></span><span>0 <DynText>{currency}</DynText></span></div>
                <div className="inv-sum-row inv-total"><span><DynText>Grand Total</DynText></span><span>50,000 <DynText>{currency}</DynText></span></div>
              </div>
            </div>
            <div className="inv-footer">
              <div>{compInfo.footer || `Thank you for your business with ${compInfo.name}`}</div>
              <div style={{marginTop:5}}><DynText>Address:</DynText> {compInfo.address} - <DynText>Phone:</DynText> {compInfo.phone}</div>
              {compInfo.taxNumber && <div style={{marginTop:3}}>VAT #: {compInfo.taxNumber}</div>}
              {(compInfo.facebook || compInfo.instagram) && <div style={{marginTop:3}}>{[compInfo.facebook && `📘 ${compInfo.facebook}`, compInfo.instagram && `📷 ${compInfo.instagram}`].filter(Boolean).join('   ')}</div>}
            </div>
          </div>
        </div>
      </Modal>

      <div className="dgrid">
        <div className="card" style={{gridColumn: '1 / -1'}}>
          <div className="card-hdr">
            <div className="card-title">📦 <DynText>Products & Categories Management (Master Inventory)</DynText></div>
            <button className="btn btn-p btn-sm" onClick={() => { setEditProdId(null); setEditProdImageFile(null); setEditProdForm({ name:'', unit:'pcs', quantity:'', threshold:'', price: '', image:null }); setShowProdModal(true); }}>+ <DynText>Add Product</DynText></button>
          </div>
          <div style={{padding:18, display:'flex', gap:10, flexWrap:'wrap'}}>
            {(data.inventory?.items || []).map(item => (
              <div key={item.id} style={{padding: '10px 14px', background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 250px', minWidth: 250}}>
                {item.image && <img src={item.image} style={{width:40, height:40, borderRadius:8, objectFit:'cover'}} alt="" />}
                <div style={{flex: 1}}><div className="fw7"><DynText>{item.name}</DynText></div><div className="txs tmt"><DynText>Unit:</DynText> <DynText>{item.unit}</DynText> • <DynText>Low-Stock Threshold:</DynText> {item.threshold}{item.price ? <><DynText> • Price: </DynText>{item.price}</> : ''}</div></div>
                <button className="btn btn-g btn-icon btn-sm" onClick={() => { setEditProdId(item.id); setEditProdImageFile(null); setEditProdForm({ name: item.name, unit: item.unit, threshold: item.threshold, quantity: item.quantity, price: item.price || '', image: item.image }); setShowProdModal(true); }}>⚙️</button>
                <button className="btn btn-d btn-icon btn-sm" onClick={() => handleDeleteProduct(item)}>🗑</button>
              </div>
            ))}
            {(data.inventory?.items || []).length === 0 && <div className="empty" style={{width:'100%'}}><DynText>No products. Start by adding your first product.</DynText></div>}
          </div>
        </div>
        <div className="card">
          <div className="card-hdr">
            <div className="card-title">🏢 <DynText>Company Info (for Invoice)</DynText></div>
            <div className="card-actions">
          <button className="btn btn-g btn-sm" onClick={()=>setShowPreview(true)}>👁 <DynText>Invoice Preview</DynText></button>
          <button className="btn btn-p btn-sm" type="button" onClick={saveCompInfo} disabled={logoLoading}>{logoLoading ? <DynText>Saving...</DynText> : <DynText>Save Changes</DynText>}</button>
            </div>
          </div>
          <div style={{padding:18}}>
            <div className="form-grid">
              <FormField label="Company Logo" full>
                <div style={{display:'flex',alignItems:'center',gap:15}}>
                  {(logoFile || compInfo.logo) && <img src={logoFile ? logoFile : compInfo.logo} alt="Company Logo" style={{maxHeight:80,maxWidth:180,objectFit:'contain',marginBottom:10,border:'1px solid var(--border)',borderRadius:4,padding:4}} />}
                  <div className="btn btn-g btn-sm" style={{cursor:'pointer', position: 'relative', overflow: 'hidden'}}>
                📷 <DynText>Choose Image</DynText>
                    <input type="file" aria-label="Choose logo" id="compLogo" name="compLogo" accept="image/*" style={{position:'absolute', top:0, left:0, opacity:0, width:'100%', height:'100%', cursor:'pointer'}} onChange={handleFileSelect} />
                  </div>
              {(logoFile || compInfo.logo) && <button className="btn btn-d btn-sm" onClick={()=>{setLogoFile(null);setCompInfo(prev=>({...prev, logo: null}));}}>🗑 <DynText>Remove</DynText></button>}
                </div>
              </FormField>
              <FormField label="Company Name"><input className="fi" value={compInfo.name} onChange={e=>setCompInfo(prev=>({...prev, name:e.target.value}))} /></FormField>
              <FormField label="Business Activity (on invoice)"><input className="fi" value={compInfo.activity || ''} onChange={e=>setCompInfo(prev=>({...prev, activity:e.target.value}))} placeholder="e.g. Import & Export" /></FormField>
              <FormField label="Address"><input className="fi" value={compInfo.address} onChange={e=>setCompInfo(prev=>({...prev, address:e.target.value}))} /></FormField>
              <FormField label="Phone"><input className="fi" value={compInfo.phone} onChange={e=>setCompInfo(prev=>({...prev, phone:e.target.value}))} /></FormField>
              <FormField label="Tax / VAT number"><input className="fi" value={compInfo.taxNumber || ''} onChange={e=>setCompInfo(prev=>({...prev, taxNumber:e.target.value}))} placeholder="e.g. 123-456-789" /></FormField>
              <FormField label="📘 Facebook page URL"><input className="fi" value={compInfo.facebook || ''} onChange={e=>setCompInfo(prev=>({...prev, facebook:e.target.value}))} placeholder="https://facebook.com/yourpage" style={{direction:'ltr'}} /></FormField>
              <FormField label="📷 Instagram URL"><input className="fi" value={compInfo.instagram || ''} onChange={e=>setCompInfo(prev=>({...prev, instagram:e.target.value}))} placeholder="https://instagram.com/yourhandle" style={{direction:'ltr'}} /></FormField>
              <FormField label="Invoice footer text" full><input className="fi" value={compInfo.footer || ''} onChange={e=>setCompInfo(prev=>({...prev, footer:e.target.value}))} placeholder="e.g. Thank you for your business" /></FormField>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-hdr">
            <div className="card-title">🤖 <DynText>AI Settings (Gemini)</DynText></div>
            <button className="btn btn-p btn-sm" onClick={() => { localStorage.setItem('nile_gemini_key', geminiKey); toast.success('Key saved successfully ✅'); }}><DynText>Save Key</DynText></button>
          </div>
          <div style={{padding:18}}>
            <div className="ts tmt" style={{marginBottom:10}}><DynText>To enable real AI that understands your commands and can execute, read, and delete operations, get a free key from Google AI Studio and enter it here:</DynText></div>
            <FormField label="Gemini API Key" full>
               <input type="password" placeholder="AIzaSy..." className="fi" value={geminiKey} onChange={e=>setGeminiKey(e.target.value)} style={{direction:'ltr', fontFamily:'monospace'}} />
            </FormField>
          </div>
        </div>
        <div className="card">
          <div className="card-hdr"><div className="card-title">🎨 <DynText>Appearance</DynText></div></div>
          <div style={{padding:18}}>
            <div className="ts tmt" style={{marginBottom:10}}><DynText>Choose background color:</DynText></div>
            <div style={{display:'flex',gap:10}}>
              {themes.map((t,i)=><button key={i} className="btn btn-g" onClick={()=>{document.documentElement.style.setProperty('--bg-grad',t.v);localStorage.setItem('nile_bg_grad',t.v);}}><DynText>{t.n}</DynText></button>)}
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-hdr"><div className="card-title">💾 <DynText>Backup</DynText></div></div>
          <div style={{padding:18}}>
            <div className="ts tmt" style={{marginBottom:10}}><DynText>Download a full data backup:</DynText></div>
            <button className="btn btn-p" onClick={downloadBackup}>⬇ <DynText>Download JSON</DynText></button>
            <button className="btn btn-s" onClick={()=>exportCSV(data)} style={{marginTop:8}}>⬇ <DynText>Export CSV</DynText></button>
            
            <div className="divider" style={{margin:'20px 0'}} />
            <div className="ts tmt" style={{marginBottom:10}}><DynText>Restore a backup:</DynText></div>
            <label className="btn btn-gold" style={{cursor:'pointer', display:'inline-flex'}}>⬆ <DynText>Restore from JSON</DynText><input type="file" accept=".json" hidden onChange={handleRestore} /></label>

            <div className="divider" style={{margin:'20px 0'}} />
            <div className="ts tmt" style={{marginBottom:10,color:'var(--rose-l)'}}><DynText>Danger Zone:</DynText></div>
            <button className="btn btn-d" onClick={() => setShowResetModal(true)}>⚠️ <DynText>Reset Data (Factory Reset Options)</DynText></button>
          </div>
        </div>
        <div className="card">
          <div className="card-hdr"><div className="card-title">🏷 <DynText>Expense Types</DynText></div></div>
          <div style={{padding:18}}>
            <div style={{display:'flex',gap:8,marginBottom:10}}>
              <input id="newExpenseType" name="newExpenseType" className="fi" placeholder="New type..." value={newExp} onChange={e=>setNewExp(e.target.value)} />
              <button className="btn btn-s" onClick={handleAddExpType}>+</button>
            </div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{data.expenseTypes.map(t=><span key={t} className="badge b-info"><DynText>{t}</DynText></span>)}</div>
          </div>
        </div>
        <div className="card">
          <div className="card-hdr">
            <div className="card-title">✏️ <DynText>Customize Labels</DynText></div>
            <button className="btn btn-p btn-sm" onClick={saveLabels}><DynText>Save Changes</DynText></button>
          </div>
          <div style={{padding:18}}>
            <div className="form-grid">
              <FormField label="Sales"><input className="fi" value={labels.sales} onChange={e=>setLabels({...labels, sales:e.target.value})} /></FormField>
              <FormField label="Purchases"><input className="fi" value={labels.incoming} onChange={e=>setLabels({...labels, incoming:e.target.value})} /></FormField>
              <FormField label="Clients"><input className="fi" value={labels.clients} onChange={e=>setLabels({...labels, clients:e.target.value})} /></FormField>
              <FormField label="Workers"><input className="fi" value={labels.workers} onChange={e=>setLabels({...labels, workers:e.target.value})} /></FormField>
              <FormField label="Suppliers"><input className="fi" value={labels.suppliers} onChange={e=>setLabels({...labels, suppliers:e.target.value})} /></FormField>
              <FormField label="Inventory"><input className="fi" value={labels.inventory} onChange={e=>setLabels({...labels, inventory:e.target.value})} /></FormField>
              <FormField label="Expenses"><input className="fi" value={labels.expenses} onChange={e=>setLabels({...labels, expenses:e.target.value})} /></FormField>
              <FormField label="Treasury"><input className="fi" value={labels.treasury} onChange={e=>setLabels({...labels, treasury:e.target.value})} /></FormField>
            </div>
            <FormField label={`Currency (e.g. EGP, $, SAR)`}><input className="fi" value={labels.currency || ''} placeholder="EGP" onChange={w=>setLabels({...labels, currency:w.target.value})} /></FormField>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-hdr"><div className="card-title">📜 <DynText>Activity Log</DynText> (Audit Log)</div></div>
        <div style={{maxHeight:400,overflowY:'auto'}}>
          {data.auditLog.map((l,i)=>(
            <div key={i} className="audit-row" style={{padding:'12px 18px'}}>
              <div style={{width:140}}>{new Date(l.date).toLocaleString(_l())}</div>
            <div style={{width:120,fontWeight:'bold',color:'var(--light)'}}>{l.user || 'System'}</div>
            <div style={{width:120}}><span className="badge b-vio"><DynText>{l.action || '-'}</DynText></span></div>
            <div style={{flex:1}}><DynText>{l.details}</DynText></div>
            </div>
          ))}
        </div>
      </div>

      <Modal open={showProdModal} onClose={() => setShowProdModal(false)} title={editProdId ? "⚙️ Edit Product Info" : "➕ Add New Product"} footer={<><button className="btn btn-p" onClick={handleSaveProduct}>✅ <DynText>Save</DynText></button><button className="btn btn-g" onClick={() => setShowProdModal(false)}><DynText>Cancel</DynText></button></>}>
        <div className="form-grid">
          <FormField label="Product Image (optional)" full>
            <div style={{display:'flex',alignItems:'center',gap:15}}>
              {(editProdImageFile || editProdForm.image) && <img src={editProdImageFile ? URL.createObjectURL(editProdImageFile) : editProdForm.image} alt="Product image" style={{maxHeight:60,maxWidth:60,objectFit:'cover',borderRadius:8,border:'1px solid var(--border)'}} />}
              <div className="btn btn-g btn-sm" style={{cursor:'pointer', position: 'relative', overflow: 'hidden'}}>
                📷 <DynText>Choose Image</DynText>
                <input type="file" accept="image/*" style={{position:'absolute', top:0, left:0, opacity:0, width:'100%', height:'100%', cursor:'pointer'}} onChange={e => { if(e.target.files[0]) setEditProdImageFile(e.target.files[0]) }} />
              </div>
              {(editProdImageFile || editProdForm.image) && <button className="btn btn-d btn-sm" onClick={()=>{setEditProdImageFile(null);setEditProdForm(f=>({...f, image: null}));}}>🗑 <DynText>Remove</DynText></button>}
            </div>
          </FormField>
          <FormField label="Product Name *"><input className="fi" value={editProdForm.name} onChange={e => setEditProdForm(f => ({ ...f, name: e.target.value }))} /></FormField>
          <FormField label="Standard Unit"><input className="fi" value={editProdForm.unit} placeholder="e.g. unit, kg, ton" onChange={e => setEditProdForm(f => ({ ...f, unit: e.target.value }))} /></FormField>
          <FormField label="Sale Price (optional)"><input type="number" min="0" className="fi" value={editProdForm.price} onChange={e => setEditProdForm(f => ({ ...f, price: e.target.value }))} /></FormField>
          {!editProdId && <FormField label="Opening Balance"><input type="number" min="0" className="fi" value={editProdForm.quantity} onChange={e => setEditProdForm(f => ({ ...f, quantity: e.target.value }))} /></FormField>}
          <FormField label="Low-stock alert threshold"><input type="number" min="0" className="fi" value={editProdForm.threshold} onChange={e => setEditProdForm(f => ({ ...f, threshold: e.target.value }))} /></FormField>
        </div>
      </Modal>

      <Modal open={showResetModal} onClose={() => setShowResetModal(false)} title="⚠️ Reset Data (Factory Reset)"
        footer={<><button className="btn btn-d" onClick={handleFactoryReset}>🗑 <DynText>Delete Selected Data</DynText></button><button className="btn btn-g" onClick={() => setShowResetModal(false)}><DynText>Cancel</DynText></button></>}>
        <div className="alert-bar warn" style={{marginBottom: 15}}><span className="ts"><DynText>The selected data will be permanently deleted and cannot be recovered. Make a backup first.</DynText></span></div>
        <div className="form-grid">
          <div style={{gridColumn: '1 / -1', fontWeight: 'bold', borderBottom: '1px solid var(--border)', paddingBottom: 5, marginBottom: 5}}><DynText>Financial Transactions & Operations</DynText></div>
          <Toggle on={resetOpts.sales} label={<DynText>Sales (and clear client debts)</DynText>} onChange={v => setResetOpts({...resetOpts, sales: v})} />
          <Toggle on={resetOpts.incoming} label={<DynText>Purchases (and clear supplier debts)</DynText>} onChange={v => setResetOpts({...resetOpts, incoming: v})} />
          <Toggle on={resetOpts.expenses} label={<DynText>General Expenses</DynText>} onChange={v => setResetOpts({...resetOpts, expenses: v})} />
          <Toggle on={resetOpts.treasury} label={<DynText>Treasury & Logistics</DynText>} onChange={v => setResetOpts({...resetOpts, treasury: v})} />
          
          <div style={{gridColumn: '1 / -1', fontWeight: 'bold', borderBottom: '1px solid var(--border)', paddingBottom: 5, marginTop: 15, marginBottom: 5}}><DynText>Entities & Names (permanent delete)</DynText></div>
          <Toggle on={resetOpts.clients} label={<DynText>Delete All Clients</DynText>} onChange={v => setResetOpts({...resetOpts, clients: v})} />
          <Toggle on={resetOpts.suppliers} label={<DynText>Delete All Suppliers</DynText>} onChange={v => setResetOpts({...resetOpts, suppliers: v})} />
          <Toggle on={resetOpts.workers} label={<DynText>Delete All Workers</DynText>} onChange={v => setResetOpts({...resetOpts, workers: v})} />
          <Toggle on={resetOpts.inventory} label={<DynText>Delete Inventory Items</DynText>} onChange={v => setResetOpts({...resetOpts, inventory: v})} />
        </div>
        <div className="mt3" style={{textAlign:'center', borderTop:'1px solid var(--border)', paddingTop: 15}}>
           <button className="btn btn-g btn-sm" onClick={() => setResetOpts({sales:true, incoming:true, expenses:true, treasury:true, clients:true, suppliers:true, workers:true, inventory:true})}><DynText>Select All (Full Factory Reset)</DynText></button>
        </div>
      </Modal>
    </div>
  );
});

/* ═══════════════════════════════════════════════════════
   GLOBAL SEARCH BOX (OPTIMIZED)
═══════════════════════════════════════════════════════ */
const GlobalSearchBox = memo(({ data, navTo }) => {
  const { t } = useLanguage();
  const [globalSearch, setGlobalSearch] = useState('');
  const deferredGlobalSearch = useDeferredValue(globalSearch);
  const L = data?.appLabels || EMPTY_DATA.appLabels;

  const searchResults = useMemo(() => {
    if (!deferredGlobalSearch || !data) return [];
    const q = deferredGlobalSearch.toLowerCase();
    const res = [];
    data.clients?.forEach(c => { if (c.name?.toLowerCase().includes(q)) res.push({ type: <DynText>Client</DynText>, txt: c.name, sub: c.phone, click: () => { navTo('clients'); setGlobalSearch(''); } }); });
    data.suppliers?.forEach(s => { if (s.name?.toLowerCase().includes(q)) res.push({ type: <DynText>Supplier</DynText>, txt: s.name, sub: s.phone, click: () => { navTo('suppliers'); setGlobalSearch(''); } }); });
    data.inventory?.items?.forEach(i => { if(i.name?.toLowerCase().includes(q)) res.push({ type: <DynText>Inventory</DynText>, txt: <><DynText>items</DynText> {i.name}</>, sub: <><DynText>Balance</DynText>: {fmt(i.quantity)}</>, click: () => { navTo('inventory'); setGlobalSearch(''); } }); });
    data.sales?.forEach(s => { if (s.invoiceId?.toLowerCase().includes(q)) res.push({ type: <DynText>Sale Invoice</DynText>, txt: s.invoiceId, sub: s.client, click: () => { navTo('sales'); setGlobalSearch(''); } }); });
    data.incoming?.forEach(i => { if (i.batchNo?.toLowerCase().includes(q)) res.push({ type: <DynText>Purchase Batch</DynText>, txt: i.batchNo, sub: i.supplier, click: () => { navTo('incoming'); setGlobalSearch(''); } }); });
    return res.slice(0, 6);
  }, [deferredGlobalSearch, data, navTo]);

  return (
    <div className="global-search">
      <span className="gs-icon">🔍</span>
      <input id="globalSearchInput" name="globalSearch" aria-label={t('search')} className="gs-input" placeholder={t('search')} value={globalSearch} onChange={e=>setGlobalSearch(e.target.value)} onBlur={()=>setTimeout(()=>setGlobalSearch(''),200)} />
      {globalSearch && <div className="gs-results">
        {searchResults.length===0 ? <div style={{padding:10,fontSize:11,color:'var(--tm)',textAlign:'center'}}><DynText>No results</DynText></div> :
          searchResults.map((r,i)=><div key={i} style={{padding:'8px 12px',borderBottom:'1px solid var(--border)',cursor:'pointer'}} onMouseDown={r.click}>
            <div style={{fontSize:10,color:'var(--bright)'}}>{r.type}</div><div style={{fontSize:12,fontWeight:'bold'}}>{r.txt}</div><div style={{fontSize:10,color:'var(--tm)'}}>{r.sub}</div>
          </div>)}
      </div>}
    </div>
  );
});

/* ═══════════════════════════════════════════════════════
   CALCULATOR WIDGET
═══════════════════════════════════════════════════════ */
function Calculator() {
  const [disp, setDisp] = useState('');
  const calc = (btn) => {
    if (btn === 'C') setDisp('');
    else if (btn === '=') {
        if (!disp) return; // guard against a crash if the display is empty
      try {
        // eslint-disable-next-line no-new-func
        const res = new Function('return ' + disp.replace(/[^0-9+\-*/.]/g, ''))();
        if(isNaN(res) || !isFinite(res)) throw new Error('Invalid');
        setDisp(String(Math.round(Number(res) * 100) / 100));
      } catch { setDisp('Error'); }
    } else setDisp(d => (d === 'Error' ? '' : d) + btn);
  };
  const btns = ['7','8','9','/','4','5','6','*','1','2','3','-','0','.','=','+'];
  return (
    <div className="calc-widget">
      <div className="ts tmt" style={{marginBottom:6,textAlign:'center'}}>🧮 <DynText>Quick Calculator</DynText></div>
      <div className="calc-disp">{disp||'0'}</div>
      <div className="calc-grid">
        <button onClick={()=>calc('C')} className="calc-btn c-clr"><DynText>Clear</DynText> (C)</button>
        {btns.map(b=><button key={b} onClick={()=>calc(b)} className={"calc-btn "+(b==='='?'c-eq':['/','*','-','+'].includes(b)?'c-op':'')}>{b}</button>)}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   LOGIN PAGE
═══════════════════════════════════════════════════════ */
const saveLocalCreds = async (email, password) => {
  const creds = JSON.parse(localStorage.getItem('nile_local_creds') || '{}');
  creds[email] = await hashPassword(password); 
  localStorage.setItem('nile_local_creds', JSON.stringify(creds));
};

const verifyLocalCreds = async (email, password) => {
  const creds = JSON.parse(localStorage.getItem('nile_local_creds') || '{}');
  const hash = await hashPassword(password);
  return creds[email] === hash || creds[email] === btoa(password);
};

function LoginPage({ onLogin, checkActive }) {
  const toast = useToast();
  const [name,setName]=useState('');
  const [email,setEmail]=useState('');
  const [p,setP]=useState('');
  const [err,setErr]=useState('');
  const [loading,setLoading]=useState(false);
  const [view, setView] = useState('login');
  const [resetDone, setResetDone] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showP, setShowP] = useState(false);

  const handleLogin = async () => {
    if (!email||!p){setErr('Please enter email and password');return;}
    setLoading(true);
    try {
      let nodeSuccess = false;
      try {
        const response = await api.post('/login', { email, password: p });
        if (response.success) {
          localStorage.setItem('nile_token', response.token);
          localStorage.setItem('nile_tenant_id', response.tenantId);
          localStorage.setItem('nile_is_super', response.isSuperAdmin ? '1' : '');
          localStorage.setItem('nile_plan', response.plan || 'free');
          localStorage.setItem('nile_plan_modules', JSON.stringify(response.modules || []));
          await saveLocalCreds(email, p);
          toast.success('Signed in via local server 👋');
          onLogin({ email, name: response.name, tenantId: response.tenantId, isLocal: true, uid: 'local_' + Date.now(), isSuperAdmin: response.isSuperAdmin });
          nodeSuccess = true;
        }
      } catch (nodeErr) {
        const isOffline = !navigator.onLine || nodeErr.message.includes('fetch') || nodeErr.message.includes('Failed to fetch');
        if (!isOffline && nodeErr.message.includes('incorrect')) {
           throw nodeErr;
        }
        console.warn("Node API failed, falling back to Firebase Auth or local credentials...", nodeErr.message);
      }

      if (!nodeSuccess) {
        if (!firebaseEnabled) {
          if (await verifyLocalCreds(email, p)) {
            const isActive = checkActive(email);
            if (!isActive) {
              setErr('⛔ This account is disabled — contact the admin');
              setLoading(false);
              return;
            }
            toast.success('Signed in locally 👋');
            onLogin({ email, name: 'Local User', uid: 'local_' + Date.now(), isLocal: true });
            setLoading(false);
            return;
          }
          setErr('Firebase is disabled. Please set up the local server or create a local account first.');
          setLoading(false);
          return;
        }
        await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
        const result = await signInWithEmailAndPassword(auth, email, p);
        const user = result.user;
        
        const isActive = checkActive(user.email);
        if (!isActive) { 
          await signOut(auth);
          setLoading(false);
          setErr('⛔ This account is disabled — contact the admin');
          return;
        }
        
        await saveLocalCreds(email, p);
        toast.success('Signed in successfully 👋');
        if (onLogin) {
          onLogin({ uid: user.uid, name: user.displayName || "New User", email: user.email, photoURL: user.photoURL });
        }
      }
    } catch (error) {
      console.error(error);
      const isOfflineError = !navigator.onLine || error.message.includes('fetch') || error.message.includes('Failed to fetch');
      if (isOfflineError && await verifyLocalCreds(email, p)) {
        const isActive = checkActive(email);
        if (!isActive) { setErr('⛔ This account is disabled'); setLoading(false); return; }
        onLogin({ email, name: 'Local User', uid: 'local_'+Date.now(), isLocal: true });
      } else {
        if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
           setErr('❌ Incorrect email or password');
        } else {
           setErr(error.message && !isOfflineError ? error.message : '❌ Incorrect email or password');
        }
      }
    }
    setLoading(false);
  };

  const handleSignUp = async () => {
    if (!name||!email||!p){setErr('Please fill in all fields');return;}
    if (p.length<6){setErr('Password must be at least 6 characters');return;}
    setLoading(true);
    try {
      // Try the MongoDB backend first; fall back to Firebase when it's offline.
      try {
        const res = await api.post('/register', { email, password: p, name });
        if (res.success) {
          localStorage.setItem('nile_token', res.token);
          localStorage.setItem('nile_tenant_id', res.tenantId);
          localStorage.setItem('nile_is_super', res.isSuperAdmin ? '1' : '');
          localStorage.setItem('nile_plan', res.plan || 'free');
          localStorage.setItem('nile_plan_modules', JSON.stringify(res.modules || []));
          await saveLocalCreds(email, p);
          toast.success(`Welcome ${name}! Your account was created successfully 🎉`);
          if (onLogin) onLogin({ email, name, tenantId: res.tenantId, isLocal: true, uid: 'local_' + Date.now(), isSuperAdmin: res.isSuperAdmin });
          return;
        }
      } catch (nodeErr) {
        const isOffline = !navigator.onLine || nodeErr.message.includes('fetch') || nodeErr.message.includes('Failed to fetch');
        if (!isOffline) throw nodeErr; // a real backend error (e.g. email already exists)
        console.warn('Node API register failed, falling back to Firebase…', nodeErr.message);
      }

      const { user } = await createUserWithEmailAndPassword(auth, email, p);
      await updateProfile(user, { displayName: name });
      await user.reload();

      if(onLogin) {
        onLogin({
          uid: user.uid,
          name: name,
          email: user.email,
          photoURL: user.photoURL
        });
      }
      toast.success(`Welcome ${name}! Your account was created successfully 🎉`);
    } catch (e) {
      console.error(e);
      if(e.code==='auth/email-already-in-use' || (e.message && e.message.toLowerCase().includes('already exists'))) {
        setErr('⚠️ This email is already registered. Try signing in instead.');
      }
      else setErr(e.message && !e.message.includes('fetch') ? `❌ ${e.message}` : '❌ Error creating account');
      setLoading(false);
    }
  };

      const handleGoogleSignIn = async () => {
        setLoading(true);
        setErr('');
        try {
          if (!firebaseEnabled) {
            throw new Error('Firebase is not configured. Google Sign-In requires Firebase configuration.');
          }
          await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
          const provider = new GoogleAuthProvider();
          const result = await signInWithPopup(auth, provider);
          const user = result.user;
          
          const isActive = checkActive(user.email);
          if (!isActive) { 
            await signOut(auth);
            setLoading(false);
            setErr('⛔ This account is disabled — contact the admin');
            return;
          }

          const addInfo = getAdditionalUserInfo(result);
          if (addInfo?.isNewUser) {
            toast.success(`Welcome ${user.displayName || 'our friend'}! Your account is ready 🎉`);
          } else {
            toast.success(`Welcome back, ${user.displayName?.split(' ')[0] || ''} 👋`);
          }

          // Update the UI immediately and create the account in the system if missing
          if (onLogin) {
            onLogin({
              uid: user.uid,
              name: user.displayName || "New User",
              email: user.email,
              photoURL: user.photoURL
            });
          }
        } catch (error) {
          console.error(error);
          if (error.code === 'auth/popup-blocked' || error.code === 'auth/operation-not-supported-in-this-environment') {
            try {
              // Fall back to redirect sign-in when the mobile/desktop env blocks popups
              const provider = new GoogleAuthProvider();
              await signInWithRedirect(auth, provider);
            } catch (e) {
              setErr('❌ This environment does not support direct Google sign-in');
              setLoading(false);
            }
          } else if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
            setErr('❌ Login error: ' + error.message);
            setLoading(false);
          } else {
            setLoading(false);
          }
        }
      };

      const handleAppleSignIn = async () => {
        setLoading(true);
        setErr('');
        try {
          await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
          const provider = new OAuthProvider('apple.com');
          const result = await signInWithPopup(auth, provider);
          const user = result.user;
          
          const isActive = checkActive(user.email);
          if (!isActive) { 
            await signOut(auth);
            setLoading(false);
            setErr('⛔ This account is disabled — contact the admin');
            return;
          }

          const addInfo = getAdditionalUserInfo(result);
          if (addInfo?.isNewUser) {
            toast.success(`Welcome ${user.displayName || 'our friend'}! Your account is ready 🎉`);
          } else {
            toast.success(`Welcome back, ${user.displayName?.split(' ')[0] || ''} 👋`);
          }

          if (onLogin) {
            onLogin({
              uid: user.uid,
              name: user.displayName || "New User",
              email: user.email,
              photoURL: null
            });
          }
        } catch (error) {
          console.error(error);
          if (error.code === 'auth/popup-blocked' || error.code === 'auth/operation-not-supported-in-this-environment') {
            try {
              const provider = new OAuthProvider('apple.com');
              await signInWithRedirect(auth, provider);
            } catch (e) {
              setErr('❌ This environment does not support direct Apple sign-in');
              setLoading(false);
            }
          } else if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
            setErr('❌ Login error: ' + error.message);
            setLoading(false);
          } else {
            setLoading(false);
          }
        }
      };

  const handleReset = async () => {
    if (!email) { setErr('Please enter the email'); return; }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetDone(true);
      setErr('');
    } catch (e) {
      console.error(e);
      setErr('❌ An error occurred (check the email)');
    }
    setLoading(false);
  };

  return (
    <main className="login-screen">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-ico">📊</div>
          <div className="login-title">Nexora</div>
          <div className="login-sub"><DynText>Smart Business Management Platform</DynText><br /><DynText>Sales · Inventory · HR · Accounting</DynText></div>
        </div>
        
        {view === 'login' || view === 'signup' ? (
          <form className="login-form" onSubmit={e => e.preventDefault()}>
            {view === 'signup' && <div><label htmlFor="signupName" className="login-label"><DynText>👤 Full Name</DynText></label><input id="signupName" name="name" className="login-input" placeholder="Name" value={name} onChange={e=>{setName(e.target.value);setErr('');}} /></div>}
            <div><label htmlFor="loginEmail" className="login-label">📧 <DynText>Email</DynText></label><input id="loginEmail" name="email" className="login-input" placeholder="name@example.com" value={email} onChange={e=>{setEmail(e.target.value);setErr('');}} onKeyDown={e=>e.key==='Enter'&&handleLogin()} autoComplete="username" /></div>
            <div>
              <label htmlFor="loginPassword" className="login-label">🔑 <DynText>Password</DynText></label>
              <div style={{position:'relative'}}>
                <input type={showP ? "text" : "password"} id="loginPassword" name="password" className="login-input" placeholder="••••••••" value={p} onChange={e=>{setP(e.target.value);setErr('');}} onKeyDown={e=>e.key==='Enter'&&handleLogin()} autoComplete="current-password" style={{paddingLeft: 40}} />
                <span onClick={()=>setShowP(!showP)} style={{position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', cursor:'pointer', color:'var(--tm)', fontSize:18, userSelect:'none'}}>{showP ? '🙈' : '👁️'}</span>
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:6,marginTop:4}}>
              <input type="checkbox" id="rememberMe" name="rememberMe" checked={rememberMe} onChange={e=>setRememberMe(e.target.checked)} style={{cursor:'pointer',accentColor:'var(--bright)'}} />
              <label htmlFor="rememberMe" style={{fontSize:12,color:'var(--ts)',cursor:'pointer',userSelect:'none'}}><DynText>Remember me on this device</DynText></label>
            </div>
            {err&&<div className="login-err"><DynText>{err}</DynText></div>}
            
            {view === 'login' ? (
              <>
            <button className="login-btn" onClick={handleLogin} disabled={loading}>{loading?<DynText>⏳ Signing in...</DynText>:<DynText>Sign In →</DynText>}</button>
                <div style={{display:'flex',justifyContent:'space-between',marginTop:10}}>
              <button style={{background:'none',border:'none',color:'var(--tm)',cursor:'pointer',fontSize:12,fontFamily:'inherit'}} onClick={()=>{setView('forgot');setErr('');}}><DynText>Forgot password?</DynText></button>
              <button style={{background:'none',border:'none',color:'var(--bright)',cursor:'pointer',fontSize:12,fontFamily:'inherit',fontWeight:'bold'}} onClick={()=>{setView('signup');setErr('');}}><DynText>Create new account</DynText></button>
                </div>
              </>
            ) : (
              <>
            <div style={{fontSize:11, color:'var(--tm)', textAlign:'center', marginBottom:10, padding:'8px', background:'rgba(59,130,246,0.1)', borderRadius:'8px', border:'1px solid var(--border)'}}><DynText>💡 If you were invited by your manager, sign up with the same email to auto-join their company.</DynText></div>
            <button className="login-btn" onClick={handleSignUp} disabled={loading}>{loading?<DynText>⏳ Creating...</DynText>:<DynText>Create Account ✅</DynText>}</button>
                <div style={{textAlign:'center',marginTop:10}}>
              <button style={{background:'none',border:'none',color:'var(--tm)',cursor:'pointer',fontSize:12,fontFamily:'inherit'}} onClick={()=>{setView('login');setErr('');}}><DynText>Already have an account? Sign in</DynText></button>
                </div>
              </>
            )}

            <div style={{display:'flex',alignItems:'center',margin:'10px 0 5px'}}>
              <div style={{flex:1,height:1,background:'var(--border)'}} />
          <span style={{padding:'0 10px',fontSize:12,color:'var(--tm)'}}><DynText>or</DynText></span>
              <div style={{flex:1,height:1,background:'var(--border)'}} />
            </div>
            <div style={{display:'flex', flexDirection:'column', gap:10}}>
              <button className="btn btn-g" style={{width:'100%',justifyContent:'center',padding:'12px',fontSize:'14px',fontWeight:'bold',background:'rgba(255,255,255,0.05)'}} onClick={handleGoogleSignIn} disabled={loading || !firebaseEnabled}>
                <svg width="18" height="18" viewBox="0 0 24 24" style={{marginLeft: 8}}><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            <DynText>Continue with Google</DynText>
              </button>
              <button className="btn btn-g" style={{width:'100%',justifyContent:'center',padding:'12px',fontSize:'14px',fontWeight:'bold',background:'rgba(255,255,255,0.05)'}} onClick={handleAppleSignIn} disabled={loading || !firebaseEnabled}>
                <svg width="16" height="18" viewBox="0 0 384 512" style={{marginLeft: 8}}><path fill="currentColor" d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>
            <DynText>Continue with Apple</DynText>
              </button>
            </div>
            {!firebaseEnabled && <div style={{fontSize:12,color:'var(--tm)',marginTop:6,textAlign:'center'}}>Firebase is disabled. Social sign-in is off.</div>}
          </form>
        ) : (
          <form className="login-form" onSubmit={e => e.preventDefault()}>
        <div style={{textAlign:'center',color:'var(--ts)',fontSize:13,marginBottom:6}}><DynText>Enter your email to receive a reset link</DynText></div>
            <div><label htmlFor="resetEmail" className="login-label">📧 <DynText>Email</DynText></label><input id="resetEmail" name="resetEmail" className="login-input" placeholder="name@example.com" value={email} onChange={e=>{setEmail(e.target.value);setErr('');}} /></div>
            {err&&<div className="login-err"><DynText>{err}</DynText></div>}
        {resetDone&&<div className="login-err" style={{borderColor:'var(--em)',color:'var(--em-l)',background:'rgba(16,185,129,.1)'}}>✅ <DynText>Reset link sent! Check your inbox.</DynText></div>}
        <button className="login-btn" onClick={handleReset} disabled={loading}>{loading?<DynText>⏳ Sending...</DynText>:<DynText>Send Reset Link</DynText>}</button>
        <button style={{background:'none',border:'none',color:'var(--tm)',cursor:'pointer',fontSize:13,fontFamily:'inherit',marginTop:5}} onClick={()=>{setView('login');setErr('');setResetDone(false);}}>← <DynText>Back</DynText></button>
          </form>
        )}
      </div>
    </main>
  );
}

/* ═══════════════════════════════════════════════════════
   NOTIFICATION PANEL
═══════════════════════════════════════════════════════ */
function NotifPanel({ data, onClose }) {
  const { t } = useLanguage();
  const currency = data.appLabels?.currency || t('currency');
  const alerts=[];
  (data.inventory?.items || []).forEach(item => { if (item.threshold > 0 && item.quantity < item.threshold) alerts.push({type:'err',icon:'⚠️',title:`Stock of "${item.name}" is low!`,desc:`Stock ${fmt(item.quantity)} ${item.unit}`}); });
  data.clients.forEach(c=>{if(c.remaining>5000)alerts.push({type:'warn',icon:'💰',title:`Outstanding debt: ${c.name}`,desc:`Remaining ${fmt(c.remaining)} ${currency}`});});
  data.suppliers.forEach(s=>{if(s.remaining>3000)alerts.push({type:'warn',icon:'🏪',title:`Supplier debt: ${s.name}`,desc:`Remaining ${fmt(s.remaining)} ${currency}`});});

  // Anomaly detection in alerts
  const thisM = new Date().toISOString().slice(0, 7);
  const lastMD = new Date(); lastMD.setMonth(lastMD.getMonth() - 1);
  const lastM = lastMD.toISOString().slice(0, 7);
  const expThis = data.expenses.filter(e => e.date && e.date.startsWith(thisM)).reduce((a,b)=>a+b.amount,0);
  const expLast = data.expenses.filter(e => e.date && e.date.startsWith(lastM)).reduce((a,b)=>a+b.amount,0);
  if (expLast > 0 && expThis > expLast * 1.5) alerts.push({type:'err',icon:'🕵️‍♂️',title:`Smart alert: expense anomaly`,desc:`Up 50% from last month.`});
  data.clients.forEach(c => {
      if (c.totalBought > 5000 && c.remaining > c.totalBought * 0.75) alerts.push({type:'err',icon:'🛑',title:`Smart alert: debt risk for ${c.name}`,desc:`Their debt exceeds 75% of their withdrawals!`});
  });

  return (
    <div className="notif-panel">
      <div className="notif-hdr">
        <span>🔔 <DynText>Notifications</DynText> {alerts.length>0&&<span className="badge b-err" style={{marginRight:4}}>{alerts.length}</span>}</span>
        <button className="btn btn-g btn-icon btn-sm" onClick={onClose}>✕</button>
      </div>
      {alerts.length===0?<div className="notif-empty">✅ <DynText>No new notifications</DynText></div>
        :alerts.map((a,i)=>(
          <div key={`${a.type}-${i}`} className="notif-item">
            <span className="notif-icon">{a.icon}</span>
            <div><div className="notif-title" style={{color:a.type==='err'?'var(--rose-l)':'var(--gold-l)'}}><DynText>{a.title}</DynText></div><div className="notif-desc"><DynText>{a.desc}</DynText></div></div>
          </div>
        ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   AI COPILOT (SMART ASSISTANT)
═══════════════════════════════════════════════════════ */
const AICopilot = memo(({ data, setData, user, navTo, onClose }) => {
  const { t, lang } = useLanguage();
  const [messages, setMessages] = useState([{ sender: 'bot', text: 'Hi! I am Nexora AI 🤖 powered by Gemini. Ask me anything in English, like "Add 500 maintenance expense" or "Delete the last sale invoice".' }]);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const msgsEndRef = useRef(null);
  const recRef = useRef(null);
  const toast = useToast();
  const isThinkingRef = useRef(false);
  const isCancelledRef = useRef(false);
  const transcriptRef = useRef('');
  const [recordingText, setRecordingText] = useState('');
  
  // Drag & Resize State
  const [pos, setPos] = useState({ x: Math.max(20, window.innerWidth - 380), y: Math.max(20, window.innerHeight - 520) });
  const [size, setSize] = useState({ w: 360, h: 500 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, initX: 0, initY: 0 });
  const resizeRef = useRef({ startX: 0, startY: 0, initW: 0, initH: 0, initX: 0 });

  const getClientX = (e) => e.clientX !== undefined ? e.clientX : e.touches?.[0]?.clientX;
  const getClientY = (e) => e.clientY !== undefined ? e.clientY : e.touches?.[0]?.clientY;

  const startDrag = (e) => {
    if (e.target.closest('button')) return;
    setIsDragging(true);
    dragRef.current = { startX: getClientX(e), startY: getClientY(e), initX: pos.x, initY: pos.y };
  };

  const startResize = (e) => {
    e.stopPropagation();
    setIsResizing(true);
    resizeRef.current = { startX: getClientX(e), startY: getClientY(e), initW: size.w, initH: size.h, initX: pos.x };
  };

  useEffect(() => {
    const handleMove = (e) => {
      const clientX = getClientX(e);
      const clientY = getClientY(e);
      if (clientX === undefined || clientY === undefined) return;

      if (isDragging) {
        const newX = dragRef.current.initX + (clientX - dragRef.current.startX);
        const newY = dragRef.current.initY + (clientY - dragRef.current.startY);
        setPos({ x: Math.max(0, Math.min(window.innerWidth - 100, newX)), y: Math.max(0, Math.min(window.innerHeight - 100, newY)) });
      } else if (isResizing) {
        const dx = clientX - resizeRef.current.startX;
        const dy = clientY - resizeRef.current.startY;
        const isRtl = document.documentElement.dir === 'rtl';
        const newW = Math.max(300, resizeRef.current.initW + (isRtl ? -dx : dx));
        const newH = Math.max(350, resizeRef.current.initH + dy);
        setSize({ w: newW, h: newH });
        if (isRtl) setPos(p => ({ ...p, x: resizeRef.current.initX - (newW - resizeRef.current.initW) }));
      }
    };
    const handleUp = () => { setIsDragging(false); setIsResizing(false); };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [isDragging, isResizing]);

  useEffect(() => { msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const speak = (text) => {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = lang === 'en' ? 'en-US' : 'ar-EG';
        u.pitch = 1.15; // raise pitch for a more feminine voice
        u.rate = 0.95;  // comfortable listening speed

        const setVoiceAndSpeak = () => {
          const voices = window.speechSynthesis.getVoices();
          let targetVoices = voices.filter(v => v.lang.startsWith(lang === 'en' ? 'en' : 'ar'));
          if (targetVoices.length === 0) targetVoices = voices;
          
          const femaleVoice = targetVoices.find(v => /Zeina|Salma|Hoda|Laila|Noura|Zira|Female|Samantha|Victoria|Google US English/i.test(v.name));
          if (femaleVoice || targetVoices[0]) u.voice = femaleVoice || targetVoices[0];
          
          window.speechSynthesis.speak(u);
        };

        // Handle delayed voice loading in the browser
        if (window.speechSynthesis.getVoices().length === 0) {
            window.speechSynthesis.addEventListener('voiceschanged', setVoiceAndSpeak, { once: true });
            setTimeout(setVoiceAndSpeak, 600); // strong fallback to ensure speech
        } else {
            setVoiceAndSpeak();
        }
    }
  };

  const processCommand = async (text) => {
    if (!text.trim() || isThinkingRef.current) return;
    isThinkingRef.current = true;
    setMessages(m => [...m, { sender: 'user', text }]);
    setInput('');

    const apiKey = localStorage.getItem('nile_gemini_key') || 'AIzaSyD9Mf5g6ZjQLdEDh8hrIhnmtSb38enBCNQ';
    if (!apiKey) {
      const noKeyReply = lang === 'en' ? "Welcome! To assist you with real AI, please add your Gemini API Key in the Settings page ⚙️." : "Welcome! To use real AI that understands and executes your commands, first add a Gemini API Key on the Settings page ⚙️.";
      setMessages(m => [...m, { sender: 'bot', text: noKeyReply }]);
      speak(noKeyReply);
      isThinkingRef.current = false;
      return;
    }

    setMessages(m => [...m, { sender: 'bot', text: lang === 'en' ? 'Thinking...' : 'Thinking...', isTyping: true }]);

    try {
      const tDay = today();
      const tMonth = tDay.slice(0, 7);
      
      // Compute complex stats to feed the AI full system context
      const tSales = (data.sales||[]).reduce((a,b)=>a+(b.totalAmount||0),0);
      const tDaySales = (data.sales||[]).filter(s => s.date === tDay).reduce((a,b)=>a+(b.totalAmount||0),0);
      const tExp = (data.expenses||[]).reduce((a,b)=>a+(b.amount||0),0);
      const tInc = (data.incoming||[]).reduce((a,b)=>a+(b.totalExpenses||0),0);
      const tWorkers = data.workers.reduce((s, w) => s + (w.received||0) + (w.advance||0), 0);
      
      const clientsPaid = data.clients.reduce((s, c) => s + c.totalPaid, 0);
      const treasuryIn = data.treasuryMoves.filter(m => m.type === 'deposit').reduce((s, m) => s + m.amount, 0);
      const suppliersPaid = data.suppliers.reduce((s, sp) => s + sp.totalPaid, 0);
      const logisticsExp = data.vehicleLog.reduce((s, l) => s + l.cost, 0);
      
      // Compute COGS for an accurate net profit for the AI assistant
      const avgCosts = {};
      const allProducts = new Set([ ...(data.incoming||[]).map(i => i.category), ...(data.workers||[]).flatMap(w => (w.records||[]).map(r => r.category)) ]);
      allProducts.forEach(product => {
        const inc = (data.incoming||[]).filter(i => i.category === product);
        const wks = (data.workers||[]).flatMap(w => (w.records||[]).filter(r => r.category === product));
        const tProd = inc.reduce((s, i) => s + Number(i.production||0), 0) + wks.reduce((s, r) => s + Number(r.quantity||0), 0);
        const tCost = inc.reduce((s, i) => s + Number(i.totalExpenses||0), 0) + wks.reduce((s, r) => s + Number(r.total||0), 0);
        avgCosts[product] = tProd > 0 ? tCost / tProd : 0;
      });
      const cogs = (data.sales||[]).reduce((sum, s) => sum + (s.quantity * (avgCosts[s.product] || 0)), 0);
      const netProfit = tSales - cogs - tExp - logisticsExp; // accurate net profit estimate without double-counting workers

      const treasuryOut = data.treasuryMoves.filter(m => m.type === 'withdraw').reduce((s, m) => s + m.amount, 0);
      const treasuryBal = (clientsPaid + treasuryIn) - (suppliersPaid + tWorkers + tExp + logisticsExp + treasuryOut);

      const clientDebts = (data.clients||[]).reduce((a,b)=>a+(b.remaining||0),0);
      const suppDebts = (data.suppliers||[]).reduce((a,b)=>a+(b.remaining||0),0);
      
      // Inject client & supplier names to prevent mismatches and hallucination
      const activeClients = data.clients.slice(0, 40).map(c => c.name).join(', ') + (data.clients.length > 40 ? ' ...and others' : '');
      const activeSuppliers = data.suppliers.slice(0, 40).map(s => s.name).join(', ') + (data.suppliers.length > 40 ? ' ...and others' : '');
      const activeWorkers = data.workers.slice(0, 40).map(w => w.name).join(', ') + (data.workers.length > 40 ? ' ...and others' : '');
      const activeVehicles = (data.vehicles||[]).slice(0, 20).map(v => v.name).join(', ') + ((data.vehicles||[]).length > 20 ? ' ...and more' : '');

      const recentExp = (data.expenses||[]).slice(-10).map(e=>({id: e.id, desc: e.description, amt: e.amount, type: e.type}));
      const recentSales = (data.sales||[]).slice(-10).map(s=>({id: s.id, client: s.client, prod: s.product, amt: s.totalAmount, date: s.date}));
      const recentIncoming = (data.incoming||[]).slice(-5).map(i=>({id: i.id, supplier: i.supplier, cat: i.category, wt: i.weight, date: i.date}));
      
      // Token-limit guard: send at most 40 items to avoid overflow
      const allItems = data.inventory?.items || [];
      const invItems = allItems.slice(0, 30).map(i => `${i.name}(${i.quantity})`).join(' , ') + (allItems.length > 30 ? ' ...and more' : '');

      const chatHistory = messages.filter(m => !m.isTyping).slice(-10).map(m => `${m.sender === 'user' ? 'User' : 'Help'}: ${m.text}`).join('\n');

      const isEn = lang === 'en';
      
      const systemStats = isEn ? 
        `System Data:
- Today Sales: ${tDaySales}
- Total Sales: ${tSales}
- Total Expenses: ${tExp}
- Purchasing Costs: ${tInc}
- Estimated Net Profit: ${netProfit}
- Treasury Liquid Balance: ${treasuryBal}
- Clients Debts (Owe us): ${clientDebts}
- Suppliers Debts (We owe): ${suppDebts}
- Active Clients: ${activeClients}
- Active Suppliers: ${activeSuppliers}
- Active Workers: ${activeWorkers}
- Active Vehicles: ${activeVehicles}
- Inventory Stock: ${invItems}
- Recent Expenses (for edit/delete): ${JSON.stringify(recentExp)}
- Recent Sales (for edit/delete): ${JSON.stringify(recentSales)}
- Recent Incoming (for delete): ${JSON.stringify(recentIncoming)}

Recent Chat History (Context):
${chatHistory}` :
        `System data:
- Today's sales: ${tDaySales}
- Total sales: ${tSales}
- Expenses: ${tExp}
- Cost of goods: ${tInc}
- Approx. net profit: ${netProfit}
- Treasury balance (liquidity): ${treasuryBal}
- Client debts owed to us: ${clientDebts}
- Supplier debts we owe: ${suppDebts}
- Registered clients: ${activeClients}
- Registered suppliers: ${activeSuppliers}
- Registered workers: ${activeWorkers}
- Registered vehicles: ${activeVehicles}
- Inventory balances: ${invItems}
- Recent expenses (for deletion): ${JSON.stringify(recentExp)}
- Recent sales (for deletion): ${JSON.stringify(recentSales)}
- Recent purchases (for deletion): ${JSON.stringify(recentIncoming)}

Recent conversation log (remember the context well to answer smartly):
${chatHistory}`;

      const prompt = isEn 
        ? `You are a "Smart Copilot", a smart AI assistant inside an ERP system.
Language: STRICTLY English (natural, friendly, and professional). Never reply in Arabic.
Task: Read the user's input, answer their questions using the system data, and return the appropriate action.
Instructions:
1. The "reply" must be a complete conversational sentence (never just a number).
2. You MUST use the EXACT product, client, and supplier names from the System Data to avoid accounting errors.
3. Always output valid JSON only.
4. If asked about profits or system summary, provide a detailed summary combining sales, net profit, treasury balance, and debts.
5. If a client returns a product, use ADD_RETURN with client name, product, quantity, and amount.

${systemStats}

Your response MUST be ONLY valid JSON, no markdown formatting:
{
  "reply": "Your conversational response",
  "action": { "type": "NONE" | "NAVIGATE" | "ADD_EXPENSE" | "DELETE_EXPENSE" | "DELETE_SALE" | "DELETE_INCOMING" | "ADD_TASK" | "ADD_CLIENT" | "ADD_WORKER" | "ADD_SUPPLIER" | "ADD_RETURN" | "DEDUCT_SUPPLIER" | "ADD_TREASURY" | "ADD_SALE" | "ADD_INCOMING" | "PAY_CLIENT" | "PAY_SUPPLIER" | "CLEAR_CLIENT_ACCOUNT" | "CLEAR_SUPPLIER_ACCOUNT" | "EDIT_CLIENT" | "EDIT_SALE" | "EDIT_INCOMING" | "PAY_WORKER" | "SET_ATTENDANCE" | "ADD_VEHICLE_LOG" | "EDIT_PRODUCT_PRICE", "payload": {} }
}
Payload examples:
- NAVIGATE: {"page": "sales|inventory|statistics|..."}
- EDIT_CLIENT: {"oldName": "Ahmed", "newName": "Ahmed Ali", "phone": "010...", "city": "Cairo"}
- EDIT_SALE: {"id": 123456, "quantity": 15, "unitPrice": 60, "paid": 900}
- EDIT_INCOMING: {"id": 123456, "weight": 150, "unitPrice": 12, "paid": 1500}
- ADD_EXPENSE: {"amount": 500, "description": "text", "type": "text"}
- DELETE_EXPENSE: {"id": 12345}
- DELETE_SALE: {"id": 12345}
- DELETE_INCOMING: {"id": 12345}
- ADD_TASK: {"txt": "call client"}
- ADD_CLIENT: {"name": "Ahmed", "phone": "010..."}
- ADD_WORKER: {"name": "Sayed"}
- ADD_SUPPLIER: {"name": "Sami", "phone": "010..."}
- ADD_RETURN: {"client": "Ahmed", "product": "Item", "quantity": 5, "amount": 500}
- DEDUCT_SUPPLIER: {"name": "Sami", "amount": 500, "notes": "text"}
- ADD_TREASURY: {"amount": 1000, "type": "deposit|withdraw", "reason": "text"}
- ADD_SALE: {"client": "Ahmed", "product": "Item", "quantity": 10, "unitPrice": 50, "paid": 500}
- ADD_INCOMING: {"supplier": "Sami", "category": "Item", "weight": 100, "unitPrice": 10, "paid": 1000}
- PAY_CLIENT: {"name": "Ahmed", "amount": 500}
- PAY_SUPPLIER: {"name": "Sami", "amount": 500}
- PAY_WORKER: {"name": "Sayed", "amount": 200, "type": "advance" | "received"}
- SET_ATTENDANCE: {"name": "Sayed", "status": "present" | "absent", "date": "YYYY-MM-DD"}
- ADD_VEHICLE_LOG: {"vehicleName": "Jumbo", "type": "maintenance|fuel|oil|fines|license", "cost": 500, "notes": "text", "date": "YYYY-MM-DD"}
- EDIT_PRODUCT_PRICE: {"product": "Item", "price": 50}
- CLEAR_CLIENT_ACCOUNT: {"name": "Ahmed"}
- CLEAR_SUPPLIER_ACCOUNT: {"name": "Sami"}

User Request: "${text}"`
        : `You are "Nexora AI", a smart assistant inside the Nexora ERP system.
Reply language: English — natural, friendly and helpful.
Personality: friendly, smart and direct — you talk like a teammate, not a formal robot. Use phrases like "All good", "Done", "Noted" naturally.
Your task: answer the user's questions using the system data, and reply with JSON containing the message and the action.
Important rules:
1. The reply must be a complete, useful sentence with real information — not just a number.
2. Write large numbers in words so they read well (e.g. one thousand five hundred instead of 1500).
3. Use names exactly as written in the data to avoid any error.
4. If asked about profits or the daily summary, give a cheerful, comprehensive summary covering sales, profit, treasury and debts.
5. To record client returns, use ADD_RETURN with the client name, product, quantity and amount.

${systemStats}

Your reply must be JSON only, with no extra markers or text:
{
  "reply": "Text reply",
  "action": { "type": "NONE" | "NAVIGATE" | "ADD_EXPENSE" | "DELETE_EXPENSE" | "DELETE_SALE" | "DELETE_INCOMING" | "ADD_TASK" | "ADD_CLIENT" | "ADD_WORKER" | "ADD_SUPPLIER" | "ADD_RETURN" | "DEDUCT_SUPPLIER" | "ADD_TREASURY" | "ADD_SALE" | "ADD_INCOMING" | "PAY_CLIENT" | "PAY_SUPPLIER" | "CLEAR_CLIENT_ACCOUNT" | "CLEAR_SUPPLIER_ACCOUNT" | "EDIT_CLIENT" | "EDIT_SALE" | "EDIT_INCOMING" | "PAY_WORKER" | "SET_ATTENDANCE" | "ADD_VEHICLE_LOG" | "EDIT_PRODUCT_PRICE", "payload": {} }
}
Payload examples:
- NAVIGATE: {"page": "statistics"}
- EDIT_CLIENT: {"oldName": "Ahmed", "newName": "Ahmed Ali", "phone": "010...", "city": "Cairo"}
- EDIT_SALE: {"id": 123456, "quantity": 15, "unitPrice": 60, "paid": 900}
- EDIT_INCOMING: {"id": 123456, "weight": 150, "unitPrice": 12, "paid": 1500}
- ADD_EXPENSE: {"amount": 500, "description": "Maintenance", "type": "Workshop Expenses"}
- DELETE_EXPENSE: {"id": 123456}
- DELETE_SALE: {"id": 123456}
- DELETE_INCOMING: {"id": 123456}
- ADD_TASK: {"txt": "Call Client"}
- ADD_CLIENT: {"name": "Ahmed", "phone": "010..."}
- ADD_WORKER: {"name": "Sayed"}
- ADD_SUPPLIER: {"name": "Mahmoud", "phone": "010..."}
- ADD_RETURN: {"client": "Ahmed", "product": "Pellet", "quantity": 5, "amount": 500}
- DEDUCT_SUPPLIER: {"name": "Mahmoud", "amount": 500, "notes": "Settlement"}
- ADD_TREASURY: {"amount": 1000, "type": "deposit" (Deposit) or "withdraw" (Withdraw), "reason": "Reason"}
- ADD_SALE: {"client": "Ahmed", "product": "Pellet", "quantity": 10, "unitPrice": 50, "paid": 500}
- ADD_INCOMING: {"supplier": "Mahmoud", "category": "Pellet", "weight": 100, "unitPrice": 10, "paid": 1000}
- PAY_CLIENT: {"name": "Ahmed", "amount": 500}
- PAY_SUPPLIER: {"name": "Mahmoud", "amount": 500}
- PAY_WORKER: {"name": "Sayed", "amount": 200, "type": "advance" (for Advance) or "received" (for received)}
- SET_ATTENDANCE: {"name": "Sayed", "status": "present" (Present) or "absent" (Absent)}
- ADD_VEHICLE_LOG: {"vehicleName": "Jumbo", "type": "Maintenance|Fuel|Oil|Fines|License", "cost": 500, "notes": "Any notes"}
- EDIT_PRODUCT_PRICE: {"product": "Pellet", "price": 50}
- CLEAR_CLIENT_ACCOUNT: {"name": "Ahmed"}
- CLEAR_SUPPLIER_ACCOUNT: {"name": "Mahmoud"}

User request: "${text}"`;

      const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-8b'];
      let resData = null;
      let lastErr = null;

      for (const model of modelsToTry) {
        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: "application/json", temperature: 0.7 }
            })
          });

          if (!response.ok) {
            if (response.status === 403) throw new Error('AUTH_ERROR');
            if (response.status === 429) throw new Error('RATE_LIMIT');
            throw new Error(`API Error with ${model}: ${response.status}`);
          }
          resData = await response.json();
          break; // success! exit the loop and don't try the other models
        } catch (err) {
          lastErr = err;
          // If the model hit its daily quota (429) or failed, move on to the next model immediately
          // Stop retrying if the key itself is the problem, to reduce usage
          if (err.message === 'AUTH_ERROR') break;
        }
      }

      if (!resData) {
        throw lastErr || new Error('ALL_MODELS_FAILED');
      }
      
      if (!resData.candidates || resData.candidates.length === 0 || !resData.candidates[0].content || !resData.candidates[0].content.parts) {
        throw new Error('BLOCKED_BY_SAFETY');
      }

      // Clean the text in case Google added Markdown markers
      let rawText = resData.candidates[0].content.parts[0].text;
      // Robust routine to extract the JSON whatever the response shape
      const jsonMatch = rawText.match(/\{[\s\S]*\}/m);
      if (jsonMatch) rawText = jsonMatch[0];
      let aiResponse;
      try {
        aiResponse = JSON.parse(rawText);
      } catch (e) {
        throw new Error('PARSE_ERROR');
      }

      const reply = aiResponse.reply || (lang === 'en' ? "At your service!" : "At your service!");
      setMessages(m => m.filter(msg => !msg.isTyping).concat({ sender: 'bot', text: reply }));
      speak(reply);

      // Execute the actions decided by the AI
      if (aiResponse.action && aiResponse.action.type !== 'NONE') {
        const { type, payload } = aiResponse.action;
        
        const validPages = ['dashboard','incoming','sales','clients','workers','suppliers','inventory','expenses','logistics','treasury','hr','crm','integrations','statistics','reports','profile','users','settings'];
        if (type === 'NAVIGATE' && payload.page && validPages.includes(payload.page)) {
           navTo(payload.page);
        } 
        else if (type === 'ADD_EXPENSE' && payload.amount) {
           setData(d => {
              const newType = payload.type || 'Petty Cash';
              const typeExists = d.expenseTypes.includes(newType);
              return {
                ...d,
                expenseTypes: typeExists ? d.expenseTypes : [...d.expenseTypes, newType],
                expenses: [{id: Date.now() + Math.floor(Math.random()*1000), date:tDay, type:newType, amount:payload.amount, description:payload.description||'by AI'}, ...(d.expenses || [])],
                auditLog: [createLog(user, 'Gemini AI', `Logged expense ${payload.amount} ${payload.description}`), ...(d.auditLog || [])].slice(0,100)
              };
           });
        } 
        else if (type === 'DELETE_EXPENSE' && payload.id) {
           setData(d => ({
              ...d,
              expenses: (d.expenses||[]).filter(e => String(e.id) !== String(payload.id)),
              auditLog: [createLog(user, 'Gemini AI', `Delete expense via AI`), ...(d.auditLog || [])].slice(0,100)
           }));
        }
        else if (type === 'DELETE_SALE' && payload.id) {
           const sale = data.sales.find(s => String(s.id) === String(payload.id));
           if (sale) {
             const isInvItem = (data.inventory?.items || []).some(i => i.name === sale.product);
             setData(d=>({...d,
                sales:d.sales.filter(x=>x.id!==sale.id),
                clients:d.clients.map(c=>c.name===sale.client?{...c,totalBought:Math.max(0,c.totalBought-sale.totalAmount),totalPaid:Math.max(0,c.totalPaid-sale.paid),remaining:c.remaining-sale.remaining, transactions: (c.transactions||[]).filter(t => t.saleId !== sale.id)}:c),
                inventory: isInvItem ? {...d.inventory, items: (d.inventory?.items || []).map(i => i.name === sale.product ? {...i, quantity: i.quantity + sale.quantity} : i), log: [{id: Date.now(), date:new Date().toISOString(), action:`Delete sale (${sale.client})`, amount:sale.quantity, user:user?.name || 'Gemini AI'}, ...(d.inventory.log||[])].slice(0,50)} : d.inventory,
                auditLog: [createLog(user, 'Gemini AI', `Delete sale to ${sale.client}`), ...d.auditLog].slice(0, 100)
             }));
           }
        }
        else if (type === 'DELETE_INCOMING' && payload.id) {
           const inc = data.incoming.find(i => String(i.id) === String(payload.id));
           if (inc) {
             const isInvItem = (data.inventory?.items || []).some(i => i.name === inc.category);
             setData(d=>({...d,
                incoming: d.incoming.filter(x => x.id !== inc.id),
                inventory: isInvItem ? {...d.inventory, items: (d.inventory?.items || []).map(i => i.name === inc.category ? {...i, quantity: i.quantity - (inc.production||0)} : i), log: [{id: Date.now(), date:new Date().toISOString(), action:`Delete purchase (${inc.category})`, amount:-(inc.production||0), user:user?.name || 'Gemini AI'}, ...(d.inventory.log||[])].slice(0,50)} : d.inventory,
                suppliers: d.suppliers.map(s => s.name === inc.supplier ? {...s, totalSupplied: Math.max(0, s.totalSupplied - inc.totalExpenses), remaining: s.remaining - (inc.remaining !== undefined ? inc.remaining : inc.totalExpenses), records: (s.records||[]).filter(r => r.incomingId !== inc.id)} : s),
                auditLog: [createLog(user, 'Gemini AI', `Delete purchase from ${inc.supplier}`), ...d.auditLog].slice(0, 100)
             }));
           }
        }
        else if (type === 'ADD_TASK' && payload.txt) {
           setData(d => ({
              ...d,
              todos: [...(d.todos || []), { id: Date.now() + Math.floor(Math.random()*1000), txt: payload.txt, done: false }],
              auditLog: [createLog(user, 'Gemini AI', `Add task: ${payload.txt}`), ...(d.auditLog || [])].slice(0,100)
           }));
        }
        else if (type === 'ADD_CLIENT' && payload.name) {
           setData(d => ({
              ...d,
              clients: [{id: Date.now() + Math.floor(Math.random()*1000), name: payload.name, phone: payload.phone||'', city: '', totalBought:0, totalPaid:0, remaining:0, transactions:[]}, ...(d.clients||[])],
              auditLog: [createLog(user, 'Gemini AI', `Add client ${payload.name}`), ...(d.auditLog || [])].slice(0,100)
           }));
        }
        else if (type === 'ADD_WORKER' && payload.name) {
           setData(d => ({
              ...d,
              workers: [{id: Date.now() + Math.floor(Math.random()*1000), name: payload.name, totalEarned:0, received:0, advance:0, remaining:0, records:[]}, ...(d.workers||[])],
              auditLog: [createLog(user, 'Gemini AI', `Add worker ${payload.name}`), ...(d.auditLog || [])].slice(0,100)
           }));
        }
        else if (type === 'ADD_SUPPLIER' && payload.name) {
           setData(d => ({
              ...d,
              suppliers: [{id: Date.now() + Math.floor(Math.random()*1000), name: payload.name, phone: payload.phone||'', city: '', totalSupplied:0, totalPaid:0, remaining:0, payments:[], records:[]}, ...(d.suppliers||[])],
              auditLog: [createLog(user, 'Gemini AI', `Add supplier ${payload.name}`), ...(d.auditLog || [])].slice(0,100)
           }));
        }
        else if (type === 'ADD_RETURN' && payload.client && payload.product) {
           const qty = parseFloat(payload.quantity) || 1;
           const amt = parseFloat(payload.amount) || 0;
           const recId = Date.now() + Math.floor(Math.random()*1000);
           setData(d => {
             const isInvItem = (d.inventory?.items || []).some(i => i.name === payload.product);
             return {
                ...d,
                sales: [{id: recId, date: tDay, invoiceId: 'RET-'+recId.toString().slice(-6), client: payload.client, product: payload.product, quantity: -qty, unit: 'Return', unitPrice: 0, transportPrice: 0, totalAmount: -amt, paid: 0, remaining: -amt}, ...(d.sales || [])],
                clients: d.clients.map(c => c.name === payload.client ? {
                   ...c,
                   totalBought: Math.max(0, c.totalBought - amt),
                   remaining: c.remaining - amt,
                   transactions: [...(c.transactions||[]), {saleId: recId, date: tDay, type: 'Sales Return', product: payload.product, quantity: qty, total: -amt, paid: 0, remaining: c.remaining - amt}]
                } : c),
                inventory: isInvItem ? {
                   ...d.inventory,
                   items: (d.inventory?.items||[]).map(i => i.name === payload.product ? {...i, quantity: i.quantity + qty} : i),
                   log: [{id: Date.now(), date: new Date().toISOString(), action: `Sales return (${payload.client})`, amount: qty, user: 'Gemini AI'}, ...(d.inventory.log||[])].slice(0,50)
                } : d.inventory,
                auditLog: [createLog(user, 'Gemini AI', `Record return for ${payload.client} of ${amt}`), ...(d.auditLog||[])].slice(0,100)
             };
           });
        }
        else if (type === 'DEDUCT_SUPPLIER' && payload.name && payload.amount) {
           const amt = parseFloat(payload.amount) || 0;
           setData(d => {
             const suppExists = d.suppliers.some(s => s.name === payload.name);
             if (!suppExists) return d;
             return {
                ...d,
                suppliers: d.suppliers.map(s => s.name === payload.name ? {
                   ...s,
                   totalPaid: s.totalPaid + amt,
                   remaining: s.remaining - amt,
                   payments: [...(s.payments || []), {
                      id: Date.now() + Math.floor(Math.random()*1000),
                      date: tDay,
                      amount: amt,
                      notes: payload.notes || 'Direct Deduction / AI Settlement'
                   }]
                } : s),
                auditLog: [createLog(user, 'Gemini AI', `Deduct/settle ${amt} from supplier ${payload.name}`), ...(d.auditLog || [])].slice(0, 100)
             };
           });
        }
        else if (type === 'ADD_TREASURY' && payload.amount && payload.type) {
           const tType = String(payload.type).toLowerCase().includes('withdraw') || String(payload.type).includes('Withdraw') ? 'withdraw' : 'deposit';
           setData(d => ({
              ...d,
              treasuryMoves: [{ id: Date.now() + Math.floor(Math.random() * 1000), date: tDay, type: tType, amount: Number(payload.amount), reason: payload.reason || 'AI Operation', user: user?.name || 'Gemini AI' }, ...(d.treasuryMoves || [])],
              auditLog: [createLog(user, tType === 'deposit' ? 'Treasury Deposit' : 'Treasury Withdrawal', `${payload.amount} - ${payload.reason || 'AI'}`), ...(d.auditLog || [])].slice(0, 100)
           }));
        }
        else if (type === 'ADD_SALE' && payload.client && payload.product) {
           const qty = Number(payload.quantity) || 1;
           const up = Number(payload.unitPrice) || 0;
           const pd = Number(payload.paid) || 0;
           const total = qty * up;
           const rem = total - pd;
           const recId = Date.now() + Math.floor(Math.random()*1000);
           const invId = `INV-${Date.now().toString().slice(-6)}`;
           setData(d => {
             const isInvItem = (d.inventory?.items || []).some(i => i.name === payload.product);
             return { ...d,
                sales: [{id: recId, date: tDay, invoiceId: invId, client: payload.client, product: payload.product, quantity: qty, unit: 'pcs', unitPrice: up, transportPrice: 0, vat: 0, discount: 0, totalPrice: total, totalAmount: total, paid: pd, remaining: rem}, ...(d.sales || [])],
                clients: d.clients.map(c => c.name === payload.client ? { ...c, lastPurchase: tDay, totalBought: c.totalBought + total, totalPaid: c.totalPaid + pd, remaining: c.remaining + rem, transactions: [...(c.transactions||[]), {saleId: recId, date: tDay, product: payload.product, quantity: qty, unit: 'pcs', price: up, total, paid: pd, remaining: rem}] } : c),
                inventory: isInvItem ? {...d.inventory, items: (d.inventory?.items||[]).map(i => i.name === payload.product ? {...i, quantity: i.quantity - qty} : i), log: [{id: Date.now(), date:new Date().toISOString(), action:`AI sale (${payload.client})`, amount:-qty, user:user?.name || 'Gemini AI'}, ...(d.inventory.log||[])].slice(0,50)} : d.inventory,
                auditLog: [createLog(user, 'Gemini AI', `Record sale to ${payload.client} of ${total}`), ...(d.auditLog||[])].slice(0,100)
             };
           });
        }
        else if (type === 'ADD_INCOMING' && payload.supplier && payload.category) {
           const wt = Number(payload.weight) || 1;
           const up = Number(payload.unitPrice) || 0;
           const pd = Number(payload.paid) || 0;
           const total = wt * up;
           const rem = total - pd;
           const recId = Date.now() + Math.floor(Math.random()*1000);
           setData(d => {
             const isInvItem = (d.inventory?.items || []).some(i => i.name === payload.category);
             return { ...d,
                incoming: [{id: recId, date: tDay, supplier: payload.supplier, category: payload.category, weight: wt, unit: 'kg', unitPrice: up, transportPrice: 0, totalPrice: total, totalExpenses: total, production: wt, paid: pd, remaining: rem, quality: 'Approved'}, ...(d.incoming || [])],
                suppliers: d.suppliers.map(s => s.name === payload.supplier ? { ...s, totalSupplied: s.totalSupplied + total, totalPaid: s.totalPaid + pd, remaining: s.remaining + rem, records: [...(s.records||[]), {incomingId: recId, date: tDay, category: payload.category, weight: wt, total, paid: pd, remaining: rem}] } : s),
                inventory: isInvItem ? {...d.inventory, items: (d.inventory?.items||[]).map(i => i.name === payload.category ? {...i, quantity: i.quantity + wt} : i), log: [{id: Date.now(), date:new Date().toISOString(), action:`AI purchase (${payload.category})`, amount:wt, user:user?.name || 'Gemini AI'}, ...(d.inventory.log||[])].slice(0,50)} : d.inventory,
                auditLog: [createLog(user, 'Gemini AI', `Record purchase from ${payload.supplier} of ${total}`), ...(d.auditLog||[])].slice(0,100)
             };
           });
        }
        else if (type === 'PAY_CLIENT' && payload.name && payload.amount) {
           const amt = Number(payload.amount);
           setData(d => ({ ...d,
              clients: d.clients.map(c => c.name === payload.name ? { ...c, totalPaid: c.totalPaid + amt, remaining: c.remaining - amt, transactions: [...(c.transactions || []), {date: tDay, type: 'Cash Payment (AI)', paid: amt, remaining: c.remaining - amt}] } : c),
              auditLog: [createLog(user, 'Gemini AI', `Collect ${amt} from client ${payload.name}`), ...(d.auditLog || [])].slice(0, 100)
           }));
        }
        else if (type === 'PAY_SUPPLIER' && payload.name && payload.amount) {
           const amt = Number(payload.amount);
           setData(d => ({ ...d,
              suppliers: d.suppliers.map(s => s.name === payload.name ? { ...s, totalPaid: s.totalPaid + amt, remaining: s.remaining - amt, payments: [...(s.payments || []), {id: Date.now() + Math.floor(Math.random()*1000), date: tDay, amount: amt, notes: 'Cash Payment (AI)'}] } : s),
              auditLog: [createLog(user, 'Gemini AI', `Pay ${amt} to supplier ${payload.name}`), ...(d.auditLog || [])].slice(0, 100)
           }));
        }
        else if (type === 'PAY_WORKER' && payload.name && payload.amount) {
           const amt = Number(payload.amount);
           const isAdvance = payload.type === 'advance' || payload.type === 'Advance';
           const arType = isAdvance ? 'Advance' : 'Received';
           setData(d => ({ ...d,
              workers: d.workers.map(w => w.name === payload.name ? { ...w, received: !isAdvance ? w.received + amt : w.received, advance: isAdvance ? w.advance + amt : w.advance, remaining: w.remaining - amt } : w),
              auditLog: [createLog(user, 'Gemini AI', `Pay ${amt} (${arType}) to worker ${payload.name}`), ...(d.auditLog || [])].slice(0, 100)
           }));
        }
        else if (type === 'SET_ATTENDANCE' && payload.name && payload.status) {
           setData(d => {
              const worker = d.workers.find(w => w.name === payload.name);
              if (!worker) return d;
              const aDate = payload.date || tDay;
              const statusAr = payload.status === 'present' ? 'Present' : 'Absent';
              return { ...d,
                 attendance: { ...d.attendance, [aDate]: { ...(d.attendance?.[aDate] || {}), [worker.id]: payload.status } },
                 auditLog: [createLog(user, 'Gemini AI', `Mark worker ${worker.name} (${statusAr})`), ...(d.auditLog || [])].slice(0, 100)
              };
           });
        }
        else if (type === 'ADD_VEHICLE_LOG' && payload.vehicleName && payload.cost) {
           setData(d => {
              const vehicle = (d.vehicles || []).find(v => v.name.includes(payload.vehicleName) || v.number.includes(payload.vehicleName));
              if (!vehicle) return d;
              const cst = Number(payload.cost);
              const vDate = payload.date || tDay;
              const vType = payload.type || 'Maintenance';
              return { ...d,
                 vehicleLog: [...(d.vehicleLog || []), { id: Date.now() + Math.floor(Math.random()*1000), vehicleId: vehicle.id, date: vDate, type: vType, cost: cst, notes: payload.notes || 'by AI' }],
                 auditLog: [createLog(user, 'Gemini AI', `Log ${vType} for vehicle ${vehicle.name} at ${cst}`), ...(d.auditLog || [])].slice(0, 100)
              };
           });
        }
        else if (type === 'EDIT_PRODUCT_PRICE' && payload.product && payload.price !== undefined) {
           const price = Number(payload.price);
           setData(d => {
              const itemExists = (d.inventory?.items || []).some(i => i.name === payload.product);
              if (!itemExists) return d;
              return {
                 ...d,
                 inventory: { ...d.inventory, items: d.inventory.items.map(i => i.name === payload.product ? { ...i, price } : i) },
                 auditLog: [createLog(user, 'Gemini AI', `Edit product price ${payload.product} to ${price}`), ...(d.auditLog || [])].slice(0, 100)
              };
           });
        }
        else if (type === 'CLEAR_CLIENT_ACCOUNT' && payload.name) {
           setData(d => {
              const client = d.clients.find(c => c.name === payload.name);
              if (!client || client.remaining <= 0) return d;
              const amt = client.remaining;
              return {
                 ...d,
                 clients: d.clients.map(c => c.id === client.id ? { ...c, totalPaid: c.totalPaid + amt, remaining: 0, transactions: [...(c.transactions || []), {date: tDay, type: 'Settle Account (Final - AI)', paid: amt, remaining: 0}] } : c),
                 auditLog: [createLog(user, 'Gemini AI', `Settle client account ${payload.name} of ${amt}`), ...(d.auditLog || [])].slice(0, 100)
              };
           });
        }
        else if (type === 'CLEAR_SUPPLIER_ACCOUNT' && payload.name) {
           setData(d => {
              const supplier = d.suppliers.find(s => s.name === payload.name);
              if (!supplier || supplier.remaining <= 0) return d;
              const amt = supplier.remaining;
              return {
                 ...d,
                 suppliers: d.suppliers.map(s => s.id === supplier.id ? { ...s, totalPaid: s.totalPaid + amt, remaining: 0, payments: [...(s.payments || []), {id: Date.now() + Math.floor(Math.random()*1000), date: tDay, amount: amt, notes: 'Settle Account (Final - AI)'}] } : s),
                 auditLog: [createLog(user, 'Gemini AI', `Settle supplier account ${payload.name} of ${amt}`), ...(d.auditLog || [])].slice(0, 100)
              };
           });
        }
        else if (type === 'EDIT_CLIENT' && payload.oldName) {
           setData(d => {
              const client = d.clients.find(c => c.name === payload.oldName);
              if (!client) return d;
              const newName = payload.newName || client.name;
              return {
                 ...d,
                 clients: d.clients.map(c => c.id === client.id ? { ...c, name: newName, phone: payload.phone || c.phone, city: payload.city || c.city } : c),
                 sales: newName !== client.name ? d.sales.map(s => s.client === client.name ? {...s, client: newName} : s) : d.sales,
                 auditLog: [createLog(user, 'Gemini AI', `Edit client ${payload.oldName}`), ...(d.auditLog||[])].slice(0,100)
              };
           });
        }
        else if (type === 'EDIT_SALE' && payload.id) {
           const sale = data.sales.find(s => String(s.id) === String(payload.id));
           if (sale) {
             const qty = payload.quantity !== undefined ? Number(payload.quantity) : sale.quantity;
             const up = payload.unitPrice !== undefined ? Number(payload.unitPrice) : sale.unitPrice;
             const pd = payload.paid !== undefined ? Number(payload.paid) : sale.paid;
             const total = qty * up + (sale.transportPrice||0) - (sale.discount||0);
             const finalTotal = total + (total * (sale.vat||0)/100);
             const rem = finalTotal - pd;
             const diffTotal = finalTotal - sale.totalAmount;
             const diffPaid = pd - sale.paid;
             const diffRem = rem - sale.remaining;
             const diffQty = sale.quantity - qty;
             const isInvItem = (data.inventory?.items || []).some(i => i.name === sale.product);
             setData(d => ({ ...d,
                sales: d.sales.map(s => s.id === sale.id ? {...s, quantity: qty, unitPrice: up, totalPrice: qty*up, totalAmount: finalTotal, paid: pd, remaining: rem} : s),
                clients: d.clients.map(c => c.name === sale.client ? { ...c, totalBought: Math.max(0, c.totalBought + diffTotal), totalPaid: Math.max(0, c.totalPaid + diffPaid), remaining: c.remaining + diffRem, transactions: (c.transactions||[]).map(t => t.saleId === sale.id ? {...t, quantity: qty, price: up, total: finalTotal, paid: pd, remaining: rem} : t) } : c),
                inventory: (isInvItem && diffQty !== 0) ? {...d.inventory, items: (d.inventory?.items||[]).map(i => i.name === sale.product ? {...i, quantity: i.quantity + diffQty} : i), log: [{id: Date.now(), date:new Date().toISOString(), action:`Edit AI sale (${sale.client})`, amount:diffQty, user:user?.name || 'Gemini AI'}, ...(d.inventory.log||[])].slice(0,50)} : d.inventory,
                auditLog: [createLog(user, 'Gemini AI', `Edit sale to ${sale.client}`), ...(d.auditLog||[])].slice(0,100)
             }));
           }
        }
        else if (type === 'EDIT_INCOMING' && payload.id) {
           const inc = data.incoming.find(i => String(i.id) === String(payload.id));
           if (inc) {
             const wt = payload.weight !== undefined ? Number(payload.weight) : inc.weight;
             const up = payload.unitPrice !== undefined ? Number(payload.unitPrice) : inc.unitPrice;
             const pd = payload.paid !== undefined ? Number(payload.paid) : (inc.paid || 0);
             const total = wt * up;
             const exp = total + (inc.transportPrice||0);
             const rem = exp - pd;
             const prodDiff = (payload.weight !== undefined && inc.production === inc.weight) ? (wt - inc.weight) : 0;
             const newProd = (inc.production || 0) + prodDiff;
             const diffExp = exp - inc.totalExpenses;
             const diffPaid = pd - (inc.paid || 0);
             const diffRem = rem - (inc.remaining !== undefined ? inc.remaining : inc.totalExpenses);
             const isInvItem = (data.inventory?.items || []).some(i => i.name === inc.category);
             setData(d => ({ ...d,
                incoming: d.incoming.map(i => i.id === inc.id ? {...i, weight: wt, unitPrice: up, totalPrice: total, totalExpenses: exp, production: newProd, paid: pd, remaining: rem} : i),
                suppliers: d.suppliers.map(s => s.name === inc.supplier ? { ...s, totalSupplied: Math.max(0, s.totalSupplied + diffExp), totalPaid: Math.max(0, s.totalPaid + diffPaid), remaining: s.remaining + diffRem, records: (s.records||[]).map(r => r.incomingId === inc.id ? {...r, weight: wt, total: exp, paid: pd, remaining: rem} : r) } : s),
                inventory: (isInvItem && prodDiff !== 0) ? {...d.inventory, items: (d.inventory?.items||[]).map(i => i.name === inc.category ? {...i, quantity: i.quantity + prodDiff} : i), log: [{id: Date.now(), date:new Date().toISOString(), action:`Edit AI purchase (${inc.category})`, amount:prodDiff, user:user?.name || 'Gemini AI'}, ...(d.inventory.log||[])].slice(0,50)} : d.inventory,
                auditLog: [createLog(user, 'Gemini AI', `Edit purchase from ${inc.supplier}`), ...(d.auditLog||[])].slice(0,100)
             }));
           }
        }
      }

    } catch (err) {
      if (err.message !== 'RATE_LIMIT') {
        console.error("Gemini Execution Error:", err);
      }
      let errReply = lang === 'en' ? "Sorry, there was a problem communicating with Gemini. Please check your API Key and Internet connection." : "Sorry, there was a problem connecting to Gemini or reading the data. Check your API key and internet.";
      
      if (err.message === 'RATE_LIMIT') {
        errReply = lang === 'en' ? "I'm receiving too many requests right now! Please wait a minute and try again." : "I am getting too many requests right now! Wait a minute and try again (error 429).";
      }
      else if (err.message === 'BLOCKED_BY_SAFETY') {
        errReply = lang === 'en' ? "I cannot respond to this request due to safety policies." : "Sorry, I cannot respond to this request due to Google safety policies.";
      }
      else if (err.message === 'PARSE_ERROR') {
        errReply = lang === 'en' ? "I didn't quite catch that. Could you rephrase your request?" : "Sorry, I did not understand. Could you rephrase your request?";
      }
      else if (err.message === 'AUTH_ERROR') {
        errReply = lang === 'en' ? "Your API Key seems to be invalid. Please check it in Settings." : "The API key is invalid or unauthorized. Please review it in Settings.";
      }

      setMessages(m => m.filter(msg => !msg.isTyping).concat({ sender: 'bot', text: errReply }));
      speak(errReply);
    } finally {
      isThinkingRef.current = false;
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;
    processCommand(input.trim());
    setInput('');
  };

  const toggleListen = () => {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
       toast.error(lang === 'en' ? "Your browser does not support Speech Recognition." : "Your browser does not support voice input (try Google Chrome).");
       return;
    }
    const recognition = new SpeechRecognition();
    recRef.current = recognition;
    
    // Set speech-recognition language based on the app language
    recognition.lang = lang === 'en' ? 'en-US' : 'ar-EG';
    recognition.continuous = true; // keep recording until the user stops
    recognition.interimResults = true; // show text live while speaking
    
    isCancelledRef.current = false;
    transcriptRef.current = '';
    setRecordingText('');

    recognition.onstart = () => setListening(true);
    recognition.onresult = (e) => {
       if (isCancelledRef.current) return;
       let fullTranscript = '';
       for (let i = 0; i < e.results.length; ++i) {
           fullTranscript += e.results[i][0].transcript;
       }
       transcriptRef.current = fullTranscript.trim();
         setRecordingText(fullTranscript.trim());
    };
    recognition.onerror = (e) => {
       if (e.error === 'aborted') return;
       setListening(false);
       toast.error(lang === 'en' ? "Voice recognition error. Please try again." : "Voice recognition error. Please try again.");
    };
    recognition.onend = () => {
       setListening(false);
         setRecordingText('');
       if (!isCancelledRef.current && transcriptRef.current.trim() !== '') {
           processCommand(transcriptRef.current.trim());
       }
       transcriptRef.current = '';
    };
    
    recognition.start();
  };

  const cancelListen = () => {
    isCancelledRef.current = true;
    recRef.current?.stop();
    setListening(false);
    transcriptRef.current = '';
    setRecordingText('');
  };

  return createPortal(
    <div className="ai-panel" style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}>
      <div className="ai-hdr" style={{ cursor: isDragging ? 'grabbing' : 'grab' }} onMouseDown={startDrag} onTouchStart={startDrag}>
        <div className="fw7" style={{display:'flex', alignItems:'center', gap:8, color:'var(--tp)'}}>✨ <strong style={{background: 'linear-gradient(to right, #a78bfa, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontFamily: 'system-ui, sans-serif', letterSpacing: '1px'}}>SMART</strong> <span style={{fontFamily: 'system-ui, sans-serif', fontWeight: 600, fontSize: '13px', color: '#cbd5e1'}}>COPILOT</span></div>
        <button className="btn btn-g btn-icon btn-sm" onClick={onClose} style={{background:'transparent', border:'none', fontSize:18, padding:0, width:26, height:26}}>✕</button>
      </div>
      <div className="ai-body">
        {messages.map((m, i) => (
          <div key={i} className={`ai-msg ${m.sender}`} style={m.isTyping ? {fontStyle:'italic', opacity:0.7} : {}}>
            {m.isTyping ? (lang === 'en' ? 'Thinking...' : 'Thinking...') : <DynText>{m.text}</DynText>}
          </div>
        ))}
        <div ref={msgsEndRef} />
      </div>
      <div className="ai-footer">
        {listening ? (
          <>
            <button className="ai-mic listening" onClick={toggleListen} title={lang === 'en' ? "Stop & Send" : "Stop & Send"}>➤</button>
            <div style={{ flex: 1, background: 'var(--glass)', border: '1px solid var(--rose-l)', borderRadius: 20, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
               <span style={{color: 'var(--rose-l)', animation: 'pulse-glow 1s infinite'}}>🔴</span>
               <span style={{color: 'var(--tp)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 13}}>{recordingText || (lang === 'en' ? 'Listening...' : 'Listening...')}</span>
            </div>
            <button className="btn btn-d btn-icon" style={{borderRadius: '50%', width: 42, height: 42, padding: 0, flexShrink: 0}} onClick={cancelListen} title={lang === 'en' ? "Cancel" : "Cancel"}>✕</button>
          </>
        ) : (
          <>
            <button className="ai-mic" onClick={toggleListen} disabled={messages.some(m=>m.isTyping)} title={lang === 'en' ? "Voice input" : "Voice input"}>🎙</button>
            <input className="ai-input" placeholder={lang === 'en' ? 'Ask a question or command...' : 'Type a question or command...'} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSend()} disabled={messages.some(m=>m.isTyping)} />
            <button className="btn btn-p btn-icon" style={{borderRadius:'50%', width:42, height:42, padding:0, flexShrink:0}} onClick={handleSend} disabled={messages.some(m=>m.isTyping)}>➤</button>
          </>
        )}
      </div>
      <div className="ai-resize-handle" onMouseDown={startResize} onTouchStart={startResize}>
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><path d="M21 15l-6 6M21 8l-13 13" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
    </div>,
    document.body
  );
});

/* ═══════════════════════════════════════════════════════
   SAAS SUPER ADMIN DASHBOARD (NEW)
═══════════════════════════════════════════════════════ */
const SuperAdminPage = memo(function SuperAdminPage({ user }) {
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const { t } = useLanguage();
  const currency = t('currency');
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [tenantForm, setTenantForm] = useState({ name: '', email: '', domain: '', plan: 'Basic' });
  const [showEditPlan, setShowEditPlan] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [newPlan, setNewPlan] = useState('Basic');
  const [updatingPlan, setUpdatingPlan] = useState(false);

  useEffect(() => {
    db.getAllTenants().then(data => {
      setTenants(data.sort((a,b) => b.date.localeCompare(a.date)));
      setLoading(false);
    }).catch(err => {
      toast.error('Error fetching companies data');
      setLoading(false);
    });
  }, [toast]);

  const toggleStatus = async (t) => {
    if (t.id === 'nile_erp_main') { toast.error('Cannot suspend the system main company!'); return; }
    const isSuspending = t.status === 'active';
    const ok = await confirm(isSuspending ? 'Suspend Company' : 'Activate Company', `Are you sure you want to ${isSuspending ? 'disable' : 'enable'} access for company "${t.name}"?`);
    if (!ok) return;
    
    try {
      await db.updateTenantStatus(t.id, isSuspending ? 'suspended' : 'active');
      setTenants(prev => prev.map(x => x.id === t.id ? { ...x, status: isSuspending ? 'suspended' : 'active' } : x));
      toast.success(`Company ${isSuspending ? 'disabled' : 'enabled'} successfully.`);
    } catch (e) {
      toast.error('Error updating status');
    }
  };

  const handleAddTenant = async () => {
    if (!tenantForm.name.trim() || !tenantForm.email.trim()) { toast.error('Please enter company name and email'); return; }
    
    let customDomain = tenantForm.domain.trim().toLowerCase();
    if (customDomain && customDomain.includes('@')) {
       customDomain = customDomain.split('@')[1];
    }

    setAdding(true);
    try {
      const newTenant = await db.createNewTenant(tenantForm.name, tenantForm.email, tenantForm.plan, customDomain);
      // Add the new company to the top of the table immediately
      setTenants(prev => [newTenant, ...prev]);
      toast.success('Company created successfully ✅');
      setShowAdd(false);
      setTenantForm({ name: '', email: '', domain: '', plan: 'Basic' });
    } catch (e) {
      console.error(e);
      if (e.message === 'EMAIL_EXISTS') toast.error('❌ This email is already registered! Email must be unique.');
      else if (e.message === 'DOMAIN_EXISTS') toast.error('❌ This domain is already reserved by another company!');
      else toast.error('Error creating company');
    }
    setAdding(false);
  };

  const impersonate = async (t) => {
    localStorage.setItem('nile_impersonated_tenant', t.id);
    localStorage.setItem('nile_impersonated_tenant_name', t.name);
    localStorage.removeItem('nile_data_cache');
    try { await idbDel('nile_data_cache'); } catch(e){}
    window.location.reload();
  };

  const handleUpdatePlan = async () => {
    if (!editingTenant) return;
    setUpdatingPlan(true);
    try {
      await db.updateTenantPlan(editingTenant.id, newPlan);
      setTenants(prev => prev.map(x => x.id === editingTenant.id ? { ...x, plan: newPlan } : x));
      toast.success('Plan updated successfully ✅');
      setShowEditPlan(false);
    } catch (e) {
      console.error(e);
      toast.error('Error updating plan');
    }
    setUpdatingPlan(false);
  };

  const handleDeleteTenant = async (t) => {
    if (t.id === 'nile_erp_main') { toast.error('Cannot delete the main company!'); return; }
    const ok = await confirm('Delete Company Permanently', `Are you sure you want to permanently delete company "${t.name}" and all its data? This cannot be undone.`, { confirmLabel: 'Permanent Delete', confirmClass: 'btn-d' });
    if (!ok) return;

    try {
      await db.deleteTenant(t.id);
      setTenants(prev => prev.filter(x => x.id !== t.id));
      toast.success('Company deleted successfully 🗑️');
    } catch (e) {
      console.error(e);
      toast.error('Error during deletion');
    }
  };

  return (
    <div className="page">
      {dialog}
      <div className="alert-bar info" style={{marginBottom:20}}>
         <span style={{fontSize:24}}>👑</span>
         <div>
           <div className="fw7 ts" style={{color:'var(--light)'}}><DynText>Owner Dashboard</DynText> (Super Admin)</div>
           <div className="txs tmt mt2"><DynText>This screen is visible only to you. From here you can manage all tenant companies (SaaS) and activate/suspend their accounts.</DynText></div>
         </div>
      </div>
      <div className="stats-grid">
         <StatCard c="blue" icon="🏢" label={<DynText>Total Companies</DynText>} value={tenants.length} />
         <StatCard c="em" icon="✅" label={<DynText>Active Companies</DynText>} value={loading ? '...' : tenants.filter(t=>t.status==='active').length} />
         <StatCard c="rose" icon="⛔" label={<DynText>Suspended Companies</DynText>} value={loading ? '...' : tenants.filter(t=>t.status==='suspended').length} />
         <StatCard c="gold" icon="💳" label={<DynText>Subscription Revenue</DynText>} value={<>0 {currency}</>} sub={<DynText>Coming soon with online payments</DynText>} />
      </div>
      <div className="card">
         <div className="card-hdr">
           <div className="card-title">🌐 <DynText>Tenant Companies List</DynText></div>
           <button className="btn btn-p" onClick={() => setShowAdd(true)}>+ <DynText>Add Company</DynText></button>
         </div>
         <div className="table-scroll">
           <table>
             <thead><tr><th><DynText>Workspace ID</DynText></th><th><DynText>Company Name</DynText></th><th><DynText>Domain</DynText></th><th><DynText>Admin Email</DynText></th><th><DynText>Registration Date</DynText></th><th><DynText>Plan</DynText></th><th><DynText>Status</DynText></th><th><DynText>Actions</DynText></th></tr></thead>
             <tbody>
               {loading ? <tr><td colSpan={8} className="empty"><DynText>Loading company data...</DynText></td></tr> : 
                 tenants.length === 0 ? <tr><td colSpan={8} className="empty"><DynText>No companies registered</DynText></td></tr> :
                 tenants.map(t => (
                 <tr key={t.id}>
                   <td className="ts">{t.id}</td>
                   <td className="fw7 t-info">{t.name}</td>
                   <td className="ts t-gold">@{t.domain || '---'}</td>
                   <td className="tmt">{t.email}</td>
                  <td className="tmt">{fmtD(t.date ? t.date.split('T')[0] : '')}</td>
                   <td><span className="badge b-vio"><DynText>{t.plan}</DynText></span></td>
                   <td><span className={`badge ${t.status==='active'?'b-ok':'b-err'}`}><DynText>{t.status==='active'?'Active 🟢':'Suspended 🔴'}</DynText></span></td>
                   <td>
                     <div style={{display:'flex',gap:4}}>
                       <button className="btn btn-sm btn-p" onClick={()=>impersonate(t)} disabled={t.id === 'nile_erp_main'}><DynText>Enter</DynText></button>
                       <button className={`btn btn-sm ${t.status==='active'?'btn-d':'btn-s'}`} onClick={()=>toggleStatus(t)}><DynText>{t.status==='active'?'Suspend':'Activate'}</DynText></button>
                       <button className="btn btn-sm btn-gold" onClick={() => { setEditingTenant(t); setNewPlan(t.plan || 'Basic'); setShowEditPlan(true); }}><DynText>Edit Plan</DynText></button>
                       <button className="btn btn-sm btn-d btn-icon" onClick={() => handleDeleteTenant(t)} disabled={t.id === 'nile_erp_main'} title="Delete permanently">🗑</button>
                     </div>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="➕ Add New Company (Tenant)" footer={<><button className="btn btn-p" onClick={handleAddTenant} disabled={adding}>{adding ? '⏳ Creating...' : '✅ Add Company'}</button><button className="btn btn-g" onClick={() => setShowAdd(false)}>Cancel</button></>}>
        <div className="form-grid">
          <FormField label="Company Name *" full><input className="fi" value={tenantForm.name} onChange={e=>setTenantForm(f=>({...f, name: e.target.value}))} placeholder="e.g. Acme Trading LLC" /></FormField>
          <FormField label="Email (company manager) *" full><input type="email" className="fi" value={tenantForm.email} onChange={e=>setTenantForm(f=>({...f, email: e.target.value}))} placeholder="admin@company.com" style={{direction:'ltr',textAlign:'left'}} /></FormField>
          <FormField label="Company domain (auto-join) - optional" full><input className="fi" value={tenantForm.domain} onChange={e=>setTenantForm(f=>({...f, domain: e.target.value}))} placeholder="e.g. company.com" style={{direction:'ltr',textAlign:'left'}} /></FormField>
          <FormField label="Plan" full>
            <select className="fi" value={tenantForm.plan} onChange={e=>setTenantForm(f=>({...f, plan: e.target.value}))}>
              <option value="Basic"><DynText>Basic</DynText></option>
              <option value="Advanced"><DynText>Advanced</DynText></option>
              <option value="Professional"><DynText>Professional</DynText></option>
              <option value="Unlimited"><DynText>Unlimited (VIP)</DynText></option>
            </select>
          </FormField>
        </div>
        <div className="alert-bar info mt3">
           <span style={{fontSize: 20}}>ℹ️</span>
           <div className="ts"><DynText>Once the company is added, ask the admin to register with the same email — they'll instantly become the workspace admin of their own independent tenant.</DynText></div>
        </div>
      </Modal>

      <Modal open={showEditPlan} onClose={() => setShowEditPlan(false)} title={`✏️ Edit Plan: ${editingTenant?.name}`} footer={<><button className="btn btn-p" onClick={handleUpdatePlan} disabled={updatingPlan}>{updatingPlan ? <DynText>⏳ Updating...</DynText> : <DynText>✅ Save Plan</DynText>}</button><button className="btn btn-g" onClick={() => setShowEditPlan(false)}><DynText>Cancel</DynText></button></>}>
        <div className="form-grid">
          <FormField label="New Plan" full>
            <select className="fi" value={newPlan} onChange={e=>setNewPlan(e.target.value)}>
              <option value="Basic"><DynText>Basic</DynText></option>
              <option value="Advanced"><DynText>Advanced</DynText></option>
              <option value="Professional"><DynText>Professional</DynText></option>
              <option value="Unlimited"><DynText>Unlimited (VIP)</DynText></option>
            </select>
          </FormField>
        </div>
      </Modal>
    </div>
  );
});

/* ════════════���══════════════════════════════════════════
   ROOT APP — Firebase async load/save
═══════════════════════════════════════════════════════ */
function AppInner() {
  const toast = useToast();
  const { lang, toggleLang, t } = useLanguage();
  const [loading, setLoading]     = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [user, setUser]           = useState(() => db.loadSession());
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('nile_sidebar_collapsed') === 'true');
  const [page, setPage]           = useState(() => localStorage.getItem('nile_active_page') || 'dashboard');
  const deferredPage              = useDeferredValue(page);
  const [data, dispatch]          = useReducer(appReducer, null, () => EMPTY_DATA);
  const currentDataRef            = useRef(data);
  useEffect(() => { currentDataRef.current = data; }, [data]);

  const lastSource                = useRef(null);
  const [fbData, setFbData] = useState(null);
  const [showNotif, setShowNotif] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showAI, setShowAI]       = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('nile_theme') || 'dark');
  const [sysStatus, setSysStatus] = useState(navigator.onLine ? 'online' : 'offline');
  const [updateReady, setUpdateReady] = useState(false);
  const initialized = useRef(false);
  const notifRef    = useRef(null);
  const saveTimer   = useRef(null);
  const touchStartX = useRef(null);
  const touchEndX   = useRef(null);
  const touchStartY = useRef(null);
  const touchEndY   = useRef(null);
  const scrollYAtStart = useRef(0); // Add to prevent layout thrashing
  const [refreshing, setRefreshing] = useState(false);
  const pullRef = useRef(null);
  const pullYRef = useRef(0);
  
  /* Close the sidebar when clicking outside it */
  const sidebarRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mobileOpen && sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        if (event.target.closest('.hamburger')) return; // ignore clicks on the menu button itself
        setMobileOpen(false);
      }
    };
    if (mobileOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mobileOpen]);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  useEffect(() => {
    localStorage.setItem('nile_active_page', page);
  }, [page]);

  const isElectron = window.navigator.userAgent.includes('Electron');
  const winCtrl = (act) => { if(isElectron && window.electron) window.electron.ipcRenderer.send(act); };

  /* Load data from Firebase + session from localStorage */
  useEffect(() => {
    // TBT perf: slightly defer the local data read so the browser paints the shell first
    const fastLoadTimer = setTimeout(async () => {
      if (!lastSource.current) {
        try {
          let cachedData = await idbGet('nile_data_cache');
          if (!cachedData) {
             const oldCached = localStorage.getItem('nile_data_cache');
             if (oldCached) {
                cachedData = JSON.parse(oldCached);
                await idbSet('nile_data_cache', cachedData);
                localStorage.removeItem('nile_data_cache');
             }
          }
          if (cachedData) {
              startTransition(() => {
                dispatch({ type: 'REPLACE', payload: cachedData, noMerge: true });
                setDataLoaded(true);
              });
          }
        } catch(e) {}
      }
    }, 15);

    let unsubDb = () => {};
    let isSubscribed = false;

    (async () => {
      // Start the subscription only after confirming a user exists
      const startSubscription = () => {
        if (isSubscribed) return;
        let cancelled = false;
        unsubDb = db.subscribe(async (newData) => {
              // Fixed: allow empty data through to init a new account; ignore only connection errors
              if (newData && (newData._isConnectionError || newData._connectionError)) {
                setSysStatus('offline');
                return; 
              }

              let localLastMod = 0;
              let currentLocal = null;
              try { 
                currentLocal = await idbGet('nile_data_cache');
                if (!currentLocal) {
                   const oldCached = localStorage.getItem('nile_data_cache');
                   if (oldCached) {
                      currentLocal = JSON.parse(oldCached);
                      await idbSet('nile_data_cache', currentLocal);
                      localStorage.removeItem('nile_data_cache');
                   }
                }
                if (currentLocal) {
                   localLastMod = currentLocal.lastModified || 0;
                }
              } catch(e) {}
              
              const remoteLastMod = newData?.lastModified || 0;
              
              if (newData && remoteLastMod >= localLastMod) {
                setFbData(newData);
                lastSource.current = 'remote';
                startTransition(() => {
                  dispatch({ type: 'REPLACE', payload: newData });
                });
                try { await idbSet('nile_data_cache', newData); } catch(e){}
              } else if (currentLocal && localLastMod > remoteLastMod) {
                lastSource.current = 'local';
                startTransition(() => {
                  dispatch({ type: 'REPLACE', payload: currentLocal });
                });
              } else if (!newData) {
                setFbData(EMPTY_DATA);
                if (currentLocal) {
                   lastSource.current = 'local';
                   startTransition(() => {
                     dispatch({ type: 'REPLACE', payload: currentLocal });
                   });
                } else {
                 lastSource.current = 'local'; // force-save initial data for a new company to init its workspace in Firebase
                   startTransition(() => {
                     dispatch({ type: 'REPLACE', payload: EMPTY_DATA });
                   });
                   try { await idbDel('nile_data_cache'); } catch(e) {}
                }
              }
          startTransition(() => {
            setSysStatus('online');
            setDataLoaded(true);
          });
        }).then(unsub => {
            if (cancelled) unsub();
            else unsubDb = unsub;
        });
        unsubDb = () => { cancelled = true; };
        isSubscribed = true;
      };
      
      // Listen for auth state changes
      const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          // Check whether the user was deleted (banned) by the admin
          // Use lastSource.current to ensure data is loaded, or use fbData
          const currentEmailSafe = String(firebaseUser.email || '').toLowerCase();
          if (currentDataRef.current && currentDataRef.current.bannedEmails && currentDataRef.current.bannedEmails.some(e => String(e).toLowerCase() === currentEmailSafe)) {
             await signOut(auth);
             toast.error('⛔ This account was deleted by the admin.');
             return;
          }

          const isSuperAdmin = currentEmailSafe === 'negm@nile.com' || currentEmailSafe === 'aboalaa@nile.com';
          
          // [SaaS] Resolve the company's tenant workspace using the central database
          let resolvedTenantId = 'nile_erp_main';
          let tenantStatus = 'active';
          let isOwner = false;

          if (isSuperAdmin) {
            isOwner = true;
            const impersonated = localStorage.getItem('nile_impersonated_tenant');
            if (impersonated) {
              resolvedTenantId = impersonated;
            }
          } else {
            const tenantInfo = await db.getUserTenant(currentEmailSafe, firebaseUser.uid);
            resolvedTenantId = tenantInfo.tenantId;
            tenantStatus = tenantInfo.status;
            isOwner = tenantInfo.isOwner;
          }
          
          if (tenantStatus === 'suspended') {
             await signOut(auth);
             toast.error('⛔ This company account is suspended — please contact the admin.');
             return;
          }

          setTenantId(resolvedTenantId);
          localStorage.setItem('nile_tenant_id', resolvedTenantId);
          localStorage.setItem('nile_is_owner', isOwner.toString());

          let rName = firebaseUser.displayName;
          if (!rName || rName === "New User") {
            rName = (user?.name && user.name !== "New User") ? user.name : (isSuperAdmin ? "General Manager" : "New User");
          }

          const u = {
            uid: firebaseUser.uid,
            name: rName,
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL,
            tenantId: resolvedTenantId,
            isOwner: isOwner
          };
          setUser(u);
          db.saveSession(u);
          startSubscription(); // critical fix: enable sync for online users
        } else {
        const sessionUser = db.loadSession();
        if (sessionUser && sessionUser.isLocal) {
          setTenantId(sessionUser.tenantId);
          localStorage.setItem('nile_tenant_id', sessionUser.tenantId);
          startSubscription(); // sync data for the local user when offline
        }
        setUser(sessionUser?.isLocal ? sessionUser : null);
        }

        // Ensure user data is synced after sign-in
        if (firebaseUser && fbData) {
          const exists = fbData.systemUsers?.find(u => u.email === firebaseUser.email);
          if (exists) {
            // Update the UI with the user's data
            setUser({
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || "New User",
              email: firebaseUser.email,
              photoURL: exists.photoURL || firebaseUser.photoURL,
            });
          }
        }
        initialized.current = true;
        setLoading(false);
      });

      return () => {
        unsubDb();
        unsubAuth();
      clearTimeout(fastLoadTimer);
      };
    })();
  }, []);

  useEffect(() => {
    const handleOnline = async () => {
      setSysStatus('online');
      if (lastSource.current === 'local') {
        toast.info('Connection restored, syncing... ⏳');
        try { 
          let c = await idbGet('nile_data_cache'); 
          if (!c) {
             const oldStr = localStorage.getItem('nile_data_cache');
             if(oldStr) {
               c = JSON.parse(oldStr);
               await idbSet('nile_data_cache', c);
               localStorage.removeItem('nile_data_cache');
             }
          }
          if (c) {
            setSaving(true);
            db.save(c).then(res => {
              if (res === true) {
                setLastSaved(new Date());
                toast.success('Data synced successfully 🔄');
                lastSource.current = 'remote';
                setSaving(false);
              } else if (res === 'RACE_CONDITION') {
                toast.error('⚠️ Sync failed: data was modified on another device');
                setSaving(false);
              } else {
                toast.error('❌ Sync failed');
                setSaving(false);
              }
            }).catch(() => {
              setSysStatus('offline');
              setSaving(false);
            });
          } 
        } catch(e) { setSaving(false); }
      } else {
        toast.success('Connection restored 🟢');
      }
    };
    const handleOffline = () => {
      setSysStatus('offline');
      toast.warning('Connection lost — saving locally now (offline) 📵');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, [toast]);

  /* Auto-add the new user to the users list */
  useEffect(() => {
    if (user && initialized.current && dataLoaded && data && data.systemUsers) {
      // If the user is on the banned list, don't add them
      if (data.bannedEmails?.some(e => String(e).toLowerCase() === String(user.email || '').toLowerCase())) return;

          const currentUserEmailLower = String(user.email || '').toLowerCase();
          const existsLocally = data.systemUsers.find(u => u.email.toLowerCase() === currentUserEmailLower);
          const isSuperAdmin = currentUserEmailLower === 'negm@nile.com' || currentUserEmailLower === 'aboalaa@nile.com';
          const finalName = user.name || (isSuperAdmin ? "General Manager" : "New User");
          
          // Decide whether the user owns the company to make them Admin automatically
          const isOwner = user.isOwner === true || localStorage.getItem('nile_is_owner') === 'true';

          if (!existsLocally) {
        setData(d => {
          // Check the user doesn't already exist locally to prevent duplicates
          const isAlreadyAdded = d.systemUsers.some(u => String(u.email || '').toLowerCase() === currentUserEmailLower);
              if (isAlreadyAdded) return d;
          return {
            ...d,
            systemUsers: [
              ...d.systemUsers,
              {
                email: user.email,
                    name: finalName,
                    role: (isSuperAdmin || isOwner) ? 'Admin' : 'User',
                active: true,
                    perms: (isSuperAdmin || isOwner) ? FULL_PERMS : DEFAULT_USER_PERMS,
                    photoURL: user.photoURL || null
              }
            ]
          };
        });
          } else if ((existsLocally.name === "New User" || existsLocally.name === "Pending login...") && finalName !== "New User" && finalName !== "Pending login...") {
            // Update the name if previously stored as a new user, or fix the admin name
        setData(d => ({
          ...d,
          systemUsers: d.systemUsers.map(u => String(u.email || '').toLowerCase() === currentUserEmailLower ? { ...u, name: finalName } : u)
        }));
      }
    }
  }, [user, dataLoaded, data.systemUsers, data.bannedEmails]);

  /* Refresh user data (name) from the database on load */
  useEffect(() => {
    if (user && dataLoaded && data.systemUsers) {
      const dbUser = data.systemUsers.find(u => String(u.email || '').toLowerCase() === String(user.email || '').toLowerCase());
      // Fix: Sync both Name AND PhotoURL if changed in DB
      if (dbUser) {
        const isPlaceholder = dbUser.name === "New User" || dbUser.name === "Pending login...";
        if (!isPlaceholder && (dbUser.name !== user.name || dbUser.photoURL !== user.photoURL)) {
          setUser(prev => ({ ...prev, name: dbUser.name, photoURL: dbUser.photoURL }));
        }
      }
    }
  }, [data.systemUsers, user?.email, user?.name, user?.photoURL, dataLoaded]); 

  /* Enable push notifications for mobile (Capacitor) */
  useEffect(() => {
    if (user && Capacitor.isNativePlatform()) {
      // Request permissions from the user
      PushNotifications.requestPermissions().then(result => {
        if (result.receive === 'granted') {
          PushNotifications.register();
        }
      });

      // On successful registration, send the token to the Firebase database
      PushNotifications.addListener('registration', (token) => {
        console.log('FCM Token:', token.value);
        db.saveDeviceToken(user.email, token.value).catch(console.error);
      });

      // Receive the notification while the app is in foreground and show it as a toast
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        toast.info(`🔔 ${notification.title}: ${notification.body}`);
      });
    }
  }, [user, toast]);

  /* ── Theme Persistence ── */
  useEffect(() => {
    if (theme === 'light') document.body.classList.add('light-mode');
    else document.body.classList.remove('light-mode');
    localStorage.setItem('nile_theme', theme);
  }, [theme]);

  /* Set the browser title to reflect the active company name */
  useEffect(() => {
    document.title = localStorage.getItem('nile_impersonated_tenant_name') || data?.companyInfo?.name || 'Nexora ERP';
  }, [data?.companyInfo?.name]);

  useEffect(() => {
    const savedBg = localStorage.getItem('nile_bg_grad');
    if (savedBg) document.documentElement.style.setProperty('--bg-grad', savedBg);
  }, []);

  useEffect(() => {
    localStorage.setItem('nile_sidebar_collapsed', collapsed);
  }, [collapsed]);

  /* ── Prevent closing while saving ── */
  useEffect(() => {
    if (!saving) return;
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saving]);

  /* Listen for Electron updates */
  useEffect(() => {
    if (isElectron && window.electron?.ipcRenderer?.on) {
      window.electron.ipcRenderer.on('update-downloaded', () => {
        setUpdateReady(true);
      });
    }
  }, [isElectron]);

  /* Watch and update the current user's permissions in real time */
  useEffect(() => {
    if (user && dataLoaded && data.systemUsers) {
      const safeEmail = String(user.email || '').toLowerCase();
      const myUserEntry = data.systemUsers.find(u => String(u.email || '').toLowerCase() === safeEmail);
      // If the account was disabled while working
      if (myUserEntry && myUserEntry.active === false && safeEmail !== "negm@nile.com") {
        handleLogout();
        alert("⛔ Your account was disabled by the admin");
      }
      const isBanned = data.bannedEmails?.some(e => String(e).toLowerCase() === safeEmail);
      if (isBanned && safeEmail !== "negm@nile.com") {
        handleLogout();
        alert("⛔ This account was deleted by the admin");
      }
      // Auto-clean old logs to keep the app fast (maintenance)
      if (data.auditLog.length > 150 && !saving) {
         setData(d => ({ ...d, auditLog: d.auditLog.slice(0, 100) }));
      }
    }
  }, [data.systemUsers, user, dataLoaded, saving]);

  /* Close the alerts panel when clicking outside it */
  useEffect(() => {
    const handleClick = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false); };
    if (showNotif) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showNotif]);

  /* setData: update state + debounced auto-save to Firebase */
  const setData = useCallback(updater => {
    lastSource.current = 'local';
    dispatch({ type: 'UPDATE', updater });
  }, []);

  /* Auto-save on local changes */
  useEffect(() => {
    if (initialized.current && dataLoaded && lastSource.current === 'local' && data) {
      // CPU/UI perf (removed the very heavy deep clone)
      idbSet('nile_data_cache', data).catch(()=>{});
      
      if (!navigator.onLine) return; // avoid auto-save attempts while offline

      clearTimeout(saveTimer.current);
      setSaving(true);
      saveTimer.current = setTimeout(() => {
        db.save(data).then(res => {
            if (res === true) {
              setLastSaved(new Date());
              if (currentDataRef.current?.lastModified === data.lastModified) {
                lastSource.current = 'remote';
                setSaving(false);
              }
              setSysStatus(prev => {
                if (prev === 'offline') toast.success('Connection restored and data synced 🟢');
                return 'online';
              });
            } else if (res === 'RACE_CONDITION') {
              toast.warning('⚠️ Another device modified the data! Refreshing...');
              setSaving(false);
              // subscribe will fetch the new data automatically
            } else {
              setSysStatus('offline');
              setSaving(false);
            }
          }).catch(err => {
            console.error("Save error:", err);
            setSysStatus(prev => {
              if (prev === 'online') toast.warning('⚠️ Cannot reach the server. Saving locally 📵');
              return 'offline';
            });
            if (currentDataRef.current && currentDataRef.current.lastModified === data.lastModified) setSaving(false);
          });
      }, 1500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, dataLoaded]);

  const handleLogin = (localUser) => {
    if (localUser) {
      setUser(localUser);
      db.saveSession(localUser);
    }
    // For local sign-in, data is already loaded from cache via db.subscribe
  }; 

  const handleLogout = useCallback(async () => {
    await signOut(auth);
    db.saveSession(null);
    setUser(null);
    setShowNotif(false);
    setMobileOpen(false);
    localStorage.removeItem('nile_impersonated_tenant');
    localStorage.removeItem('nile_impersonated_tenant_name');
    localStorage.removeItem('nile_data_cache');
    localStorage.removeItem('nile_token');
    localStorage.removeItem('nile_is_super');
    localStorage.removeItem('nile_plan');
    localStorage.removeItem('nile_plan_modules');
    try { await idbDel('nile_data_cache'); } catch(e){}
  }, []);

  const navTo = useCallback(id => { setPage(id); setMobileOpen(false); }, []);

  // Resolve permissions for the active user from the per-tenant systemUsers list.
  const safeActiveEmail = String(user?.email || '').toLowerCase();
  const currentUserEntry = data.systemUsers?.find(u => String(u.email || '').toLowerCase() === safeActiveEmail);
  // Super admin = the original platform owners, OR the flag set by the MongoDB
  // backend (SUPER_ADMIN_EMAIL). Only super admins ever see the SaaS platform.
  const backendSuper = (() => { try { return localStorage.getItem('nile_is_super') === '1'; } catch { return false; } })();
  const isSuperAdmin = backendSuper || user?.isSuperAdmin === true || safeActiveEmail === "negm@nile.com" || safeActiveEmail === "aboalaa@nile.com";
  const isAdmin = isSuperAdmin || currentUserEntry?.role === 'Admin';
  const isActive = isSuperAdmin ? true : (currentUserEntry ? currentUserEntry.active !== false : true);

  const perms = isAdmin ? FULL_PERMS : (currentUserEntry?.perms || DEFAULT_USER_PERMS);

  // Plan-based feature gating (only when synced via the MongoDB backend, which
  // returns the tenant's allowed modules). Without a backend (Firebase/local),
  // nothing is gated. Super admins (modules = ["*"]) bypass all gating.
  const GATEABLE_PAGES = ['logistics', 'treasury', 'hr', 'crm', 'manufacturing', 'statistics', 'reports', 'integrations'];
  const planModules = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('nile_plan_modules') || 'null'); } catch { return null; }
  }, [user]);
  const moduleAllowed = useCallback((id) => {
    if (!Array.isArray(planModules)) return true;     // no backend gating in play
    if (planModules.includes('*')) return true;        // super admin
    if (!GATEABLE_PAGES.includes(id)) return true;     // core module, always on
    return planModules.includes(id);
  }, [planModules]);

  // 🛡️ Route guards: redirect users away from pages they can't access.
  useEffect(() => {
    const adminPages = ['users', 'settings'];
    const superPages = ['saas'];

    if (superPages.includes(page) && !isSuperAdmin) {
      navTo('dashboard');
      toast.error('⛔ You are not authorized to access the owner panel');
    } else if (adminPages.includes(page) && !isAdmin) {
      navTo('dashboard');
      toast.error('⛔ You are not authorized to access Settings');
    } else if (!moduleAllowed(page)) {
      navTo('dashboard');
      toast.error('🔒 This feature is not included in your plan — upgrade to unlock it');
    }
  }, [page, isAdmin, isSuperAdmin, navTo, toast, moduleAllowed]);

  const L = data.appLabels || EMPTY_DATA.appLabels;
  const NAV = [
    {id:'dashboard',label: t('dashboard'),icon:'📊',c:'var(--bright)',adminOnly:false},
    {id:'incoming', label: lang==='ar'?L.incoming:t('incoming'),     icon:'📥',c:'var(--cyan)', adminOnly:false},
    {id:'sales',    label: lang==='ar'?L.sales:t('sales'),        icon:'💳',c:'var(--em)',   adminOnly:false},
    {id:'clients',  label: lang==='ar'?L.clients:t('clients'),      icon:'👥',c:'var(--gold)', adminOnly:false},
    {id:'workers',  label: lang==='ar'?L.workers:t('workers'),      icon:'👷',c:'var(--orange)',adminOnly:false},
    {id:'suppliers',label: lang==='ar'?L.suppliers:t('suppliers'),    icon:'🏪',c:'var(--vio)', adminOnly:false},
    {id:'inventory',label: lang==='ar'?L.inventory:t('inventory'),    icon:'📦',c:'var(--rose)', adminOnly:false},
    {id:'expenses', label: lang==='ar'?L.expenses:t('expenses'),     icon:'💼',c:'var(--cyan)', adminOnly:false},
    {id:'logistics',label: lang==='ar'?L.logistics:t('logistics'),    icon:'🚛',c:'var(--blue)', adminOnly:false},
    {id:'treasury', label: lang==='ar'?L.treasury:t('treasury'),     icon:'💰',c:'var(--gold)', adminOnly:false},
    {id:'hr',       label: lang==='ar'?L.hr:t('hr'),           icon:'👔',c:'var(--rose)', adminOnly:false},
    {id:'crm',      label: lang==='ar'?L.crm:t('crm'),          icon:'🤝',c:'var(--cyan)', adminOnly:false},
    {id:'manufacturing',label: lang==='ar'?(L.manufacturing||'Manufacturing'):t('manufacturing'),icon:'🏭',c:'var(--gold)',adminOnly:false},
    {id:'integrations',label: t('integrations'),icon:'🔌',c:'var(--vio)',adminOnly:false},
    {id:'statistics',label: t('statistics'),icon:'📈',c:'var(--em)', adminOnly:false, requirePerm: 'finance.viewReports'},
    {id:'reports',  label: t('reports'),     icon:'📄',c:'var(--vio)',  adminOnly:false, requirePerm: 'finance.viewReports'},
    {id:'profile',  label: t('profile'),        icon:'👤',c:'var(--light)',adminOnly:false},
    {id:'users',    label: t('users'),icon:'🔐',c:'var(--rose)',adminOnly:true},
    {id:'saas',     label: lang==='ar'?'Companies Management (SaaS)':t('saas'), icon:'🏢',c:'var(--gold)',adminOnly:true, superOnly:true},
    {id:'settings', label: t('settings'),    icon:'⚙',c:'var(--ts)',   adminOnly:true},
  ];

  const alertCount = useMemo(() => {
    if (!dataLoaded || !data) return 0;
    let c = 0;
    (data.inventory?.items || []).forEach(item => { if (item.threshold > 0 && item.quantity < item.threshold) c++; });
    data.clients?.forEach(cl => { if (cl.remaining > 5000) c++; });
    data.suppliers?.forEach(s => { if (s.remaining > 3000) c++; });
    
    // 🚨 Anomaly Alerts Count
    const thisM = new Date().toISOString().slice(0, 7);
    const lastMD = new Date(); lastMD.setMonth(lastMD.getMonth() - 1);
    const lastM = lastMD.toISOString().slice(0, 7);
    const expThis = data.expenses.filter(e => e.date && e.date.startsWith(thisM)).reduce((a,b)=>a+b.amount,0);
    const expLast = data.expenses.filter(e => e.date && e.date.startsWith(lastM)).reduce((a,b)=>a+b.amount,0);
    if (expLast > 0 && expThis > expLast * 1.5) c++;
    data.clients?.forEach(cl => { if (cl.totalBought > 5000 && cl.remaining > cl.totalBought * 0.75) c++; });
    
    return c;
  }, [data, dataLoaded]);

  const TITLES = {
    dashboard:`🏠 ${t('dashboard')}`, incoming:`📥 ${lang==='ar'?L.incoming:t('incoming')}`, sales:`💳 ${lang==='ar'?L.sales:t('sales')}`,
    clients:`👥 ${lang==='ar'?L.clients:t('clients')}`, workers:`👷 ${lang==='ar'?L.workers:t('workers')}`, suppliers:`🏪 ${lang==='ar'?L.suppliers:t('suppliers')}`,
    inventory:`📦 ${lang==='ar'?L.inventory:t('inventory')}`, expenses:`💼 ${lang==='ar'?L.expenses:t('expenses')}`, statistics:`📈 ${t('statistics')}`,
    reports:`📄 ${t('reports')}`, users:`🔐 ${t('users')}`, settings:`⚙ ${t('settings')}`,
    logistics:`🚛 ${lang==='ar'?L.logistics:t('logistics')}`, treasury:`💰 ${lang==='ar'?L.treasury:t('treasury')}`, profile:`👤 ${t('profile')}`,
    hr:`👔 ${lang==='ar'?L.hr:t('hr')}`, crm:`🤝 ${lang==='ar'?L.crm:t('crm')}`,
    manufacturing:`🏭 ${lang==='ar'?(L.manufacturing||'Manufacturing & Production'):t('manufacturing')}`,
    saas:`🏢 ${lang==='ar'?'Companies Management (SaaS)':t('saas')}`,
    integrations:`🔌 ${t('integrations')}`
  };
  
  /* ── Touch Gestures (Swipe Sidebar + Pull to Refresh) ── */
  const onTouchStart = (e) => {
    touchEndX.current = null;
    touchEndY.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
    touchStartY.current = e.targetTouches[0].clientY;
    scrollYAtStart.current = window.scrollY; // read once to avoid layout thrashing
  };
  const onTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
    touchEndY.current = e.targetTouches[0].clientY;
    if (touchStartY.current !== null && !mobileOpen && !refreshing) {
      const diff = e.targetTouches[0].clientY - touchStartY.current;
      if (diff > 0 && scrollYAtStart.current <= 0) {
        const newY = Math.min(diff * 0.4, 120);
        pullYRef.current = newY;
        if (pullRef.current) {
          pullRef.current.style.transform = `translateY(${newY - 60}px)`;
          pullRef.current.style.transition = 'none';
        }
      }
    }
  };
  const onTouchEnd = () => {
    // Sidebar & Navigation Logic
    if (touchStartX.current && touchEndX.current && touchStartY.current && touchEndY.current) {
      const dx = touchStartX.current - touchEndX.current;
      const dy = touchStartY.current - touchEndY.current;
      
      if (Math.abs(dx) > Math.abs(dy)) { // Horizontal Swipe
        const isLeftSwipe = dx > 50;
        const isRightSwipe = dx < -50;
        if (mobileOpen) {
          if (isRightSwipe) setMobileOpen(false);
        } else {
          if (isLeftSwipe && touchStartX.current > window.innerWidth - 70) setMobileOpen(true);
        }
      }
    }

    // Pull to Refresh Logic
    if (pullYRef.current > 60 && !refreshing) {
      setRefreshing(true);
      if (pullRef.current) {
        pullRef.current.style.transform = `translateY(0px)`;
        pullRef.current.style.transition = 'transform .3s ease';
      }
      setTimeout(() => {
        setRefreshing(false);
        if (pullRef.current) pullRef.current.style.transform = `translateY(-60px)`;
        toast.success('Data updated ✅');
      }, 1500);
    } else {
      if (pullRef.current && !refreshing) {
        pullRef.current.style.transform = `translateY(-60px)`;
        pullRef.current.style.transition = 'transform .3s ease';
      }
    }
    pullYRef.current = 0;
    touchStartY.current = null;
    touchEndY.current = null;
  };

  /* ── Keyboard Shortcuts ── */
  useEffect(() => {
    const handleKey = (e) => {
      if (e.altKey) {
        if (e.key === '1') navTo('dashboard');
        if (e.key === '2') navTo('sales');
        if (e.key === '3') navTo('incoming');
        if (e.key === '4') navTo('inventory');
        if (e.key.toLowerCase() === 's' && isAdmin) navTo('settings');
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [navTo, isAdmin]);

  
  useEffect(() => {
    const handleRipple = (e) => {
      const btn = e.target.closest('.btn');
      if (btn) {
        const circle = document.createElement('span');
        const d = Math.max(btn.clientWidth, btn.clientHeight);
        const r = d / 2;
        const rect = btn.getBoundingClientRect();
        circle.style.width = circle.style.height = `${d}px`;
        circle.style.left = `${e.clientX - rect.left - r}px`;
        circle.style.top = `${e.clientY - rect.top - r}px`;
        circle.classList.add('ripple');
        btn.appendChild(circle);
        setTimeout(() => circle.remove(), 600);
      }
    };
    document.addEventListener('mousedown', handleRipple);
    return () => document.removeEventListener('mousedown', handleRipple);
  }, []);

    const isReadyToRender = (user && dataLoaded) || (!loading && !user);
  if (!isReadyToRender) return (
    <>
      <GlobalStyle />
      <SkeletonLoader />
    </>
  );

  // If not signed in or the account is disabled
  if (!user || !isActive) return (
    <>
      <GlobalStyle />
      <LoginPage onLogin={handleLogin} checkActive={(email) => {
        if (email === "negm@nile.com") return true;
        const u = fbData?.systemUsers?.find(x => x.email === email);
        return u ? u.active : true; // active by default until data loads and is verified
      }} />
    </>
  );

  const pageProps = { data, setData, isAdmin, perms, user, isMobile };

  return (
    <>
      <GlobalStyle />
      <div className="wrap" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        {/* Pull to Refresh Indicator */}
        <div ref={pullRef} className="pull-refresh" style={{
          position:'fixed',top:0,left:0,right:0,height:60,display:'flex',alignItems:'center',justifyContent:'center',zIndex:2000,pointerEvents:'none',
          transform:`translateY(-60px)`,transition:'transform .3s ease'
        }}>
          <div style={{background:'var(--navy)',border:'1px solid var(--border)',borderRadius:20,padding:'8px 16px',boxShadow:'0 4px 15px rgba(0,0,0,.3)',display:'flex',alignItems:'center',gap:8}}>
            {refreshing?<div className="spinner" style={{width:18,height:18,borderWidth:2}}/>:<span style={{transition:'transform .2s'}}>⬇️</span>}
            <span style={{fontSize:12,fontWeight:'bold'}}><DynText>{refreshing?'Refreshing...':'Pull to refresh'}</DynText></span>
          </div>
        </div>

        {updateReady && (
          <div className="alert-bar" style={{background: 'linear-gradient(135deg, var(--em), #059669)', color: '#fff', border: 'none', position: 'fixed', bottom: 30, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, boxShadow: '0 10px 30px rgba(0,0,0,0.5)', padding: '15px 25px', borderRadius: '14px', display: 'flex', alignItems: 'center', width: '90%', maxWidth: '450px'}}>
            <span style={{ fontSize: 26, marginInlineEnd: 12 }}>🎉</span>
            <div style={{ flex: 1 }}>
            <div className="fw8" style={{fontSize: 15}}><DynText>New update available!</DynText></div>
            <div className="txs" style={{marginTop: 4, opacity: 0.9}}><DynText>The latest version has been downloaded successfully.</DynText></div>
            </div>
          <button className="btn" style={{ background: '#fff', color: '#059669', marginInlineEnd: 15, fontWeight: 'bold' }} onClick={() => window.electron.ipcRenderer.send('install-update')}><DynText>Restart Now</DynText></button>
            <button className="btn btn-icon" style={{ background: 'transparent', color: '#fff', padding: 0 }} onClick={() => setUpdateReady(false)}>✕</button>
          </div>
        )}

        <div className="watermark"><span className="wm1">{localStorage.getItem('nile_impersonated_tenant_name') || data?.companyInfo?.name || 'Nexora'}</span><span className="wm2">{data?.companyInfo?.address || ''}</span></div>
        {mobileOpen && <div className="sidebar-overlay" onClick={()=> setMobileOpen(false)} />}
        <div ref={sidebarRef} className={"sidebar" + (mobileOpen ? ' mobile-open' : '') + (collapsed ? ' collapsed' : '')}>
          <div className="collapse-btn" onClick={() => setCollapsed(!collapsed)} title={collapsed ? "Expand" : "Collapse"}>◀</div>
          <div className="sb-logo">
            <div className="sb-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {data?.companyInfo?.logo ? <img src={data?.companyInfo?.logo} alt="Logo" style={{ height: '26px', maxWidth: '40px', objectFit: 'contain', borderRadius: '4px' }} /> : '📊'}
              <span>{localStorage.getItem('nile_impersonated_tenant_name') || data?.companyInfo?.name || 'Nexora'}</span>
            </div>
            <div className="sb-sub">NEXORA ERP</div>
            <div className="sb-badge"><DynText>{isAdmin ? t('sysAdmin') : t('readonly')}</DynText></div>
          </div>
          <div className="sb-nav">
            <div className="sb-section"><DynText>Main Navigation</DynText></div>
            {NAV.filter(item => {
          if (item.requirePerm) {
             const [sec, k] = item.requirePerm.split('.');
             if (!isAdmin && !perms?.[sec]?.[k]) return false;
          }
              if (item.superOnly && !isSuperAdmin) return false;
              if (item.adminOnly && !isAdmin) return false;
              if (!moduleAllowed(item.id)) return false;
              return true;
            }).map(item => (
              <div key={item.id} className={"nav-item " + (page === item.id ? 'active' : '')} onClick={() => navTo(item.id)}>
                <div className="nav-icon" style={{background: page === item.id ? item.c + '20' : 'rgba(255,255,255,.03)'}}>{item.icon}</div>
                <span><DynText>{item.label}</DynText></span>
                {item.id === 'inventory' && alertCount > 0 && <span className="nav-badge">{alertCount}</span>}
              </div>
            ))}
            <Calculator />
          </div>
          <div className="sb-footer">
            <div className="user-card" onClick={() => navTo('profile')} style={{cursor:'pointer'}} title="Edit profile">
              <div className="user-av" style={{overflow:'hidden'}}>
                {user.photoURL ? <img src={user.photoURL} alt={`${user.name} photo`} style={{width:'100%',height:'100%',objectFit:'cover'}} /> : '👤'}
              </div>
              <div><div className="user-name">{user.name}</div><div className="user-role"><DynText>{isAdmin ? t('sysAdmin') : t('readonly')}</DynText></div></div>
              <button className="btn btn-g btn-icon btn-sm" style={{marginInlineStart:'auto'}} onClick={handleLogout} title={t('logout')}>🚪</button>
            </div>
            {isSuperAdmin && localStorage.getItem('nile_impersonated_tenant') && (
              <button className="btn btn-d btn-sm" style={{width: '100%', marginTop: 8}} onClick={(e) => {
                e.stopPropagation();
                localStorage.removeItem('nile_impersonated_tenant');
                localStorage.removeItem('nile_impersonated_tenant_name');
                localStorage.removeItem('nile_data_cache');
                window.location.reload();
              }}>
                <DynText>Back to Main Dashboard</DynText> 👑
              </button>
            )}
            <div style={{textAlign:'center',marginTop:8,minHeight:16}}>
          {saving   && <div className="saving-badge txs">☁️ <DynText>Saving to Cloud...</DynText></div>}
          {!saving && lastSaved && <div className="saved-badge txs">✅ <DynText>Saved</DynText> {lastSaved.toLocaleTimeString(_l(),{hour:'2-digit',minute:'2-digit'})}</div>}
          <div className="txs tmt" style={{marginTop:4,opacity:.6,fontWeight:'bold',color:sysStatus==='online'?'var(--em-l)':'var(--rose-l)'}}><DynText>Status:</DynText> {sysStatus==='online'?<DynText>Online 🟢</DynText>:<DynText>Offline 🔴</DynText>}</div>
            </div>
          </div>
        </div>
        <main className={"main" + (collapsed ? ' collapsed' : '')}>
          <div className="topbar">
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              {isElectron && (
                <div className="win-controls" style={{display:'flex',gap:6,marginInlineStart:10}}>
                  <button className="btn btn-icon btn-sm" style={{background:'var(--rose)',color:'#fff',width:26,height:26,padding:0}} onClick={()=>winCtrl('app-close')}>✕</button>
                  <button className="btn btn-icon btn-sm" style={{background:'var(--gold)',color:'#000',width:26,height:26,padding:0}} onClick={()=>winCtrl('app-maximize')}>☐</button>
                  <button className="btn btn-icon btn-sm" style={{background:'var(--em)',color:'#fff',width:26,height:26,padding:0}} onClick={()=>winCtrl('app-minimize')}>─</button>
                </div>
              )}
              <button className="hamburger" onClick={() => setMobileOpen(v => !v)}>☰</button>
              <div className="topbar-title"><DynText>{TITLES[page]||"N/A"}</DynText></div>
              {!isAdmin && <span className="readonly-badge"><DynText>{t('readonly')}</DynText></span>}
              <GlobalSearchBox data={data} navTo={navTo} />
            </div>
            <div className="topbar-actions">
              <button className="tb-btn" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} title={theme==='dark'?'Light Mode':'Dark Mode'}>
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
              <button className="tb-btn" onClick={toggleLang} style={{minWidth: 40, justifyContent:'center'}} title={lang === 'ar' ? 'English' : 'Arabic'}>
                {lang === 'ar' ? 'EN' : 'AR'}
              </button>
              <button className="tb-btn" style={{background:'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)', border:'1px solid rgba(139, 92, 246, 0.5)', boxShadow:'0 0 15px rgba(139, 92, 246, 0.4)', color:'#e2e8f0', padding:'8px 16px', letterSpacing:'0.5px', gap: '8px'}} onClick={() => setShowAI(!showAI)} title="SMART COPILOT">
                <span style={{fontSize: '16px'}}>✨</span> <strong style={{background: 'linear-gradient(to right, #a78bfa, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontFamily: 'system-ui, sans-serif', letterSpacing: '1px'}}>SMART</strong> <span style={{fontFamily: 'system-ui, sans-serif', fontWeight: 600, fontSize: '13px', color: '#cbd5e1'}}>COPILOT</span>
              </button>
              <div className="notif-wrap" ref={notifRef}>
                <button className="tb-btn" onClick={() => setShowNotif(v => !v)}>
                🔔 <span><DynText>{t('notifications')}</DynText></span>
                  {alertCount > 0 && <span className="notif-dot" />}
                </button>
                {showNotif && <NotifPanel data={data} onClose={() => setShowNotif(false)} />}
              </div>
              <button className="tb-btn primary" onClick={() => { exportExcel(data); toast.info('Exporting file...'); }}>
                📊 <span><DynText>{t('exportExcel')}</DynText></span>
              </button>
            </div>
          </div>
        {deferredPage === 'dashboard'   && <DashboardPage  data={data} setData={setData} navTo={navTo} isAdmin={isAdmin} user={user} perms={perms} />}
        {deferredPage === 'incoming'    && <IncomingPage   {...pageProps} />}
        {deferredPage === 'sales'       && (
            <Suspense fallback={<div className="page" style={{display:'flex',justifyContent:'center',alignItems:'center',height:'60vh'}}><div className="spinner"></div></div>}>
              <SalesPage {...pageProps} />
            </Suspense>
          )}
        {deferredPage === 'clients'     && <ClientsPage    {...pageProps} />}
        {deferredPage === 'workers'     && <WorkersPage    {...pageProps} />}
        {deferredPage === 'suppliers'   && <SuppliersPage  {...pageProps} />}
        {deferredPage === 'inventory'   && <InventoryPage  {...pageProps} />}
        {deferredPage === 'expenses'    && <ExpensesPage   {...pageProps} />}
        {deferredPage === 'logistics'   && <LogisticsPage  {...pageProps} />}
        {deferredPage === 'treasury'    && <TreasuryPage   {...pageProps} />}
        {deferredPage === 'hr'          && <HRPage         {...pageProps} />}
        {deferredPage === 'crm'         && <CRMPage        {...pageProps} />}
        {deferredPage === 'manufacturing'&& (
            <Suspense fallback={<div className="page" style={{display:'flex',justifyContent:'center',alignItems:'center',height:'60vh'}}><div className="spinner"></div></div>}>
              <ManufacturingPage {...pageProps} />
            </Suspense>
          )}
        {deferredPage === 'integrations'&& <IntegrationsPage {...pageProps} />}
        {deferredPage === 'statistics'  && (
            <Suspense fallback={<div className="page" style={{display:'flex',justifyContent:'center',alignItems:'center',height:'60vh'}}><div className="spinner"></div></div>}>
              <StatisticsPage data={data} perms={perms} />
            </Suspense>
          )}
        {deferredPage === 'reports'     && <ReportsPage    data={data} perms={perms} />}
        {deferredPage === 'profile'     && <ProfilePage    data={data} setData={setData} user={user} />}
        {deferredPage === 'users' && isAdmin && <UserManagementPage data={data} setData={setData} user={user} />}
        {deferredPage === 'saas' && isSuperAdmin && <SuperAdminPage user={user} />}
        {deferredPage === 'settings' && isAdmin && <SettingsPage data={data} setData={setData} user={user} />}
        </main>
        
        {showAI && <AICopilot data={data} setData={setData} user={user} navTo={navTo} onClose={()=>setShowAI(false)} />}

        <div className="bottom-nav">
          <button className={"bn-item " + (page==='dashboard'?'active':'')} onClick={()=>navTo('dashboard')}>
            <div className="bn-icon">🏠</div><span>{t('dashboard')}</span>
          </button>
          <button className={"bn-item " + (page==='sales'?'active':'')} onClick={()=>navTo('sales')}>
            <div className="bn-icon">💳</div><span>{t('sales')}</span>
          </button>
          <button className={"bn-item " + (page==='incoming'?'active':'')} onClick={()=>navTo('incoming')}>
            <div className="bn-icon">📥</div><span>{t('incoming')}</span>
          </button>
          <button className={"bn-item " + (page==='inventory'?'active':'')} onClick={()=>navTo('inventory')}>
            <div className="bn-icon">📦</div><span>{t('inventory')}</span>
          </button>
          <button className={"bn-item " + (mobileOpen?'active':'')} onClick={()=>setMobileOpen(true)}>
            <div className="bn-icon">☰</div><span>{t('more')}</span>
          </button>
        </div>
      </div>
    </>
  );
}

export default function App() {
  // Enforce standard mobile sizing and prevent arbitrary zoom (viewport)
  useEffect(() => {
    let meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'viewport';
      document.head.appendChild(meta);
    }
    meta.content = 'width=device-width, initial-scale=1.0, viewport-fit=cover';

    let desc = document.querySelector('meta[name="description"]');
    if (!desc) {
      desc = document.createElement('meta');
      desc.name = 'description';
      desc.content = 'Integrated cloud ERP for managing sales, purchases, inventory and labor efficiently.';
      document.head.appendChild(desc);
    }
  }, []);

  return (
    <LanguageProvider>
      <ToastProvider>
        <ErrorBoundary>
          <AppInner />
        </ErrorBoundary>
      </ToastProvider>
    </LanguageProvider>
  );
}