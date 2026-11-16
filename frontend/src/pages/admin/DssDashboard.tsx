import { useCallback, useEffect, useMemo, useState } from "react";
import { dssApi, authStorage } from "../../services/api";
import type {
  DssDashboard,
  DssHasilAnalisis,
  DssKriteria,
  DssPeriode,
  DssRiwayatDetail,
  DssRiwayatItem,
  DssSumberData,
} from "../../services/api";
import {
  BrainIcon,
  ScaleIcon,
  TrophyIcon,
  DatabaseIcon,
  RefreshIcon,
  CheckCircleIcon,
  AlertWarningIcon,
  CloseIcon,
  SaveIcon,
  TrendingUpIcon,
  LayersIcon,
  AwardIcon,
  ClockIcon,
  FileTextIcon,
  ShieldCheckIcon,
  BriefcaseIcon,
} from "../../components/Icons";

const rupiah = (n: number) => "Rp " + Math.round(n).toLocaleString("id-ID");
const angka = (n: number, d = 2) => n.toLocaleString("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d });
const skor = (n: number) => n.toFixed(4);

type TabType = "ringkasan" | "sumber" | "kriteria" | "hasil" | "riwayat";

const STATUS_STYLE: Record<string, { label: string; box: string; dot: string; text: string }> = {
  terhubung: {
    label: "Terhubung",
    box: "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-900",
    dot: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-300",
  },
  sebagian: {
    label: "Sebagian",
    box: "bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-900",
    dot: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-300",
  },
  kosong: {
    label: "Kosong",
    box: "bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700",
    dot: "bg-slate-400",
    text: "text-slate-600 dark:text-slate-300",
  },
  tidak_tersedia: {
    label: "Tidak Tersedia",
    box: "bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-900",
    dot: "bg-rose-500",
    text: "text-rose-700 dark:text-rose-300",
  },
};

const MODUL_STYLE: Record<string, { ring: string; text: string; bg: string }> = {
  TPS: { ring: "border-blue-200 dark:border-blue-900", text: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/60" },
  OAS: { ring: "border-emerald-200 dark:border-emerald-900", text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/60" },
  KMS: { ring: "border-amber-200 dark:border-amber-900", text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/60" },
  MIS: { ring: "border-violet-200 dark:border-violet-900", text: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/60" },
};

const PERIODE_OPTIONS: Array<{ id: DssPeriode; label: string }> = [
  { id: "hari_ini", label: "Hari Ini" },
  { id: "7_hari", label: "7 Hari" },
  { id: "30_hari", label: "30 Hari" },
  { id: "kuartal", label: "Kuartal" },
  { id: "all_time", label: "Semua Data" },
];

export default function DssDashboardPage() {
  const [data, setData] = useState<DssDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabType>("ringkasan");
  const [periode, setPeriode] = useState<DssPeriode>("all_time");
  const [lastRefreshed, setLastRefreshed] = useState<string>("");

  // Bobot (draft) untuk simulasi & penyimpanan
  const [bobotDraft, setBobotDraft] = useState<Record<string, number>>({});
  const [simulasi, setSimulasi] = useState<DssHasilAnalisis | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [savingBobot, setSavingBobot] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [detailRiwayat, setDetailRiwayat] = useState<DssRiwayatDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [judulAnalisis, setJudulAnalisis] = useState("Prioritas Restok Barang");

  const bolehUbah = authStorage.getAkses().dss_analyze;
  const bolehSimpanBobot = authStorage.getAkses().dss_criteria;

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 6000);
  };

  const fetchData = useCallback(async (selectedPeriode: DssPeriode) => {
    setLoading(true);
    setError(null);
    try {
      const res = await dssApi.getDashboard(selectedPeriode);
      setData(res);
      setBobotDraft(
        res.kriteria.reduce<Record<string, number>>((acc, k) => {
          acc[k.kode_kriteria] = Number(k.bobot);
          return acc;
        }, {})
      );
      setLastRefreshed(
        new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal mengambil data DSS";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(periode);
  }, [fetchData, periode]);

  const totalBobot = useMemo(
    () => Object.values(bobotDraft).reduce((sum, v) => sum + (Number.isFinite(v) ? v : 0), 0),
    [bobotDraft]
  );

  const bobotValid = Math.abs(totalBobot - 100) < 0.01;

  const hasilTampil = simulasi?.hasil ?? data?.peringkat ?? [];
  const kriteriaTampil = simulasi?.kriteria ?? data?.kriteria ?? [];
  const rekomendasi = simulasi?.rekomendasi_utama ?? data?.rekomendasi_utama ?? null;
  const maxSkor = hasilTampil.length > 0 ? Math.max(...hasilTampil.map((h) => h.skor)) : 0;

  const handleSimulasi = async () => {
    if (!bobotValid) {
      showToast("error", `Total bobot harus 100%. Saat ini ${angka(totalBobot)}%.`);
      return;
    }
    setSimulating(true);
    try {
      const res = await dssApi.simulate({ periode, bobot: bobotDraft });
      setSimulasi(res);
      showToast("success", "Simulasi bobot berhasil dihitung. Hasil belum disimpan ke riwayat.");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Simulasi gagal dijalankan");
    } finally {
      setSimulating(false);
    }
  };

  const handleResetBobot = () => {
    if (!data) return;
    setBobotDraft(
      data.kriteria.reduce<Record<string, number>>((acc, k) => {
        acc[k.kode_kriteria] = Number(k.bobot);
        return acc;
      }, {})
    );
    setSimulasi(null);
  };

  const handleSimpanBobot = async () => {
    if (!bobotValid) {
      showToast("error", `Total bobot harus 100%. Saat ini ${angka(totalBobot)}%.`);
      return;
    }
    setSavingBobot(true);
    try {
      await dssApi.updateCriteria(bobotDraft);
      showToast("success", "Bobot kriteria berhasil disimpan sebagai bobot aktif.");
      await fetchData(periode);
      setSimulasi(null);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Gagal menyimpan bobot");
    } finally {
      setSavingBobot(false);
    }
  };

  const handleAnalisis = async () => {
    if (!bobotValid) {
      showToast("error", `Total bobot harus 100%. Saat ini ${angka(totalBobot)}%.`);
      return;
    }
    setAnalyzing(true);
    try {
      const res = await dssApi.analyze({ periode, judul: judulAnalisis, bobot: bobotDraft });
      showToast("success", `Analisis ${res.kode_analisis ?? ""} berhasil dihitung dan disimpan ke riwayat.`);
      setSimulasi(null);
      await fetchData(periode);
      setTab("hasil");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Analisis gagal dijalankan");
    } finally {
      setAnalyzing(false);
    }
  };

  const bukaDetailRiwayat = async (item: DssRiwayatItem) => {
    setLoadingDetail(true);
    try {
      const res = await dssApi.getHistoryDetail(item.id_analisis);
      setDetailRiwayat(res);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Gagal memuat detail riwayat");
    } finally {
      setLoadingDetail(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3 min-h-[500px]">
        <svg className="animate-spin text-slate-700 dark:text-slate-300" width="40" height="40" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="25 12" />
        </svg>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Menjalankan mesin DSS (SAW)...</p>
        <p className="text-xs text-slate-400">Mengambil data TPS, OAS, KMS, dan MIS lalu menghitung normalisasi &amp; skor preferensi</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-12 flex flex-col items-center justify-center gap-3 min-h-[400px]">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
          <AlertWarningIcon size={24} />
        </div>
        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Gagal memuat data DSS</p>
        <p className="text-xs text-slate-500 max-w-md text-center">{error}</p>
        <button
          onClick={() => fetchData(periode)}
          className="mt-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  const d = data!;
  const status = d.status_integrasi;

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto pb-16" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 p-4 rounded-2xl shadow-2xl border flex items-start gap-3 max-w-md ${
            toast.type === "success"
              ? "bg-emerald-900 text-white border-emerald-700"
              : "bg-rose-900 text-white border-rose-700"
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
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-700 to-slate-950 text-white flex items-center justify-center shadow-md border border-indigo-800">
            <BrainIcon size={24} className="text-indigo-100" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">
                Decision Support System
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900 uppercase tracking-wider">
                Metode SAW
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 uppercase tracking-wider">
                TPS + OAS + KMS → MIS → DSS
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Prioritas restok barang berbasis data operasional, administrasi, pengetahuan, dan laporan manajemen.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
            {PERIODE_OPTIONS.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setPeriode(p.id);
                  setSimulasi(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  periode === p.id
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchData(periode)}
            title={`Terakhir diperbarui: ${lastRefreshed}`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all shadow-sm"
          >
            <RefreshIcon size={14} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Sinkronisasi</span>
          </button>
        </div>
      </div>

      {d.konteks_es && (
        <div
          className={`p-4 rounded-2xl border flex items-start gap-3 ${
            d.konteks_es.tersedia
              ? "border-violet-200 dark:border-violet-900 bg-violet-50 dark:bg-violet-950/30"
              : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60"
          }`}
        >
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              d.konteks_es.tersedia
                ? "bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300"
                : "bg-slate-200 dark:bg-slate-800 text-slate-500"
            }`}
          >
            <BrainIcon size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Konteks Expert System</p>
              {d.konteks_es.tersedia && d.konteks_es.kode_kerusakan && (
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-950 text-violet-800 dark:text-violet-300">
                  {d.konteks_es.kode_kerusakan}
                </span>
              )}
              {d.konteks_es.tersedia && d.konteks_es.persentase && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-600 text-white">
                  CF {d.konteks_es.persentase}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              {d.konteks_es.tersedia
                ? `${d.konteks_es.nama_kerusakan ?? "-"} — ${d.konteks_es.keterangan}`
                : d.konteks_es.keterangan}
            </p>
            {d.konteks_es.tersedia && (d.konteks_es.barang_terdampak?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {d.konteks_es.barang_terdampak!.map((kode) => (
                  <span
                    key={kode}
                    className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-violet-200 dark:border-violet-900 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300"
                  >
                    {kode}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Integrasi */}
        <div className="rounded-3xl p-6 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white border border-slate-800 shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10 pointer-events-none">
            <DatabaseIcon size={150} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Status Integrasi Sumber Data
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                  status.semua_terhubung
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                }`}
              >
                {status.semua_terhubung ? "SEMUA TERHUBUNG" : "SEBAGIAN TERHUBUNG"}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black tracking-tight text-white">{status.terhubung}</span>
              <span className="text-slate-400 text-sm font-semibold">/ {status.total_modul} modul</span>
            </div>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              {status.persentase}% modul sumber data terhubung langsung ke database operasional.
            </p>
          </div>
          <div className="grid grid-cols-4 gap-1.5 mt-5 pt-4 border-t border-slate-800/80">
            {d.sumber_data.map((s) => {
              const st = STATUS_STYLE[s.status] ?? STATUS_STYLE.kosong;
              return (
                <div key={s.modul} className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                    <span className="text-[10px] font-extrabold text-white">{s.modul}</span>
                  </div>
                  <p className="text-[9px] text-slate-400 mt-0.5">{s.jumlah_record} rec</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Alternatif */}
        <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Alternatif Dinilai
              </span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <LayersIcon size={16} />
              </div>
            </div>
            <p className="text-xs text-slate-400 font-medium">Barang relevan (terjual / stok kritis)</p>
            <p className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-1">{d.ringkasan.total_alternatif}</p>
            <p className="text-xs text-slate-500 mt-1.5">
              {d.periode.transaksi_periode ?? 0} transaksi selesai · {d.periode.hari_efektif ?? 0} hari data
            </p>
          </div>
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
            <span>Periode:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{d.periode.label}</span>
          </div>
        </div>

        {/* Kriteria */}
        <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Kriteria &amp; Bobot
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <ScaleIcon size={16} />
              </div>
            </div>
            <p className="text-xs text-slate-400 font-medium">Total bobot aktif</p>
            <p className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-1">
              {d.ringkasan.total_kriteria} <span className="text-sm font-bold text-slate-400">kriteria</span>
            </p>
            <div className="flex flex-wrap gap-1 mt-2">
              {d.kriteria.map((k) => (
                <span
                  key={k.kode_kriteria}
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                    k.jenis === "cost"
                      ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                  }`}
                >
                  {k.kode_kriteria} {k.bobot}%
                </span>
              ))}
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
            <span>Metode:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">SAW</span>
          </div>
        </div>

        {/* Skor tertinggi */}
        <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Rekomendasi Teratas
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <TrophyIcon size={16} />
              </div>
            </div>
            <p className="text-xs text-slate-400 font-medium">Alternatif peringkat 1</p>
            <p className="text-sm font-black text-slate-900 dark:text-slate-100 mt-1 leading-tight line-clamp-2">
              {rekomendasi?.nama_alternatif ?? "Belum ada alternatif"}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Skor preferensi{" "}
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {rekomendasi ? skor(rekomendasi.skor) : "0.0000"}
              </span>
            </p>
          </div>
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
            <span>Analisis tersimpan:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{d.ringkasan.total_analisis_tersimpan}</span>
          </div>
        </div>
      </div>

      {/* PERINGATAN DATA */}
      {d.peringatan.length > 0 && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-4">
          <div className="flex items-start gap-2.5">
            <AlertWarningIcon size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-800 dark:text-amber-200">Catatan validasi data</p>
              <ul className="mt-1 space-y-0.5">
                {d.peringatan.map((w, i) => (
                  <li key={i} className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
                    • {w}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TABS */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        {(
          [
            { id: "ringkasan", label: "Ringkasan & Rekomendasi", icon: AwardIcon },
            { id: "sumber", label: "Sumber Data (TPS/OAS/KMS/MIS)", icon: DatabaseIcon },
            { id: "kriteria", label: "Kriteria & Bobot", icon: ScaleIcon },
            { id: "hasil", label: "Hasil Perhitungan SAW", icon: TrendingUpIcon },
            { id: "riwayat", label: "Riwayat Analisis", icon: ClockIcon },
          ] as const
        ).map((t) => {
          const IconComp = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
                active
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              <IconComp size={16} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ======================= TAB: RINGKASAN ======================= */}
      {tab === "ringkasan" && (
        <div className="space-y-6">
          {/* Rekomendasi utama */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/40 dark:to-slate-900 border-b border-slate-200 dark:border-slate-800">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
                    <TrophyIcon size={22} />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      Rekomendasi Keputusan Utama
                    </p>
                    <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
                      {rekomendasi?.nama_alternatif ?? "Belum ada alternatif pada periode ini"}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {rekomendasi?.kode_barang ? `Kode ${rekomendasi.kode_barang} · ` : ""}
                      Peringkat {rekomendasi?.peringkat ?? "-"} · Skor SAW{" "}
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {rekomendasi ? skor(rekomendasi.skor) : "0.0000"}
                      </span>
                    </p>
                  </div>
                </div>
                {rekomendasi?.estimasi_biaya !== null && rekomendasi?.estimasi_biaya !== undefined && (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 shrink-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Estimasi Biaya</p>
                    <p className="text-base font-black text-slate-900 dark:text-slate-100">
                      {rupiah(rekomendasi.estimasi_biaya)}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {rekomendasi.jumlah_disarankan} {rekomendasi.satuan ?? "unit"} restok
                    </p>
                  </div>
                )}
              </div>

              {rekomendasi?.alasan && (
                <div className="mt-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-indigo-100 dark:border-indigo-900 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Penjelasan Perhitungan
                  </p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{rekomendasi.alasan}</p>
                </div>
              )}
            </div>

            {/* Dasar nilai */}
            {rekomendasi && Object.keys(rekomendasi.dasar_nilai ?? {}).length > 0 && (
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                {kriteriaTampil.map((k) => (
                  <div
                    key={k.kode_kriteria}
                    className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-3.5"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-extrabold text-slate-500">{k.kode_kriteria}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                          k.jenis === "cost"
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        }`}
                      >
                        {k.jenis}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight">
                      {k.nama_kriteria}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {rekomendasi.dasar_nilai?.[k.kode_kriteria] ?? "-"}
                    </p>
                    <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 mt-1.5">
                      Bobot {k.bobot}% · Nilai {angka(rekomendasi ? Number(hasilTampil[0]?.nilai?.[k.kode_kriteria] ?? 0) : 0)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Visualisasi perbandingan skor */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Perbandingan Skor Preferensi (Vi)
                </h3>
                <p className="text-xs text-slate-500">
                  Vi = Σ (Wj × Rij) — semakin tinggi skor, semakin diprioritaskan.
                  {simulasi && (
                    <span className="ml-1 font-bold text-indigo-600 dark:text-indigo-400">
                      (menampilkan hasil simulasi bobot, belum disimpan)
                    </span>
                  )}
                </p>
              </div>
            </div>

            {hasilTampil.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-xs text-slate-500">Tidak ada alternatif untuk ditampilkan pada periode ini.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {hasilTampil.slice(0, 10).map((row) => {
                  const width = maxSkor > 0 ? (row.skor / maxSkor) * 100 : 0;
                  return (
                    <div key={row.kode_alternatif} className="flex items-center gap-3">
                      <div className="w-7 shrink-0 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-[10px] font-extrabold ${
                            row.peringkat === 1
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {row.peringkat}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                            {row.es_menandai && (
                              <span
                                className="mr-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300 align-middle"
                                title={row.diagnosa_es ? `Expert System ${row.diagnosa_es.kode_kerusakan}: ${row.diagnosa_es.nama_kerusakan}` : undefined}
                              >
                                ES
                              </span>
                            )}
                            {row.nama_alternatif}
                          </p>
                          <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300 shrink-0">
                            {skor(row.skor)}
                          </span>
                        </div>
                        <div className="h-2 mt-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              row.peringkat === 1
                                ? "bg-gradient-to-r from-indigo-600 to-indigo-400"
                                : "bg-slate-400 dark:bg-slate-600"
                            }`}
                            style={{ width: `${Math.max(2, width)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Ringkasan integrasi mini */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                <ShieldCheckIcon size={16} className="text-slate-400" />
                Alur Data Terintegrasi
              </h3>
              <div className="flex items-center gap-1.5 flex-wrap">
                {["TPS", "OAS", "KMS"].map((m) => (
                  <span
                    key={m}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold border ${MODUL_STYLE[m].bg} ${MODUL_STYLE[m].text} ${MODUL_STYLE[m].ring}`}
                  >
                    {m}
                  </span>
                ))}
                <span className="text-slate-400 text-xs">→</span>
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold border bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-900">
                  MIS
                </span>
                <span className="text-slate-400 text-xs">→</span>
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold border bg-indigo-600 text-white border-indigo-700">
                  DSS (SAW)
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">
                DSS membaca langsung tabel operasional TPS (transaksi, detail transaksi, barang), disposisi OAS
                (rekomendasi restock), repositori KMS (knowledge base), dan laporan MIS. Tidak ada tabel data yang
                diduplikasi.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                <BriefcaseIcon size={16} className="text-slate-400" />
                Konteks Keputusan
              </h3>
              <dl className="space-y-2 text-xs">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Domain kasus</dt>
                  <dd className="font-bold text-slate-800 dark:text-slate-200 text-right">Prioritas restok barang</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Rentang data</dt>
                  <dd className="font-bold text-slate-800 dark:text-slate-200 text-right">
                    {d.periode.data_pertama ?? "-"} s.d. {d.periode.data_terakhir ?? "-"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Transaksi dianalisis</dt>
                  <dd className="font-bold text-slate-800 dark:text-slate-200 text-right">
                    {d.periode.transaksi_periode ?? 0} transaksi selesai
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Skor tertinggi / terendah</dt>
                  <dd className="font-bold text-slate-800 dark:text-slate-200 text-right font-mono">
                    {skor(d.ringkasan.skor_tertinggi)} / {skor(d.ringkasan.skor_terendah)}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      )}

      {/* ======================= TAB: SUMBER DATA ======================= */}
      {tab === "sumber" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Status Aktual Sumber Data</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Status diambil langsung dari database {`dbtugasmg`} melalui pemeriksaan tabel &amp; jumlah record aktual.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {d.sumber_data.map((s: DssSumberData) => {
              const st = STATUS_STYLE[s.status] ?? STATUS_STYLE.kosong;
              const ms = MODUL_STYLE[s.modul] ?? MODUL_STYLE.TPS;
              return (
                <div
                  key={s.modul}
                  className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${ms.bg} ${ms.text} ${ms.ring}`}>
                        <DatabaseIcon size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black text-slate-900 dark:text-slate-100">{s.modul}</p>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${st.box} ${st.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                            {st.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">{s.nama}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-black text-slate-900 dark:text-slate-100">{s.jumlah_record}</p>
                      <p className="text-[9px] text-slate-400 uppercase font-bold">record</p>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">{s.keterangan}</p>

                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                    <div className="flex justify-between gap-2 text-[11px]">
                      <span className="text-slate-500">Dipakai untuk</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300 text-right max-w-[62%]">
                        {s.dipakai_untuk}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2 text-[11px]">
                      <span className="text-slate-500">Tabel sumber</span>
                      <span className="font-mono text-[10px] text-slate-600 dark:text-slate-400 text-right">
                        {s.tabel.join(", ")}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2 text-[11px]">
                      <span className="text-slate-500">Terakhir update</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {s.terakhir_update ?? "Belum ada data"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-2">Catatan Transparansi Data</h4>
            <ul className="space-y-1 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              <li>• Seluruh nilai kriteria dihitung dari tabel existing; tidak ada data simulasi yang disajikan sebagai data riil.</li>
              <li>• Status <span className="font-bold">Sebagian</span> berarti sebagian tabel modul tersedia/berisi; DSS tetap menghitung dari tabel yang ada.</li>
              <li>• Bila periode tidak memiliki transaksi, DSS menampilkan peringatan validasi dan tidak mengarang nilai.</li>
              <li>• Riwayat keputusan menyimpan snapshot bobot, kriteria, skor, peringkat, dan waktu analisis.</li>
            </ul>
          </div>
        </div>
      )}

      {/* ======================= TAB: KRITERIA ======================= */}
      {tab === "kriteria" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Pengaturan Kriteria &amp; Bobot</h3>
                  <p className="text-xs text-slate-500">Ubah bobot lalu simulasikan atau simpan sebagai bobot aktif.</p>
                </div>
                <div
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border ${
                    bobotValid
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900"
                      : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-900"
                  }`}
                >
                  Total: {angka(totalBobot)}%
                </div>
              </div>

              <div className="space-y-4">
                {d.kriteria.map((k: DssKriteria) => (
                  <div
                    key={k.kode_kriteria}
                    className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center text-[11px] font-extrabold shrink-0">
                          {k.kode_kriteria}
                        </span>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{k.nama_kriteria}</p>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                k.jenis === "cost"
                                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                              }`}
                            >
                              {k.jenis}
                            </span>
                            <span className="text-[9px] text-slate-400 font-semibold uppercase">{k.satuan}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                            {k.deskripsi}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:shrink-0">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={bobotDraft[k.kode_kriteria] ?? 0}
                          disabled={!bolehUbah}
                          onChange={(e) =>
                            setBobotDraft((prev) => ({ ...prev, [k.kode_kriteria]: Number(e.target.value) }))
                          }
                          className="w-32 accent-slate-900 dark:accent-slate-100 disabled:opacity-50"
                        />
                        <div className="relative">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            value={bobotDraft[k.kode_kriteria] ?? 0}
                            disabled={!bolehUbah}
                            onChange={(e) =>
                              setBobotDraft((prev) => ({ ...prev, [k.kode_kriteria]: Number(e.target.value) }))
                            }
                            className="w-20 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 text-right disabled:opacity-60"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 pointer-events-none">
                            %
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="h-1.5 mt-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-slate-800 dark:bg-slate-300"
                        style={{ width: `${Math.min(100, bobotDraft[k.kode_kriteria] ?? 0)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {!bolehUbah && (
                <p className="mt-4 text-[11px] text-amber-700 dark:text-amber-400">
                  Peran Anda hanya dapat melihat konfigurasi. Perubahan bobot &amp; penyimpanan analisis dibatasi untuk
                  admin, owner, dan manager.
                </p>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <button
                  onClick={handleSimulasi}
                  disabled={simulating || !bolehUbah}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all disabled:opacity-50"
                >
                  <TrendingUpIcon size={14} />
                  {simulating ? "Menghitung..." : "Simulasikan Bobot"}
                </button>
                <button
                  onClick={handleSimpanBobot}
                  disabled={savingBobot || !bolehUbah || !bolehSimpanBobot || !bobotValid}
                  title={!bolehSimpanBobot ? "Hanya admin/owner yang dapat mengubah bobot aktif" : undefined}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 transition-all disabled:opacity-50"
                >
                  <SaveIcon size={14} />
                  {savingBobot ? "Menyimpan..." : "Simpan Bobot Aktif"}
                </button>
                <button
                  onClick={handleResetBobot}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  <RefreshIcon size={14} />
                  Reset
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">Jalankan &amp; Simpan Analisis</h4>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Judul analisis
                </label>
                <input
                  value={judulAnalisis}
                  onChange={(e) => setJudulAnalisis(e.target.value)}
                  disabled={!bolehUbah}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 disabled:opacity-60"
                />
                <p className="text-[10px] text-slate-400 mt-2">
                  Periode: <span className="font-bold text-slate-600 dark:text-slate-300">{d.periode.label}</span>
                </p>
                <button
                  onClick={handleAnalisis}
                  disabled={analyzing || !bolehUbah || !bobotValid}
                  className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all disabled:opacity-50"
                >
                  <BrainIcon size={14} />
                  {analyzing ? "Menghitung SAW..." : "Hitung & Simpan ke Riwayat"}
                </button>
                <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                  Hasil perhitungan disimpan lengkap: bobot, kriteria, matriks normalisasi, skor, peringkat, dan waktu
                  analisis.
                </p>
              </div>

              <div className="bg-slate-900 dark:bg-slate-900 rounded-3xl p-5 text-white border border-slate-800">
                <h4 className="text-sm font-bold mb-2">Aturan Perhitungan</h4>
                <div className="space-y-2 text-[11px] text-slate-300 leading-relaxed">
                  <p>
                    <span className="font-bold text-white">Benefit:</span> R<sub>ij</sub> = X<sub>ij</sub> / Max(X
                    <sub>j</sub>)
                  </p>
                  <p>
                    <span className="font-bold text-white">Cost:</span> R<sub>ij</sub> = Min(X<sub>j</sub>) / X
                    <sub>ij</sub>
                  </p>
                  <p>
                    <span className="font-bold text-white">Preferensi:</span> V<sub>i</sub> = Σ (W<sub>j</sub> × R
                    <sub>ij</sub>)
                  </p>
                  <p className="pt-2 border-t border-slate-700 text-slate-400">
                    Total bobot wajib 100%. Alternatif diurutkan menurun berdasarkan V<sub>i</sub>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================= TAB: HASIL ======================= */}
      {tab === "hasil" && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Hasil Perhitungan SAW</h3>
                <p className="text-xs text-slate-500">
                  {simulasi
                    ? "Menampilkan hasil simulasi bobot (belum disimpan ke riwayat)."
                    : "Menampilkan perhitungan live menggunakan bobot aktif tersimpan."}
                </p>
              </div>
              {simulasi && (
                <button
                  onClick={() => setSimulasi(null)}
                  className="px-3 py-1.5 rounded-xl text-[11px] font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Kembali ke bobot aktif
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                    <th className="px-3 py-2.5 text-left font-bold text-slate-500 text-[10px] uppercase">Rank</th>
                    <th className="px-3 py-2.5 text-left font-bold text-slate-500 text-[10px] uppercase">Alternatif</th>
                    {kriteriaTampil.map((k) => (
                      <th key={k.kode_kriteria} className="px-3 py-2.5 text-right font-bold text-slate-500 text-[10px] uppercase whitespace-nowrap">
                        {k.kode_kriteria}
                        <span className="block text-[9px] font-semibold normal-case text-slate-400">
                          {k.bobot}% {k.jenis}
                        </span>
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-right font-bold text-slate-500 text-[10px] uppercase">Skor (Vi)</th>
                  </tr>
                </thead>
                <tbody>
                  {hasilTampil.map((row) => (
                    <tr
                      key={row.kode_alternatif}
                      className={`border-b border-slate-100 dark:border-slate-800/60 ${
                        row.peringkat === 1 ? "bg-amber-50/60 dark:bg-amber-950/20" : ""
                      }`}
                    >
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-[10px] font-extrabold ${
                            row.peringkat === 1
                              ? "bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {row.peringkat}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="font-bold text-slate-800 dark:text-slate-200">{row.nama_alternatif}</p>
                        <p className="text-[10px] text-slate-400">
                          {row.kode_barang ?? row.kode_alternatif}
                          {row.kategori ? ` · ${row.kategori}` : ""}
                          {row.stok !== null && row.stok !== undefined ? ` · stok ${row.stok}` : ""}
                        </p>
                        {row.es_menandai && row.diagnosa_es && (
                          <p className="text-[10px] font-semibold text-violet-700 dark:text-violet-300">
                            Dilandasi Expert System {row.diagnosa_es.kode_kerusakan}
                            {row.diagnosa_es.persentase ? ` (${row.diagnosa_es.persentase})` : ""}
                          </p>
                        )}
                      </td>
                      {kriteriaTampil.map((k) => (
                        <td key={k.kode_kriteria} className="px-3 py-2.5 text-right">
                          <p className="font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            {angka(Number(row.nilai?.[k.kode_kriteria] ?? 0), k.satuan === "rupiah" ? 0 : 2)}
                          </p>
                          <p className="font-mono text-[9px] text-slate-400">
                            R={angka(Number(row.normalisasi?.[k.kode_kriteria] ?? 0), 3)}
                          </p>
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-right">
                        <span className="font-mono text-[12px] font-extrabold text-slate-900 dark:text-slate-100">
                          {skor(row.skor)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {hasilTampil.length === 0 && (
                    <tr>
                      <td colSpan={kriteriaTampil.length + 3} className="px-4 py-10 text-center text-slate-500">
                        Tidak ada alternatif pada periode ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Peringkat cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {hasilTampil.slice(0, 6).map((row) => (
              <div
                key={`card-${row.kode_alternatif}`}
                className={`rounded-2xl border p-4 ${
                  row.peringkat === 1
                    ? "border-indigo-200 dark:border-indigo-900 bg-indigo-50/60 dark:bg-indigo-950/30"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Peringkat {row.peringkat} · {row.kode_alternatif}
                    </p>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {row.es_menandai && (
                        <span className="mr-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300 align-middle">
                          ES
                        </span>
                      )}
                      {row.nama_alternatif}
                    </p>
                  </div>
                  <span className="text-sm font-black font-mono text-slate-900 dark:text-slate-100 shrink-0">
                    {skor(row.skor)}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed line-clamp-3">
                  {row.rekomendasi}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================= TAB: RIWAYAT ======================= */}
      {tab === "riwayat" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Riwayat Pengambilan Keputusan</h3>
              <p className="text-xs text-slate-500">
                Setiap analisis menyimpan snapshot bobot, kriteria, skor, peringkat, dan waktu analisis.
              </p>
            </div>

            {d.riwayat.length === 0 ? (
              <div className="p-10 text-center">
                <FileTextIcon size={28} className="mx-auto text-slate-300 dark:text-slate-600" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-2">Belum ada riwayat analisis</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Jalankan analisis pada tab Kriteria &amp; Bobot untuk menyimpan keputusan pertama.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                      <th className="px-4 py-2.5 text-left font-bold text-slate-500 text-[10px] uppercase">Kode</th>
                      <th className="px-4 py-2.5 text-left font-bold text-slate-500 text-[10px] uppercase">Judul</th>
                      <th className="px-4 py-2.5 text-left font-bold text-slate-500 text-[10px] uppercase">Alternatif Terbaik</th>
                      <th className="px-4 py-2.5 text-right font-bold text-slate-500 text-[10px] uppercase">Skor</th>
                      <th className="px-4 py-2.5 text-left font-bold text-slate-500 text-[10px] uppercase">Waktu</th>
                      <th className="px-4 py-2.5 text-right font-bold text-slate-500 text-[10px] uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.riwayat.map((r: DssRiwayatItem) => (
                      <tr key={r.id_analisis} className="border-b border-slate-100 dark:border-slate-800/60">
                        <td className="px-4 py-2.5 font-mono text-[10px] font-bold text-slate-600 dark:text-slate-300">
                          {r.kode_analisis}
                        </td>
                        <td className="px-4 py-2.5">
                          <p className="font-bold text-slate-800 dark:text-slate-200">{r.judul}</p>
                          <p className="text-[10px] text-slate-400">
                            {r.total_alternatif} alternatif · {r.total_kriteria} kriteria · oleh{" "}
                            {r.dianalisis_oleh ?? "sistem"}
                          </p>
                        </td>
                        <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{r.alternatif_terbaik ?? "-"}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                          {skor(r.skor_tertinggi)}
                        </td>
                        <td className="px-4 py-2.5 text-[10px] text-slate-500">{r.dibuat_pada ?? "-"}</td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            onClick={() => bukaDetailRiwayat(r)}
                            disabled={loadingDetail}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                          >
                            Detail
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DETAIL RIWAYAT */}
      {detailRiwayat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDetailRiwayat(null)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[88vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-5 py-4 flex items-start justify-between gap-3 z-10">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Detail Riwayat · {detailRiwayat.kode_analisis}
                </p>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100">{detailRiwayat.judul}</h3>
                <p className="text-[11px] text-slate-500">
                  {detailRiwayat.dibuat_pada} · oleh {detailRiwayat.dianalisis_oleh ?? "sistem"} · periode{" "}
                  {detailRiwayat.periode}
                </p>
              </div>
              <button
                onClick={() => setDetailRiwayat(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <CloseIcon size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Bobot snapshot */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Snapshot Kriteria &amp; Bobot
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {detailRiwayat.kriteria.map((k) => (
                    <div
                      key={k.kode_kriteria}
                      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-3 py-2 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
                          {k.kode_kriteria} · {k.nama_kriteria}
                        </p>
                        <p className="text-[9px] uppercase font-bold text-slate-400">
                          {k.jenis} {k.satuan ? `· ${k.satuan}` : ""}
                        </p>
                      </div>
                      <span className="text-xs font-black text-slate-900 dark:text-slate-100 shrink-0">{k.bobot}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hasil */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Hasil Perhitungan Tersimpan
                </p>
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/60">
                        <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-slate-500">Rank</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-slate-500">Alternatif</th>
                        {detailRiwayat.kriteria.map((k) => (
                          <th key={k.kode_kriteria} className="px-3 py-2 text-right text-[10px] font-bold uppercase text-slate-500">
                            {k.kode_kriteria}
                          </th>
                        ))}
                        <th className="px-3 py-2 text-right text-[10px] font-bold uppercase text-slate-500">Skor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailRiwayat.hasil.map((row) => (
                        <tr key={row.kode_alternatif} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="px-3 py-2 font-bold text-slate-600 dark:text-slate-300">{row.peringkat}</td>
                          <td className="px-3 py-2 text-slate-800 dark:text-slate-200 font-semibold">
                            {row.nama_alternatif}
                          </td>
                          {detailRiwayat.kriteria.map((k) => (
                            <td key={k.kode_kriteria} className="px-3 py-2 text-right font-mono text-[10px] text-slate-600 dark:text-slate-400">
                              {angka(Number(row.nilai?.[k.kode_kriteria] ?? 0), 2)}
                            </td>
                          ))}
                          <td className="px-3 py-2 text-right font-mono font-extrabold text-slate-900 dark:text-slate-100">
                            {skor(row.skor)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Rekomendasi teratas */}
              {detailRiwayat.hasil[0]?.rekomendasi && (
                <div className="rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/60 dark:bg-indigo-950/30 p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1">
                    Rekomendasi Tersimpan
                  </p>
                  <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                    {detailRiwayat.hasil[0].rekomendasi}
                  </p>
                </div>
              )}

              {detailRiwayat.peringatan.length > 0 && (
                <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1">
                    Peringatan Saat Analisis
                  </p>
                  <ul className="space-y-0.5">
                    {detailRiwayat.peringatan.map((w, i) => (
                      <li key={i} className="text-[10px] text-amber-700 dark:text-amber-300">
                        • {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
