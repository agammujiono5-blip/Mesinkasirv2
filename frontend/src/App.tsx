import { useState, useEffect } from "react";
import Login from "./pages/Login";
import Kasir from "./pages/Kasir";
import AdminLayout from "./components/AdminLayout";
import type { AdminPage } from "./components/AdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminBarang from "./pages/admin/Barang";
import AdminStokLog from "./pages/admin/StokLog";
import AdminPembelian from "./pages/admin/Pembelian";
import Transaksi from "./components/Transaksi";
import Kategori from "./components/Kategori";
import Supplier from "./components/Supplier";
import Diskon from "./components/Diskon";
import Users from "./components/Users";
import { authStorage } from "./services/api";
import type { UserSession } from "./services/api";

type View = "login" | "kasir" | "admin";

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [view, setView] = useState<View>("login");
  const [adminPage, setAdminPage] = useState<AdminPage>("dashboard");
  const [isDark, setIsDark] = useState(false);

  // Restore existing session on mount
  useEffect(() => {
    const savedUser = authStorage.getUser();
    const token = authStorage.getToken();
    if (savedUser && token) {
      setCurrentUser(savedUser);
      setView(savedUser.role === "kasir" ? "kasir" : "admin");
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) root.classList.add("dark");
    else root.classList.remove("dark");
  }, [isDark]);

  const toggleDark = () => setIsDark((d) => !d);

  const handleLoginSuccess = (user: UserSession) => {
    setCurrentUser(user);
    if (user.role === "kasir") {
      setView("kasir");
    } else {
      setView("admin");
      setAdminPage("dashboard");
    }
  };

  const handleLogout = () => {
    authStorage.removeToken();
    setCurrentUser(null);
    setView("login");
  };

  const renderAdminContent = () => {
    switch (adminPage) {
      case "dashboard":
        return <AdminDashboard />;
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
        return <Users />;
      default:
        return <AdminDashboard />;
    }
  };

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
      onNavigate={setAdminPage}
      onLogout={handleLogout}
      isDark={isDark}
      toggleDark={toggleDark}
    >
      {renderAdminContent()}
    </AdminLayout>
  );
}
