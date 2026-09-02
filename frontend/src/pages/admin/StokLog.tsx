import { useState, useEffect, useCallback } from "react";
import { stokLogApi, barangApi } from "../../services/api";
import type { StokLogItem, BarangItem } from "../../services/api";
import {
  PlusIcon,
  CloseIcon,
} from "../../components/Icons";

export default function AdminStokLog() {
  const [logs, setLogs] = useState<StokLogItem[]>([]);
  const [barangList, setBarangList] = useState<BarangItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [jenisFilter, setJenisFilter] = useState("");

  const [showOpnameModal, setShowOpnameModal] = useState(false);
  const [selectedBarangId, setSelectedBarangId] = useState<number>(0);
  const [stokBaru, setStokBaru] = useState<number>(0);
  const [keterangan, setKeterangan] = useState("Penyesuaian stok fisik (Stock Opname)");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [lRes, bRes] = await Promise.all([
        stokLogApi.getAll({ jenis: jenisFilter, per_page: 50 }),
        barangApi.getAll({ per_page: 100 }),
      ]);
      const lItems = Array.isArray(lRes) ? lRes : lRes?.data || [];
      const bItems = Array.isArray(bRes) ? bRes : bRes?.data || [];
      setLogs(lItems);
      setBarangList(bItems);
      if (bItems.length > 0 && selectedBarangId === 0) {
        setSelectedBarangId(bItems[0].id_barang);
        setStokBaru(bItems[0].stok);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [jenisFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleBarangSelect = (id: number) => {
    setSelectedBarangId(id);
    const b = barangList.find((item) => item.id_barang === id);
    if (b) setStokBaru(b.stok);
  };

  const handleSaveOpname = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBarangId) return;

    try {
      setSubmitting(true);
      await stokLogApi.penyesuaian({
        id_barang: selectedBarangId,
        stok_baru: stokBaru,
        keterangan: keterangan,
      });

      setShowOpnameModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Gagal melakukan penyesuaian stok.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Audit Log & Riwayat Stok</h2>
          <p className="text-xs text-slate-400">Pencatatan keluar masuk stok otomatis dan stok opname manual</p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <select
            value={jenisFilter}
            onChange={(e) => setJenisFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border outline-none font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
          >
            <option value="">Semua Jenis Log</option>
            <option value="masuk">Stok Masuk</option>
            <option value="keluar">Stok Keluar</option>
            <option value="penyesuaian">Penyesuaian (Opname)</option>
          </select>

          <button
            onClick={() => setShowOpnameModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 dark:bg-slate-200 dark:text-slate-900 rounded-xl shadow-sm whitespace-nowrap transition-all"
          >
            <PlusIcon size={14} />
            <span>Penyesuaian Opname</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th className="p-4">Waktu</th>
              <th className="p-4">Nama Barang</th>
              <th className="p-4">Jenis</th>
              <th className="p-4">Jumlah</th>
              <th className="p-4">Stok Sebelum</th>
              <th className="p-4">Stok Sesudah</th>
              <th className="p-4">Keterangan / Referensi</th>
              <th className="p-4">User</th>
            </tr>
          </thead>
          <tbody className="text-xs divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400">
                  Memuat riwayat stok...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400">
                  Belum ada log stok di database.
                </td>
              </tr>
            ) : (
              logs.map((l) => (
                <tr key={l.id_log} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-all">
                  <td className="p-4 text-slate-400">
                    {new Date(l.created_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
                  </td>
                  <td className="p-4 font-bold text-slate-800 dark:text-slate-100">
                    {l.barang?.nama_barang || `Barang #${l.id_barang}`}
                  </td>
                  <td className="p-4">
                    <span
                      className="text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                    >
                      {l.jenis}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-slate-700 dark:text-slate-300">
                    {l.jenis === "keluar" ? `-${l.jumlah}` : `+${l.jumlah}`}
                  </td>
                  <td className="p-4 text-slate-400">{l.stok_sebelum}</td>
                  <td className="p-4 font-extrabold text-slate-800 dark:text-slate-100">{l.stok_sesudah}</td>
                  <td className="p-4 text-slate-400 max-w-xs truncate">{l.keterangan || l.referensi || "-"}</td>
                  <td className="p-4 font-semibold text-slate-600 dark:text-slate-300">{l.user?.nama || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Stock Opname Modal */}
      {showOpnameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">Penyesuaian Stok Opname</h3>
              <button
                onClick={() => setShowOpnameModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <CloseIcon size={14} />
              </button>
            </div>

            <form onSubmit={handleSaveOpname} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-500 block mb-1">Pilih Produk</label>
                <select
                  value={selectedBarangId}
                  onChange={(e) => handleBarangSelect(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border outline-none font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                >
                  {barangList.map((b) => (
                    <option key={b.id_barang} value={b.id_barang}>
                      {b.nama_barang} (Stok Sistem: {b.stok} {b.satuan})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-500 block mb-1">Stok Fisik Sebenarnya (Baru)</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={stokBaru}
                  onChange={(e) => setStokBaru(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border outline-none font-bold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="font-bold text-slate-500 block mb-1">Alasan / Catatan Penyesuaian</label>
                <textarea
                  required
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border outline-none border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowOpnameModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 font-semibold text-slate-500"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-200 dark:text-slate-900 text-white font-bold transition-all shadow-sm"
                >
                  {submitting ? "Menyimpan..." : "Simpan Penyesuaian"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
