import { useState, useEffect, useCallback } from "react";
import {
  pembelianApi,
  supplierApi,
  barangApi,
} from "../../services/api";
import type {
  PembelianItem,
  SupplierItem,
  BarangItem,
} from "../../services/api";
import {
  PlusIcon,
  CloseIcon,
} from "../../components/Icons";

const rupiah = (n: number) => "Rp " + Math.floor(n).toLocaleString("id-ID");

export default function AdminPembelian() {
  const [pembelianList, setPembelianList] = useState<PembelianItem[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [barangList, setBarangList] = useState<BarangItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number>(0);
  const [selectedBarangId, setSelectedBarangId] = useState<number>(0);
  const [jumlah, setJumlah] = useState<number>(10);
  const [hargaBeli, setHargaBeli] = useState<number>(0);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [pRes, sRes, bRes] = await Promise.all([
        pembelianApi.getAll({ per_page: 50 }),
        supplierApi.getAll({ all: true }),
        barangApi.getAll({ per_page: 100 }),
      ]);

      const pItems = Array.isArray(pRes) ? pRes : pRes?.data || [];
      const sItems = Array.isArray(sRes) ? sRes : sRes?.data || [];
      const bItems = Array.isArray(bRes) ? bRes : bRes?.data || [];

      setPembelianList(pItems);
      setSuppliers(sItems);
      setBarangList(bItems);

      if (sItems.length > 0 && selectedSupplierId === 0) {
        setSelectedSupplierId(sItems[0].id_supplier);
      }
      if (bItems.length > 0 && selectedBarangId === 0) {
        setSelectedBarangId(bItems[0].id_barang);
        setHargaBeli(Number(bItems[0].harga_beli));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleBarangChange = (id: number) => {
    setSelectedBarangId(id);
    const item = barangList.find((b) => b.id_barang === id);
    if (item) {
      setHargaBeli(Number(item.harga_beli));
    }
  };

  const handleCreateRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId || !selectedBarangId || jumlah <= 0) {
      alert("Mohon lengkapi data supplier, barang, dan jumlah.");
      return;
    }

    try {
      setSubmitting(true);
      await pembelianApi.create({
        id_supplier: selectedSupplierId,
        items: [
          {
            id_barang: selectedBarangId,
            jumlah: jumlah,
            harga_beli_satuan: hargaBeli,
          },
        ],
      });

      setShowModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Gagal mencatat pembelian.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Pengadaan & Restok Supplier</h2>
          <p className="text-xs text-slate-400">Pencatatan pengadaan dari supplier dan penambahan stok otomatis</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 dark:bg-slate-200 dark:text-slate-900 rounded-xl shadow-sm transition-all"
        >
          <PlusIcon size={14} />
          <span>Catat Pembelian Baru</span>
        </button>
      </div>

      {/* Table */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th className="p-4">No. Pembelian</th>
              <th className="p-4">Waktu</th>
              <th className="p-4">Supplier</th>
              <th className="p-4">Admin Penanggung Jawab</th>
              <th className="p-4">Total Biaya</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="text-xs divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">
                  Memuat riwayat pembelian...
                </td>
              </tr>
            ) : pembelianList.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">
                  Belum ada catatan pembelian di database.
                </td>
              </tr>
            ) : (
              pembelianList.map((p) => (
                <tr key={p.id_pembelian} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-all">
                  <td className="p-4 font-mono font-semibold text-slate-400">{p.no_pembelian}</td>
                  <td className="p-4 text-slate-400">
                    {new Date(p.tanggal).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
                  </td>
                  <td className="p-4 font-bold text-slate-800 dark:text-slate-100">
                    {p.supplier?.nama_supplier || `Supplier #${p.id_supplier}`}
                  </td>
                  <td className="p-4 text-slate-400">{p.admin?.nama || `Admin #${p.id_admin}`}</td>
                  <td className="p-4 font-extrabold text-slate-800 dark:text-slate-100">
                    {rupiah(Number(p.total_harga))}
                  </td>
                  <td className="p-4">
                    <span className="text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Restock Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">Catat Restok Barang</h3>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <CloseIcon size={14} />
              </button>
            </div>

            <form onSubmit={handleCreateRestock} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-500 block mb-1">Pilih Supplier</label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border outline-none font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                >
                  {suppliers.map((s) => (
                    <option key={s.id_supplier} value={s.id_supplier}>
                      {s.nama_supplier}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-500 block mb-1">Pilih Barang yang Dipesan</label>
                <select
                  value={selectedBarangId}
                  onChange={(e) => handleBarangChange(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border outline-none font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                >
                  {barangList.map((b) => (
                    <option key={b.id_barang} value={b.id_barang}>
                      {b.nama_barang} (Stok Saat Ini: {b.stok} {b.satuan})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-500 block mb-1">Jumlah Masuk</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={jumlah}
                    onChange={(e) => setJumlah(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border outline-none font-bold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-500 block mb-1">Harga Beli Satuan (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={hargaBeli}
                    onChange={(e) => setHargaBeli(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border outline-none font-bold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs flex justify-between font-bold">
                <span className="text-slate-600 dark:text-slate-300">Total Biaya Restok</span>
                <span className="text-slate-800 dark:text-slate-100">{rupiah(jumlah * hargaBeli)}</span>
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
                  {submitting ? "Memproses..." : "Konfirmasi Pembelian"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
