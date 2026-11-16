import { useState, useEffect, useCallback, useMemo } from "react";
import {
  misApi,
  authStorage,
} from "../../services/api";
import type {
  MISExecutiveData,
  SopDocumentItem,
} from "../../services/api";
import {
  BriefcaseIcon,
  TrendingUpIcon,
  ClockIcon,
  BookOpenIcon,
  LayersIcon,
  CheckCircleIcon,
  DownloadIcon,
  RefreshIcon,
  CloseIcon,
  SearchIcon,
  PrinterIcon,
  BuildingIcon,
} from "../../components/Icons";

const rupiah = (n: number) => "Rp " + Math.floor(n).toLocaleString("id-ID");

type TabType = "overview" | "tps" | "oas" | "kms";
type PeriodeType = "hari_ini" | "7_hari" | "30_hari" | "kuartal";

export default function MisManager() {
  const [data, setData] = useState<MISExecutiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabType>("overview");
  const [periode, setPeriode] = useState<PeriodeType>("30_hari");
  const [lastRefreshed, setLastRefreshed] = useState<string>("");
  
  // Interactive Modal States
  const [selectedSop, setSelectedSop] = useState<SopDocumentItem | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [kbSearchQuery, setKbSearchQuery] = useState("");
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [processingPrId, setProcessingPrId] = useState<string | null>(null);

  const currentUser = authStorage.getUser();
  const bolehDisposisi = authStorage.getAkses().mis;

  const fetchData = useCallback(async (selectedPeriode: PeriodeType) => {
    setLoading(true);
    try {
      const res = await misApi.getExecutiveData(selectedPeriode);
      setData(res);
      setLastRefreshed(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch (err) {
      console.error("Gagal mengambil data MIS:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(periode);
    // Auto-refresh real-time data every 20 seconds
    const interval = setInterval(() => {
      fetchData(periode);
    }, 20000);
    return () => clearInterval(interval);
  }, [fetchData, periode]);

  const handleApprovePR = async (id_pr: string) => {
    setProcessingPrId(id_pr);
    try {
      await misApi.approveRequisition(id_pr, "Disetujui oleh Manager Operasional secara langsung di Dashboard MIS.");
      setActionSuccessMsg(`Disposisi ${id_pr} berhasil disetujui! Status diperbarui ke departemen logistik.`);
      setTimeout(() => setActionSuccessMsg(null), 5000);
      await fetchData(periode);
    } catch {
      alert("Gagal menyetujui pengajuan");
    } finally {
      setProcessingPrId(null);
    }
  };

  const handleRejectPR = async (id_pr: string) => {
    const alasan = prompt("Masukkan alasan penolakan disposisi:", "Anggaran dialokasikan untuk prioritas mendesak lain");
    if (!alasan) return;
    setProcessingPrId(id_pr);
    try {
      await misApi.rejectRequisition(id_pr, alasan);
      setActionSuccessMsg(`Disposisi ${id_pr} ditolak dengan catatan manajerial.`);
      setTimeout(() => setActionSuccessMsg(null), 5000);
      await fetchData(periode);
    } catch {
      alert("Gagal menolak pengajuan");
    } finally {
      setProcessingPrId(null);
    }
  };

  // Filtered Knowledge Base Articles
  const filteredKbArticles = useMemo(() => {
    if (!data?.kms.knowledge_base_articles) return [];
    if (!kbSearchQuery.trim()) return data.kms.knowledge_base_articles;
    const q = kbSearchQuery.toLowerCase();
    return data.kms.knowledge_base_articles.filter(
      (a) =>
        a.topik.toLowerCase().includes(q) ||
        a.kategori.toLowerCase().includes(q) ||
        a.ringkasan_solusi.toLowerCase().includes(q)
    );
  }, [data?.kms.knowledge_base_articles, kbSearchQuery]);

  if (loading && !data) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3 min-h-[500px]">
        <svg className="animate-spin text-slate-700 dark:text-slate-300" width="40" height="40" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="25 12" />
        </svg>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Mengagregasi Data Multi-Sistem (TPS, OAS, KMS)...</p>
        <p className="text-xs text-slate-400">Menghubungkan metrik transaksi, alur kerja administrasi, dan kepatuhan SOP</p>
      </div>
    );
  }

  const { tps, oas, kms, overall_health_score, tps_subscore, oas_subscore, kms_subscore, insights } = data!;

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto pb-16" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Toast Notification for Manager Action */}
      {actionSuccessMsg && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-2xl shadow-2xl border flex items-center gap-3 bg-emerald-900 text-white border-emerald-700 animate-slide-in">
          <CheckCircleIcon size={20} className="text-emerald-300 shrink-0" />
          <span className="text-xs font-semibold">{actionSuccessMsg}</span>
          <button onClick={() => setActionSuccessMsg(null)} className="ml-2 hover:opacity-75">
            <CloseIcon size={14} />
          </button>
        </div>
      )}

      {/* TOP HEADER & CONTROL BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 text-white flex items-center justify-center shadow-md border border-slate-700">
            <BriefcaseIcon size={24} className="text-slate-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">
                Pusat Kendali MIS Manager
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-900 uppercase tracking-wider">
                Tri-System Integrated
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Dashboard Eksekutif Terpadu: Mengintegrasikan Database <span className="font-semibold text-slate-700 dark:text-slate-300">TPS</span>, <span className="font-semibold text-slate-700 dark:text-slate-300">OAS</span>, dan <span className="font-semibold text-slate-700 dark:text-slate-300">KMS</span>
            </p>
          </div>
        </div>

        {/* Controls: Period Selector & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Period selector */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
            {(
              [
                { id: "hari_ini", label: "Hari Ini" },
                { id: "7_hari", label: "7 Hari" },
                { id: "30_hari", label: "30 Hari" },
                { id: "kuartal", label: "Kuartal Q3" },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriode(p.id)}
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

          {/* Refresh button */}
          <button
            onClick={() => fetchData(periode)}
            title={`Terakhir diperbarui: ${lastRefreshed}`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all shadow-sm"
          >
            <RefreshIcon size={14} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Sinkronisasi</span>
          </button>

          {/* Export Report button */}
          <button
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 transition-all shadow-sm active:scale-95"
          >
            <DownloadIcon size={14} />
            <span>Cetak Laporan MIS</span>
          </button>
        </div>
      </div>

      {/* EXECUTIVE SUMMARY / BALANCED SCORECARD BENTO */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Pilar 0: Overall Corporate Health Score */}
        <div className="rounded-3xl p-6 bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 text-white border border-slate-800 shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10 pointer-events-none">
            <BuildingIcon size={160} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Index Kesehatan Bisnis (MIS)
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                STATUS PRIMA
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black tracking-tight text-white">{overall_health_score}</span>
              <span className="text-slate-400 text-sm font-semibold">/ 100</span>
            </div>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Agregasi performa multi-sistem perusahaan berkinerja di atas target kuartalan.
            </p>
          </div>

          {/* Tri-System Mini Progress */}
          <div className="space-y-2 mt-6 pt-4 border-t border-slate-800/80">
            <div>
              <div className="flex justify-between text-[11px] font-semibold text-slate-300 mb-1">
                <span>TPS (Finansial & Transaksi)</span>
                <span className="font-bold text-white">{tps_subscore}%</span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${tps_subscore}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[11px] font-semibold text-slate-300 mb-1">
                <span>OAS (Administrasi & SDM)</span>
                <span className="font-bold text-white">{oas_subscore}%</span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${oas_subscore}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[11px] font-semibold text-slate-300 mb-1">
                <span>KMS (SOP & Pengetahuan)</span>
                <span className="font-bold text-white">{kms_subscore}%</span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${kms_subscore}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Pilar 1: TPS Quick Metric */}
        <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-blue-400 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Pilar TPS (Transaksi)
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <TrendingUpIcon size={16} />
              </div>
            </div>
            <p className="text-xs text-slate-400 font-medium">Penjualan Hari Ini (Live)</p>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
              {rupiah(tps.penjualan_hari_ini)}
            </p>
            <div className="flex items-center gap-2 mt-2 text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Bulan Ini: {rupiah(tps.penjualan_bulan_ini)}
              </span>
              <span className="text-slate-400">• {tps.transaksi_hari_ini} transaksi</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
            <span>Aset Inventori: {rupiah(tps.nilai_aset_inventori)}</span>
            <span className="font-bold text-rose-600 dark:text-rose-400">
              {tps.stok_kritis_count} Stok Kritis
            </span>
          </div>
        </div>

        {/* Pilar 2: OAS Quick Metric */}
        <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-emerald-400 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Pilar OAS (Administrasi)
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <ClockIcon size={16} />
              </div>
            </div>
            <p className="text-xs text-slate-400 font-medium">Tingkat Kehadiran Shift</p>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
              {oas.kehadiran_hari_ini_persen}%
            </p>
            <div className="flex items-center gap-2 mt-2 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {oas.staf_tepat_waktu} Tepat Waktu
              </span>
              <span className="text-slate-400">• {oas.staf_terlambat} Terlambat</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-500">Disposisi PR Pending:</span>
            <span className={`px-2 py-0.5 rounded-full font-bold ${oas.pending_approval_count > 0 ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" : "bg-slate-100 text-slate-700"}`}>
              {oas.pending_approval_count} Butuh Approval
            </span>
          </div>
        </div>

        {/* Pilar 3: KMS Quick Metric */}
        <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-amber-400 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Pilar KMS (Pengetahuan)
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <BookOpenIcon size={16} />
              </div>
            </div>
            <p className="text-xs text-slate-400 font-medium">Kepatuhan Audit SOP</p>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
              {kms.sop_compliance_rate}%
            </p>
            <div className="flex items-center gap-2 mt-2 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {kms.total_sop_aktif} SOP Aktif
              </span>
              <span className="text-slate-400">• FCR: {kms.first_contact_resolution_rate}%</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
            <span>Kompetensi SDM:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              Skor {kms.rata_rata_kompetensi}/100
            </span>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS (Overview, TPS, OAS, KMS) */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        {(
          [
            { id: "overview", label: "Ringkasan Eksekutif (Tri-System)", icon: LayersIcon },
            { id: "tps", label: "Kinerja TPS (Transaksi & Finansial)", icon: TrendingUpIcon },
            { id: "oas", label: "Kinerja OAS (Administrasi & Shift)", icon: ClockIcon },
            { id: "kms", label: "Kinerja KMS (SOP, Audit & Pelatihan)", icon: BookOpenIcon },
          ] as const
        ).map((t) => {
          const IconComp = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
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

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW / TRI-SYSTEM INTEGRATION                                  */}
      {/* ========================================================================= */}
      {tab === "overview" && (
        <div className="space-y-6">
          {/* Executive Multi-System Insights (Cross correlations) */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>Rekomendasi Keputusan Manajerial (Cross-System Intelligence)</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                </h3>
                <p className="text-xs text-slate-500">
                  Korelasi cerdas lintas database (TPS, OAS, dan KMS) untuk mendukung pengambilan keputusan strategis Manager.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {insights.map((ins) => {
                const isKritis = ins.tingkat_urgensi === "kritis";
                const isWaspada = ins.tingkat_urgensi === "waspada";

                return (
                  <div
                    key={ins.id}
                    className={`rounded-2xl p-5 border flex flex-col justify-between transition-all hover:shadow-md ${
                      isKritis
                        ? "bg-red-50/60 dark:bg-red-950/20 border-red-200 dark:border-red-900/60"
                        : isWaspada
                        ? "bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60"
                        : "bg-blue-50/60 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/60"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 shadow-2xs border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                          {ins.pilar_sumber}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            isKritis
                              ? "bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300"
                              : isWaspada
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300"
                          }`}
                        >
                          {ins.tingkat_urgensi}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug mb-1.5">
                        {ins.judul}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                        {ins.deskripsi}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/80 space-y-1.5">
                      <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                        <span className="font-bold text-slate-500">Tindakan:</span> {ins.rekomendasi_tindakan}
                      </p>
                      <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                        ✓ Dampak: {ins.estimasi_dampak}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tri-System Data Architecture Card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* TPS Module Summary */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  TPS
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Transaction Processing</h4>
                  <p className="text-[11px] text-slate-400">Database Penjualan & POS Harian</p>
                </div>
              </div>
              <ul className="text-xs space-y-2 text-slate-600 dark:text-slate-300">
                <li className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span>Volume Transaksi Hari Ini:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{tps.transaksi_hari_ini} struk</span>
                </li>
                <li className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span>Kecepatan Kasir Rata-rata:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{tps.kecepatan_kasir_detik} detik / trx</span>
                </li>
                <li className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span>Metode Pembayaran Dominan:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {tps.metode_pembayaran?.[0] ? `${tps.metode_pembayaran[0].metode} (${tps.metode_pembayaran[0].persentase}%)` : "QRIS (49%)"}
                  </span>
                </li>
                <li className="flex justify-between py-1">
                  <span>Perputaran Inventori (Turnover):</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{tps.turnover_ratio}x per tahun</span>
                </li>
              </ul>
              <button
                onClick={() => setTab("tps")}
                className="w-full py-2 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-all text-center"
              >
                Eksplorasi Detail TPS →
              </button>
            </div>

            {/* OAS Module Summary */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  OAS
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Office Automation</h4>
                  <p className="text-[11px] text-slate-400">Sistem Administrasi & Alur Dokumen</p>
                </div>
              </div>
              <ul className="text-xs space-y-2 text-slate-600 dark:text-slate-300">
                <li className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span>Kehadiran Staf Hari Ini:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{oas.kehadiran_hari_ini_persen}% (16/18 hadir)</span>
                </li>
                <li className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span>Disposisi PR Menunggu Review:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{oas.pending_approval_count} pengajuan</span>
                </li>
                <li className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span>Dokumen Digital Diproses:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{oas.dokumen_digital_diproses} dokumen</span>
                </li>
                <li className="flex justify-between py-1">
                  <span>Penyelesaian Task SLA:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{oas.task_sla_completion_rate}% tepat waktu</span>
                </li>
              </ul>
              <button
                onClick={() => setTab("oas")}
                className="w-full py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-all text-center"
              >
                Eksplorasi Detail OAS →
              </button>
            </div>

            {/* KMS Module Summary */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  KMS
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Knowledge Management</h4>
                  <p className="text-[11px] text-slate-400">Repositori SOP & Modal Pengetahuan</p>
                </div>
              </div>
              <ul className="text-xs space-y-2 text-slate-600 dark:text-slate-300">
                <li className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span>Rata-rata Kepatuhan SOP:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{kms.sop_compliance_rate}% compliance</span>
                </li>
                <li className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span>First-Contact Resolution (FCR):</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{kms.first_contact_resolution_rate}% mandiri</span>
                </li>
                <li className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span>Penyelesaian Modul Pelatihan:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{kms.pelatihan_completion_rate}% peserta</span>
                </li>
                <li className="flex justify-between py-1">
                  <span>Rata-rata Skor Kompetensi:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{kms.rata_rata_kompetensi} / 100</span>
                </li>
              </ul>
              <button
                onClick={() => setTab("kms")}
                className="w-full py-2 rounded-xl text-xs font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-all text-center"
              >
                Eksplorasi Detail KMS →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TPS PERFORMANCE (TRANSACTION PROCESSING SYSTEM)                   */}
      {/* ========================================================================= */}
      {tab === "tps" && (
        <div className="space-y-6">
          {/* Financial Summary Bento */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-2xl p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Penjualan Hari Ini (Live)</span>
              <p className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">{rupiah(tps.penjualan_hari_ini)}</p>
              <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1">
                <span>{tps.transaksi_hari_ini} transaksi tercatat</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">Bulan Ini: {rupiah(tps.penjualan_bulan_ini)}</span>
              </div>
            </div>
            <div className="rounded-2xl p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Pengadaan / Restok</span>
              <p className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">{rupiah(tps.pembelian_bulan_ini)}</p>
              <p className="text-[11px] text-slate-400 mt-1">Total Biaya Pengadaan Bulan Ini</p>
            </div>
            <div className="rounded-2xl p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Stok Kritis / Menipis</span>
              <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">{tps.stok_kritis_count} item</p>
              <p className="text-[11px] text-slate-400 mt-1">Di Bawah Batas Buffer Minimum</p>
            </div>
            <div className="rounded-2xl p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Total Akumulasi Omset</span>
              <p className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">{rupiah(tps.total_omset_all_time || 15185000)}</p>
              <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                {tps.total_transaksi_all_time || 30} transaksi • Nilai Aset: {rupiah(tps.nilai_aset_inventori)}
              </p>
            </div>
          </div>

          {/* Sales Chart & Payment Methods */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Daily Trend Chart */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Tren Omset Harian vs Target Manajerial</h3>
                  <p className="text-xs text-slate-400">Pencatatan real-time dari seluruh register kasir operasional</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-800 dark:bg-slate-200" /> Realisasi
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" /> Target
                  </span>
                </div>
              </div>

              {/* Bar visualization */}
              <div className="h-56 flex items-end gap-3 pt-6 pb-2 px-2 border-b border-slate-100 dark:border-slate-800">
                {tps.tren_penjualan_harian.map((item) => {
                  const maxVal = Math.max(...tps.tren_penjualan_harian.map((c) => c.omset), 10000);
                  const heightPct = item.omset > 0 ? Math.min(100, Math.max(8, (item.omset / maxVal) * 100)) : 4;
                  const targetPct = item.target > 0 && maxVal > 10000 ? Math.min(100, (item.target / maxVal) * 100) : 0;

                  return (
                    <div key={item.tanggal} className="flex-1 flex flex-col items-center gap-2 group relative">
                      <div className="w-full flex items-end justify-center gap-1 h-44 relative">
                        {/* Target line indicator */}
                        <div
                          className="absolute w-full border-t-2 border-dashed border-slate-300 dark:border-slate-700 z-10 pointer-events-none"
                          style={{ bottom: `${targetPct}%` }}
                        />
                        {/* Realisasi bar */}
                        <div
                          className="w-full max-w-[32px] rounded-t-xl bg-gradient-to-t from-slate-800 to-slate-600 dark:from-slate-400 dark:to-slate-200 transition-all group-hover:opacity-90 relative"
                          style={{ height: `${heightPct}%` }}
                        >
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-20">
                            {rupiah(item.omset)}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">{item.hari}</span>
                      <span className="text-[9px] text-slate-400">{item.transaksi} trx</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Payment Method Distribution */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">Distribusi Metode Pembayaran</h3>
                <p className="text-xs text-slate-400 mb-4">Proporsi nilai transaksi kasir</p>

                <div className="space-y-3.5">
                  {tps.metode_pembayaran.map((m) => (
                    <div key={m.metode} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{m.metode}</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {m.persentase}% <span className="font-normal text-slate-400">({rupiah(m.nominal)})</span>
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${m.persentase}%`, backgroundColor: m.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                <span className="font-bold text-blue-600 dark:text-blue-400">Insight Manajerial:</span> Transaksi non-tunai (QRIS, Transfer, Debit) mendominasi penjualan di kasir. Pertahankan efisiensi verifikasi pembayaran digital.
              </div>
            </div>
          </div>

          {/* Cashier Performance Table & Top Pareto Products */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cashier Performance Evaluation */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Evaluasi Produktivitas Kasir</h3>
                  <p className="text-xs text-slate-400">Performa register kasir, omset, dan akurasi</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-left">
                      <th className="pb-2 font-semibold">Kasir</th>
                      <th className="pb-2 font-semibold">Total Trx</th>
                      <th className="pb-2 font-semibold">Total Omset</th>
                      <th className="pb-2 font-semibold">Akurasi</th>
                      <th className="pb-2 font-semibold">Kecepatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {tps.performa_kasir.map((k) => (
                      <tr key={k.id_kasir} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 font-bold text-slate-800 dark:text-slate-200">
                          {k.nama}
                          <span className={`ml-2 inline-block w-1.5 h-1.5 rounded-full ${k.status === 'aktif' ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                        </td>
                        <td className="py-2.5 text-slate-600 dark:text-slate-300">{k.total_transaksi} trx</td>
                        <td className="py-2.5 font-bold text-slate-900 dark:text-slate-100">{rupiah(k.total_omset)}</td>
                        <td className="py-2.5 font-semibold text-emerald-600 dark:text-emerald-400">{k.akurasi_persen}%</td>
                        <td className="py-2.5 text-slate-500">{k.kecepatan_transaksi}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pareto Products (80/20 Rule) */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Produk Pareto (Kontributor Utama Omset)</h3>
                  <p className="text-xs text-slate-400">Top 5 SKU penyumbang penjualan terbesar</p>
                </div>
              </div>

              <div className="space-y-3">
                {tps.produk_pareto.map((p, idx) => (
                  <div key={p.id_barang} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 dark:text-slate-100 truncate">{p.nama_barang}</p>
                        <p className="text-[11px] text-slate-400">
                          {p.kategori} • {p.terjual} unit terjual • <span className={p.stok_sisa <= 15 ? "text-amber-600 font-bold" : "text-slate-500"}>Sisa Stok: {p.stok_sisa}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-extrabold text-slate-900 dark:text-slate-100">{rupiah(p.revenue)}</p>
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                        {p.persen_kontribusi}% omset
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: OAS WORKFLOW (OFFICE AUTOMATION SYSTEM)                             */}
      {/* ========================================================================= */}
      {tab === "oas" && (
        <div className="space-y-6">
          {/* Purchase Requisitions Approval Workflow */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>Disposisi Persetujuan Pengadaan Barang (Purchase Requisition)</span>
                  {oas.pending_approval_count > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      {oas.pending_approval_count} Membutuhkan Persetujuan Manager
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400">
                  Otorisasi langsung Manager untuk pengadaan inventori dari staf logistik ke supplier.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {oas.purchase_requisitions.map((pr) => {
                const isPending = pr.status === "menunggu_approval";
                const isApproved = pr.status === "disetujui";
                const isProcessing = processingPrId === pr.id_pr;

                return (
                  <div
                    key={pr.id_pr}
                    className={`p-4 rounded-2xl border transition-all ${
                      isPending
                        ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800"
                        : isApproved
                        ? "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700"
                        : "bg-red-50/30 dark:bg-red-950/20 border-red-200 dark:border-red-900"
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-xs font-black text-slate-800 dark:text-slate-100">
                          {pr.id_pr}
                        </span>
                        <span className="text-[11px] text-slate-400">• {pr.tanggal}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            pr.urgensi === "tinggi"
                              ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          Urgensi: {pr.urgensi}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                            isPending
                              ? "bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200"
                              : isApproved
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                          }`}
                        >
                          {pr.status.replace("_", " ")}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                          {rupiah(pr.total_estimasi)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-slate-600 dark:text-slate-300 mb-3">
                      <div>
                        <span className="text-slate-400">Pemohon: </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{pr.pemohon}</span> ({pr.departemen})
                      </div>
                      <div>
                        <span className="text-slate-400">Supplier: </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{pr.supplier}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Rincian Barang: </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{pr.items_summary}</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 text-xs border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                      <span className="font-semibold text-slate-500">Alasan Kebutuhan:</span> {pr.alasan}
                      {pr.catatan_approval && (
                        <p className="mt-1 pt-1 border-t border-slate-100 dark:border-slate-800 text-slate-500 italic">
                          Catatan Manager ({pr.waktu_respon}): {pr.catatan_approval}
                        </p>
                      )}
                    </div>

                    {/* Interactive Action Buttons for Manager */}
                    {isPending && bolehDisposisi && (
                      <div className="flex items-center justify-end gap-2.5 mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800">
                        <button
                          onClick={() => handleRejectPR(pr.id_pr)}
                          disabled={isProcessing}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900 transition-all disabled:opacity-50"
                        >
                          Tolak Disposisi
                        </button>
                        <button
                          onClick={() => handleApprovePR(pr.id_pr)}
                          disabled={isProcessing}
                          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all disabled:opacity-50"
                        >
                          <CheckCircleIcon size={14} />
                          <span>{isProcessing ? "Memproses..." : "Setujui Pengadaan (Approve)"}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Shift Monitoring & Internal Memo */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Shift & Staff Attendance Table */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Monitoring Shift & Kehadiran Staf</h3>
                  <p className="text-xs text-slate-400">Pencatatan check-in mesin absensi biometrik toko</p>
                </div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full">
                  {oas.kehadiran_hari_ini_persen}% Hadir
                </span>
              </div>

              <div className="space-y-2">
                {oas.shift_monitoring.map((s) => (
                  <div key={s.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200">{s.nama}</p>
                      <p className="text-[11px] text-slate-400">
                        {s.role} • {s.shift} • {s.lokasi_posisi}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                          s.status === "tepat_waktu"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : s.status === "terlambat"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                        }`}
                      >
                        {s.status.replace("_", " ")} ({s.jam_hadir})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Internal Memos & Operational Circulars */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Memo Internal & Instruksi Manajerial</h3>
                    <p className="text-xs text-slate-400">Penyebaran instruksi kerja resmi ke seluruh staf toko</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {oas.memo_internal.map((memo) => (
                    <div key={memo.id_memo} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">{memo.id_memo}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 uppercase">
                          {memo.prioritas}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">{memo.judul}</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{memo.ringkasan}</p>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-200/50 dark:border-slate-800">
                        <span>Audiens: {memo.target_audiens}</span>
                        <span className="font-semibold text-emerald-600">Dibaca {memo.status_baca_persen}% Staf</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 flex justify-between items-center">
                <span>Total Dokumen Digital Diproses: <b>{oas.dokumen_digital_diproses}</b></span>
                <span className="font-bold text-emerald-600">SLA Dokumen: {oas.task_sla_completion_rate}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: KMS KNOWLEDGE & QUALITY (KNOWLEDGE MANAGEMENT SYSTEM)              */}
      {/* ========================================================================= */}
      {tab === "kms" && (
        <div className="space-y-6">
          {/* SOP Repository & Compliance Audit Grid */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Repositori Dokumen SOP & Kepatuhan Audit Operasional
                </h3>
                <p className="text-xs text-slate-400">
                  Standard Operating Procedures resmi dan persentase kepatuhan staf pada saat audit berkala
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                  Rata-rata Kepatuhan: {kms.sop_compliance_rate}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {kms.sop_list.map((sop) => (
                <div
                  key={sop.kode_sop}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col justify-between hover:border-slate-400 transition-all cursor-pointer"
                  onClick={() => setSelectedSop(sop)}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md font-mono text-[11px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                          {sop.kode_sop}
                        </span>
                        <span className="text-[11px] text-slate-400">{sop.versi}</span>
                      </div>
                      <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400">
                        {sop.skor_kepatuhan_persen}% Audit
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-1 leading-snug">
                      {sop.judul}
                    </h4>
                    <p className="text-[11px] text-slate-500 mb-3">
                      Divisi: <span className="font-semibold text-slate-700 dark:text-slate-300">{sop.divisi}</span> • PJ: {sop.penanggung_jawab}
                    </p>

                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tahapan Kunci Prosedur:</p>
                      <ul className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1 pl-4 list-disc">
                        {sop.ringkasan_prosedur.slice(0, 3).map((item, idx) => (
                          <li key={idx} className="truncate">{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                    <span>Audit Terakhir: {sop.terakhir_audit}</span>
                    <span className="text-blue-600 dark:text-blue-400 font-bold hover:underline">
                      Lihat Dokumen SOP Lengkap →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Training Modules & Knowledge Base Articles */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Training Modules for Staff */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Modul Pelatihan & Sertifikasi Staf</h3>
                  <p className="text-xs text-slate-400">Pengembangan kompetensi kasir & logistik</p>
                </div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full">
                  {kms.pelatihan_completion_rate}% Selesai
                </span>
              </div>

              <div className="space-y-3">
                {kms.modul_pelatihan.map((modul) => (
                  <div key={modul.id_modul} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-slate-100">{modul.judul_modul}</p>
                        <p className="text-[11px] text-slate-400">{modul.kategori} • Standar Kelulusan: {modul.passing_grade}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-slate-900 dark:text-slate-100">Skor: {modul.rata_rata_skor}</span>
                        <p className="text-[10px] text-slate-400">{modul.peserta_selesai}/{modul.total_target_peserta} staf</p>
                      </div>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${(modul.peserta_selesai / modul.total_target_peserta) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Knowledge Base & Troubleshooting Search */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Basis Pengetahuan & Panduan Insiden (KB)</h3>
                    <p className="text-xs text-slate-400">Solusi mandiri kasir (First-Contact Resolution: {kms.first_contact_resolution_rate}%)</p>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative mb-3">
                  <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={kbSearchQuery}
                    onChange={(e) => setKbSearchQuery(e.target.value)}
                    placeholder="Cari solusi kendala (cth: QRIS time-out, barcode rusak)..."
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:border-slate-400"
                  />
                </div>

                {/* Articles List */}
                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {filteredKbArticles.map((art) => (
                    <div key={art.id_artikel} className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold text-blue-600 dark:text-blue-400">{art.id_artikel}</span>
                        <span className="text-[10px] text-slate-400">Rating: ⭐ {art.rating_kegunaan} ({art.pembaca_bulan_ini} pembaca)</span>
                      </div>
                      <p className="font-bold text-slate-800 dark:text-slate-100">{art.topik}</p>
                      <p className="text-[11px] text-slate-500 leading-snug">{art.ringkasan_solusi}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Popular FAQs */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Kata Kunci Kendala Terbanyak:</p>
                <div className="flex flex-wrap gap-1.5">
                  {kms.pencarian_faq_terpopuler.map((f) => (
                    <button
                      key={f.kata_kunci}
                      onClick={() => setKbSearchQuery(f.kata_kunci)}
                      className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                    >
                      {f.kata_kunci} ({f.hits}x)
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: DETAIL SOP VIEWER                                               */}
      {/* ========================================================================= */}
      {selectedSop && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                  {selectedSop.kode_sop} • {selectedSop.versi}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {selectedSop.judul}
                </h3>
              </div>
              <button
                onClick={() => setSelectedSop(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1"
              >
                <CloseIcon size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <span className="text-slate-400 block text-[10px]">Divisi Bertanggung Jawab:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedSop.divisi}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Penanggung Jawab (PIC):</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedSop.penanggung_jawab}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Skor Kepatuhan Audit:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{selectedSop.skor_kepatuhan_persen}% Compliance</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Audit Terakhir:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedSop.terakhir_audit}</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">
                  Langkah-Langkah Prosedur Baku:
                </h4>
                <ol className="space-y-2 pl-4 list-decimal text-slate-700 dark:text-slate-300 leading-relaxed">
                  {selectedSop.ringkasan_prosedur.map((step, idx) => (
                    <li key={idx} className="pl-1">
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedSop(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
              >
                Tutup Dokumen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: PRINT / EXPORT EXECUTIVE MIS REPORT                             */}
      {/* ========================================================================= */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Header / Kop Laporan Eksekutif */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 dark:border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
                  <BuildingIcon size={20} />
                </div>
                <div>
                  <h2 className="text-base font-black tracking-tight text-slate-900 dark:text-slate-100 uppercase">
                    KasirPro Retail Enterprise
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Laporan Eksekutif Sistem Informasi Manajemen (MIS) • Periode: {periode.replace('_', ' ').toUpperCase()}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-slate-700">
                <CloseIcon size={18} />
              </button>
            </div>

            {/* Content summary for print */}
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-slate-800 dark:text-slate-200">Index Kesehatan Perusahaan (Balanced Index):</span>
                  <span className="font-black text-sm text-slate-900 dark:text-slate-100">{overall_health_score} / 100 (Status: PRIMA)</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                  <div>TPS Subscore: <b>{tps_subscore}%</b></div>
                  <div>OAS Subscore: <b>{oas_subscore}%</b></div>
                  <div>KMS Subscore: <b>{kms_subscore}%</b></div>
                </div>
              </div>

              {/* TPS Summary Section */}
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-1 mb-2">
                  1. Ringkasan Kinerja TPS (Transaction Processing System)
                </h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-slate-700 dark:text-slate-300">
                  <div>• Total Omset Penjualan: <b>{rupiah(tps.penjualan_bulan_ini)}</b></div>
                  <div>• Total Biaya Pengadaan: <b>{rupiah(tps.pembelian_bulan_ini)}</b></div>
                  <div>• Laba Kotor (Gross Profit): <b>{rupiah(tps.laba_kotor_bulan_ini)} ({tps.margin_laba_persen}%)</b></div>
                  <div>• Rata-rata Nilai Transaksi (AOV): <b>{rupiah(tps.rata_rata_transaksi)}</b></div>
                  <div>• Kecepatan Rata-rata Checkout: <b>{tps.kecepatan_kasir_detik} detik / transaksi</b></div>
                  <div>• Total SKU Aktif / Stok Kritis: <b>{tps.total_sku_aktif} SKU ({tps.stok_kritis_count} menipis)</b></div>
                </div>
              </div>

              {/* OAS Summary Section */}
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-1 mb-2">
                  2. Ringkasan Kinerja OAS (Office Automation System)
                </h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-slate-700 dark:text-slate-300">
                  <div>• Tingkat Kehadiran Shift Toko: <b>{oas.kehadiran_hari_ini_persen}%</b></div>
                  <div>• Staf Tepat Waktu / Terlambat: <b>{oas.staf_tepat_waktu} tepat waktu / {oas.staf_terlambat} terlambat</b></div>
                  <div>• Dokumen Digital Diproses: <b>{oas.dokumen_digital_diproses} dokumen</b></div>
                  <div>• Penyelesaian Task SLA Administrasi: <b>{oas.task_sla_completion_rate}% tepat waktu</b></div>
                  <div>• Disposisi Pengadaan (PR) Disetujui: <b>{rupiah(oas.total_pengeluaran_disetujui)}</b></div>
                  <div>• Pengajuan PR Menunggu Approval: <b>{oas.pending_approval_count} dokumen</b></div>
                </div>
              </div>

              {/* KMS Summary Section */}
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-1 mb-2">
                  3. Ringkasan Kinerja KMS (Knowledge Management System)
                </h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-slate-700 dark:text-slate-300">
                  <div>• Rata-rata Kepatuhan Audit SOP: <b>{kms.sop_compliance_rate}% compliance</b></div>
                  <div>• First-Contact Resolution (FCR): <b>{kms.first_contact_resolution_rate}% masalah selesai mandiri</b></div>
                  <div>• Rasio Penyelesaian Training Staf: <b>{kms.pelatihan_completion_rate}% peserta tuntas</b></div>
                  <div>• Rata-rata Skor Kompetensi SDM: <b>{kms.rata_rata_kompetensi} / 100</b></div>
                </div>
              </div>

              {/* Signoff footer */}
              <div className="pt-6 flex justify-between items-end border-t border-slate-200 dark:border-slate-800">
                <div className="text-[11px] text-slate-400">
                  <p>Dokumen ini dihasilkan secara otomatis oleh sistem KasirPro MIS.</p>
                  <p>Waktu Unduh: {new Date().toLocaleString("id-ID")}</p>
                </div>
                <div className="text-center min-w-[160px]">
                  <p className="text-[11px] text-slate-400 mb-8">Disahkan oleh Manager Operasional,</p>
                  <p className="font-bold text-slate-900 dark:text-slate-100 underline">
                    {currentUser?.nama || "Drs. Hendra Pratama, M.M."}
                  </p>
                  <p className="text-[10px] text-slate-400 uppercase">Head of Enterprise Management</p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              >
                <PrinterIcon size={14} />
                <span>Cetak Lembar Laporan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
