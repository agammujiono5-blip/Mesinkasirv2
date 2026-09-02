import { useState, useEffect, useCallback } from "react";
import {
  barangApi,
  kategoriApi,
  diskonApi,
  transaksiApi,
  authStorage,
} from "../services/api";
import type {
  BarangItem,
  KategoriItem,
  DiskonItem,
  TransaksiItem,
  UserSession,
} from "../services/api";
import {
  LogoIcon,
  SearchIcon,
  RefreshIcon,
  SunIcon,
  MoonIcon,
  LogoutIcon,
  CartIcon,
  PackageIcon,
  CashIcon,
  QrCodeIcon,
  BankTransferIcon,
  CreditCardIcon,
  CheckCircleIcon,
  AlertWarningIcon,
  TrashIcon,
  PrinterIcon,
  CloseIcon,
} from "../components/Icons";

interface KasirProps {
  user: UserSession;
  onLogout: () => void;
  isDark: boolean;
  toggleDark: () => void;
}

const PAYMENT_METHODS = [
  { id: 'cash' as const, label: 'Tunai', icon: CashIcon },
  { id: 'qris' as const, label: 'QRIS', icon: QrCodeIcon },
  { id: 'transfer' as const, label: 'Transfer', icon: BankTransferIcon },
  { id: 'debit' as const, label: 'Debit', icon: CreditCardIcon },
];

const rupiah = (n: number) => "Rp " + Math.floor(n).toLocaleString("id-ID");

type CartItem = {
  barang: BarangItem;
  qty: number;
  id_diskon?: number | null;
  diskonPersen: number;
};

export default function Kasir({ user, onLogout, isDark, toggleDark }: KasirProps) {
  const [categories, setCategories] = useState<KategoriItem[]>([]);
  const [products, setProducts] = useState<BarangItem[]>([]);
  const [activeDiscounts, setActiveDiscounts] = useState<DiskonItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [payment, setPayment] = useState<'cash' | 'transfer' | 'qris' | 'debit' | 'kredit'>('cash');
  const [cashInput, setCashInput] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [receiptData, setReceiptData] = useState<TransaksiItem | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [catRes, prodRes, diskonRes] = await Promise.all([
        kategoriApi.getAll(),
        barangApi.getAll({ per_page: 100 }),
        diskonApi.getActive().catch(() => []),
      ]);

      setCategories(catRes || []);
      const items = Array.isArray(prodRes) ? prodRes : (prodRes?.data || []);
      setProducts(items);
      setActiveDiscounts(diskonRes || []);
    } catch (err: any) {
      showToast(err.message || "Gagal memuat data produk", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredProducts = products.filter((p) => {
    const matchCat = selectedCatId === null || p.id_kategori === selectedCatId;
    const matchSearch =
      p.nama_barang.toLowerCase().includes(search.toLowerCase()) ||
      p.kode_barang.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const addToCart = (product: BarangItem) => {
    if (product.stok <= 0) {
      showToast(`Stok ${product.nama_barang} habis!`, "error");
      return;
    }

    setCart((prev) => {
      const existingIndex = prev.findIndex((i) => i.barang.id_barang === product.id_barang);
      if (existingIndex > -1) {
        const currentQty = prev[existingIndex].qty;
        if (currentQty + 1 > product.stok) {
          showToast(`Stok ${product.nama_barang} hanya tersisa ${product.stok}`, "error");
          return prev;
        }
        return prev.map((item, idx) =>
          idx === existingIndex ? { ...item, qty: item.qty + 1 } : item
        );
      }

      const activeDisc = activeDiscounts.find(
        (d) => d.id_barang === product.id_barang || d.id_barang === null
      );
      const diskonPersen = activeDisc && activeDisc.tipe === 'persen' ? Number(activeDisc.nilai) : 0;

      return [
        ...prev,
        {
          barang: product,
          qty: 1,
          id_diskon: activeDisc?.id_diskon || null,
          diskonPersen: diskonPersen,
        },
      ];
    });
  };

  const updateQty = (id_barang: number, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.barang.id_barang === id_barang) {
            const nextQty = item.qty + delta;
            if (nextQty > item.barang.stok) {
              showToast(`Stok hanya tersisa ${item.barang.stok}`, "error");
              return item;
            }
            if (nextQty <= 0) return null;
            return { ...item, qty: nextQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeItem = (id_barang: number) => {
    setCart((prev) => prev.filter((i) => i.barang.id_barang !== id_barang));
  };

  const getItemPrice = (item: CartItem) => {
    const raw = Number(item.barang.harga_jual);
    if (item.diskonPersen > 0) {
      return raw * (1 - item.diskonPersen / 100);
    }
    return raw;
  };

  const getItemSubtotal = (item: CartItem) => getItemPrice(item) * item.qty;

  const totalBelanja = cart.reduce((sum, item) => sum + getItemSubtotal(item), 0);
  const cashVal = parseFloat(cashInput.replace(/\D/g, "")) || 0;
  const kembalian = payment === 'cash' ? Math.max(0, cashVal - totalBelanja) : 0;

  const handleCheckout = async () => {
    if (cart.length === 0) {
      showToast("Keranjang belanja masih kosong", "error");
      return;
    }

    if (payment === 'cash' && cashVal < totalBelanja) {
      showToast("Jumlah uang tunai kurang dari total belanja", "error");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        metode_bayar: payment,
        items: cart.map((i) => ({
          id_barang: i.barang.id_barang,
          jumlah: i.qty,
          id_diskon: i.id_diskon || null,
        })),
      };

      const res = await transaksiApi.create(payload);
      setReceiptData(res);
      showToast(`Transaksi ${res.no_transaksi} berhasil dicatat!`);
      loadData();
    } catch (err: any) {
      showToast(err.message || "Gagal memproses transaksi.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const startNewTransaction = () => {
    setCart([]);
    setReceiptData(null);
    setCashInput("");
    setPayment("cash");
  };

  return (
    <div className="flex h-full flex-col bg-slate-50 dark:bg-slate-950" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-3 transition-all duration-300 ${
            notification.type === 'success'
              ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-700 dark:border-slate-300'
              : 'bg-red-600 text-white border-red-500'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircleIcon size={18} className="text-white dark:text-slate-900" />
          ) : (
            <AlertWarningIcon size={18} className="text-white" />
          )}
          <span className="text-sm font-semibold">{notification.message}</span>
        </div>
      )}

      {/* Top bar */}
      <header
        className="flex items-center justify-between px-5 py-3 shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 shadow-sm">
            <LogoIcon size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-slate-800 dark:text-slate-100">KasirPro</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                POS Kasir
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Kasir: <strong className="text-slate-700 dark:text-slate-200">{user.nama}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            title="Refresh Data Produk"
            className="p-2 rounded-xl flex items-center gap-1.5 text-xs font-semibold border transition-all hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900"
          >
            <RefreshIcon size={14} className={loading ? "animate-spin" : ""} />
            <span>Sync</span>
          </button>

          <button
            onClick={toggleDark}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800"
          >
            {isDark ? <SunIcon size={16} /> : <MoonIcon size={16} />}
          </button>

          <button
            onClick={() => {
              authStorage.removeToken();
              onLogout();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-all"
          >
            <LogoutIcon size={14} />
            <span>Keluar</span>
          </button>
        </div>
      </header>

      {/* Main Content Area: Left Catalog & Right POS Cart */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Product Catalog */}
        <div className="flex-1 flex flex-col p-5 overflow-hidden">
          {/* Search & Categories */}
          <div className="space-y-3 mb-4">
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama produk atau kode (BRG-XXX)..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl text-sm outline-none border transition-all border-slate-200 dark:border-slate-800 focus:border-slate-400 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-sm"
              />
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <SearchIcon size={16} />
              </div>
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <CloseIcon size={14} />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              <button
                onClick={() => setSelectedCatId(null)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCatId === null
                    ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                Semua ({products.length})
              </button>
              {categories.map((c) => (
                <button
                  key={c.id_kategori}
                  onClick={() => setSelectedCatId(c.id_kategori)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    selectedCatId === c.id_kategori
                      ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {c.nama_kategori}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto pr-1">
            {loading ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
                <svg className="animate-spin" width="32" height="32" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="25 12" />
                </svg>
                <p className="text-xs font-medium">Memuat katalog...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                <PackageIcon size={36} className="text-slate-300 dark:text-slate-700 mb-2" />
                <p className="text-sm font-semibold">Tidak ada produk ditemukan</p>
                <p className="text-xs">Coba kata kunci lain atau sync data</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {filteredProducts.map((p) => {
                  const inCart = cart.find((i) => i.barang.id_barang === p.id_barang);
                  const isLow = p.stok <= p.stok_minimum;
                  const isOut = p.stok <= 0;

                  return (
                    <div
                      key={p.id_barang}
                      onClick={() => !isOut && addToCart(p)}
                      className={`group relative flex flex-col justify-between p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer select-none bg-white dark:bg-slate-900 ${
                        isOut
                          ? "opacity-50 cursor-not-allowed border-slate-200 dark:border-slate-800"
                          : inCart
                          ? "border-slate-800 dark:border-slate-200 shadow-md ring-1 ring-slate-800/10 dark:ring-slate-200/10"
                          : "hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      {/* Badge in cart */}
                      {inCart && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 font-bold text-xs flex items-center justify-center shadow-sm">
                          {inCart.qty}
                        </div>
                      )}

                      <div>
                        {p.gambar ? (
                          <img
                            src={p.gambar}
                            alt={p.nama_barang}
                            className="w-full h-24 object-cover rounded-xl mb-2.5"
                          />
                        ) : (
                          <div className="w-full h-20 rounded-xl mb-2.5 flex items-center justify-center bg-slate-100 dark:bg-slate-800/80 text-slate-400">
                            <PackageIcon size={24} />
                          </div>
                        )}
                        <p className="text-[10px] font-mono font-semibold text-slate-400">{p.kode_barang}</p>
                        <h4 className="text-sm font-bold leading-snug line-clamp-2 text-slate-800 dark:text-slate-100">
                          {p.nama_barang}
                        </h4>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-end justify-between">
                        <div>
                          <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                            {rupiah(Number(p.harga_jual))}
                          </p>
                          <p className="text-[10px] text-slate-400">/{p.satuan}</p>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            isOut
                              ? "bg-slate-200 dark:bg-slate-800 text-slate-500"
                              : isLow
                              ? "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {isOut ? "Habis" : `Stok: ${p.stok}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Cart & POS Checkout */}
        <div
          className="w-96 lg:w-[420px] flex flex-col shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
        >
          {/* Header Cart */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CartIcon size={18} className="text-slate-700 dark:text-slate-300" />
              <div>
                <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">Keranjang</h3>
                <p className="text-xs text-slate-400">{cart.length} item dipilih</p>
              </div>
            </div>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Kosongkan
              </button>
            )}
          </div>

          {/* Cart items list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <CartIcon size={40} className="text-slate-300 dark:text-slate-700 mb-2" />
                <p className="text-sm font-semibold">Keranjang Masih Kosong</p>
                <p className="text-xs text-center mt-1 text-slate-400">Pilih item dari katalog produk</p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.barang.id_barang}
                  className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate text-slate-800 dark:text-slate-100">
                        {item.barang.nama_barang}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {rupiah(Number(item.barang.harga_jual))} / {item.barang.satuan}
                      </p>
                    </div>
                    <button
                      onClick={() => removeItem(item.barang.id_barang)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs p-1"
                    >
                      <TrashIcon size={14} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    {/* Qty controller */}
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-xl px-2 py-1 border border-slate-200 dark:border-slate-700 shadow-sm">
                      <button
                        onClick={() => updateQty(item.barang.id_barang, -1)}
                        className="w-6 h-6 flex items-center justify-center font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      >
                        -
                      </button>
                      <span className="text-xs font-bold w-6 text-center text-slate-800 dark:text-slate-200">
                        {item.qty}
                      </span>
                      <button
                        onClick={() => updateQty(item.barang.id_barang, 1)}
                        className="w-6 h-6 flex items-center justify-center font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      >
                        +
                      </button>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                        {rupiah(getItemSubtotal(item))}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Payment & Summary Drawer */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3 bg-white dark:bg-slate-900">
            {/* Payment Method Selector */}
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1.5">Metode Pembayaran</label>
              <div className="grid grid-cols-4 gap-1.5">
                {PAYMENT_METHODS.map((pm) => {
                  const IconComp = pm.icon;
                  const active = payment === pm.id;
                  return (
                    <button
                      key={pm.id}
                      onClick={() => setPayment(pm.id)}
                      className={`py-2 rounded-xl text-[11px] font-bold flex flex-col items-center gap-1 border transition-all ${
                        active
                          ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 border-slate-800 dark:border-slate-200 shadow-sm"
                          : "bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <IconComp size={16} className={active ? "text-white dark:text-slate-900" : "text-slate-400"} />
                      <span>{pm.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cash Input (if Cash) */}
            {payment === 'cash' && (
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={cashInput}
                  onChange={(e) => setCashInput(e.target.value)}
                  placeholder="Uang Tunai Diterima (Rp)"
                  className="flex-1 px-3 py-2 text-xs rounded-xl border outline-none font-bold border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200"
                />
                <button
                  type="button"
                  onClick={() => setCashInput(String(totalBelanja))}
                  className="px-2.5 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                >
                  Uang Pas
                </button>
              </div>
            )}

            {/* Total & Change Breakdown */}
            <div className="space-y-1 py-1">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Total Belanja</span>
                <span className="font-black text-sm text-slate-800 dark:text-slate-100">{rupiah(totalBelanja)}</span>
              </div>
              {payment === 'cash' && cashVal > 0 && (
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300 font-semibold">
                  <span>Kembalian</span>
                  <span>{rupiah(kembalian)}</span>
                </div>
              )}
            </div>

            {/* Checkout Button */}
            <button
              onClick={handleCheckout}
              disabled={submitting || cart.length === 0}
              className="w-full py-3.5 rounded-2xl font-bold text-sm text-white bg-slate-800 hover:bg-slate-900 dark:bg-slate-200 dark:text-slate-900 shadow-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Menyimpan..." : `Bayar ${rupiah(totalBelanja)}`}
            </button>
          </div>
        </div>
      </div>

      {/* Receipt Modal Pop-up */}
      {receiptData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center mx-auto mb-2 border border-slate-200 dark:border-slate-700">
                <CheckCircleIcon size={24} />
              </div>
              <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-100">Transaksi Berhasil</h3>
              <p className="text-xs text-slate-400">Nomor: {receiptData.no_transaksi}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 space-y-2 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Tanggal</span>
                <span className="font-semibold">{new Date(receiptData.tanggal).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Kasir</span>
                <span className="font-semibold">{user.nama}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Metode Bayar</span>
                <span className="font-semibold uppercase">{receiptData.metode_bayar}</span>
              </div>
              <div className="border-t border-dashed border-slate-200 dark:border-slate-700 my-2 pt-2">
                {receiptData.detail_transaksi?.map((d) => (
                  <div key={d.id_detail} className="flex justify-between py-0.5">
                    <span>{d.barang?.nama_barang} × {d.jumlah}</span>
                    <span className="font-mono font-semibold">{rupiah(Number(d.subtotal))}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between font-extrabold text-sm text-slate-800 dark:text-slate-100">
                <span>Total Dibayar</span>
                <span className="font-black">{rupiah(Number(receiptData.total_harga))}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5"
              >
                <PrinterIcon size={14} />
                <span>Cetak Struk</span>
              </button>
              <button
                onClick={startNewTransaction}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-200 dark:text-slate-900 text-white font-bold text-xs shadow-sm transition-all"
              >
                Transaksi Baru
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
