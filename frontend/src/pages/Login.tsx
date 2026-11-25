import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { SignIn2 } from "@/components/ui/clean-minimal-sign-in";
import { authApi, authStorage } from "../services/api";
import type { ModuleAccess, UserSession, UserRole } from "../services/api";
import {
  ShieldCheckIcon,
  CartIcon,
  BriefcaseIcon,
} from "../components/Icons";

type Role = "manager" | "admin" | "kasir";

interface LoginProps {
  onLogin: (
    user: UserSession,
    akses: Partial<ModuleAccess>,
    roleDapatDikelola?: UserRole[]
  ) => void;
  isDark: boolean;
  toggleDark: () => void;
}

/** Akun contoh per role untuk tombol pintas. */
const PRESET_AKUN: Record<Role, { username: string; label: string; icon: typeof BriefcaseIcon }> = {
  manager: { username: "manager", label: "Manager", icon: BriefcaseIcon },
  admin: { username: "admin", label: "Admin", icon: ShieldCheckIcon },
  kasir: { username: "kasir1", label: "Kasir", icon: CartIcon },
};

export default function Login({ onLogin, isDark, toggleDark }: LoginProps) {
  const [username, setUsername] = useState("manager");
  const [password, setPassword] = useState("password123");
  const [role, setRole] = useState<Role>("manager");
  const [loading, setLoading] = useState(false);
  const [showAkunDemo, setShowAkunDemo] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRoleSwitch = (selectedRole: Role) => {
    setRole(selectedRole);
    setErrorMessage(null);
    setUsername(PRESET_AKUN[selectedRole].username);
    setPassword("password123");
  };

  const handleLogin = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await authApi.login(username, password);
      authStorage.setToken(response.token);
      authStorage.setUser(response.user);
      onLogin(response.user, response.akses, response.role_dapat_dikelola ?? []);
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal masuk. Periksa username dan password Anda.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={toggleDark}
        aria-label={isDark ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
        className="fixed right-5 top-5 z-30 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-100 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        {isDark ? <Sun size={15} /> : <Moon size={15} />}
      </button>

      <SignIn2
        username={username}
        onUsernameChange={(v) => {
          setUsername(v);
          setErrorMessage(null);
        }}
        password={password}
        onPasswordChange={(v) => {
          setPassword(v);
          setErrorMessage(null);
        }}
        onSubmit={handleLogin}
        loading={loading}
        error={errorMessage}
        title="Masuk ke KasirPro"
        description="Kelola penjualan, stok, dan laporan toko Anda dalam satu tempat."
        submitLabel="Masuk"
        className="dark:bg-slate-950"
        footer={
          <p className="text-[11px] text-slate-400">
            by Muhammad Agam Mudjiono © 2026
          </p>
        }
      >
        {/* Pemilih role — mengisi kredensial demo secara otomatis */}
        <div className="grid grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
          {(Object.keys(PRESET_AKUN) as Role[]).map((r) => {
            const aktif = role === r;
            const IconComp = PRESET_AKUN[r].icon;
            return (
              <button
                key={r}
                type="button"
                onClick={() => handleRoleSwitch(r)}
                aria-pressed={aktif}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                  aktif
                    ? "bg-slate-800 text-white shadow-sm"
                    : "text-slate-500 hover:bg-white hover:text-slate-800"
                }`}
              >
                <IconComp size={13} />
                {PRESET_AKUN[r].label}
              </button>
            );
          })}
        </div>

        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={() => setShowAkunDemo((v) => !v)}
            className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 transition-colors hover:text-slate-600"
          >
            {showAkunDemo ? "Tutup akun demo" : "Akun demo"}
          </button>
        </div>

        {showAkunDemo && (
          <dl className="mt-2 space-y-1 rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500">
            {(Object.keys(PRESET_AKUN) as Role[]).map((r) => (
              <div key={r} className="flex justify-between gap-3">
                <dt className="font-semibold uppercase tracking-wider">{PRESET_AKUN[r].label}</dt>
                <dd>
                  {PRESET_AKUN[r].username} / password123
                </dd>
              </div>
            ))}
          </dl>
        )}
      </SignIn2>
    </>
  );
}
