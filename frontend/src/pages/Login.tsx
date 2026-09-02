import { useState } from "react";
import { authApi, authStorage } from "../services/api";
import type { UserSession } from "../services/api";
import {
  LogoIcon,
  SunIcon,
  MoonIcon,
  UserSingleIcon,
  ShieldCheckIcon,
  CartIcon,
  ZapIcon,
  ReceiptIcon,
  PackageIcon,
  AlertWarningIcon,
} from "../components/Icons";

type Role = "kasir" | "admin";
interface LoginProps {
  onLogin: (user: UserSession) => void;
  isDark: boolean;
  toggleDark: () => void;
}

export default function Login({ onLogin, isDark, toggleDark }: LoginProps) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("password123");
  const [role, setRole] = useState<Role>("admin");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRoleSwitch = (selectedRole: Role) => {
    setRole(selectedRole);
    setErrorMessage(null);
    if (selectedRole === "admin") {
      setUsername("admin");
      setPassword("password123");
    } else {
      setUsername("kasir1");
      setPassword("password123");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await authApi.login(username, password);
      authStorage.setToken(response.token);
      authStorage.setUser(response.user);
      onLogin(response.user);
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal masuk. Periksa username dan password Anda.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full bg-slate-50 dark:bg-slate-950" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Left panel — brand / art */}
      <div
        className="hidden lg:flex flex-col justify-between w-[50%] p-10 relative overflow-hidden bg-gradient-to-br from-slate-800 via-slate-850 to-slate-900 text-white border-r border-slate-700/60"
      >
        {/* Grid decoration */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.3) 0px, rgba(255,255,255,0.3) 1px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, rgba(255,255,255,0.3) 0px, rgba(255,255,255,0.3) 1px, transparent 1px, transparent 40px)"
        }} />

        {/* Brand */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-700 text-white border border-slate-600 shadow-sm">
              <LogoIcon size={20} className="text-white" />
            </div>
            <span className="text-white font-bold text-lg">KasirPro</span>
          </div>
          <p className="text-sm text-slate-400">Sistem Manajemen Toko & POS</p>
        </div>

        {/* Center content */}
        <div className="relative z-10 space-y-8">
          {/* Bento preview cards */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { label: "Koneksi Real-time", value: "Terkoneksi", icon: ZapIcon, col: "col-span-2" },
              { label: "Mode Kasir & Admin", value: "Terintegrasi", icon: ReceiptIcon },
              { label: "Audit Otomatis", value: "Stok Log", icon: PackageIcon },
            ].map((c) => {
              const IconComp = c.icon;
              return (
                <div
                  key={c.label}
                  className={`rounded-2xl p-4 border border-slate-700/70 bg-slate-800/60 backdrop-blur-md ${c.col || ""}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <IconComp size={16} className="text-slate-400" />
                    <p className="text-xs font-medium text-slate-400">{c.label}</p>
                  </div>
                  <p className="text-xl font-bold text-white">{c.value}</p>
                </div>
              );
            })}
          </div>

          <div>
            <h2 className="text-3xl font-bold text-white leading-tight mb-3">
              Kelola Toko Lebih<br />Cepat & Terintegrasi
            </h2>
            <p className="text-sm leading-relaxed text-slate-300">
              Platform POS terintegrasi penuh dengan backend database Laravel, pembaruan stok otomatis, notifikasi pesanan masuk instan, dan pencatatan audit log.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2">
            {["Real-time Stock", "Live Pesanan Admin", "Multi Kasir", "QRIS & Kas", "Laporan Otomatis"].map((f) => (
              <span key={f} className="text-xs px-3 py-1.5 rounded-full font-medium bg-slate-800 text-slate-300 border border-slate-700">
                {f}
              </span>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-slate-400">
          © 2026 KasirPro • Backend Laravel & React
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 relative bg-white dark:bg-slate-900">
        {/* Dark mode toggle */}
        <button
          onClick={toggleDark}
          className="absolute top-6 right-6 w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800"
        >
          {isDark ? <SunIcon size={16} /> : <MoonIcon size={16} />}
        </button>

        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900">
              <LogoIcon size={16} />
            </div>
            <span className="font-bold text-base text-slate-800 dark:text-slate-100">KasirPro</span>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-1.5 text-slate-800 dark:text-slate-100">Selamat datang</h1>
            <p className="text-sm text-slate-400">Masuk dengan akun terdaftar di database</p>
          </div>

          {/* Role selector preset */}
          <div className="flex gap-2 p-1 rounded-xl mb-5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            {(["admin", "kasir"] as Role[]).map((r) => {
              const active = role === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleRoleSwitch(r)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize transition-all flex items-center justify-center gap-2 ${
                    active
                      ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  {r === "kasir" ? (
                    <>
                      <CartIcon size={14} className={active ? "text-white dark:text-slate-900" : "text-slate-400"} />
                      <span>Akun Kasir</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheckIcon size={14} className={active ? "text-white dark:text-slate-900" : "text-slate-400"} />
                      <span>Akun Admin</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl flex items-start gap-2.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800">
              <AlertWarningIcon size={16} className="text-red-500 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-slate-500">Username / Email</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <UserSingleIcon size={16} />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin / kasir1"
                  className="w-full pl-9 pr-4 py-3 text-sm rounded-xl outline-none transition-all border border-slate-200 dark:border-slate-800 focus:border-slate-400 bg-slate-50/50 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-500">Password</label>
              </div>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <input
                  type={showPass ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-3 text-sm rounded-xl outline-none transition-all border border-slate-200 dark:border-slate-800 focus:border-slate-400 bg-slate-50/50 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <span className="text-xs font-semibold">{showPass ? "Hide" : "Show"}</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-50 bg-slate-800 hover:bg-slate-900 dark:bg-slate-200 dark:text-slate-900 text-white shadow-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="25 12" />
                  </svg>
                  Menghubungkan...
                </span>
              ) : (
                `Masuk sebagai ${role === "kasir" ? "Kasir" : "Admin"}`
              )}
            </button>
          </form>

          <div className="mt-6 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <p className="text-xs font-semibold mb-2 text-slate-500">Akun Database Siap Pakai:</p>
            <div className="space-y-1">
              <p className="text-xs text-slate-500">Admin → <span className="font-mono font-bold text-slate-700 dark:text-slate-300">admin / password123</span></p>
              <p className="text-xs text-slate-500">Kasir → <span className="font-mono font-bold text-slate-700 dark:text-slate-300">kasir1 / password123</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
