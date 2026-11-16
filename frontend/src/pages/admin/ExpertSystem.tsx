import { useState, useEffect, useCallback, useMemo } from "react";
import { esApi, authStorage } from "../../services/api";
import type {
  EsDashboard,
  EsGejala,
  EsKategori,
  EsKerusakan,
  EsHasilDiagnosa,
  EsPernyataanRule,
  EsRiwayatDetail,
  EsRiwayatItem,
} from "../../services/api";
import {
  BrainIcon,
  RefreshIcon,
  CheckCircleIcon,
  AlertWarningIcon,
  CloseIcon,
  SearchIcon,
  LayersIcon,
  FileTextIcon,
  ClockIcon,
  TrophyIcon,
  ShieldCheckIcon,
  DatabaseIcon,
  BookOpenIcon,
} from "../../components/Icons";

type TabType = "diagnosa" | "basis-pengetahuan" | "riwayat";

const TABS: Array<{ id: TabType; label: string; icon: typeof BrainIcon }> = [
  { id: "diagnosa", label: "Diagnosa Gejala", icon: BrainIcon },
  { id: "basis-pengetahuan", label: "Basis Pengetahuan", icon: BookOpenIcon },
  { id: "riwayat", label: "Riwayat Diagnosa", icon: ClockIcon },
];

const URGENSI_STYLE: Record<string, string> = {
  tinggi: "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900",
  sedang: "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900",
  rendah: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900",
};

const KEYAKINAN_STYLE: Record<string, string> = {
  "sangat yakin": "bg-emerald-600",
  yakin: "bg-emerald-500",
  "cukup yakin": "bg-amber-500",
  "kurang yakin": "bg-rose-400",
  "tidak diketahui": "bg-slate-400",
};

const persen = (n: number) => `${Math.round(n * 1000) / 10}%`;

export default function ExpertSystem() {
  const [data, setData] = useState<EsDashboard | null>(null);
  const [gejala, setGejala] = useState<EsGejala[]>([]);
  const [kerusakan, setKerusakan] = useState<EsKerusakan[]>([]);
  const [aturan, setAturan] = useState<EsPernyataanRule[]>([]);
  const [riwayat, setRiwayat] = useState<EsRiwayatItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingBasis, setLoadingBasis] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabType>("diagnosa");

  const [dipilih, setDipilih] = useState<Record<string, boolean>>({});
  const [catatan, setCatatan] = useState("");
  const [pencarianGejala, setPencarianGejala] = useState("");
  const [filterKelompok, setFilterKelompok] = useState<EsKategori | "">("");
  const [mendiagnosa, setMendiagnosa] = useState(false);
  const [hasil, setHasil] = useState<EsHasilDiagnosa | null>(null);
  const [periode, setPeriode] = useState("90_hari");
  const [pakaiOtomatis, setPakaiOtomatis] = useState(true);

  const [filterKategoriBasis, setFilterKategoriBasis] = useState("");
  const [pencarianRule, setPencarianRule] = useState("");
  const [detailRiwayat, setDetailRiwayat] = useState<EsRiwayatDetail | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const bolehDiagnosa = authStorage.getAkses().es_diagnose;

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 6000);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashboardRes, gejalaRes, riwayatRes] = await Promise.all([
        esApi.getDashboard(periode),
        esApi.getGejala(),
        esApi.getHistory(20),
      ]);
      setData(dashboardRes);
      setGejala(gejalaRes.gejala);
      setRiwayat(riwayatRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengambil data Expert System");
    } finally {
      setLoading(false);
    }
  }, [periode]);

  const fetchBasisPengetahuan = useCallback(async () => {
    setLoadingBasis(true);
    try {
      const [kerusakanRes, aturanRes] = await Promise.all([esApi.getKerusakan(), esApi.getAturan()]);
      setKerusakan(kerusakanRes.kerusakan);
      setAturan(aturanRes.rule);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Gagal memuat basis pengetahuan");
    } finally {
      setLoadingBasis(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (tab === "basis-pengetahuan" && kerusakan.length === 0) {
      fetchBasisPengetahuan();
    }
  }, [tab, kerusakan.length, fetchBasisPengetahuan]);

  const kelompokGejala = useMemo(() => {
    const map = new Map<string, { kode: string; label: string; items: EsGejala[] }>();
    gejala.forEach((g) => {
      if (!map.has(g.kelompok)) {
        const label = data?.kategori.find((k) => k.kode === g.kelompok)?.label ?? g.kelompok;
        map.set(g.kelompok, { kode: g.kelompok, label, items: [] });
      }
      map.get(g.kelompok)!.items.push(g);
    });
    return Array.from(map.values());
  }, [gejala, data?.kategori]);

  const gejalaTampil = useMemo(() => {
    const q = pencarianGejala.trim().toLowerCase();
    return kelompokGejala
      .filter((k) => !filterKelompok || k.kode === filterKelompok)
      .map((k) => ({
        ...k,
        items: k.items.filter(
          (g) =>
            !q ||
            g.nama_gejala.toLowerCase().includes(q) ||
            g.kode_gejala.toLowerCase().includes(q)
        ),
      }))
      .filter((k) => k.items.length > 0);
  }, [kelompokGejala, filterKelompok, pencarianGejala]);

  const jumlahDipilih = Object.values(dipilih).filter(Boolean).length;

  const otomatisPerKode = useMemo(() => {
    const map = new Map<string, NonNullable<EsDashboard["deteksi_otomatis"]>["gejala"][number]>();
    (data?.deteksi_otomatis?.gejala ?? []).forEach((g) => map.set(g.kode_gejala, g));
    return map;
  }, [data?.deteksi_otomatis]);

  const toggleGejala = (kode: string) => {
    setDipilih((prev) => ({ ...prev, [kode]: !prev[kode] }));
    setHasil(null);
  };

  const handleDiagnosa = async () => {
    const kode = Object.entries(dipilih)
      .filter(([, aktif]) => aktif)
      .map(([kode]) => kode);

    const jumlahOtomatis = data?.deteksi_otomatis?.gejala.length ?? 0;

    if (kode.length === 0 && (!pakaiOtomatis || jumlahOtomatis === 0)) {
      showToast(
        "error",
        pakaiOtomatis
          ? "Tidak ada gejala terdeteksi otomatis. Centang gejala yang dialami secara manual."
          : "Pilih minimal satu gejala yang dialami."
      );
      return;
    }

    setMendiagnosa(true);
    try {
      const res = await esApi.diagnose({
        gejala: kode,
        catatan: catatan.trim() || undefined,
        otomatis: pakaiOtomatis,
        periode,
      });
      setHasil(res);
      showToast("success", `Diagnosa ${res.kode_diagnosa ?? ""} selesai: ${res.utama?.nama_kerusakan ?? "tidak teridentifikasi"}.`);
      const riwayatRes = await esApi.getHistory(20);
      setRiwayat(riwayatRes);
      setData((prev) =>
        prev
          ? {
              ...prev,
              basis_pengetahuan: { ...prev.basis_pengetahuan, total_diagnosa: prev.basis_pengetahuan.total_diagnosa + 1 },
            }
          : prev
      );
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Diagnosa gagal dijalankan");
    } finally {
      setMendiagnosa(false);
    }
  };

  const resetDiagnosa = () => {
    setDipilih({});
    setCatatan("");
    setHasil(null);
  };

  const bukaDetailRiwayat = async (item: EsRiwayatItem) => {
    try {
      const res = await esApi.getHistoryDetail(item.id_diagnosa);
      setDetailRiwayat(res);
      setTab("riwayat");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Gagal memuat detail riwayat");
    }
  };

  const kerusakanTampil = useMemo(() => {
    const q = pencarianRule.trim().toLowerCase();
    return kerusakan
      .filter((k) => !filterKategoriBasis || k.kategori === filterKategoriBasis)
      .filter(
        (k) =>
          !q ||
          k.nama_kerusakan.toLowerCase().includes(q) ||
          k.kode_kerusakan.toLowerCase().includes(q) ||
          k.rule.some((r) => (r.nama_gejala ?? "").toLowerCase().includes(q))
      );
  }, [kerusakan, filterKategoriBasis, pencarianRule]);

  if (loading && !data) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-slate-500 gap-3 min-h-[500px]">
        <svg className="animate-spin text-slate-700 dark:text-slate-300" width="40" height="40" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="25 12" />
        </svg>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Memuat basis pengetahuan pakar...</p>
        <p className="text-xs text-slate-500">Menyiapkan heuristik gejala, rule IF-THEN, dan riwayat diagnosa</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-12 flex flex-col items-center justify-center gap-3 min-h-[400px]">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
          <AlertWarningIcon size={24} />
        </div>
        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Gagal memuat data Expert System</p>
        <p className="text-xs text-slate-500 max-w-md text-center">{error}</p>
        <button
          onClick={fetchData}
          className="mt-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  const d = data!;
  const bp = d.basis_pengetahuan;

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto pb-16" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 p-4 rounded-2xl shadow-2xl border flex items-start gap-3 max-w-md ${
            toast.type === "success" ? "bg-emerald-900 text-white border-emerald-700" : "bg-rose-900 text-white border-rose-700"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircleIcon size={18} className="text-emerald-300 shrink-0 mt-0.5" />
          ) : (
            <AlertWarningIcon size={18} className="text-rose-300 shrink-0 mt-0.5" />
          )}
          <span className="text-xs font-semibold leading-relaxed">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-75">
            <CloseIcon size={14} />
          </button>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-700 to-slate-950 text-white flex items-center justify-center shadow-md border border-violet-800">
            <BrainIcon size={24} className="text-violet-100" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">Expert System</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300 border border-violet-200 dark:border-violet-900 uppercase tracking-wider">
                Forward Chaining + CF
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 uppercase tracking-wider">
                TPS + OAS + KMS → MIS → DSS → ES
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Sistem pakar untuk mendiagnosa penyebab masalah inventori, penjualan, dan pembayaran berdasarkan gejala.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            <DatabaseIcon size={14} className="text-violet-600 dark:text-violet-400" />
            {bp.total_rule} rule · {bp.total_gejala} gejala
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all shadow-sm"
          >
            <RefreshIcon size={14} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Sinkronisasi</span>
          </button>
        </div>
      </div>

      {!bp.siap && (
        <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 flex items-start gap-3">
          <AlertWarningIcon size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800 dark:text-amber-200">Basis pengetahuan belum siap</p>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              {bp.peringatan[0] ?? "Jalankan migration dan EsBasisPengetahuanSeeder sebelum memakai diagnosa."}
            </p>
          </div>
        </div>
      )}

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3.5">
        {[
          { label: "Hipotesis", value: bp.total_kerusakan, icon: LayersIcon },
          { label: "Gejala", value: bp.total_gejala, icon: SearchIcon },
          { label: "Aturan (Rule)", value: bp.total_rule, icon: FileTextIcon },
          { label: "Total Diagnosa", value: bp.total_diagnosa, icon: TrophyIcon },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                <Icon size={16} />
              </div>
              <p className="text-2xl font-black tabular-nums text-slate-900 dark:text-slate-100">{s.value}</p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* TABS */}
      <div className="flex gap-2 overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                tab === t.id
                  ? "bg-violet-700 text-white border-violet-700 dark:bg-violet-600 dark:border-violet-600 shadow-sm"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* DIAGNOSA */}
      {tab === "diagnosa" && (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
          <div className="xl:col-span-3 space-y-4">
            <DeteksiOtomatis
              dashboard={d}
              periode={periode}
              setPeriode={setPeriode}
              pakaiOtomatis={pakaiOtomatis}
              setPakaiOtomatis={setPakaiOtomatis}
            />

            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Pilih gejala yang dialami</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {jumlahDipilih > 0 ? `${jumlahDipilih} gejala dipilih` : "Centang semua gejala yang sesuai kondisi saat ini"}
                    </p>
                  </div>
                  {jumlahDipilih > 0 && (
                    <button onClick={resetDiagnosa} className="text-xs font-semibold text-slate-500 hover:text-rose-600 dark:hover:text-rose-400">
                      Reset
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={pencarianGejala}
                      onChange={(e) => setPencarianGejala(e.target.value)}
                      placeholder="Cari gejala (mis. stok, kas, diskon)..."
                      className="w-full pl-9 pr-8 py-2 text-xs rounded-xl outline-none border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-violet-500/40"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <SearchIcon size={14} />
                    </div>
                    {pencarianGejala && (
                      <button
                        onClick={() => setPencarianGejala("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <CloseIcon size={12} />
                      </button>
                    )}
                  </div>
                  <select
                    value={filterKelompok}
                    onChange={(e) => setFilterKelompok(e.target.value as EsKategori | "")}
                    className="px-3 py-2 text-xs rounded-xl border font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-violet-500/40"
                  >
                    <option value="">Semua kelompok</option>
                    {kelompokGejala.map((k) => (
                      <option key={k.kode} value={k.kode}>
                        {k.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-4 space-y-4 max-h-[520px] overflow-y-auto">
                {gejalaTampil.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-8">Tidak ada gejala yang cocok dengan pencarian.</p>
                )}
                {gejalaTampil.map((kelompok) => (
                  <div key={kelompok.kode}>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">{kelompok.label}</p>
                    <div className="space-y-1.5">
                      {kelompok.items.map((g) => {
                        const aktif = !!dipilih[g.kode_gejala];
                        const otomatis = otomatisPerKode.get(g.kode_gejala);
                        return (
                          <label
                            key={g.kode_gejala}
                            className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                              aktif
                                ? "border-violet-300 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/40"
                                : otomatis && pakaiOtomatis
                                  ? "border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                  : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={aktif}
                              onChange={() => toggleGejala(g.kode_gejala)}
                              className="mt-0.5 w-4 h-4 rounded accent-violet-600 shrink-0"
                            />
                            <span className="min-w-0">
                              <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                                <span className="font-mono text-[10px] text-slate-400 mr-1.5">{g.kode_gejala}</span>
                                {g.nama_gejala}
                                {otomatis && (
                                  <span
                                    className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900"
                                    title={otomatis.bukti?.ringkasan}
                                  >
                                    {aktif ? "koreksi" : "otomatis"} {otomatis.persentase}%
                                  </span>
                                )}
                              </span>
                              {g.deskripsi && <span className="block text-[11px] text-slate-500 dark:text-slate-400">{g.deskripsi}</span>}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3 bg-slate-50/60 dark:bg-slate-800/30">
                <input
                  type="text"
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  maxLength={255}
                  placeholder="Catatan (opsional), mis. kode barang atau shift kasir"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-violet-500/40"
                />
                <button
                  onClick={handleDiagnosa}
                  disabled={
                    mendiagnosa ||
                    !bolehDiagnosa ||
                    (jumlahDipilih === 0 && (!pakaiOtomatis || otomatisPerKode.size === 0))
                  }
                  className="w-full py-3 rounded-xl text-sm font-bold bg-violet-700 hover:bg-violet-800 text-white shadow-sm transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!bolehDiagnosa ? "Hanya admin/manager yang dapat menyimpan diagnosa" : undefined}
                >
                  {mendiagnosa
                    ? "Menjalankan inferensi..."
                    : `Jalankan Diagnosa${
                        jumlahDipilih > 0
                          ? ` (${jumlahDipilih} gejala)`
                          : pakaiOtomatis && otomatisPerKode.size > 0
                            ? ` (${otomatisPerKode.size} gejala otomatis)`
                            : ""
                      }`}
                </button>
              </div>
            </div>
          </div>

          <div className="xl:col-span-2 space-y-4">
            {hasil ? (
              <HasilDiagnosa hasil={hasil} onBukaDetail={bukaDetailRiwayat} />
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-slate-900/40 p-8 text-center">
                <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400">
                  <BrainIcon size={26} />
                </div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Belum ada hasil diagnosa</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                  Centang gejala yang sesuai lalu tekan Jalankan Diagnosa. Sistem akan menelusuri {bp.total_rule} rule pakar dengan metode Certainty Factor.
                </p>
              </div>
            )}

            {d.diagnosa_terakhir && !hasil && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Diagnosa terakhir</p>
                <button
                  onClick={() => bukaDetailRiwayat(d.diagnosa_terakhir!)}
                  className="w-full text-left"
                >
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    {d.diagnosa_terakhir.nama_kerusakan ?? "Tidak teridentifikasi"}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {d.diagnosa_terakhir.persentase} yakin · {d.diagnosa_terakhir.kode_diagnosa}
                  </p>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BASIS PENGETAHUAN */}
      {tab === "basis-pengetahuan" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={pencarianRule}
                onChange={(e) => setPencarianRule(e.target.value)}
                placeholder="Cari hipotesis, kode, atau gejala..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl outline-none border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-violet-500/40"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <SearchIcon size={14} />
              </div>
            </div>
            <select
              value={filterKategoriBasis}
              onChange={(e) => setFilterKategoriBasis(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-violet-500/40"
            >
              <option value="">Semua kategori</option>
              {d.kategori.map((k) => (
                <option key={k.kode} value={k.kode}>
                  {k.label}
                </option>
              ))}
            </select>
            <button
              onClick={fetchBasisPengetahuan}
              disabled={loadingBasis}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            >
              <RefreshIcon size={14} className={loadingBasis ? "animate-spin" : ""} />
              Muat ulang
            </button>
          </div>

          {loadingBasis ? (
            <p className="text-xs text-slate-500 text-center py-10">Memuat basis pengetahuan...</p>
          ) : kerusakanTampil.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Belum ada hipotesis pada filter ini</p>
              <p className="text-xs text-slate-500 mt-1">Pastikan seeder basis pengetahuan sudah dijalankan.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {kerusakanTampil.map((k) => (
                <div key={k.kode_kerusakan} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {k.kode_kerusakan}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{k.kategori_label}</span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{k.nama_kerusakan}</h3>
                    </div>
                    <span
                      className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-bold border capitalize ${
                        URGENSI_STYLE[k.tingkat_urgensi] ?? URGENSI_STYLE.sedang
                      }`}
                    >
                      {k.tingkat_urgensi}
                    </span>
                  </div>

                  {k.deskripsi && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">{k.deskripsi}</p>}

                  <div className="mt-3 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rule IF-THEN ({k.jumlah_rule})</p>
                    {k.rule.map((r) => (
                      <div key={r.kode_rule} className="text-[11px] flex items-start gap-1.5 text-slate-600 dark:text-slate-300">
                        <ShieldCheckIcon size={12} className="text-violet-500 shrink-0 mt-0.5" />
                        <span>
                          <span className="font-semibold text-slate-800 dark:text-slate-100">IF</span> {r.kode_gejala} · {r.nama_gejala}
                          <span className="text-slate-400"> → CF {r.cf_pakar}</span>
                        </span>
                      </div>
                    ))}
                  </div>

                  {k.solusi && (
                    <details className="mt-3">
                      <summary className="text-[11px] font-bold text-violet-700 dark:text-violet-300 cursor-pointer select-none">
                        Lihat solusi penanganan
                      </summary>
                      <p className="mt-1.5 text-[11px] whitespace-pre-line text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2.5">
                        {k.solusi}
                      </p>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}

          {aturan.length > 0 && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Daftar pernyataan rule ({aturan.length})
              </p>
              <div className="max-h-64 overflow-y-auto space-y-1 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                {aturan.map((r) => (
                  <p key={r.kode_rule} className="py-0.5 border-b border-dashed border-slate-100 dark:border-slate-800 last:border-0">
                    {r.pernyataan}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* RIWAYAT */}
      {tab === "riwayat" && (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
          <div className="xl:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Riwayat diagnosa</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{riwayat.length} diagnosa terakhir</p>
            </div>
            <div className="max-h-[560px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {riwayat.length === 0 && <p className="text-xs text-slate-500 text-center py-10">Belum ada diagnosa.</p>}
              {riwayat.map((r) => (
                <button
                  key={r.id_diagnosa}
                  onClick={() => bukaDetailRiwayat(r)}
                  className={`w-full text-left p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                    detailRiwayat?.id_diagnosa === r.id_diagnosa ? "bg-violet-50 dark:bg-violet-950/30" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] text-slate-400">{r.kode_diagnosa}</span>
                    <span className="text-[11px] font-bold tabular-nums text-slate-700 dark:text-slate-200">{r.persentase}</span>
                  </div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-0.5 truncate">
                    {r.nama_kerusakan ?? "Tidak teridentifikasi"}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {r.jumlah_gejala} gejala · {r.tingkat_keyakinan} · {r.dibuat_pada?.slice(0, 16) ?? "-"}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="xl:col-span-3">
            {detailRiwayat ? (
              <div className="space-y-4">
                <HasilDiagnosa
                  hasil={{
                    metode: "Forward Chaining + Certainty Factor",
                    ambang_keyakinan_persen: d.ambang_keyakinan_persen,
                    gejala_terpilih: detailRiwayat.gejala_terpilih.map((g) => ({
                      ...g,
                      nama_gejala: gejala.find((x) => x.kode_gejala === g.kode_gejala)?.nama_gejala,
                      persentase: Math.round(g.cf_pengguna * 100),
                    })),
                    total_rule_aktif: bp.total_rule,
                    total_rule_terpicu: detailRiwayat.kandidat.reduce((n, k) => n + k.rule.length, 0),
                    hasil: detailRiwayat.hasil,
                    utama: detailRiwayat.kandidat.find((k) => k.kode_kerusakan === detailRiwayat.kode_kerusakan) ?? detailRiwayat.kandidat[0] ?? null,
                    kandidat: detailRiwayat.kandidat,
                    langkah_inferensi: detailRiwayat.langkah_inferensi,
                    kode_diagnosa: detailRiwayat.kode_diagnosa,
                    didiagnosa_pada: detailRiwayat.dibuat_pada ?? undefined,
                    didiagnosa_oleh: detailRiwayat.didiagnosa_oleh,
                  }}
                />
                <button
                  onClick={() => setDetailRiwayat(null)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  ← Tutup detail
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center h-full flex flex-col items-center justify-center">
                <ClockIcon size={26} className="text-slate-300 dark:text-slate-700 mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Pilih salah satu riwayat</p>
                <p className="text-xs text-slate-500 mt-1">Detail gejala, langkah inferensi, dan solusi akan ditampilkan di sini.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function HasilDiagnosa({
  hasil,
  onBukaDetail,
}: {
  hasil: EsHasilDiagnosa;
  onBukaDetail?: (item: EsRiwayatItem) => void;
}) {
  const [tampilLangkah, setTampilLangkah] = useState(false);
  const utama = hasil.utama;

  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Hasil inferensi</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {hasil.kode_diagnosa ?? "Simulasi"} · {hasil.total_rule_terpicu}/{hasil.total_rule_aktif} rule terpicu
          </p>
        </div>
        {hasil.didiagnosa_oleh && <p className="text-[11px] text-slate-500">{hasil.didiagnosa_oleh}</p>}
      </div>

      <div className="p-4 space-y-4">
        {utama ? (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-700 to-slate-950 text-white">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/15">{utama.kode_kerusakan}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/15">
                {utama.tingkat_keyakinan}
              </span>
            </div>
            <p className="text-base font-black mt-2">{utama.nama_kerusakan ?? "Hipotesis tidak dikenali"}</p>
            <div className="mt-3">
              <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
                <span className="text-violet-200">Nilai Certainty Factor</span>
                <span className="tabular-nums">CF {utama.cf.toFixed(4)} ({utama.persentase})</span>
              </div>
              <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                <div className="h-full rounded-full bg-violet-300" style={{ width: `${Math.min(100, utama.persen)}%` }} />
              </div>
            </div>
            {utama.solusi && (
              <details className="mt-3">
                <summary className="text-[11px] font-bold text-violet-100 cursor-pointer">Solusi / tindakan penanganan</summary>
                <p className="mt-1.5 text-[11px] whitespace-pre-line text-violet-50/90">{utama.solusi}</p>
              </details>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900">
            <div className="flex items-start gap-2">
              <AlertWarningIcon size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-800 dark:text-amber-200">Gejala belum cukup untuk menyimpulkan</p>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Tidak ada hipotesis dengan CF ≥ {hasil.ambang_keyakinan_persen}%. Tambahkan gejala lain yang relevan.
                </p>
              </div>
            </div>
          </div>
        )}

        {hasil.kandidat.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Peringkat hipotesis</p>
            <div className="space-y-1.5">
              {hasil.kandidat.map((k) => (
                <div key={k.kode_kerusakan} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      <span className="font-mono text-[10px] text-slate-400 mr-1">{k.kode_kerusakan}</span>
                      {k.nama_kerusakan}
                    </span>
                    <span className="text-[11px] font-bold tabular-nums text-slate-600 dark:text-slate-300">{k.persentase}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 mt-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${KEYAKINAN_STYLE[k.tingkat_keyakinan] ?? "bg-slate-400"}`}
                      style={{ width: `${Math.min(100, k.persen)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Gejala terpilih</p>
          <div className="flex flex-wrap gap-1.5">
            {hasil.gejala_terpilih.map((g) => (
              <span
                key={g.kode_gejala}
                className={`text-[10px] px-2 py-0.5 rounded-full border ${
                  g.asal === "otomatis"
                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-transparent"
                }`}
                title={g.bukti?.ringkasan ?? `CF ${persen(g.cf_pengguna)}`}
              >
                {g.asal === "otomatis" && <span aria-hidden>⚡ </span>}
                {g.kode_gejala} · {g.nama_gejala ?? "-"}
              </span>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            ⚡ otomatis dari data · abu-abu = input manual
            {hasil.otomatis_aktif === false && " · deteksi otomatis dimatikan"}
          </p>
        </div>

        {utama && (utama.data_pendukung?.length ?? 0) > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Data pendukung · {utama.kode_kerusakan}
            </p>
            <div className="space-y-2">
              {utama.data_pendukung!.map((dp) => (
                <div key={dp.kode_gejala} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    <span className="font-mono text-[10px] text-slate-400 mr-1">{dp.kode_gejala}</span>
                    {dp.bukti?.ringkasan}
                  </p>
                  <div className="mt-1 space-y-0.5">
                    {(dp.bukti?.detail ?? []).slice(0, 5).map((row, i) => (
                      <p key={i} className="text-[10px] text-slate-500 dark:text-slate-400">
                        {row.kode ? <span className="font-mono mr-1">{row.kode}</span> : null}
                        {row.keterangan}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {utama && (utama.rujukan_knowledge?.length ?? 0) > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Rujukan SOP (KMS)
            </p>
            <div className="space-y-1.5">
              {utama.rujukan_knowledge!.map((r) => (
                <div key={r.id_knowledge} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">{r.judul}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2">{r.ringkasan}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <button
            onClick={() => setTampilLangkah((v) => !v)}
            className="text-[11px] font-bold text-violet-700 dark:text-violet-300 flex items-center gap-1"
          >
            {tampilLangkah ? "Sembunyikan" : "Lihat"} langkah inferensi ({hasil.langkah_inferensi.length})
          </button>
          {tampilLangkah && (
            <ol className="mt-2 space-y-1 text-[11px] text-slate-600 dark:text-slate-300 list-decimal pl-4">
              {hasil.langkah_inferensi.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ol>
          )}
        </div>

        {hasil.didiagnosa_pada && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
            Didiagnosa pada {hasil.didiagnosa_pada}
          </p>
        )}

        {onBukaDetail && hasil.id_diagnosa && (
          <button
            onClick={() =>
              onBukaDetail({
                id_diagnosa: hasil.id_diagnosa!,
                kode_diagnosa: hasil.kode_diagnosa ?? "-",
                kode_kerusakan: utama?.kode_kerusakan ?? null,
                nama_kerusakan: utama?.nama_kerusakan,
                kategori: utama?.kategori ?? null,
                cf_akhir: utama?.cf ?? 0,
                persentase: utama?.persentase ?? "0%",
                tingkat_keyakinan: utama?.tingkat_keyakinan ?? "-",
                hasil: hasil.hasil,
                jumlah_gejala: hasil.gejala_terpilih.length,
                dibuat_pada: hasil.didiagnosa_pada ?? null,
              })
            }
            className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          >
            Lihat di riwayat →
          </button>
        )}
      </div>
    </div>
  );
}

const STATUS_SUMBER: Record<string, { label: string; className: string }> = {
  terhubung: {
    label: "Terhubung",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900",
  },
  sebagian: {
    label: "Sebagian",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-900",
  },
  kosong: {
    label: "Kosong",
    className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  },
  tidak_tersedia: {
    label: "Tidak tersedia",
    className: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-900",
  },
};

function DeteksiOtomatis({
  dashboard,
  periode,
  setPeriode,
  pakaiOtomatis,
  setPakaiOtomatis,
}: {
  dashboard: EsDashboard;
  periode: string;
  setPeriode: (kode: string) => void;
  pakaiOtomatis: boolean;
  setPakaiOtomatis: (aktif: boolean) => void;
}) {
  const [terbuka, setTerbuka] = useState<string | null>(null);
  const data = dashboard.deteksi_otomatis;
  const sumber = dashboard.sumber_data ?? [];
  const gejala = data?.gejala ?? [];

  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <DatabaseIcon size={14} className="text-emerald-600 dark:text-emerald-400" />
              Bukti otomatis dari data operasional
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Gejala dinilai otomatis dari TPS, OAS, KMS, MIS, dan DSS. Centang manual untuk mengoreksi nilai sistem.
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={pakaiOtomatis}
              onChange={(e) => setPakaiOtomatis(e.target.checked)}
              className="w-4 h-4 rounded accent-emerald-600"
            />
            Deteksi otomatis
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={periode}
            onChange={(e) => setPeriode(e.target.value)}
            disabled={!pakaiOtomatis}
            className="px-3 py-2 text-xs rounded-xl border font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-violet-500/40 disabled:opacity-50"
          >
            {(data?.daftar_periode ?? [{ kode: "90_hari", label: "90 Hari Terakhir" }]).map((p) => (
              <option key={p.kode} value={p.kode}>
                {p.label}
              </option>
            ))}
          </select>
          {sumber.map((s) => {
            const style = STATUS_SUMBER[s.status] ?? STATUS_SUMBER.kosong;
            return (
              <span
                key={s.modul}
                title={`${s.nama} — ${s.dipakai_untuk} (${s.jumlah_record} record)`}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${style.className}`}
              >
                {s.modul} · {style.label}
              </span>
            );
          })}
        </div>
      </div>

      <div className="p-4">
        {!pakaiOtomatis ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 py-3 text-center">
            Deteksi otomatis dimatikan. Diagnosa hanya memakai gejala yang dicentang manual.
          </p>
        ) : gejala.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 py-3 text-center">
            Tidak ada gejala yang dapat disimpulkan dari data pada {data?.periode.label ?? "periode ini"}.
          </p>
        ) : (
          <div className="space-y-2">
            {data?.ringkasan && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {data.ringkasan.total_barang} SKU · {data.ringkasan.total_transaksi_periode} transaksi pada{" "}
                {data.ringkasan.periode_label}
              </p>
            )}
            {gejala.map((g) => {
              const dbuka = terbuka === g.kode_gejala;
              return (
                <div key={g.kode_gejala} className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <button
                    onClick={() => setTerbuka(dbuka ? null : g.kode_gejala)}
                    className="w-full flex items-center gap-3 p-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 shrink-0">
                      {g.kode_gejala}
                    </span>
                    <span className="flex-1 min-w-0 text-xs text-slate-700 dark:text-slate-300 truncate">
                      {g.bukti?.ringkasan ?? "Bukti tidak tersedia"}
                    </span>
                    <span className="text-xs font-bold tabular-nums text-emerald-700 dark:text-emerald-400 shrink-0">
                      {g.persentase}%
                    </span>
                    <span className="text-slate-400 text-[10px] shrink-0">{dbuka ? "▲" : "▼"}</span>
                  </button>
                  {dbuka && (
                    <div className="px-3 pb-3 pt-1 space-y-1.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-2">
                        Sumber: {g.bukti?.sumber ?? "-"} · {g.bukti?.jumlah ?? 0} bukti
                      </p>
                      {(g.bukti?.detail ?? []).map((row, i) => (
                        <div key={`${g.kode_gejala}-${i}`} className="flex gap-2 text-[11px]">
                          {row.kode && (
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                              {row.kode}
                            </span>
                          )}
                          <span className="text-slate-600 dark:text-slate-400">{row.keterangan}</span>
                        </div>
                      ))}
                      {(g.bukti?.detail ?? []).length === 0 && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Tidak ada rincian tambahan.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
