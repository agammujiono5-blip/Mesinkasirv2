const rupiah = (n: number) => "Rp " + n.toLocaleString("id-ID");

const monthlySales = [
  { bulan: "Mar", nilai: 52000000 },
  { bulan: "Apr", nilai: 61000000 },
  { bulan: "Mei", nilai: 48000000 },
  { bulan: "Jun", nilai: 71000000 },
  { bulan: "Jul", nilai: 65000000 },
  { bulan: "Agu", nilai: 78000000 },
];

const topItems = [
  { nama: "Indomie Goreng", qty: 2840, revenue: 11360000 },
  { nama: "Aqua 600ml", qty: 1920, revenue: 5760000 },
  { nama: "Minyak Goreng 2L", qty: 480, revenue: 16800000 },
  { nama: "Teh Botol Sosro", qty: 1340, revenue: 6700000 },
  { nama: "Susu UHT Ultra 1L", qty: 390, revenue: 7020000 },
];

export default function Laporan() {
  const maxVal = Math.max(...monthlySales.map((m) => m.nilai));

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: "#f1f5f9" }}>
      <div className="px-6 py-4 border-b" style={{ background: "white", borderColor: "#e2e8f0" }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold" style={{ color: "#0f172a" }}>Laporan</h1>
            <p className="text-sm" style={{ color: "#64748b" }}>Ringkasan performa toko</p>
          </div>
          <div className="flex items-center gap-2">
            <select className="text-sm border rounded-md px-2.5 py-1.5 outline-none" style={{ borderColor: "#e2e8f0", color: "#475569" }}>
              <option>Agustus 2026</option>
              <option>Juli 2026</option>
              <option>Juni 2026</option>
            </select>
            <button className="text-sm px-3 py-1.5 rounded-md font-medium text-white" style={{ background: "#2563eb" }}>
              Export PDF
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* KPI */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Penjualan", value: "Rp 78.450.000", sub: "Agustus 2026", trend: "+20.4%", up: true },
            { label: "Jumlah Transaksi", value: "1.248", sub: "Agustus 2026", trend: "+15.2%", up: true },
            { label: "Total Pembelian", value: "Rp 42.100.000", sub: "Agustus 2026", trend: "+8.1%", up: true },
            { label: "Laba Kotor", value: "Rp 36.350.000", sub: "Margin 46.4%", trend: "+28.7%", up: true },
          ].map((k) => (
            <div key={k.label} className="rounded-xl p-4 border" style={{ background: "white", borderColor: "#e2e8f0" }}>
              <p className="text-xs font-medium mb-2" style={{ color: "#64748b" }}>{k.label}</p>
              <p className="text-xl font-bold" style={{ color: "#0f172a" }}>{k.value}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-xs font-semibold" style={{ color: "#16a34a" }}>{k.trend}</span>
                <span className="text-xs" style={{ color: "#94a3b8" }}>{k.sub}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 340px" }}>
          {/* Monthly bar chart */}
          <div className="rounded-xl border p-5" style={{ background: "white", borderColor: "#e2e8f0" }}>
            <p className="text-sm font-semibold mb-1" style={{ color: "#0f172a" }}>Tren Penjualan Bulanan</p>
            <p className="text-xs mb-4" style={{ color: "#94a3b8" }}>6 bulan terakhir</p>
            <div className="flex items-end gap-3" style={{ height: 140 }}>
              {monthlySales.map((m) => (
                <div key={m.bulan} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs font-mono" style={{ color: "#64748b", fontSize: 9 }}>{rupiah(m.nilai / 1000000)}jt</span>
                  <div className="w-full rounded" style={{ height: `${(m.nilai / maxVal) * 110}px`, background: m.bulan === "Agu" ? "#2563eb" : "#bfdbfe" }} />
                  <span className="text-xs font-medium" style={{ color: m.bulan === "Agu" ? "#2563eb" : "#94a3b8" }}>{m.bulan}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top items */}
          <div className="rounded-xl border" style={{ background: "white", borderColor: "#e2e8f0" }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: "#f1f5f9" }}>
              <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>Produk Terlaris</p>
              <p className="text-xs" style={{ color: "#94a3b8" }}>Agustus 2026</p>
            </div>
            <div className="p-4 space-y-3">
              {topItems.map((item, i) => (
                <div key={item.nama} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold w-4 shrink-0" style={{ color: i === 0 ? "#f59e0b" : "#94a3b8" }}>#{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: "#0f172a" }}>{item.nama}</p>
                      <p className="text-xs" style={{ color: "#94a3b8" }}>{item.qty.toLocaleString("id-ID")} terjual</p>
                    </div>
                  </div>
                  <p className="text-xs font-semibold font-mono shrink-0" style={{ color: "#0f172a" }}>{rupiah(item.revenue)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Payment methods + Kasir performance */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border p-4" style={{ background: "white", borderColor: "#e2e8f0" }}>
            <p className="text-sm font-semibold mb-3" style={{ color: "#0f172a" }}>Metode Pembayaran</p>
            <div className="space-y-2">
              {[
                { metode: "QRIS", pct: 42, trx: 524, color: "#2563eb" },
                { metode: "Tunai", pct: 31, trx: 387, color: "#7c3aed" },
                { metode: "Transfer Bank", pct: 18, trx: 225, color: "#0891b2" },
                { metode: "Kartu Debit/Kredit", pct: 9, trx: 112, color: "#ea580c" },
              ].map((m) => (
                <div key={m.metode}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium" style={{ color: "#475569" }}>{m.metode}</span>
                    <span className="text-xs font-semibold" style={{ color: "#0f172a" }}>{m.pct}% <span style={{ color: "#94a3b8", fontWeight: 400 }}>({m.trx} trx)</span></span>
                  </div>
                  <div className="rounded-full" style={{ height: 6, background: "#f1f5f9" }}>
                    <div className="h-full rounded-full" style={{ width: `${m.pct}%`, background: m.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border" style={{ background: "white", borderColor: "#e2e8f0" }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: "#f1f5f9" }}>
              <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>Performa Kasir</p>
            </div>
            <table className="w-full">
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Kasir", "Transaksi", "Total Penjualan", "Rata-rata"].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-semibold" style={{ color: "#64748b" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "#f8fafc" }}>
                {[
                  { nama: "Rina Wati", trx: 524, total: 32400000, avg: 61832 },
                  { nama: "Dedi Kusuma", trx: 387, total: 28100000, avg: 72610 },
                  { nama: "Anton", trx: 225, total: 12100000, avg: 53778 },
                  { nama: "Susi", trx: 112, total: 5850000, avg: 52232 },
                ].map((k) => (
                  <tr key={k.nama} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-xs font-medium" style={{ color: "#0f172a" }}>{k.nama}</td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: "#475569" }}>{k.trx}</td>
                    <td className="px-4 py-2.5 text-xs font-mono font-semibold" style={{ color: "#0f172a" }}>{rupiah(k.total)}</td>
                    <td className="px-4 py-2.5 text-xs font-mono" style={{ color: "#475569" }}>{rupiah(k.avg)}</td>
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
