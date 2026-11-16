import { useState, useEffect, useCallback } from "react";
import {
  dashboardApi,
  transaksiApi,
  barangApi,
} from "../../services/api";
import type {
  DashboardStats,
  SalesChartPoint,
  TransaksiItem,
  BarangItem,
  UserSession,
} from "../../services/api";
import {
  TruckIcon,
  AlertWarningIcon,
  CheckCircleIcon,
  DashboardIcon,
  PackageIcon,
  ReceiptIcon,
  UsersIcon,
} from "../../components/Icons";

const rupiah = (n: number) => "Rp " + Math.floor(n).toLocaleString("id-ID");

interface AdminDashboardProps {
  user: UserSession;
}

/**
 * Dashboard ringkasan admin.
 *
 * Admin tidak menerima seluruh data seperti manager: detail analitik
 * (laba, margin, pareto, performa kasir) berada di modul MIS/DSS, sedangkan
 * dashboard ini hanya ringkasan operasional. Kasir hanya melihat metrik
 * penjualan & stok; data bisnis (pengadaan, pelanggan, produk terlaris)
 * disembunyikan dan server juga tidak mengirimkannya.
 */
export default function AdminDashboard({ user }: AdminDashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<SalesChartPoint[]>([]);
  const [recentOrders, setRecentOrders] = useState<TransaksiItem[]>([]);
  const [lowStockItems, setLowStockItems] = useState<BarangItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  const bolehBisnis = stats?.akses?.ringkasan_bisnis ?? user.role !== "kasir";
  const bolehPesanan = stats?.akses?.ringkasan_pesanan ?? true;

  const fetchDashboardData = useCallback(async () => {
    try {
      const [statsRes, chartRes, lowStockRes] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getChart(7),
        barangApi.getLowStock(),
      ]);

      setStats(statsRes);
      setChartData(chartRes || []);
      setLowStockItems(lowStockRes || []);

      // Daftar pesanan terbaru hanya untuk role yang boleh melihatnya.
      if (statsRes?.akses?.ringkasan_pesanan !== false) {
        const trxRes = await transaksiApi.getAll({ per_page: 5 });
        const orders = Array.isArray(trxRes) ? trxRes : trxRes?.data || [];
        setRecentOrders(orders);
      } else {
        setRecentOrders([]);
      }
    } catch (err) {
      console.error("Gagal mengambil data dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 3500);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const maxChartValue = Math.max(...chartData.map((c) => c.total), 10000);

  if (loading && !stats) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-slate-400 gap-3">
        <svg className="animate-spin" width="36" height="36" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="25 12" />
        </svg>
        <p className="text-xs font-semibold">Mengambil data real-time...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Cakupan data sesuai jabatan */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <div>
          <h1 className="text-base font-bold text-slate-800 dark:text-slate-100">
            Ringkasan Operasional
          </h1>
          <p className="text-xs text-slate-400">
            Selamat datang, {user.nama} ·{" "}
            <span className="uppercase font-semibold">{user.role}</span>
          </p>
        </div>
        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full w-fit bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
          {bolehBisnis
            ? "Akses: ringkasan bisnis & operasional"
            : "Akses: operasional penjualan"}
        </span>
      </div>

      {/* Bento Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Penjualan Hari Ini */}
        <div
          className="col-span-1 md:col-span-2 rounded-3xl p-6 flex flex-col justify-between overflow-hidden relative bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 text-white shadow-sm border border-slate-700/50"
          style={{ minHeight: 160 }}
        >
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Penjualan Hari Ini (Live)
              </span>
              <span className="flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-700/70 text-slate-200 border border-slate-600/50">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Real-time
              </span>
            </div>
            <p className="text-3xl font-black tracking-tight mt-2 text-white tabular-nums">
              {rupiah(stats?.penjualan_hari_ini || 0)}
            </p>
          </div>

          <div className="flex items-end justify-between relative z-10 mt-4 pt-3 border-t border-slate-700/60">
            <div>
              <p className="text-xs font-medium text-slate-300">
                {stats?.transaksi_hari_ini || 0} transaksi tercatat hari ini
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-slate-400">Bulan Ini</p>
              <p className="text-xs font-bold text-slate-200">
                {rupiah(stats?.penjualan_bulan_ini || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Pengadaan / Restok — data bisnis */}
        {bolehBisnis && (
          <div className="rounded-3xl p-5 flex flex-col justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div>
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                <TruckIcon size={18} />
              </div>
              <p className="text-xs font-semibold mb-1 text-slate-400">Pengadaan / Restok</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                {rupiah(stats?.pembelian_bulan_ini || 0)}
              </p>
            </div>
            <span className="text-[11px] px-2.5 py-1 rounded-full font-medium w-fit mt-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              Total Biaya Pengadaan
            </span>
          </div>
        )}

        {/* Stok Menipis */}
        <div className="rounded-3xl p-5 flex flex-col justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
              <AlertWarningIcon size={18} />
            </div>
            <p className="text-xs font-semibold mb-1 text-slate-400">Stok Kritis / Menipis</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {stats?.barang_stok_menipis_count || 0}{" "}
              <span className="text-sm font-normal text-slate-400">item</span>
            </p>
          </div>
          <span className="text-[11px] px-2.5 py-1 rounded-full font-medium w-fit mt-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            Di Bawah Batas Minimum
          </span>
        </div>

        {/* Jumlah pelanggan terdaftar — data bisnis */}
        {bolehBisnis && (
          <div className="rounded-3xl p-5 flex flex-col justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div>
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                <UsersIcon size={18} />
              </div>
              <p className="text-xs font-semibold mb-1 text-slate-400">Pelanggan Terdaftar</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                {stats?.total_pelanggan || 0}{" "}
                <span className="text-sm font-normal text-slate-400">akun</span>
              </p>
            </div>
            <span className="text-[11px] px-2.5 py-1 rounded-full font-medium w-fit mt-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              Total Supplier: {stats?.total_supplier || 0}
            </span>
          </div>
        )}
      </div>

      {/* Center Row: Sales Chart & Produk Terlaris */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div
          className={`${bolehBisnis ? "lg:col-span-2" : "lg:col-span-3"} rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between`}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Grafik Penjualan 7 Hari Terakhir
              </h3>
              <p className="text-xs text-slate-400">Pemasukan penjualan dari database transaksi</p>
            </div>
          </div>

          <div className="h-48 flex items-end gap-3 pt-6 pb-2 px-2 border-b border-slate-100 dark:border-slate-800">
            {chartData.map((item, idx) => {
              const heightPct = Math.max(8, (item.total / maxChartValue) * 100);
              const isHovered = hoveredBar === idx;

              return (
                <div
                  key={item.date}
                  className="flex-1 flex flex-col items-center gap-2 group cursor-pointer relative"
                  onMouseEnter={() => setHoveredBar(idx)}
                  onMouseLeave={() => setHoveredBar(null)}
                >
                  {isHovered && (
                    <div className="absolute -translate-y-12 bg-slate-800 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-md z-20 pointer-events-none whitespace-nowrap border border-slate-700">
                      {rupiah(item.total)} ({item.count} trx)
                    </div>
                  )}
                  <div
                    className="w-full rounded-t-xl transition-all duration-300 relative"
                    style={{
                      height: `${heightPct}%`,
                      background: isHovered
                        ? "linear-gradient(180deg, #475569 0%, #1e293b 100%)"
                        : "linear-gradient(180deg, #94a3b8 0%, #64748b 100%)",
                    }}
                  />
                  <span className="text-[10px] font-medium text-slate-400">{item.date.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {bolehBisnis && (
          <div className="rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="mb-4">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Produk Terlaris</h3>
              <p className="text-xs text-slate-400">Kuantitas produk terjual tertinggi</p>
            </div>

            <div className="space-y-3.5 flex-1">
              {!stats?.barang_terlaris || stats.barang_terlaris.length === 0 ? (
                <div className="h-36 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
                  <DashboardIcon size={24} className="text-slate-300 dark:text-slate-700" />
                  <span>Belum ada data penjualan</span>
                </div>
              ) : (
                stats.barang_terlaris.map((item, idx) => (
                  <div key={item.id_barang} className="flex items-center gap-3">
                    {item.barang?.gambar ? (
                      <img
                        src={item.barang.gambar}
                        alt={item.barang.nama_barang}
                        className="w-8 h-8 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 shrink-0">
                        <PackageIcon size={14} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold truncate text-slate-700 dark:text-slate-200">
                          {idx + 1}. {item.barang?.nama_barang || `Barang #${item.id_barang}`}
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-100 shrink-0">
                          {item.total_terjual} terjual
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-slate-700 dark:bg-slate-300"
                          style={{
                            width: `${Math.min(
                              100,
                              (item.total_terjual / (stats.barang_terlaris[0]?.total_terjual || 1)) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Row: Pesanan Terbaru & Stok Menipis */}
      <div className={`grid grid-cols-1 ${bolehPesanan ? "lg:grid-cols-2" : ""} gap-6`}>
        {bolehPesanan && (
          <div className="rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    Pesanan Masuk Terbaru
                  </h3>
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-ping" />
                </div>
                <p className="text-xs text-slate-400">Sinkronisasi real-time setiap ada transaksi kasir</p>
              </div>
            </div>

            <div className="space-y-2.5">
              {recentOrders.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">Belum ada transaksi di database.</p>
              ) : (
                recentOrders.map((ord) => (
                  <div
                    key={ord.id_transaksi}
                    className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-mono font-bold text-slate-800 dark:text-slate-100">
                        {ord.no_transaksi}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Kasir: {ord.kasir?.nama || "Kasir"} •{" "}
                        {new Date(ord.tanggal).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                        {rupiah(Number(ord.total_harga))}
                      </p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {ord.metode_bayar} • {ord.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <div className="rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Daftar Stok Menipis</h3>
              <p className="text-xs text-slate-400">Produk yang berada pada atau di bawah batas minimum</p>
            </div>
            <ReceiptIcon size={16} className="text-slate-300 dark:text-slate-700 shrink-0" />
          </div>

          <div className="space-y-2.5">
            {lowStockItems.length === 0 ? (
              <div className="py-6 text-center text-xs font-medium text-slate-500 flex items-center justify-center gap-1.5">
                <CheckCircleIcon size={16} />
                <span>Seluruh stok produk aman di atas batas minimum.</span>
              </div>
            ) : (
              lowStockItems.slice(0, 5).map((b) => (
                <div
                  key={b.id_barang}
                  className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {b.gambar ? (
                      <img
                        src={b.gambar}
                        alt={b.nama_barang}
                        className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 shrink-0">
                        <PackageIcon size={16} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                        {b.nama_barang}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Kode: {b.kode_barang} • Min: {b.stok_minimum} {b.satuan}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600">
                      Sisa: {b.stok} {b.satuan}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
