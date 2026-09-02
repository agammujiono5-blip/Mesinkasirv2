import { useState, useEffect, useCallback } from "react";
import { diskonApi, barangApi } from "../services/api";
import type { DiskonItem, BarangItem } from "../services/api";
import {
  PlusIcon,
  TrashIcon,
  CloseIcon,
} from "./Icons";

export default function Diskon() {
  const [diskonList, setDiskonList] = useState<DiskonItem[]>([]);
  const [barangList, setBarangList] = useState<BarangItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    nama_diskon: "",
    tipe: "persen" as "persen" | "nominal",
    nilai: 10,
    id_barang: 0,
    tanggal_mulai: new Date().toISOString().slice(0, 10),
    tanggal_selesai: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    status: "aktif" as "aktif" | "nonaktif",
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [dRes, bRes] = await Promise.all([
        diskonApi.getAll(),
        barangApi.getAll({ per_page: 100 }),
      ]);
      const dItems = Array.isArray(dRes) ? dRes : (dRes as any)?.data || [];
      const bItems = Array.isArray(bRes) ? bRes : bRes?.data || [];
      setDiskonList(dItems);
      setBarangList(bItems);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload: any = {
        nama_diskon: formData.nama_diskon,
        tipe: formData.tipe,
        nilai: formData.nilai,
        tanggal_mulai: formData.tanggal_mulai,
        tanggal_selesai: formData.tanggal_selesai,
        status: formData.status,
      };
      if (formData.id_barang > 0) {
        payload.id_barang = formData.id_barang;
      }

      await diskonApi.create(payload);
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Gagal menyimpan promo diskon.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Hapus promo ini?")) return;
    try {
      await diskonApi.delete(id);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus diskon.");
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Manajemen Promo & Diskon</h2>
          <p className="text-xs text-slate-400">Pengaturan potongan harga persentase atau nominal produk</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 dark:bg-slate-200 dark:text-slate-900 rounded-xl shadow-sm transition-all"
        >
          <PlusIcon size={14} />
          <span>Tambah Promo Baru</span>
        </button>
      </div>

      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th className="p-4">Nama Promo</th>
              <th className="p-4">Tipe Diskon</th>
              <th className="p-4">Nilai Potongan</th>
              <th className="p-4">Produk Berlaku</th>
              <th className="p-4">Periode Aktif</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="text-xs divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">
                  Memuat promo...
                </td>
              </tr>
            ) : diskonList.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">
                  Belum ada promo diskon di database.
                </td>
              </tr>
            ) : (
              diskonList.map((d) => (
                <tr key={d.id_diskon} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-all">
                  <td className="p-4 font-bold text-slate-800 dark:text-slate-100">{d.nama_diskon}</td>
                  <td className="p-4 capitalize font-semibold text-slate-500">{d.tipe}</td>
                  <td className="p-4 font-extrabold text-slate-800 dark:text-slate-100">
                    {d.tipe === "persen" ? `${d.nilai}%` : `Rp ${Number(d.nilai).toLocaleString("id-ID")}`}
                  </td>
                  <td className="p-4 text-slate-500">
                    {d.barang?.nama_barang || "Semua Produk (Global)"}
                  </td>
                  <td className="p-4 text-slate-400">
                    {d.tanggal_mulai} s/d {d.tanggal_selesai}
                  </td>
                  <td className="p-4">
                    <span
                      className="text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                    >
                      {d.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleDelete(d.id_diskon)}
                      className="p-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 transition-all inline-flex items-center gap-1"
                    >
                      <TrashIcon size={12} />
                      <span>Hapus</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">Tambah Promo Diskon</h3>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <CloseIcon size={14} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-500 block mb-1">Nama Promo</label>
                <input
                  type="text"
                  required
                  value={formData.nama_diskon}
                  onChange={(e) => setFormData({ ...formData, nama_diskon: e.target.value })}
                  placeholder="Diskon Akhir Pekan 10%"
                  className="w-full px-3 py-2 rounded-xl border outline-none font-bold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-500 block mb-1">Tipe Diskon</label>
                  <select
                    value={formData.tipe}
                    onChange={(e) => setFormData({ ...formData, tipe: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border outline-none font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  >
                    <option value="persen">Persentase (%)</option>
                    <option value="nominal">Nominal (Rp)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-500 block mb-1">Nilai Potongan</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formData.nilai}
                    onChange={(e) => setFormData({ ...formData, nilai: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border outline-none font-bold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-500 block mb-1">Khusus Produk Tertentu (Opsional)</label>
                <select
                  value={formData.id_barang}
                  onChange={(e) => setFormData({ ...formData, id_barang: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border outline-none font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                >
                  <option value={0}>-- Berlaku Semua Produk --</option>
                  {barangList.map((b) => (
                    <option key={b.id_barang} value={b.id_barang}>
                      {b.nama_barang}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-500 block mb-1">Tanggal Mulai</label>
                  <input
                    type="date"
                    required
                    value={formData.tanggal_mulai}
                    onChange={(e) => setFormData({ ...formData, tanggal_mulai: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border outline-none border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-500 block mb-1">Tanggal Selesai</label>
                  <input
                    type="date"
                    required
                    value={formData.tanggal_selesai}
                    onChange={(e) => setFormData({ ...formData, tanggal_selesai: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border outline-none border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 font-semibold text-slate-500"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-200 dark:text-slate-900 text-white font-bold transition-all shadow-sm"
                >
                  {submitting ? "Menyimpan..." : "Simpan Promo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
