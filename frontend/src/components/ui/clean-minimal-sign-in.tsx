"use client";

import { useState } from "react";
import { LogIn, Lock, User, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Kartu login "clean minimal".
 *
 * Diadaptasi dari komponen demo lalu disesuaikan dengan tema aplikasi:
 * - Login memakai username (bukan email) sesuai backend KasirPro.
 * - Tidak ada tombol login via Google/Facebook/Apple.
 * - Logo aplikasi diambil dari `public/M.png`.
 *
 * Komponen dibuat props-driven agar tetap presentational: pemanggil yang
 * mengurus autentikasi lewat `onSubmit`.
 */
export interface CleanMinimalSignInProps {
  /** Nilai input username. */
  username: string;
  onUsernameChange: (value: string) => void;
  /** Nilai input password. */
  password: string;
  onPasswordChange: (value: string) => void;
  /** Dipanggil saat form disubmit. */
  onSubmit: () => void;
  /** Sedang memproses login — tombol dinonaktifkan. */
  loading?: boolean;
  /** Pesan gagal login. */
  error?: string | null;
  /** Judul kartu. */
  title?: string;
  /** Deskripsi di bawah judul. */
  description?: string;
  /** Teks tombol submit. */
  submitLabel?: string;
  /** Path logo aplikasi (default: `/M.png` dari folder public). */
  logoSrc?: string;
  /** Konten tambahan di bawah form (mis. pemilih role / akun demo). */
  children?: React.ReactNode;
  /** Callback "Lupa password?" — tautan disembunyikan bila tidak diisi. */
  onForgotPassword?: () => void;
  /** Footer di bawah kartu. */
  footer?: React.ReactNode;
  className?: string;
}

const SignIn2 = ({
  username,
  onUsernameChange,
  password,
  onPasswordChange,
  onSubmit,
  loading = false,
  error = null,
  title = "Masuk ke akun Anda",
  description = "Kelola penjualan, stok, dan laporan toko Anda dalam satu tempat.",
  submitLabel = "Masuk",
  logoSrc = "/M.png",
  children,
  onForgotPassword,
  footer,
  className,
}: CleanMinimalSignInProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState("");

  const handleSignIn = () => {
    if (loading) return;
    if (!username.trim() || !password) {
      setLocalError("Username dan password wajib diisi.");
      return;
    }
    setLocalError("");
    onSubmit();
  };

  const pesanError = error || localError;

  return (
    <div
      className={cn(
        "relative z-1 flex min-h-screen w-full items-center justify-center rounded-xl bg-white px-4 py-10",
        className
      )}
    >
      <div className="flex w-full max-w-sm flex-col items-center rounded-3xl border border-blue-100 bg-gradient-to-b from-sky-50/50 to-white p-8 text-black shadow-xl shadow-opacity-10">
        <div className="mb-6 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg shadow-opacity-5">
          <img src={logoSrc} alt="Logo aplikasi" className="h-10 w-10 object-contain" />
        </div>
        <h2 className="mb-2 text-center text-2xl font-semibold">{title}</h2>
        <p className="mb-6 text-center text-sm text-gray-500">{description}</p>

        <form
          className="w-full"
          autoComplete="off"
          onSubmit={(e) => {
            e.preventDefault();
            handleSignIn();
          }}
        >
          <div className="mb-2 flex w-full flex-col gap-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <User className="h-4 w-4" />
              </span>
              <input
                placeholder="Username"
                type="text"
                autoComplete="username"
                value={username}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-10 pr-3 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-200"
                onChange={(e) => {
                  onUsernameChange(e.target.value);
                  setLocalError("");
                }}
              />
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Lock className="h-4 w-4" />
              </span>
              <input
                placeholder="Password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-10 pr-10 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-200"
                onChange={(e) => {
                  onPasswordChange(e.target.value);
                  setLocalError("");
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400 transition-colors hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="flex w-full items-start justify-between gap-3">
              {pesanError ? (
                <div className="text-left text-sm text-red-500">{pesanError}</div>
              ) : (
                <span />
              )}
              {onForgotPassword && (
                <button
                  type="button"
                  onClick={onForgotPassword}
                  className="shrink-0 text-xs font-medium hover:underline"
                >
                  Lupa password?
                </button>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-gray-700 to-gray-900 py-2 font-medium text-white shadow transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <LogIn className="h-4 w-4" />
            {loading ? "Menghubungkan…" : submitLabel}
          </button>
        </form>

        {children && <div className="mt-6 w-full">{children}</div>}
      </div>

      {footer && <div className="absolute bottom-4 left-0 w-full px-6 text-center">{footer}</div>}
    </div>
  );
};

export { SignIn2 };
export default SignIn2;
