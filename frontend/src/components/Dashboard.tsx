const stats = [
  { label: "Pendapatan Hari Ini", value: "Rp 4.280.000", change: "+12.5%", up: true, sub: "vs kemarin" },
  { label: "Transaksi Hari Ini", value: "47", change: "+8.2%", up: true, sub: "vs kemarin" },
  { label: "Barang Terjual", value: "128 pcs", change: "+5.1%", up: true, sub: "vs kemarin" },
  { label: "Stok Menipis", value: "6 item", change: "Perlu restock", up: false, sub: "di bawah minimum" },
];

const recentTransactions = [
  { no: "TRX-20260831-001", pelanggan: "Budi Santoso", kasir: "Rina", total: "Rp 320.000", metode: "Tunai", status: "Selesai", waktu: "08:14" },
  { no: "TRX-20260831-002", pelanggan: "Siti Rahayu", kasir: "Rina", total: "Rp 145.000", metode: "QRIS", status: "Selesai", waktu: "08:37" },
  { no: "TRX-20260831-003", pelanggan: "Ahmad Fauzi", kasir: "Dedi", total: "Rp 892.500", metode: "Transfer", status: "Selesai", waktu: "09:02" },
  { no: "TRX-20260831-004", pelanggan: "Mega Wati", kasir: "Dedi", total: "Rp 57.000", metode: "Tunai", status: "Selesai", waktu: "09:18" },
  { no: "TRX-20260831-005", pelanggan: "Rudi Hermawan", kasir: "Rina", total: "Rp 1.240.000", metode: "Kartu", status: "Pending", waktu: "09:45" },
];

const lowStockItems = [
  { kode: "BRG-0023", nama: "Minyak Goreng 2L", stok: 3, min: 10, satuan: "botol" },
  { kode: "BRG-0041", nama: "Gula Pasir 1Kg", stok: 5, min: 20, satuan: "kg" },
  { kode: "BRG-0078", nama: "Tepung Terigu 500g", stok: 2, min: 15, satuan: "pcs" },
  { kode: "BRG-0112", nama: "Sabun Cuci Piring", stok: 4, min: 12, satuan: "pcs" },
  { kode: "BRG-0056", nama: "Kecap Manis 600ml", stok: 1, min: 8, satuan: "botol" },
  { kode: "BRG-0099", nama: "Tissue Multifungsi", stok: 6, min: 10, satuan: "pack" },
];

const topProducts = [
  { nama: "Indomie Goreng", terjual: 340, revenue: "Rp 1.360.000", pct: 88 },
  { nama: "Aqua 600ml", terjual: 210, revenue: "Rp 630.000", pct: 70 },
  { nama: "Minyak Goreng 2L", terjual: 95, revenue: "Rp 1.425.000", pct: 55 },
  { nama: "Teh Botol Sosro", terjual: 180, revenue: "Rp 540.000", pct: 42 },
  { nama: "Susu UHT 1L", terjual: 72, revenue: "Rp 864.000", pct: 30 },
];

const salesByHour = [6, 12, 22, 35, 28, 45, 52, 47, 38, 30, 25, 18];
const hours = ["06", "07", "08", "09", "10", "11", "12", "13", "14", "15", "16", "17"];

export default function Dashboard() {
  const maxVal = Math.max(...salesByHour);

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: "#f1f5f9" }}>
      {/* Header */}
      <div className="px-6 py-4 border-b" style={{ background: "white", borderColor: "#e2e8f0" }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold" style={{ color: "#0f172a" }}>Dashboard</h1>
            <p className="text-sm" style={{ color: "#64748b" }}>Minggu, 31 Agustus 2026</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="text-sm px-3 py-1.5 rounded-md border font-medium" style={{ borderColor: "#e2e8f0", color: "#475569" }}>
              Export Laporan
            </button>
            <button className="text-sm px-3 py-1.5 rounded-md font-medium text-white" style={{ background: "#2563eb" }}>
              + Transaksi Baru
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Stat Cards */}
        <div className="grid grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl p-4 border" style={{ background: "white", borderColor: "#e2e8f0" }}>
              <p className="text-xs font-medium mb-2" style={{ color: "#64748b" }}>{s.label}</p>
              <p className="text-2xl font-bold" style={{ color: "#0f172a" }}>{s.value}</p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-xs font-semibold" style={{ color: s.up ? "#16a34a" : "#dc2626" }}>
                  {s.change}
                </span>
                <span className="text-xs" style={{ color: "#94a3b8" }}>{s.sub}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Chart + Low Stock */}
        <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 380px" }}>
          {/* Sales chart */}
          <div className="rounded-xl p-5 border" style={{ background: "white", borderColor: "#e2e8f0" }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>Penjualan per Jam</p>
                <p className="text-xs" style={{ color: "#94a3b8" }}>Hari ini, 31 Agustus 2026</p>
              </div>
              <select className="text-xs border rounded px-2 py-1" style={{ borderColor: "#e2e8f0", color: "#475569" }}>
                <option>Hari Ini</option>
                <option>Minggu Ini</option>
                <option>Bulan Ini</option>
              </select>
            </div>
            <div className="flex items-end gap-1.5" style={{ height: 120 }}>
              {salesByHour.map((val, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-sm transition-all"
                    style={{
                      height: `${(val / maxVal) * 100}px`,
                      background: i === 5 ? "#2563eb" : "#bfdbfe",
                    }}
                  />
                  <span className="text-xs" style={{ color: "#94a3b8", fontSize: 10 }}>{hours[i]}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: "#f1f5f9" }}>
              <div className="text-center">
                <p className="text-xs" style={{ color: "#64748b" }}>Total Transaksi</p>
                <p className="text-sm font-bold" style={{ color: "#0f172a" }}>47</p>
              </div>
              <div className="text-center">
                <p className="text-xs" style={{ color: "#64748b" }}>Rata-rata</p>
                <p className="text-sm font-bold" style={{ color: "#0f172a" }}>Rp 91.000</p>
              </div>
              <div className="text-center">
                <p className="text-xs" style={{ color: "#64748b" }}>Tertinggi</p>
                <p className="text-sm font-bold" style={{ color: "#0f172a" }}>Rp 1.240.000</p>
              </div>
              <div className="text-center">
                <p className="text-xs" style={{ color: "#64748b" }}>Metode Terbanyak</p>
                <p className="text-sm font-bold" style={{ color: "#0f172a" }}>QRIS</p>
              </div>
            </div>
          </div>

          {/* Low stock */}
          <div className="rounded-xl border" style={{ background: "white", borderColor: "#e2e8f0" }}>
            <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "#f1f5f9" }}>
              <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>Stok Menipis</p>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "#fef2f2", color: "#dc2626" }}>6 item</span>
            </div>
            <div className="divide-y" style={{ borderColor: "#f8fafc" }}>
              {lowStockItems.map((item) => (
                <div key={item.kode} className="px-4 py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium" style={{ color: "#0f172a" }}>{item.nama}</p>
                    <p className="text-xs" style={{ color: "#94a3b8" }}>{item.kode}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold" style={{ color: "#dc2626" }}>{item.stok} {item.satuan}</p>
                    <p className="text-xs" style={{ color: "#94a3b8" }}>min. {item.min}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top products + Recent transactions */}
        <div className="grid gap-4" style={{ gridTemplateColumns: "320px 1fr" }}>
          {/* Top products */}
          <div className="rounded-xl border" style={{ background: "white", borderColor: "#e2e8f0" }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: "#f1f5f9" }}>
              <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>Produk Terlaris</p>
              <p className="text-xs" style={{ color: "#94a3b8" }}>Bulan ini</p>
            </div>
            <div className="p-4 space-y-3">
              {topProducts.map((p, i) => (
                <div key={p.nama}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold w-4" style={{ color: "#94a3b8" }}>{i + 1}</span>
                      <span className="text-xs font-medium" style={{ color: "#0f172a" }}>{p.nama}</span>
                    </div>
                    <span className="text-xs font-semibold" style={{ color: "#0f172a" }}>{p.terjual}</span>
                  </div>
                  <div className="flex items-center gap-2 ml-6">
                    <div className="flex-1 rounded-full overflow-hidden" style={{ height: 4, background: "#f1f5f9" }}>
                      <div className="h-full rounded-full" style={{ width: `${p.pct}%`, background: "#2563eb" }} />
                    </div>
                    <span className="text-xs" style={{ color: "#64748b", width: 80, textAlign: "right" }}>{p.revenue}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent transactions */}
          <div className="rounded-xl border" style={{ background: "white", borderColor: "#e2e8f0" }}>
            <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "#f1f5f9" }}>
              <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>Transaksi Terbaru</p>
              <button className="text-xs font-medium" style={{ color: "#2563eb" }}>Lihat Semua</button>
            </div>
            <table className="w-full">
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["No. Transaksi", "Pelanggan", "Kasir", "Total", "Metode", "Status", "Waktu"].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-semibold" style={{ color: "#64748b" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "#f8fafc" }}>
                {recentTransactions.map((t) => (
                  <tr key={t.no} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5 text-xs font-mono font-medium" style={{ color: "#2563eb" }}>{t.no}</td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: "#0f172a" }}>{t.pelanggan}</td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: "#475569" }}>{t.kasir}</td>
                    <td className="px-4 py-2.5 text-xs font-semibold" style={{ color: "#0f172a" }}>{t.total}</td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: "#475569" }}>{t.metode}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: "#94a3b8" }}>{t.waktu}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    Selesai: { bg: "#f0fdf4", color: "#16a34a" },
    Pending: { bg: "#fffbeb", color: "#d97706" },
    Batal: { bg: "#fef2f2", color: "#dc2626" },
  };
  const s = styles[status] || { bg: "#f1f5f9", color: "#64748b" };
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}
