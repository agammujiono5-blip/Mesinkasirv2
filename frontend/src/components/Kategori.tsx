import { useState, useEffect, useCallback } from "react";
import { kategoriApi } from "../services/api";
import type { KategoriItem } from "../services/api";
import {
  PlusIcon,
  EditIcon,
  TrashIcon,
  CloseIcon,
} from "./Icons";

export default function Kategori() {
  const [categories, setCategories] = useState<KategoriItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [namaKategori, setNamaKategori] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await kategoriApi.getAll();
      setCategories(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openCreateModal = () => {
    setEditId(null);
    setNamaKategori("");
    setShowModal(true);
  };

  const openEditModal = (c: KategoriItem) => {
    setEditId(c.id_kategori);
    setNamaKategori(c.nama_kategori);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaKategori.trim()) return;

    try {
      setSubmitting(true);
      if (editId) {
        await kategoriApi.update(editId, namaKategori);
      } else {
        await kategoriApi.create(namaKategori);
      }
      setShowModal(false);
      fetchCategories();
    } catch (err: any) {
      alert(err.message || "Gagal menyimpan kategori.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Hapus kategori ini? Seluruh produk dalam kategori ini mungkin terpengaruh.")) return;
    try {
      await kategoriApi.delete(id);
      fetchCategories();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus kategori.");
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Manajemen Kategori</h2>
          <p className="text-xs text-slate-400">Pengelompokan barang untuk katalog dan kasir</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 dark:bg-slate-200 dark:text-slate-900 rounded-xl shadow-sm transition-all"
        >
          <PlusIcon size={14} />
          <span>Tambah Kategori</span>
        </button>
      </div>

      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th className="p-4">ID</th>
              <th className="p-4">Nama Kategori</th>
              <th className="p-4">Jumlah Produk</th>
              <th className="p-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="text-xs divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-400">
                  Memuat kategori...
                </td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-400">
                  Belum ada kategori di database.
                </td>
              </tr>
            ) : (
              categories.map((c) => (
                <tr key={c.id_kategori} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-all">
                  <td className="p-4 font-mono font-semibold text-slate-400">#{c.id_kategori}</td>
                  <td className="p-4 font-bold text-slate-800 dark:text-slate-100">{c.nama_kategori}</td>
                  <td className="p-4 text-slate-500 font-semibold">{c.barang_count || 0} produk</td>
                  <td className="p-4 text-right space-x-1.5">
                    <button
                      onClick={() => openEditModal(c)}
                      className="p-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 dark:bg-slate-800 transition-all inline-flex items-center gap-1"
                    >
                      <EditIcon size={12} />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(c.id_kategori)}
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-sm shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                {editId ? "Edit Kategori" : "Tambah Kategori"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <CloseIcon size={14} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-500 block mb-1">Nama Kategori</label>
                <input
                  type="text"
                  required
                  value={namaKategori}
                  onChange={(e) => setNamaKategori(e.target.value)}
                  placeholder="Contoh: Makanan & Minuman"
                  className="w-full px-3 py-2 rounded-xl border outline-none font-bold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                />
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
                  {submitting ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
