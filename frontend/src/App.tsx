import { useState, useEffect } from "react";
import Login from "./pages/Login";
import Kasir from "./pages/Kasir";
import AdminLayout from "./components/AdminLayout";
import type { AdminPage } from "./components/AdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminBarang from "./pages/admin/Barang";
import AdminStokLog from "./pages/admin/StokLog";
import AdminPembelian from "./pages/admin/Pembelian";
import MisManager from "./pages/admin/MisManager";
import DssDashboard from "./pages/admin/DssDashboard";
import ExpertSystem from "./pages/admin/ExpertSystem";
import Transaksi from "./components/Transaksi";
import Kategori from "./components/Kategori";
import Supplier from "./components/Supplier";
import Diskon from "./components/Diskon";
import Users from "./components/Users";
import { authApi, authStorage, AKSES_MINIMAL } from "./services/api";
import type { ModuleAccess, UserRole, UserSession } from "./services/api";

type View = "login" | "kasir" | "admin";

/** Halaman admin yang memerlukan hak akses modul tertentu. */
const HALAMAN_TERLARANG: Partial<Record<AdminPage, keyof ModuleAccess>> = {
  "mis-manager": "mis",
  dss: "dss",
  "expert-system": "es",
  users: "manage_users",
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [akses, setAkses] = useState<ModuleAccess>(AKSES_MINIMAL);
  /** Role akun yang boleh dibuat pengguna ini (dihitung server). */
  const [roleDapatDikelola, setRoleDapatDikelola] = useState<UserRole[]>([]);
  const [view, setView] = useState<View>("login");
  const [adminPage, setAdminPage] = useState<AdminPage>("dashboard");
  const [memulihkanSesi, setMemulihkanSesi] = useState(true);
  const [isDark, setIsDark] = useState<boolean>(() => {
    const tersimpan = localStorage.getItem("pos_theme");
    if (tersimpan === "dark") return true;
    if (tersimpan === "light") return false;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });

  const terapkanAkses = (hak: Partial<ModuleAccess>) => {
    const gabungan = { ...AKSES_MINIMAL, ...hak };
    setAkses(gabungan);
    authStorage.setAkses(gabungan);
  };

  // Pulihkan sesi: token selalu divalidasi ke server agar role/status yang
  // tersimpan di browser tidak bisa dipalsukan.
  useEffect(() => {
    let aktif = true;

    const pulihkan = async () => {
      if (!authStorage.getToken()) {
        if (aktif) setMemulihkanSesi(false);
        return;
      }

      try {
        const profil = await authApi.profile();
        if (!aktif) return;
        authStorage.setUser(profil.user);
        terapkanAkses(profil.akses);
        setRoleDapatDikelola(profil.role_dapat_dikelola ?? []);
        setCurrentUser(profil.user);
        masukKe(profil.user, profil.akses);
      } catch {
        authStorage.removeToken();
        if (aktif) setView("login");
      } finally {
        if (aktif) setMemulihkanSesi(false);
      }
    };

    pulihkan();
    return () => {
      aktif = false;
    };
  }, []);

  // Token ditolak server (dicabut/akun dinonaktifkan) => kembali ke login.
  useEffect(() => {
    const tangani = () => {
      setCurrentUser(null);
      setAkses(AKSES_MINIMAL);
      setRoleDapatDikelola([]);
      setView("login");
    };
    window.addEventListener("pos:unauthorized", tangani);
    return () => window.removeEventListener("pos:unauthorized", tangani);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("pos_theme", isDark ? "dark" : "light");
  }, [isDark]);

  const toggleDark = () => setIsDark((d) => !d);

  const masukKe = (user: UserSession, hak: ModuleAccess) => {
    if (user.role === "kasir") {
      setView("kasir");
      return;
    }
    setView("admin");
    setAdminPage(hak.mis ? "mis-manager" : "dashboard");
  };

  const handleLoginSuccess = (
    user: UserSession,
    hak: Partial<ModuleAccess> = {},
    roleDapatDikelolaLogin: UserRole[] = []
  ) => {
    setCurrentUser(user);
    setRoleDapatDikelola(roleDapatDikelolaLogin);
    const gabungan = { ...AKSES_MINIMAL, ...hak };
    terapkanAkses(gabungan);
    masukKe(user, gabungan);
  };

  const handleLogout = () => {
    // Cabut token di server agar tidak bisa dipakai ulang (best effort).
    authApi.logout().catch(() => undefined);
    authStorage.removeToken();
    setCurrentUser(null);
    setAkses(AKSES_MINIMAL);
    setRoleDapatDikelola([]);
    setView("login");
  };

  const renderAdminContent = () => {
    const syarat = HALAMAN_TERLARANG[adminPage];
    if (syarat && !akses[syarat]) {
      return <AksesDitolak />;
    }

    switch (adminPage) {
      case "mis-manager":
        return <MisManager />;
      case "dss":
        return <DssDashboard />;
      case "expert-system":
        return <ExpertSystem />;
      case "dashboard":
        return <AdminDashboard user={currentUser} />;
      case "transaksi":
        return <Transaksi />;
      case "barang":
        return <AdminBarang />;
      case "kategori":
        return <Kategori />;
      case "supplier":
        return <Supplier />;
      case "pembelian":
        return <AdminPembelian />;
      case "diskon":
        return <Diskon />;
      case "stok-log":
        return <AdminStokLog />;
      case "users":
        return <Users roleDapatDikelola={roleDapatDikelola} />;
      default:
        return <AdminDashboard user={currentUser} />;
    }
  };

  if (memulihkanSesi) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin text-slate-500" width="36" height="36" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="25 12" />
          </svg>
          <p className="text-xs font-semibold text-slate-500">Memeriksa sesi & hak akses...</p>
        </div>
      </div>
    );
  }

  if (view === "login" || !currentUser) {
    return <Login onLogin={handleLoginSuccess} isDark={isDark} toggleDark={toggleDark} />;
  }

  if (view === "kasir") {
    return <Kasir user={currentUser} onLogout={handleLogout} isDark={isDark} toggleDark={toggleDark} />;
  }

  return (
    <AdminLayout
      page={adminPage}
      user={currentUser}
      akses={akses}
      onNavigate={setAdminPage}
      onLogout={handleLogout}
      isDark={isDark}
      toggleDark={toggleDark}
    >
      {renderAdminContent()}
    </AdminLayout>
  );
}

function AksesDitolak() {
  return (
    <div className="p-10 flex flex-col items-center justify-center gap-2 min-h-[400px] text-center">
      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Akses ditolak</p>
      <p className="text-xs text-slate-500 max-w-sm">
        Role akun Anda tidak memiliki izin membuka modul ini. Hubungi administrator bila akses diperlukan.
      </p>
    </div>
  );
}
