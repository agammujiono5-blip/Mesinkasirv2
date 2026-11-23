import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import NeuralAccessLogin from "@/components/ui/neural-access-login";
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
        className="fixed right-5 top-5 z-30 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/60 backdrop-blur transition-colors hover:bg-white/10 hover:text-white"
      >
        {isDark ? <Sun size={15} /> : <Moon size={15} />}
      </button>

      <NeuralAccessLogin
        identity={username}
        onIdentityChange={setUsername}
        password={password}
        onPasswordChange={setPassword}
        onSubmit={handleLogin}
        loading={loading}
        error={errorMessage}
        identityLabel="Username"
        identityPlaceholder="manager"
        passwordLabel="Password"
        passwordPlaceholder="••••••••"
        submitLabel="Masuk"
        footer={
          <>
            <span>by Muhammad Agam Mudjiono © 2026</span>
            <button
              type="button"
              onClick={() => setShowAkunDemo((v) => !v)}
              className="uppercase tracking-[1px] transition-colors hover:text-white"
            >
              {showAkunDemo ? "Tutup akun demo" : "Akun demo"}
            </button>
          </>
        }
      >
        {/* Pemilih role — mengisi kredensial demo secara otomatis */}
        <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
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
                    ? "bg-white text-black"
                    : "text-white/50 hover:bg-white/5 hover:text-white"
                }`}
              >
                <IconComp size={13} />
                {PRESET_AKUN[r].label}
              </button>
            );
          })}
        </div>

        {showAkunDemo && (
          <dl className="mt-3 space-y-1 font-mono text-[10px] text-white/40">
            {(Object.keys(PRESET_AKUN) as Role[]).map((r) => (
              <div key={r} className="flex justify-between gap-3">
                <dt className="uppercase tracking-wider">{PRESET_AKUN[r].label}</dt>
                <dd>
                  {PRESET_AKUN[r].username} / password123
                </dd>
              </div>
            ))}
          </dl>
        )}
      </NeuralAccessLogin>
    </>
  );
}
