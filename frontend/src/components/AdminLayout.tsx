import { useState, useEffect, useRef, useCallback } from "react";
import {
  transaksiApi,
  playOrderChime,
  authStorage,
} from "../services/api";
import type {
  TransaksiItem,
  UserSession,
} from "../services/api";
import {
  LogoIcon,
  DashboardIcon,
  ReceiptIcon,
  PackageIcon,
  CategoryIcon,
  StockLogIcon,
  TruckIcon,
  SupplierIcon,
  DiscountIcon,
  UsersIcon,
  LogoutIcon,
  BellIcon,
  SunIcon,
  MoonIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
} from "./Icons";

export type AdminPage =
  | "dashboard"
  | "transaksi"
  | "barang"
  | "kategori"
  | "supplier"
  | "pembelian"
  | "diskon"
  | "stok-log"
  | "users";

interface AdminLayoutProps {
  children: React.ReactNode;
  page: AdminPage;
  user: UserSession;
  onNavigate: (p: AdminPage) => void;
  onLogout: () => void;
  isDark: boolean;
  toggleDark: () => void;
}

const NAV_GROUPS = [
  {
    section: "Utama",
    items: [
      { id: "dashboard", label: "Dashboard", icon: DashboardIcon },
      { id: "transaksi", label: "Pesanan & Transaksi", icon: ReceiptIcon },
    ],
  },
  {
    section: "Inventori",
    items: [
      { id: "barang", label: "Katalog Produk", icon: PackageIcon },
      { id: "kategori", label: "Kategori Barang", icon: CategoryIcon },
      { id: "stok-log", label: "Log & Audit Stok", icon: StockLogIcon },
    ],
  },
  {
    section: "Pengadaan & Promo",
    items: [
      { id: "pembelian", label: "Restok / Pembelian", icon: TruckIcon },
      { id: "supplier", label: "Data Supplier", icon: SupplierIcon },
      { id: "diskon", label: "Diskon & Promo", icon: DiscountIcon },
    ],
  },
  {
    section: "Sistem",
    items: [
      { id: "users", label: "Manajemen Pengguna", icon: UsersIcon },
    ],
  },
];

const rupiah = (n: number) => "Rp " + Math.floor(n).toLocaleString("id-ID");

export default function AdminLayout({
  children,
  page,
  user,
  onNavigate,
  onLogout,
  isDark,
  toggleDark,
}: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [latestOrderAlert, setLatestOrderAlert] = useState<TransaksiItem | null>(null);
  const [newOrderCount, setNewOrderCount] = useState(0);

  const lastSeenTrxIdRef = useRef<number | null>(null);
  const isFirstLoadRef = useRef(true);

  // Real-time Polling for incoming orders (every 3 seconds)
  const checkLiveOrders = useCallback(async () => {
    try {
      const res = await transaksiApi.getAll({ per_page: 5 });
      const orders = Array.isArray(res) ? res : res?.data || [];

      if (orders.length > 0) {
        const newest = orders[0];

        if (isFirstLoadRef.current) {
          lastSeenTrxIdRef.current = newest.id_transaksi;
          isFirstLoadRef.current = false;
          return;
        }

        if (lastSeenTrxIdRef.current && newest.id_transaksi > lastSeenTrxIdRef.current) {
          // New incoming order detected!
          lastSeenTrxIdRef.current = newest.id_transaksi;
          setLatestOrderAlert(newest);
          setNewOrderCount((c) => c + 1);
          playOrderChime();

          // Auto dismiss toast after 8 seconds
          setTimeout(() => {
            setLatestOrderAlert((curr) => (curr?.id_transaksi === newest.id_transaksi ? null : curr));
          }, 8000);
        }
      }
    } catch {
      // Silent error
    }
  }, []);

  useEffect(() => {
    checkLiveOrders();
    const interval = setInterval(checkLiveOrders, 3000);
    return () => clearInterval(interval);
  }, [checkLiveOrders]);

  return (
    <div className="flex h-full bg-slate-50 dark:bg-slate-950" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Floating Real-time Order Alert Toast */}
      {latestOrderAlert && (
        <div
          className="fixed top-4 right-4 z-50 p-4 rounded-2xl shadow-xl border flex items-start gap-3.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 animate-bounce duration-1000 max-w-sm"
          style={{ boxShadow: "0 10px 30px rgba(15,23,42,0.1)" }}
        >
          <div className="w-10 h-10 rounded-2xl bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 flex items-center justify-center shrink-0 shadow-sm">
            <BellIcon size={20} className="text-white dark:text-slate-900" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Pesanan Baru Masuk
              </span>
              <button
                onClick={() => setLatestOrderAlert(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
              >
                <CloseIcon size={14} />
              </button>
            </div>
            <p className="text-xs font-bold truncate mt-0.5 text-slate-800 dark:text-slate-100">
              {latestOrderAlert.no_transaksi}
            </p>
            <p className="text-xs font-extrabold text-slate-700 dark:text-slate-200 mt-0.5">
              {rupiah(Number(latestOrderAlert.total_harga))} • <span className="uppercase text-slate-500">{latestOrderAlert.metode_bayar}</span>
            </p>
            <button
              onClick={() => {
                setLatestOrderAlert(null);
                onNavigate("transaksi");
              }}
              className="mt-2 text-[11px] font-bold text-white bg-slate-800 dark:bg-slate-200 dark:text-slate-900 px-3 py-1 rounded-lg hover:bg-slate-700 dark:hover:bg-slate-300 transition-all"
            >
              Lihat Detail Pesanan →
            </button>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside
        className="flex flex-col shrink-0 transition-all duration-300 z-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800"
        style={{
          width: collapsed ? 72 : 240,
        }}
      >
        {/* Brand & Logo */}
        <div className="px-4 py-4 flex items-center gap-3 border-b border-slate-200 dark:border-slate-800">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 shadow-sm"
          >
            <LogoIcon size={18} />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold truncate text-slate-800 dark:text-slate-100">KasirPro</p>
                <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 animate-pulse" title="Real-time Active" />
              </div>
              <p className="text-[10px] text-slate-400 truncate">Sistem POS Terintegrasi</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto w-6 h-6 rounded-lg flex items-center justify-center transition-all hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            {collapsed ? <ChevronRightIcon size={14} /> : <ChevronLeftIcon size={14} />}
          </button>
        </div>

        {/* Nav list with Grey Palette */}
        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
          {NAV_GROUPS.map((group) => (
            <div key={group.section}>
              {!collapsed && (
                <p className="text-[10px] font-bold uppercase tracking-wider px-2 mb-1.5 text-slate-400 dark:text-slate-500">
                  {group.section}
                </p>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = page === item.id;
                  const isTrx = item.id === "transaksi";
                  const IconComp = item.icon;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onNavigate(item.id as AdminPage);
                        if (isTrx) setNewOrderCount(0);
                      }}
                      title={collapsed ? item.label : undefined}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all relative ${
                        active
                          ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-sm"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100"
                      }`}
                      style={{
                        justifyContent: collapsed ? "center" : "flex-start",
                      }}
                    >
                      <IconComp size={18} className={active ? "text-white dark:text-slate-900" : "text-slate-500 dark:text-slate-400"} />
                      {!collapsed && <span>{item.label}</span>}
                      {isTrx && newOrderCount > 0 && (
                        <span className={`px-1.5 py-0.5 rounded-full font-bold text-[10px] bg-slate-600 text-white ${collapsed ? "absolute -top-1 -right-1" : "ml-auto"}`}>
                          +{newOrderCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User profile & Logout footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
          {!collapsed && (
            <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50">
              <div className="w-7 h-7 rounded-lg bg-slate-700 dark:bg-slate-300 text-white dark:text-slate-900 text-xs font-bold flex items-center justify-center">
                {user.nama.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold truncate text-slate-800 dark:text-slate-200">{user.nama}</p>
                <p className="text-[10px] text-slate-400 capitalize">{user.role}</p>
              </div>
            </div>
          )}

          <button
            onClick={() => {
              authStorage.removeToken();
              onLogout();
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition-all"
          >
            <LogoutIcon size={16} className="text-slate-400" />
            {!collapsed && <span>Keluar</span>}
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 dark:bg-slate-950">
        {/* Top Navbar */}
        <header
          className="flex items-center justify-between px-6 py-3 shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800"
        >
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold capitalize text-slate-800 dark:text-slate-100">
              {NAV_GROUPS.flatMap((g) => g.items).find((i) => i.id === page)?.label || page}
            </h2>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-ping" />
              <span>Realtime Polling Aktif</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleDark}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800"
            >
              {isDark ? <SunIcon size={16} /> : <MoonIcon size={16} />}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
