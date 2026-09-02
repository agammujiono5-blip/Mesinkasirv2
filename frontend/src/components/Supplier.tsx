import { useState, useEffect, useCallback } from "react";
import { supplierApi } from "../services/api";
import type { SupplierItem } from "../services/api";
import {
  PlusIcon,
  EditIcon,
  TrashIcon,
  CloseIcon,
} from "./Icons";

export default function Supplier() {
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<SupplierItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    nama_supplier: "",
    kontak: "",
    alamat: "",
    email: "",
  });

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await supplierApi.getAll({ all: true });
      const items = Array.isArray(res) ? res : res?.data || [];
      setSuppliers(items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const openCreateModal = () => {
    setEditItem(null);
    setFormData({ nama_supplier: "", kontak: "", alamat: "", email: "" });
    setShowModal(true);
  };

  const openEditModal = (s: SupplierItem) => {
    setEditItem(s);
    setFormData({
      nama_supplier: s.nama_supplier,
      kontak: s.kontak || "",
      alamat: s.alamat || "",
      email: s.email || "",
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (editItem) {
        await supplierApi.update(editItem.id_supplier, formData);
      } else {
        await supplierApi.create(formData);
      }
      setShowModal(false);
      fetchSuppliers();
    } catch (err: any) {
      alert(err.message || "Gagal menyimpan supplier.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Hapus supplier ini?")) return;
    try {
      await supplierApi.delete(id);
      fetchSuppliers();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus supplier.");
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Data Supplier & Vendor</h2>
          <p className="text-xs text-slate-400">Kontak vendor pemasok pengadaan barang inventori</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 dark:bg-slate-200 dark:text-slate-900 rounded-xl shadow-sm transition-all"
        >
          <PlusIcon size={14} />
          <span>Tambah Supplier</span>
        </button>
      </div>

      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th className="p-4">Nama Supplier</th>
              <th className="p-4">Kontak / No. Telp</th>
              <th className="p-4">Email</th>
              <th className="p-4">Alamat</th>
              <th className="p-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="text-xs divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">
                  Memuat data supplier...
                </td>
              </tr>
            ) : suppliers.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">
                  Belum ada data supplier di database.
                </td>
              </tr>
            ) : (
              suppliers.map((s) => (
                <tr key={s.id_supplier} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-all">
                  <td className="p-4 font-bold text-slate-800 dark:text-slate-100">{s.nama_supplier}</td>
                  <td className="p-4 text-slate-400 font-mono">{s.kontak || "-"}</td>
                  <td className="p-4 text-slate-400">{s.email || "-"}</td>
                  <td className="p-4 text-slate-400 max-w-xs truncate">{s.alamat || "-"}</td>
                  <td className="p-4 text-right space-x-1.5">
                    <button
                      onClick={() => openEditModal(s)}
                      className="p-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 dark:bg-slate-800 transition-all inline-flex items-center gap-1"
                    >
                      <EditIcon size={12} />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(s.id_supplier)}
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
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                {editItem ? "Edit Supplier" : "Tambah Supplier Baru"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <CloseIcon size={14} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-500 block mb-1">Nama Supplier / Perusahaan</label>
                <input
                  type="text"
                  required
                  value={formData.nama_supplier}
                  onChange={(e) => setFormData({ ...formData, nama_supplier: e.target.value })}
                  placeholder="PT Sumber Makmur"
                  className="w-full px-3 py-2 rounded-xl border outline-none font-bold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-500 block mb-1">No. Kontak / HP</label>
                  <input
                    type="text"
                    value={formData.kontak}
                    onChange={(e) => setFormData({ ...formData, kontak: e.target.value })}
                    placeholder="08123456789"
                    className="w-full px-3 py-2 rounded-xl border outline-none border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-500 block mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="sales@vendor.com"
                    className="w-full px-3 py-2 rounded-xl border outline-none border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-500 block mb-1">Alamat Kantor / Gudang</label>
                <textarea
                  value={formData.alamat}
                  onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border outline-none border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
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
                  {submitting ? "Menyimpan..." : "Simpan Supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
