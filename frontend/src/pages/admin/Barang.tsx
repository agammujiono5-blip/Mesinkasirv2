import { useState, useEffect, useCallback } from "react";
import {
  barangApi,
  kategoriApi,
  supplierApi,
} from "../../services/api";
import type {
  BarangItem,
  KategoriItem,
  SupplierItem,
} from "../../services/api";
import {
  PlusIcon,
  EditIcon,
  TrashIcon,
  CloseIcon,
  SearchIcon,
} from "../../components/Icons";

const rupiah = (n: number) => "Rp " + Math.floor(n).toLocaleString("id-ID");

export default function AdminBarang() {
  const [barangList, setBarangList] = useState<BarangItem[]>([]);
  const [categories, setCategories] = useState<KategoriItem[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<number | undefined>(undefined);

  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<BarangItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    kode_barang: "",
    nama_barang: "",
    id_kategori: 0,
    id_supplier: 0,
    harga_beli: 0,
    harga_jual: 0,
    stok: 0,
    stok_minimum: 5,
    satuan: "pcs",
    deskripsi: "",
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [bRes, kRes, sRes] = await Promise.all([
        barangApi.getAll({ search, id_kategori: selectedCat, per_page: 100 }),
        kategoriApi.getAll(),
        supplierApi.getAll({ all: true }),
      ]);
      const bItems = Array.isArray(bRes) ? bRes : bRes?.data || [];
      const sItems = Array.isArray(sRes) ? sRes : sRes?.data || [];
      setBarangList(bItems);
      setCategories(kRes || []);
      setSuppliers(sItems || []);
      if (kRes && kRes.length > 0 && formData.id_kategori === 0) {
        setFormData((prev) => ({ ...prev, id_kategori: kRes[0].id_kategori }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, selectedCat]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreateModal = () => {
    setEditItem(null);
    setFormData({
      kode_barang: "BRG-" + Math.floor(1000 + Math.random() * 9000),
      nama_barang: "",
      id_kategori: categories[0]?.id_kategori || 1,
      id_supplier: suppliers[0]?.id_supplier || 1,
      harga_beli: 0,
      harga_jual: 0,
      stok: 10,
      stok_minimum: 5,
      satuan: "pcs",
      deskripsi: "",
    });
    setShowModal(true);
  };

  const openEditModal = (item: BarangItem) => {
    setEditItem(item);
    setFormData({
      kode_barang: item.kode_barang,
      nama_barang: item.nama_barang,
      id_kategori: item.id_kategori,
      id_supplier: item.id_supplier || 0,
      harga_beli: Number(item.harga_beli),
      harga_jual: Number(item.harga_jual),
      stok: item.stok,
      stok_minimum: item.stok_minimum,
      satuan: item.satuan,
      deskripsi: item.deskripsi || "",
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const data = new FormData();
      data.append("kode_barang", formData.kode_barang);
      data.append("nama_barang", formData.nama_barang);
      data.append("id_kategori", String(formData.id_kategori));
      if (formData.id_supplier) data.append("id_supplier", String(formData.id_supplier));
      data.append("harga_beli", String(formData.harga_beli));
      data.append("harga_jual", String(formData.harga_jual));
      data.append("stok", String(formData.stok));
      data.append("stok_minimum", String(formData.stok_minimum));
      data.append("satuan", formData.satuan);
      data.append("deskripsi", formData.deskripsi);

      if (editItem) {
        await barangApi.update(editItem.id_barang, data);
      } else {
        await barangApi.create(data);
      }

      setShowModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Gagal menyimpan barang.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Hapus barang ini dari database?")) return;
    try {
      await barangApi.delete(id);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus barang.");
    }
  };

  return (
    <div className="p-6 space-y-5">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Katalog Produk & Inventori</h2>
          <p className="text-xs text-slate-400">Kelola master data produk, harga, dan stok</p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari produk..."
              className="pl-8 pr-3 py-2 text-xs rounded-xl border outline-none border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            />
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
              <SearchIcon size={13} />
            </div>
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 dark:bg-slate-200 dark:text-slate-900 rounded-xl shadow-sm whitespace-nowrap transition-all"
          >
            <PlusIcon size={14} />
            <span>Tambah Produk</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th className="p-4">Kode</th>
              <th className="p-4">Nama Barang</th>
              <th className="p-4">Kategori</th>
              <th className="p-4">Harga Beli</th>
              <th className="p-4">Harga Jual</th>
              <th className="p-4">Stok</th>
              <th className="p-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="text-xs divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">
                  Memuat katalog produk...
                </td>
              </tr>
            ) : barangList.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">
                  Tidak ada barang di database.
                </td>
              </tr>
            ) : (
              barangList.map((b) => (
                <tr key={b.id_barang} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-all">
                  <td className="p-4 font-mono font-semibold text-slate-400">{b.kode_barang}</td>
                  <td className="p-4 font-bold text-slate-800 dark:text-slate-100">{b.nama_barang}</td>
                  <td className="p-4 text-slate-500">{b.kategori?.nama_kategori || "-"}</td>
                  <td className="p-4 text-slate-400">{rupiah(Number(b.harga_beli))}</td>
                  <td className="p-4 font-extrabold text-slate-800 dark:text-slate-100">{rupiah(Number(b.harga_jual))}</td>
                  <td className="p-4">
                    <span
                      className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${
                        b.stok <= b.stok_minimum
                          ? "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold border border-slate-300 dark:border-slate-600"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {b.stok} {b.satuan}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-1.5">
                    <button
                      onClick={() => openEditModal(b)}
                      className="p-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 dark:bg-slate-800 transition-all inline-flex items-center gap-1"
                      title="Edit"
                    >
                      <EditIcon size={12} />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(b.id_barang)}
                      className="p-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 transition-all inline-flex items-center gap-1"
                      title="Hapus"
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

      {/* Modal Create/Edit */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-lg shadow-xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">
                {editItem ? "Edit Produk" : "Tambah Produk Baru"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <CloseIcon size={14} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-500 block mb-1">Kode Barang</label>
                  <input
                    type="text"
                    required
                    value={formData.kode_barang}
                    onChange={(e) => setFormData({ ...formData, kode_barang: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border outline-none font-mono border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-500 block mb-1">Nama Barang</label>
                  <input
                    type="text"
                    required
                    value={formData.nama_barang}
                    onChange={(e) => setFormData({ ...formData, nama_barang: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border outline-none border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-500 block mb-1">Kategori</label>
                  <select
                    value={formData.id_kategori}
                    onChange={(e) => setFormData({ ...formData, id_kategori: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border outline-none font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  >
                    {categories.map((c) => (
                      <option key={c.id_kategori} value={c.id_kategori}>
                        {c.nama_kategori}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-500 block mb-1">Supplier</label>
                  <select
                    value={formData.id_supplier}
                    onChange={(e) => setFormData({ ...formData, id_supplier: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border outline-none font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  >
                    <option value={0}>-- Tanpa Supplier --</option>
                    {suppliers.map((s) => (
                      <option key={s.id_supplier} value={s.id_supplier}>
                        {s.nama_supplier}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-500 block mb-1">Harga Beli (Rp)</label>
                  <input
                    type="number"
                    required
                    value={formData.harga_beli}
                    onChange={(e) => setFormData({ ...formData, harga_beli: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border outline-none border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-500 block mb-1">Harga Jual (Rp)</label>
                  <input
                    type="number"
                    required
                    value={formData.harga_jual}
                    onChange={(e) => setFormData({ ...formData, harga_jual: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border outline-none font-bold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-500 block mb-1">Stok Awal</label>
                  <input
                    type="number"
                    required
                    value={formData.stok}
                    onChange={(e) => setFormData({ ...formData, stok: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border outline-none font-bold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-500 block mb-1">Stok Minimum</label>
                  <input
                    type="number"
                    required
                    value={formData.stok_minimum}
                    onChange={(e) => setFormData({ ...formData, stok_minimum: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border outline-none border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-500 block mb-1">Satuan</label>
                  <input
                    type="text"
                    required
                    value={formData.satuan}
                    onChange={(e) => setFormData({ ...formData, satuan: e.target.value })}
                    placeholder="pcs"
                    className="w-full px-3 py-2 rounded-xl border outline-none border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-500 block mb-1">Deskripsi Produk</label>
                <textarea
                  value={formData.deskripsi}
                  onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border outline-none border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
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
                  {submitting ? "Menyimpan..." : "Simpan Produk"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
