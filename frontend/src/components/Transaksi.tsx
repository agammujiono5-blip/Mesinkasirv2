import { useState, useEffect, useCallback } from "react";
import { transaksiApi } from "../services/api";
import type { TransaksiItem } from "../services/api";
import {
  SearchIcon,
  CloseIcon,
} from "./Icons";

const rupiah = (n: number) => "Rp " + Math.floor(n).toLocaleString("id-ID");

export default function Transaksi() {
  const [transactions, setTransactions] = useState<TransaksiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedTrx, setSelectedTrx] = useState<TransaksiItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await transaksiApi.getAll({
        no_transaksi: search,
        status: statusFilter,
        per_page: 50,
      });
      const data = Array.isArray(res) ? res : res?.data || [];
      setTransactions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchTransactions();
    const interval = setInterval(fetchTransactions, 3000);
    return () => clearInterval(interval);
  }, [fetchTransactions]);

  const handleCancelOrder = async (id: number) => {
    if (!window.confirm("Yakin ingin membatalkan transaksi ini? Stok barang akan dikembalikan.")) return;
    try {
      setActionLoading(true);
      await transaksiApi.cancel(id);
      setSelectedTrx(null);
      fetchTransactions();
    } catch (err: any) {
      alert(err.message || "Gagal membatalkan transaksi.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Daftar Transaksi & Pesanan</h2>
          <p className="text-xs text-slate-400">Pembaruan real-time dari seluruh kasir</p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nomor TRX..."
              className="pl-8 pr-3 py-2 text-xs rounded-xl border outline-none border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            />
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
              <SearchIcon size={13} />
            </div>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border outline-none font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
          >
            <option value="">Semua Status</option>
            <option value="selesai">Selesai</option>
            <option value="pending">Pending</option>
            <option value="batal">Batal</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th className="p-4">No. Transaksi</th>
              <th className="p-4">Waktu</th>
              <th className="p-4">Kasir</th>
              <th className="p-4">Metode Bayar</th>
              <th className="p-4">Total Harga</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="text-xs divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">
                  Memuat data transaksi...
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">
                  Tidak ada transaksi yang ditemukan.
                </td>
              </tr>
            ) : (
              transactions.map((t) => (
                <tr key={t.id_transaksi} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-all">
                  <td className="p-4 font-mono font-semibold text-slate-400">
                    {t.no_transaksi}
                  </td>
                  <td className="p-4 text-slate-400">
                    {new Date(t.tanggal).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
                  </td>
                  <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">
                    {t.kasir?.nama || `User #${t.id_kasir}`}
                  </td>
                  <td className="p-4 uppercase font-bold text-slate-500">
                    {t.metode_bayar}
                  </td>
                  <td className="p-4 font-extrabold text-slate-800 dark:text-slate-100">
                    {rupiah(Number(t.total_harga))}
                  </td>
                  <td className="p-4">
                    <span
                      className="text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => setSelectedTrx(t)}
                      className="px-3 py-1 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                    >
                      Detail
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {selectedTrx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-lg shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">Detail Transaksi</h3>
                <p className="text-xs font-mono font-semibold text-slate-400">{selectedTrx.no_transaksi}</p>
              </div>
              <button
                onClick={() => setSelectedTrx(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <CloseIcon size={14} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-slate-400 block mb-0.5">Waktu Transaksi</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {new Date(selectedTrx.tanggal).toLocaleString("id-ID")}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Kasir Bertugas</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {selectedTrx.kasir?.nama || "-"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Metode Pembayaran</span>
                <span className="font-bold uppercase text-slate-800 dark:text-slate-100">
                  {selectedTrx.metode_bayar}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Status Transaksi</span>
                <span className="font-bold uppercase text-slate-800 dark:text-slate-100">
                  {selectedTrx.status}
                </span>
              </div>
            </div>

            {/* Item List */}
            <div className="space-y-2 max-h-56 overflow-y-auto">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Daftar Barang Terbeli</p>
              {selectedTrx.detail_transaksi?.map((d) => (
                <div key={d.id_detail} className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                  <div>
                    <p className="font-bold text-slate-700 dark:text-slate-200">{d.barang?.nama_barang}</p>
                    <p className="text-[11px] text-slate-400">
                      {d.jumlah} × {rupiah(Number(d.harga_satuan))}
                    </p>
                  </div>
                  <span className="font-extrabold text-slate-800 dark:text-slate-100">{rupiah(Number(d.subtotal))}</span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400">Total Pembayaran</span>
                <p className="text-lg font-black text-slate-800 dark:text-slate-100">{rupiah(Number(selectedTrx.total_harga))}</p>
              </div>

              {selectedTrx.status === "selesai" && (
                <button
                  onClick={() => handleCancelOrder(selectedTrx.id_transaksi)}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-white transition-all"
                >
                  Batalkan Transaksi
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
