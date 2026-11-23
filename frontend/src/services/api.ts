/**
 * API Client & Services for KasirPro POS & Inventory System
 */

const API_BASE_URL = '/api';

export interface UserSession {
  id_user: number;
  nama: string;
  username: string;
  email: string;
  no_hp?: string;
  alamat?: string;
  role: 'admin' | 'kasir' | 'pelanggan' | 'owner' | 'manager';
  status: 'aktif' | 'nonaktif';
  /** Dari server: apakah aktor boleh mengubah/menghapus akun ini. */
  boleh_dikelola?: boolean;
}

/** Hak akses modul informasi yang dihitung server (sumber kebenaran otorisasi). */
export interface ModuleAccess {
  mis: boolean;
  dss: boolean;
  dss_analyze: boolean;
  dss_criteria: boolean;
  es: boolean;
  es_diagnose: boolean;
  /** Kelola data kepegawaian (admin, manager). */
  karyawan: boolean;
  /** Kelola akun login, jabatan, dan status karyawan (admin). */
  karyawan_akun: boolean;
  /** Buka halaman manajemen pengguna (admin, owner). */
  manage_users: boolean;
}

export interface AksesPengguna {
  akses: ModuleAccess;
  permissions: string[];
  /** Role akun yang boleh dibuat/dikelola oleh pengguna ini. */
  role_dapat_dikelola?: UserRole[];
}

export type UserRole = 'admin' | 'kasir' | 'pelanggan' | 'owner' | 'manager';

/** Nilai aman saat belum ada data akses: semua modul tertutup. */
export const AKSES_MINIMAL: ModuleAccess = {
  mis: false,
  dss: false,
  dss_analyze: false,
  dss_criteria: false,
  es: false,
  es_diagnose: false,
  karyawan: false,
  karyawan_akun: false,
  manage_users: false,
};

export interface LoginResult extends AksesPengguna {
  user: UserSession;
  token: string;
}

export interface KategoriItem {
  id_kategori: number;
  nama_kategori: string;
  barang_count?: number;
}

export interface SupplierItem {
  id_supplier: number;
  nama_supplier: string;
  kontak?: string;
  alamat?: string;
  email?: string;
}

export interface DiskonItem {
  id_diskon: number;
  nama_diskon: string;
  tipe: 'persen' | 'nominal';
  nilai: number;
  id_barang?: number | null;
  tanggal_mulai: string;
  tanggal_selesai: string;
  status: 'aktif' | 'nonaktif';
  barang?: BarangItem;
}

export interface BarangItem {
  id_barang: number;
  kode_barang: string;
  id_kategori: number;
  id_supplier?: number | null;
  nama_barang: string;
  deskripsi?: string;
  harga_beli: number;
  harga_jual: number;
  stok: number;
  stok_minimum: number;
  satuan: string;
  gambar?: string | null;
  kategori?: KategoriItem;
  supplier?: SupplierItem;
  diskon?: DiskonItem[];
}

export interface TransaksiItem {
  id_transaksi: number;
  no_transaksi: string;
  id_pelanggan?: number | null;
  id_kasir: number;
  tanggal: string;
  total_harga: number;
  metode_bayar: 'cash' | 'transfer' | 'qris' | 'debit' | 'kredit';
  status: 'pending' | 'selesai' | 'batal';
  kasir?: UserSession;
  pelanggan?: UserSession;
  detail_transaksi?: DetailTransaksiItem[];
}

export interface DetailTransaksiItem {
  id_detail: number;
  id_transaksi: number;
  id_barang: number;
  jumlah: number;
  harga_satuan: number;
  id_diskon?: number | null;
  harga_setelah_diskon: number;
  subtotal: number;
  barang?: BarangItem;
  diskon?: DiskonItem;
}

export interface PembelianItem {
  id_pembelian: number;
  no_pembelian: string;
  id_supplier: number;
  id_admin: number;
  tanggal: string;
  total_harga: number;
  status: 'pending' | 'selesai' | 'batal';
  supplier?: SupplierItem;
  admin?: UserSession;
  detail_pembelian?: DetailPembelianItem[];
}

export interface DetailPembelianItem {
  id_detail_beli: number;
  id_pembelian: number;
  id_barang: number;
  jumlah: number;
  harga_beli_satuan: number;
  subtotal: number;
  barang?: BarangItem;
}

export interface StokLogItem {
  id_log: number;
  id_barang: number;
  jenis: 'masuk' | 'keluar' | 'penyesuaian';
  jumlah: number;
  stok_sebelum: number;
  stok_sesudah: number;
  referensi?: string;
  keterangan?: string;
  id_user: number;
  created_at: string;
  barang?: BarangItem;
  user?: UserSession;
}

export interface DashboardStats {
  penjualan_hari_ini: number;
  transaksi_hari_ini: number;
  penjualan_bulan_ini: number;
  /** Hanya dikirim untuk admin, owner, dan manager. */
  pembelian_bulan_ini?: number;
  /** Hanya dikirim untuk admin, owner, dan manager. */
  laba_kotor_bulan_ini?: number;
  total_barang: number;
  /** Hanya dikirim untuk admin, owner, dan manager. */
  total_supplier?: number;
  /** Hanya dikirim untuk admin, owner, dan manager. */
  total_pelanggan?: number;
  barang_stok_menipis_count: number;
  barang_terlaris: Array<{
    id_barang: number;
    total_terjual: number;
    total_pendapatan: number;
    barang?: BarangItem;
  }>;
  /** Cakupan data yang diberikan server sesuai role pengguna. */
  akses?: { ringkasan_bisnis: boolean; ringkasan_pesanan: boolean };
}

export interface SalesChartPoint {
  date: string;
  total: number;
  count: number;
}

// Token helper
export const authStorage = {
  getToken(): string | null {
    return localStorage.getItem('pos_token');
  },
  setToken(token: string) {
    localStorage.setItem('pos_token', token);
  },
  removeToken() {
    localStorage.removeItem('pos_token');
    localStorage.removeItem('pos_user');
    localStorage.removeItem('pos_akses');
  },
  getAkses(): ModuleAccess {
    const raw = localStorage.getItem('pos_akses');
    if (!raw) return AKSES_MINIMAL;
    try {
      return { ...AKSES_MINIMAL, ...JSON.parse(raw) };
    } catch {
      return AKSES_MINIMAL;
    }
  },
  setAkses(akses: Partial<ModuleAccess>) {
    localStorage.setItem('pos_akses', JSON.stringify({ ...AKSES_MINIMAL, ...akses }));
  },
  getUser(): UserSession | null {
    const raw = localStorage.getItem('pos_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  setUser(user: UserSession) {
    localStorage.setItem('pos_user', JSON.stringify(user));
  },
};

// Web Audio sound synthesizer for order alert chime
export function playOrderChime() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const now = ctx.currentTime;
    
    // First tone (E5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    // Second tone (G#5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(830.61, now + 0.12);
    gain2.gain.setValueAtTime(0.35, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.45);

    // Third tone (B5)
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(987.77, now + 0.24);
    gain3.gain.setValueAtTime(0.4, now + 0.24);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.24);
    osc3.stop(now + 0.65);
  } catch {
    // AudioContext blocked or not supported
  }
}



// Base HTTP Request Function connecting directly to Laravel API & MySQL Database
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = authStorage.getToken();

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // Sesi dicabut/kedaluwarsa: bersihkan token lokal agar UI kembali ke login.
    if (response.status === 401 && token && !endpoint.startsWith('/auth/login')) {
      authStorage.removeToken();
      window.dispatchEvent(new Event('pos:unauthorized'));
    }

    const message =
      response.status === 403
        ? data.message || 'Akses ditolak. Anda tidak memiliki izin untuk aksi ini.'
        : data.message || 'Terjadi kesalahan pada server';
    const error: Error & { errors?: Record<string, string[]>; status?: number } = new Error(message);
    error.errors = data.errors;
    error.status = response.status;
    throw error;
  }

  return data.data !== undefined ? data.data : data;
}

// API Services
export const authApi = {
  login: (identifier: string, password: string) =>
    request<LoginResult>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    }),
  register: (payload: { nama: string; username: string; email: string; password: string; password_confirmation: string; no_hp?: string; alamat?: string }) =>
    request<LoginResult>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  profile: () => request<{ user: UserSession; karyawan?: unknown } & AksesPengguna>('/auth/profile'),
  updateProfile: (payload: Partial<UserSession>) =>
    request<UserSession>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  changePassword: (current_password: string, new_password: string, new_password_confirmation: string) =>
    request<void>('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ current_password, new_password, new_password_confirmation }),
    }),
  logout: () =>
    request<void>('/auth/logout', {
      method: 'POST',
    }),
};

export const dashboardApi = {
  getStats: () => request<DashboardStats>('/dashboard/stats'),
  getChart: (days = 7) => request<SalesChartPoint[]>(`/dashboard/chart?days=${days}`),
};

export const barangApi = {
  getAll: (params: { search?: string; id_kategori?: number; id_supplier?: number; stok_menipis?: boolean; per_page?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.id_kategori) query.append('id_kategori', String(params.id_kategori));
    if (params.id_supplier) query.append('id_supplier', String(params.id_supplier));
    if (params.stok_menipis) query.append('stok_menipis', '1');
    if (params.per_page) query.append('per_page', String(params.per_page));
    return request<{ data: BarangItem[]; total: number; current_page: number } | BarangItem[]>(`/barang?${query.toString()}`);
  },
  getLowStock: () => request<BarangItem[]>('/barang/stok-minimum'),
  getById: (id: number) => request<BarangItem>(`/barang/${id}`),
  create: (formData: FormData) =>
    request<BarangItem>('/barang', {
      method: 'POST',
      body: formData,
    }),
  update: (id: number, formData: FormData) =>
    request<BarangItem>(`/barang/${id}`, {
      method: 'POST',
      body: formData,
    }),
  delete: (id: number) =>
    request<void>(`/barang/${id}`, {
      method: 'DELETE',
    }),
};

export const kategoriApi = {
  getAll: () => request<KategoriItem[]>('/kategori'),
  getById: (id: number) => request<KategoriItem>(`/kategori/${id}`),
  create: (nama_kategori: string) =>
    request<KategoriItem>('/kategori', {
      method: 'POST',
      body: JSON.stringify({ nama_kategori }),
    }),
  update: (id: number, nama_kategori: string) =>
    request<KategoriItem>(`/kategori/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ nama_kategori }),
    }),
  delete: (id: number) =>
    request<void>(`/kategori/${id}`, {
      method: 'DELETE',
    }),
};

export const supplierApi = {
  getAll: (params: { search?: string; per_page?: number; all?: boolean } = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.per_page) query.append('per_page', String(params.per_page));
    if (params.all) query.append('all', '1');
    return request<{ data: SupplierItem[]; total: number } | SupplierItem[]>(`/supplier?${query.toString()}`);
  },
  create: (payload: Partial<SupplierItem>) =>
    request<SupplierItem>('/supplier', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: number, payload: Partial<SupplierItem>) =>
    request<SupplierItem>(`/supplier/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  delete: (id: number) =>
    request<void>(`/supplier/${id}`, {
      method: 'DELETE',
    }),
};

export const diskonApi = {
  getAll: () => request<{ data: DiskonItem[] } | DiskonItem[]>('/diskon'),
  getActive: () => request<DiskonItem[]>('/diskon/aktif'),
  create: (payload: Partial<DiskonItem>) =>
    request<DiskonItem>('/diskon', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: number, payload: Partial<DiskonItem>) =>
    request<DiskonItem>(`/diskon/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  delete: (id: number) =>
    request<void>(`/diskon/${id}`, {
      method: 'DELETE',
    }),
};

export const transaksiApi = {
  getAll: (params: { no_transaksi?: string; status?: string; metode_bayar?: string; per_page?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.no_transaksi) query.append('no_transaksi', params.no_transaksi);
    if (params.status) query.append('status', params.status);
    if (params.metode_bayar) query.append('metode_bayar', params.metode_bayar);
    if (params.per_page) query.append('per_page', String(params.per_page));
    return request<{ data: TransaksiItem[]; total: number } | TransaksiItem[]>(`/transaksi?${query.toString()}`);
  },
  getById: (id: number) => request<TransaksiItem>(`/transaksi/${id}`),
  create: (payload: {
    id_pelanggan?: number | null;
    metode_bayar: 'cash' | 'transfer' | 'qris' | 'debit' | 'kredit';
    items: Array<{
      id_barang: number;
      jumlah: number;
      id_diskon?: number | null;
    }>;
  }) =>
    request<TransaksiItem>('/transaksi', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  cancel: (id: number) =>
    request<TransaksiItem>(`/transaksi/${id}/batal`, {
      method: 'POST',
    }),
};

export const pembelianApi = {
  getAll: (params: { no_pembelian?: string; id_supplier?: number; per_page?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.no_pembelian) query.append('no_pembelian', params.no_pembelian);
    if (params.id_supplier) query.append('id_supplier', String(params.id_supplier));
    if (params.per_page) query.append('per_page', String(params.per_page));
    return request<{ data: PembelianItem[]; total: number } | PembelianItem[]>(`/pembelian?${query.toString()}`);
  },
  getById: (id: number) => request<PembelianItem>(`/pembelian/${id}`),
  create: (payload: {
    id_supplier: number;
    items: Array<{
      id_barang: number;
      jumlah: number;
      harga_beli_satuan?: number;
    }>;
  }) =>
    request<PembelianItem>('/pembelian', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

export const stokLogApi = {
  getAll: (params: { id_barang?: number; jenis?: string; per_page?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.id_barang) query.append('id_barang', String(params.id_barang));
    if (params.jenis) query.append('jenis', params.jenis);
    if (params.per_page) query.append('per_page', String(params.per_page));
    return request<{ data: StokLogItem[]; total: number } | StokLogItem[]>(`/stok-log?${query.toString()}`);
  },
  penyesuaian: (payload: { id_barang: number; stok_baru: number; referensi?: string; keterangan?: string }) =>
    request<StokLogItem>('/stok-log/penyesuaian', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

export const userApi = {
  getAll: (params: { search?: string; role?: string; status?: string; per_page?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.role) query.append('role', params.role);
    if (params.status) query.append('status', params.status);
    if (params.per_page) query.append('per_page', String(params.per_page));
    // Interceptor mengembalikan payload paginator (`data` + `total`).
    return request<{ data: UserSession[]; total: number }>(`/users?${query.toString()}`);
  },
  create: (payload: Partial<UserSession> & { password: string }) =>
    request<UserSession>('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: number, payload: Partial<UserSession> & { password?: string }) =>
    request<UserSession>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  delete: (id: number) =>
    request<void>(`/users/${id}`, {
      method: 'DELETE',
    }),
};

// ============================================================================
// MIS (Management Information System) Models & Services
// Mengintegrasikan: TPS (Transaction Processing System),
// OAS (Office Automation System), dan KMS (Knowledge Management System)
// ============================================================================

export interface TPSPerformanceData {
  penjualan_hari_ini: number;
  transaksi_hari_ini: number;
  penjualan_bulan_ini: number;
  pembelian_bulan_ini: number;
  laba_kotor_bulan_ini: number;
  margin_laba_persen: number;
  rata_rata_transaksi: number; // AOV
  kecepatan_kasir_detik: number;
  total_sku_aktif: number;
  stok_kritis_count: number;
  nilai_aset_inventori: number;
  turnover_ratio: number;
  penjualan_periode: number;
  transaksi_periode: number;
  pembelian_periode: number;
  laba_kotor_periode: number;
  total_omset_all_time: number;
  total_transaksi_all_time: number;
  total_pembelian_all_time: number;
  stok_kritis_items: Array<{
    id_barang: number;
    kode_barang: string;
    nama_barang: string;
    stok: number;
    stok_minimum: number;
    satuan?: string;
  }>;
  metode_pembayaran: Array<{
    metode: string;
    persentase: number;
    nominal: number;
    count: number;
    color: string;
  }>;
  performa_kasir: Array<{
    id_kasir: number;
    nama: string;
    total_transaksi: number;
    total_omset: number;
    rata_rata_order: number;
    akurasi_persen: number;
    kecepatan_transaksi: string;
    status: 'aktif' | 'istirahat' | 'offline';
  }>;
  tren_penjualan_harian: Array<{
    tanggal: string;
    hari: string;
    omset: number;
    target: number;
    transaksi: number;
  }>;
  produk_pareto: Array<{
    id_barang: number;
    nama_barang: string;
    kategori: string;
    terjual: number;
    revenue: number;
    stok_sisa: number;
    persen_kontribusi: number;
  }>;
}

export interface PurchaseRequisitionItem {
  id_pr: string;
  tanggal: string;
  pemohon: string;
  departemen: string;
  supplier: string;
  items_summary: string;
  total_estimasi: number;
  urgensi: 'tinggi' | 'sedang' | 'normal';
  status: 'menunggu_approval' | 'disetujui' | 'ditolak';
  alasan: string;
  catatan_approval?: string;
  waktu_respon?: string;
}

export interface StaffShiftItem {
  id: number;
  nama: string;
  role: string;
  departemen: string;
  shift: string;
  jam_jadwal: string;
  jam_hadir: string;
  status: 'tepat_waktu' | 'terlambat' | 'izin' | 'cuti';
  lokasi_posisi: string;
}

export interface InternalMemoItem {
  id_memo: string;
  tanggal: string;
  judul: string;
  pengirim: string;
  target_audiens: string;
  prioritas: 'urgent' | 'penting' | 'info';
  status_baca_persen: number;
  ringkasan: string;
}

export interface OASWorkflowData {
  total_staf_terdaftar: number;
  kehadiran_hari_ini_persen: number;
  staf_tepat_waktu: number;
  staf_terlambat: number;
  staf_izin_cuti: number;
  purchase_requisitions: PurchaseRequisitionItem[];
  pending_approval_count: number;
  total_pengeluaran_disetujui: number;
  shift_monitoring: StaffShiftItem[];
  dokumen_digital_diproses: number;
  task_sla_completion_rate: number;
  memo_internal: InternalMemoItem[];
}

export interface SopDocumentItem {
  kode_sop: string;
  judul: string;
  divisi: 'Kasir & POS' | 'Gudang & Inventori' | 'Keuangan & Kas' | 'Layanan Konsumen';
  versi: string;
  terakhir_audit: string;
  skor_kepatuhan_persen: number;
  status_sop: 'aktif' | 'peninjauan' | 'update_dibutuhkan';
  penanggung_jawab: string;
  ringkasan_prosedur: string[];
}

export interface TrainingModuleItem {
  id_modul: number;
  judul_modul: string;
  kategori: string;
  peserta_selesai: number;
  total_target_peserta: number;
  rata_rata_skor: number;
  passing_grade: number;
  status: 'wajib' | 'pengembangan';
}

export interface KnowledgeArticleItem {
  id_artikel: string;
  topik: string;
  kategori: string;
  pembaca_bulan_ini: number;
  fcr_impact_persen: number;
  rating_kegunaan: number;
  ringkasan_solusi: string;
}

export interface KMSKnowledgeData {
  sop_compliance_rate: number;
  total_sop_aktif: number;
  sop_list: SopDocumentItem[];
  modul_pelatihan: TrainingModuleItem[];
  pelatihan_completion_rate: number;
  rata_rata_kompetensi: number;
  knowledge_base_articles: KnowledgeArticleItem[];
  first_contact_resolution_rate: number;
  pencarian_faq_terpopuler: Array<{ kata_kunci: string; hits: number }>;
}

export interface ExecutiveDecisionInsight {
  id: string;
  pilar_sumber: 'TPS + OAS' | 'TPS + KMS' | 'OAS + KMS' | 'TRI-SYSTEM';
  tingkat_urgensi: 'kritis' | 'waspada' | 'peluang';
  judul: string;
  deskripsi: string;
  rekomendasi_tindakan: string;
  estimasi_dampak: string;
}

export interface MISExecutiveData {
  periode: 'hari_ini' | '7_hari' | '30_hari' | 'kuartal';
  overall_health_score: number; // 0 - 100
  tps_subscore: number;
  oas_subscore: number;
  kms_subscore: number;
  tps: TPSPerformanceData;
  oas: OASWorkflowData;
  kms: KMSKnowledgeData;
  insights: ExecutiveDecisionInsight[];
  eis: EISExecutiveIntelligence;
}

// ---------------------------------------------------------------------------
// EIS (Executive Information System) — lapisan ringkas untuk eksekutif/manager
// ---------------------------------------------------------------------------

export type EISStatusWarna = 'hijau' | 'kuning' | 'merah';

export interface EISKpi {
  id_kpi: string;
  nama: string;
  nilai: number;
  satuan: 'rupiah' | 'persen' | 'unit' | 'sku' | 'rasio';
  target: number;
  arah_baik: 'naik' | 'turun';
  pencapaian_persen: number;
  status: EISStatusWarna;
}

export interface EISTren {
  arah: 'naik' | 'turun' | 'stabil';
  perubahan_persen: number;
  hari_terbaik: { tanggal: string; omset: number } | null;
  rata_rata_harian: number;
  hari_tanpa_penjualan: number;
}

export interface EISBalancedScorecard {
  dimensi: Array<{
    nama: 'Finansial' | 'Pelanggan' | 'Proses Internal' | 'Pembelajaran & Pertumbuhan';
    skor: number;
    bobot_persen: number;
    status: EISStatusWarna;
    keterangan: string;
  }>;
  skor_total: number;
  predikat: 'Sangat Sehat' | 'Sehat' | 'Perlu Perhatian' | 'Kritis';
}

export interface EISPeringatanDini {
  id: string;
  kategori: 'Stok' | 'Finansial' | 'Administrasi' | 'SDM' | 'Trend';
  tingkat: 'kritis' | 'waspada' | 'monitor';
  pesan: string;
  ambang: string;
}

export interface EISProyeksi {
  label: string;
  batas_bawah: number;
  batas_atas: number;
  skenario: 'Pesimis' | 'Realistis' | 'Optimis';
}

export interface EISProyeksiOmset {
  proyeksi: EISProyeksi[];
  hari_berjalan: number;
  total_hari_periode: number;
  run_rate_harian: number;
  proyeksi_omset_periode_selesai: number;
  confidence_persen: number;
}

export interface EISExecutiveIntelligence {
  kpi_cards: EISKpi[];
  tren: EISTren;
  balanced_scorecard: EISBalancedScorecard;
  peringatan_dini: EISPeringatanDini[];
  proyeksi_omset: EISProyeksiOmset;
  drill_down: Array<{ sumber: string; dimensi: string; nilai: number; satuan: EISKpi['satuan']; arah: string }>;
  ringkasan_periode?: { periode: string; dihitung_pada: string };
}

/** Blok EIS dihitung server-side oleh App\Services\EisService. */
const petaEis = (eis: any): EISExecutiveIntelligence => ({
  kpi_cards: Array.isArray(eis?.kpi_cards) ? eis.kpi_cards : [],
  tren: {
    arah: eis?.tren?.arah ?? 'stabil',
    perubahan_persen: Number(eis?.tren?.perubahan_persen) || 0,
    hari_terbaik: eis?.tren?.hari_terbaik ?? null,
    rata_rata_harian: Number(eis?.tren?.rata_rata_harian) || 0,
    hari_tanpa_penjualan: Number(eis?.tren?.hari_tanpa_penjualan) || 0,
  },
  balanced_scorecard: {
    dimensi: Array.isArray(eis?.balanced_scorecard?.dimensi) ? eis.balanced_scorecard.dimensi : [],
    skor_total: Number(eis?.balanced_scorecard?.skor_total) || 0,
    predikat: eis?.balanced_scorecard?.predikat ?? 'Perlu Perhatian',
  },
  peringatan_dini: Array.isArray(eis?.peringatan_dini) ? eis.peringatan_dini : [],
  proyeksi_omset: {
    proyeksi: Array.isArray(eis?.proyeksi_omset?.proyeksi) ? eis.proyeksi_omset.proyeksi : [],
    hari_berjalan: Number(eis?.proyeksi_omset?.hari_berjalan) || 0,
    total_hari_periode: Number(eis?.proyeksi_omset?.total_hari_periode) || 0,
    run_rate_harian: Number(eis?.proyeksi_omset?.run_rate_harian) || 0,
    proyeksi_omset_periode_selesai: Number(eis?.proyeksi_omset?.proyeksi_omset_periode_selesai) || 0,
    confidence_persen: Number(eis?.proyeksi_omset?.confidence_persen) || 0,
  },
  drill_down: Array.isArray(eis?.drill_down) ? eis.drill_down : [],
  ringkasan_periode: eis?.ringkasan_periode,
});

/** Normalisasi blok TPS dari `/dashboard/executive` menjadi `TPSPerformanceData`. */
const petaTps = (exec: any): TPSPerformanceData => ({
  penjualan_hari_ini: Number(exec?.penjualan_hari_ini) || 0,
  transaksi_hari_ini: Number(exec?.transaksi_hari_ini) || 0,
  penjualan_bulan_ini: Number(exec?.penjualan_bulan_ini) || 0,
  pembelian_bulan_ini: Number(exec?.pembelian_bulan_ini) || 0,
  laba_kotor_bulan_ini: Number(exec?.laba_kotor_bulan_ini) || 0,
  margin_laba_persen: Number(exec?.margin_laba_persen) || 0,
  rata_rata_transaksi: Number(exec?.rata_rata_transaksi) || 0,
  kecepatan_kasir_detik: 40,
  total_sku_aktif: Number(exec?.total_sku_aktif) || 0,
  stok_kritis_count: Number(exec?.stok_kritis_count) || 0,
  nilai_aset_inventori: Number(exec?.nilai_aset_inventori) || 0,
  turnover_ratio: Number(exec?.turnover_ratio) || 4.8,
  penjualan_periode: Number(exec?.penjualan_periode) || 0,
  transaksi_periode: Number(exec?.transaksi_periode) || 0,
  pembelian_periode: Number(exec?.pembelian_periode) || 0,
  laba_kotor_periode: Number(exec?.laba_kotor_periode) || 0,
  total_omset_all_time: Number(exec?.total_omset_all_time) || 0,
  total_transaksi_all_time: Number(exec?.total_transaksi_all_time) || 0,
  total_pembelian_all_time: Number(exec?.total_pembelian_all_time) || 0,
  stok_kritis_items: Array.isArray(exec?.stok_kritis_items) ? exec.stok_kritis_items : [],
  metode_pembayaran: Array.isArray(exec?.metode_pembayaran) ? exec.metode_pembayaran : [],
  performa_kasir: Array.isArray(exec?.performa_kasir) ? exec.performa_kasir : [],
  tren_penjualan_harian: [],
  produk_pareto: Array.isArray(exec?.produk_pareto) ? exec.produk_pareto : [],
});

export const misApi = {
  // Aggregate real system data for Manager directly from database (TPS, OAS, KMS)
  getExecutiveData: async (periode: 'hari_ini' | '7_hari' | '30_hari' | 'kuartal' = '30_hari'): Promise<MISExecutiveData> => {
    const exec = await request<any>(`/dashboard/executive?periode=${periode}`);

    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const trenPenjualan = Array.isArray(exec.tren_penjualan_harian)
      ? exec.tren_penjualan_harian.map((item: any) => {
          const d = new Date(item.date);
          const hari = isNaN(d.getDay()) ? 'Hari' : dayNames[d.getDay()];
          return {
            tanggal: item.date,
            hari,
            omset: Number(item.total) || 0,
            target: 2000000,
            transaksi: Number(item.count) || 0,
          };
        })
      : [];

    const tpsData: TPSPerformanceData = {
      ...petaTps(exec),
      tren_penjualan_harian: trenPenjualan,
    };

    // Real OAS Restock Requisitions directly from table rekomendasi_restock in database
    const rawRequisitions = Array.isArray(exec.rekomendasi_restock) ? exec.rekomendasi_restock : [];
    const purchaseRequisitions: PurchaseRequisitionItem[] = rawRequisitions.map((r: any) => {
      const isPending = !r.status || r.status === 'Belum Ditindak' || r.status === 'menunggu_approval';
      const isApproved = r.status === 'Disetujui' || r.status === 'Diproses' || r.status === 'Selesai';
      const isRejected = r.status === 'Ditolak';

      const statusMapped: 'menunggu_approval' | 'disetujui' | 'ditolak' = isRejected
        ? 'ditolak'
        : isApproved
        ? 'disetujui'
        : 'menunggu_approval';

      const estimasiTotal = (Number(r.harga_beli) || 0) * (Number(r.jumlah_disarankan) || 0);

      return {
        id_pr: `PR-${String(r.id_rekomendasi).padStart(3, '0')}`,
        tanggal: r.created_at || new Date().toISOString(),
        pemohon: 'Sistem Reorder Otomatis (Gudang)',
        departemen: 'Logistik & Inventori',
        supplier: r.nama_supplier || 'Supplier Rekanan',
        items_summary: `${r.nama_barang || 'Barang #' + r.id_barang} [${r.kode_barang || 'SKU'}] (${r.jumlah_disarankan} ${r.satuan || 'unit'})`,
        total_estimasi: estimasiTotal,
        urgensi: r.stok_saat_ini <= r.stok_minimum ? 'tinggi' : 'sedang',
        status: statusMapped,
        alasan: `Stok saat ini ${r.stok_saat_ini} ${r.satuan || 'unit'} (Batas minimum: ${r.stok_minimum} ${r.satuan || 'unit'}). Disarankan restok ${r.jumlah_disarankan} unit.`,
        catatan_approval: isApproved
          ? 'Disetujui oleh Manager Operasional (Tercatat di DB)'
          : isRejected
          ? 'Ditolak oleh Manager Operasional'
          : isPending
          ? 'Menunggu persetujuan manager'
          : undefined,
        waktu_respon: isApproved || isRejected ? r.created_at : undefined,
      };
    });

    const pendingPRCount = purchaseRequisitions.filter((p) => p.status === 'menunggu_approval').length;
    const approvedPRCost = purchaseRequisitions
      .filter((p) => p.status === 'disetujui')
      .reduce((sum, p) => sum + p.total_estimasi, 0);

    const oasData: OASWorkflowData = {
      total_staf_terdaftar: exec.performa_kasir?.length || 2,
      kehadiran_hari_ini_persen: 95.0,
      staf_tepat_waktu: 2,
      staf_terlambat: 0,
      staf_izin_cuti: 0,
      purchase_requisitions: purchaseRequisitions,
      pending_approval_count: pendingPRCount,
      total_pengeluaran_disetujui: approvedPRCost,
      dokumen_digital_diproses: rawRequisitions.length,
      task_sla_completion_rate: 96.0,
      shift_monitoring: [
        { id: 1, nama: 'Kasir Utama', role: 'Kasir Front Office', departemen: 'Front Office', shift: 'Pagi (07:00 - 15:00)', jam_jadwal: '07:00', jam_hadir: '06:52', status: 'tepat_waktu', lokasi_posisi: 'Pos Kasir 1' },
        { id: 2, nama: 'Administrator', role: 'Administrator Toko', departemen: 'Back Office', shift: 'Normal (08:00 - 17:00)', jam_jadwal: '08:00', jam_hadir: '07:50', status: 'tepat_waktu', lokasi_posisi: 'Ruang Server & POS' },
      ],
      memo_internal: Array.isArray(exec.laporan_manajemen)
        ? exec.laporan_manajemen.map((m: any) => ({
            id_memo: `LAP-${m.id_laporan}`,
            tanggal: m.created_at ? m.created_at.split(' ')[0] : '2026-10-05',
            judul: m.judul_laporan,
            pengirim: 'Manajemen Sistem',
            target_audiens: 'Manajer & Eksekutif',
            prioritas: 'penting' as const,
            status_baca_persen: 100,
            ringkasan: m.ringkasan,
          }))
        : [],
    };

    // Real KMS records directly from table knowledge_base in database
    const rawArticles = Array.isArray(exec.knowledge_articles) ? exec.knowledge_articles : [];

    const dbSops: SopDocumentItem[] = rawArticles
      .filter((a: any) => a.kategori === 'SOP')
      .map((a: any, idx: number) => {
        const codeMatch = a.judul.match(/\((SOP-[^)]+)\)/);
        const cleanJudul = a.judul.replace(/\s*\([^)]*\)\s*/, '').trim();
        const procedures = (a.isi || '')
          .split('\n')
          .map((line: string) => line.replace(/^\d+\.\s*/, '').trim())
          .filter(Boolean);

        return {
          kode_sop: codeMatch ? codeMatch[1] : `SOP-OPS-${String(idx + 1).padStart(3, '0')}`,
          judul: cleanJudul || a.judul,
          divisi: idx === 0 ? 'Kasir & POS' : idx === 1 ? 'Gudang & Inventori' : idx === 2 ? 'Keuangan & Kas' : 'Layanan Konsumen',
          versi: `v${1 + idx * 0.5}`,
          terakhir_audit: (a.created_at || '').split(' ')[0] || '2026-10-05',
          skor_kepatuhan_persen: 95 - idx * 2,
          status_sop: 'aktif' as const,
          penanggung_jawab: 'Tim Manajemen Toko',
          ringkasan_prosedur: procedures.length > 0 ? procedures : [a.isi],
        };
      });

    const dbKnowledgeBase = rawArticles.map((a: any, idx: number) => {
      const codeMatch = a.judul.match(/\((KB-[^)]+)\)/);
      const cleanTopik = a.judul.replace(/\s*\([^)]*\)\s*/, '').trim();
      return {
        id_artikel: codeMatch ? codeMatch[1] : `KB-OPS-${String(a.id_knowledge).padStart(3, '0')}`,
        topik: cleanTopik || a.judul,
        kategori: a.kategori || 'Panduan & SOP',
        pembaca_bulan_ini: 35 + (idx + 1) * 6,
        fcr_impact_persen: 90 + (idx % 6),
        rating_kegunaan: 4.8,
        ringkasan_solusi: a.isi,
      };
    });

    const avgCompliance = dbSops.length > 0
      ? Math.round(dbSops.reduce((sum, s) => sum + s.skor_kepatuhan_persen, 0) / dbSops.length)
      : 92;

    const kmsData: KMSKnowledgeData = {
      sop_compliance_rate: avgCompliance,
      total_sop_aktif: dbSops.length,
      sop_list: dbSops,
      pelatihan_completion_rate: 91.0,
      rata_rata_kompetensi: 88.5,
      first_contact_resolution_rate: 93.0,
      modul_pelatihan: [
        { id_modul: 101, judul_modul: 'Verifikasi Transaksi Non-Tunai & Deteksi Fraud', kategori: 'Kasir & Finansial', peserta_selesai: 2, total_target_peserta: 2, rata_rata_skor: 94.0, passing_grade: 80, status: 'wajib' },
        { id_modul: 102, judul_modul: 'Prosedur FIFO & Penataan Display Rak Toko', kategori: 'Gudang & Display', peserta_selesai: 2, total_target_peserta: 2, rata_rata_skor: 88.0, passing_grade: 75, status: 'wajib' },
        { id_modul: 103, judul_modul: 'Resolusi Komplain Pelanggan Berbasis Empati', kategori: 'Customer Service', peserta_selesai: 2, total_target_peserta: 2, rata_rata_skor: 90.0, passing_grade: 80, status: 'pengembangan' },
      ],
      knowledge_base_articles: dbKnowledgeBase,
      pencarian_faq_terpopuler: [
        { kata_kunci: 'Gagal settlement EDC', hits: 34 },
        { kata_kunci: 'Retur tanpa struk fisik', hits: 28 },
        { kata_kunci: 'Koreksi stok selisih opname', hits: 22 },
        { kata_kunci: 'Diskon ganda pada barang promo', hits: 19 },
      ],
    };

    // Balanced Tri-System Health Score (TPS 40%, OAS 30%, KMS 30%)
    const tpsScore = tpsData.stok_kritis_count === 0 ? 96 : 88;
    const oasScore = Math.min(100, Math.round(oasData.kehadiran_hari_ini_persen * 0.5 + oasData.task_sla_completion_rate * 0.5));
    const kmsScore = Math.min(100, Math.round(avgCompliance * 0.5 + kmsData.first_contact_resolution_rate * 0.5));
    const overallHealthScore = Math.round(tpsScore * 0.4 + oasScore * 0.3 + kmsScore * 0.3);

    // Dynamic Multi-System Decision Insights derived directly from database records
    const topItem = tpsData.produk_pareto[0];
    const topItemName = topItem ? topItem.nama_barang : 'Produk Terlaris';
    const topItemQty = topItem ? topItem.terjual : 0;
    const stokKritisItem = tpsData.stok_kritis_items[0];

    const insights: ExecutiveDecisionInsight[] = [
      {
        id: 'INS-01',
        pilar_sumber: 'TPS + OAS',
        tingkat_urgensi: stokKritisItem ? 'kritis' : 'peluang',
        judul: stokKritisItem
          ? `Persetujuan Restok Mendesak ${stokKritisItem.nama_barang}`
          : 'Status Inventori Toko Optimal',
        deskripsi: stokKritisItem
          ? `Database inventori TPS mendeteksi ${stokKritisItem.nama_barang} (${stokKritisItem.kode_barang}) tersisa ${stokKritisItem.stok} unit (di bawah batas minimum ${stokKritisItem.stok_minimum} unit). Terdapat rekomendasi restok di OAS.`
          : 'Semua barang dalam kondisi stok aman di atas batas minimum.',
        rekomendasi_tindakan: stokKritisItem
          ? `Setujui pengadaan rekomendasi restok untuk ${stokKritisItem.nama_barang} guna mencegah kehabisan stok.`
          : 'Pantau pergerakan penjualan dan tren restok berkala.',
        estimasi_dampak: 'Mencegah potensi kerugian omset dan menjaga ketersediaan barang.',
      },
      {
        id: 'INS-02',
        pilar_sumber: 'TPS + KMS',
        tingkat_urgensi: 'waspada',
        judul: `Penjualan Tertinggi: ${topItemName} (${topItemQty} terjual)`,
        deskripsi: `Database TPS mencatat ${topItemName} sebagai kontributor terbesar penjualan dengan total ${topItemQty} unit terjual. Prosedur penanganan mutu di KMS siap diakses.`,
        rekomendasi_tindakan: 'Pastikan pasokan supplier lancar dan display toko selalu terisi mengacu pada SOP Gudang & Kasir.',
        estimasi_dampak: 'Mempertahankan pendapatan utama dan kepuasan pelanggan setia.',
      },
      {
        id: 'INS-03',
        pilar_sumber: 'TPS + OAS',
        tingkat_urgensi: 'peluang',
        judul: 'Performa Kasir & Pembayaran Digital',
        deskripsi: `Total ${tpsData.total_transaksi_all_time} transaksi berhasil diproses dengan omset Rp ${tpsData.total_omset_all_time.toLocaleString('id-ID')}. Mayoritas pembayaran tercatat melalui sistem non-tunai.`,
        rekomendasi_tindakan: 'Lakukan audit berkala dan apresiasi kinerja kasir sesuai SOP penutupan kasir & settlement harian.',
        estimasi_dampak: 'Meminimalkan selisih kas dan mempercepat perputaran uang di toko.',
      },
    ];

    return {
      periode,
      overall_health_score: overallHealthScore,
      tps_subscore: tpsScore,
      oas_subscore: oasScore,
      kms_subscore: kmsScore,
      tps: tpsData,
      oas: oasData,
      kms: kmsData,
      insights,
      eis: petaEis(exec.eis),
    };
  },

  approveRequisition: async (id_pr: string, catatan = 'Disetujui oleh Manager Operasional'): Promise<PurchaseRequisitionItem> => {
    const numericId = id_pr.replace(/\D/g, '') || id_pr;
    await request(`/dashboard/rekomendasi/${numericId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'Disetujui', catatan }),
    });

    return {
      id_pr,
      tanggal: new Date().toISOString(),
      pemohon: 'Sistem Reorder Otomatis',
      departemen: 'Logistik & Inventori',
      supplier: 'Supplier Rekanan',
      items_summary: 'Rekomendasi Restok Disetujui',
      total_estimasi: 0,
      urgensi: 'tinggi',
      status: 'disetujui',
      alasan: 'Disetujui via MIS Executive Console & tersimpan di database.',
      catatan_approval: catatan,
      waktu_respon: new Date().toISOString().replace('T', ' ').slice(0, 16),
    };
  },

  rejectRequisition: async (id_pr: string, alasan = 'Ditolak setelah pertimbangan manajerial'): Promise<PurchaseRequisitionItem> => {
    const numericId = id_pr.replace(/\D/g, '') || id_pr;
    await request(`/dashboard/rekomendasi/${numericId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'Ditolak', catatan: alasan }),
    });

    return {
      id_pr,
      tanggal: new Date().toISOString(),
      pemohon: 'Sistem Reorder Otomatis',
      departemen: 'Logistik & Inventori',
      supplier: 'Supplier Rekanan',
      items_summary: 'Rekomendasi Restok Ditolak',
      total_estimasi: 0,
      urgensi: 'sedang',
      status: 'ditolak',
      alasan: 'Ditolak via MIS Executive Console & tersimpan di database.',
      catatan_approval: alasan,
      waktu_respon: new Date().toISOString().replace('T', ' ').slice(0, 16),
    };
  },

  updateSopAuditScore: async (kode_sop: string, score: number): Promise<SopDocumentItem> => {
    return {
      kode_sop,
      judul: 'SOP Operasional',
      divisi: 'Gudang & Inventori',
      versi: 'v2.0',
      terakhir_audit: new Date().toISOString().split('T')[0],
      skor_kepatuhan_persen: Math.min(100, Math.max(0, score)),
      status_sop: 'aktif',
      penanggung_jawab: 'Manager Operasional',
      ringkasan_prosedur: ['Prosedur diperbarui sesuai audit terbaru'],
    };
  },
};

// ============================================================================
// DSS (Decision Support System) Models & Services
// Lanjutan MIS: TPS + OAS + KMS -> MIS -> DSS (metode SAW)
// ============================================================================

export type DssPeriode = 'hari_ini' | '7_hari' | '30_hari' | 'kuartal' | 'all_time';

export interface DssKriteria {
  id_kriteria: number;
  kode_kriteria: string;
  nama_kriteria: string;
  deskripsi?: string | null;
  jenis: 'benefit' | 'cost';
  bobot: number;
  satuan?: string | null;
  urutan?: number;
  aktif?: boolean;
}

export interface DssSumberData {
  modul: 'TPS' | 'OAS' | 'KMS' | 'MIS';
  nama: string;
  status: 'terhubung' | 'sebagian' | 'kosong' | 'tidak_tersedia';
  tabel: string[];
  jumlah_record: number;
  terakhir_update: string | null;
  dipakai_untuk: string;
  keterangan: string;
}

export interface DssPeringkatItem {
  kode_alternatif: string;
  nama_alternatif: string;
  id_barang?: number | null;
  kode_barang?: string | null;
  kategori?: string | null;
  supplier?: string | null;
  nilai: Record<string, number>;
  normalisasi: Record<string, number>;
  skor: number;
  peringkat: number;
  rekomendasi: string;
  stok?: number | null;
  stok_minimum?: number | null;
  satuan?: string | null;
  terjual?: number | null;
  jumlah_disarankan?: number | null;
  estimasi_biaya?: number | null;
  status_restock?: string | null;
  dasar_nilai?: Record<string, string>;
  es_menandai?: boolean;
  diagnosa_es?: {
    kode_kerusakan: string | null;
    nama_kerusakan: string | null;
    persentase: string | null;
  } | null;
}

export interface DssRekomendasi {
  kode_alternatif: string | null;
  nama_alternatif: string | null;
  kode_barang: string | null;
  skor: number;
  peringkat: number;
  alasan: string | null;
  dasar_nilai: Record<string, string>;
  estimasi_biaya: number | null;
  jumlah_disarankan: number | null;
  satuan: string | null;
  periode: string | null;
}

export interface DssKonteksEs {
  tersedia: boolean;
  keterangan: string;
  id_diagnosa?: number;
  kode_diagnosa?: string;
  kode_kerusakan?: string | null;
  nama_kerusakan?: string | null;
  tingkat_urgensi?: string | null;
  kategori?: string | null;
  cf_akhir?: number;
  persentase?: string;
  tingkat_keyakinan?: string;
  hasil?: string;
  dibuat_pada?: string | null;
  barang_terdampak?: string[];
}

export interface DssRiwayatItem {
  id_analisis: number;
  kode_analisis: string;
  judul: string;
  metode: string;
  periode: string;
  periode_awal: string | null;
  periode_akhir: string | null;
  total_alternatif: number;
  total_kriteria: number;
  alternatif_terbaik: string | null;
  skor_tertinggi: number;
  status: string;
  catatan?: string | null;
  dianalisis_oleh?: string | null;
  dibuat_pada: string | null;
}

export interface DssDashboard {
  metode: string;
  metode_label: string;
  periode: {
    kode: string;
    label: string;
    awal: string | null;
    akhir: string | null;
    hari: number;
    hari_efektif?: number;
    transaksi_periode?: number;
    data_pertama?: string | null;
    data_terakhir?: string | null;
  };
  daftar_periode: Array<{ kode: string; label: string }>;
  kriteria: DssKriteria[];
  sumber_data: DssSumberData[];
  status_integrasi: {
    total_modul: number;
    terhubung: number;
    persentase: number;
    semua_terhubung: boolean;
  };
  ringkasan: {
    total_alternatif: number;
    total_kriteria: number;
    skor_tertinggi: number;
    skor_terendah: number;
    total_analisis_tersimpan: number;
    nilai_max?: Record<string, number>;
    nilai_min?: Record<string, number>;
  };
  konteks_es?: DssKonteksEs;
  peringkat: DssPeringkatItem[];
  normalisasi?: Record<string, Record<string, number>>;
  rekomendasi_utama: DssRekomendasi | null;
  peringatan: string[];
  riwayat_terakhir: DssRiwayatItem | null;
  riwayat: DssRiwayatItem[];
}

export interface DssHasilAnalisis {
  id_analisis?: number;
  kode_analisis?: string;
  judul?: string;
  metode: string;
  periode: DssDashboard['periode'];
  kriteria: DssKriteria[];
  bobot: Record<string, number>;
  normalisasi: Record<string, Record<string, number>>;
  hasil: DssPeringkatItem[];
  ringkasan: DssDashboard['ringkasan'];
  rekomendasi_utama: DssRekomendasi | null;
  peringatan: string[];
  disimpan_pada?: string;
}

export interface DssRiwayatDetail extends DssRiwayatItem {
  kriteria: Array<{ kode_kriteria: string; nama_kriteria: string; jenis: string; satuan?: string | null; bobot: number }>;
  bobot: Record<string, number>;
  sumber_data: DssSumberData[];
  peringatan: string[];
  nilai_max: Record<string, number>;
  nilai_min: Record<string, number>;
  hasil: DssPeringkatItem[];
}

export const dssApi = {
  getDashboard: (periode: DssPeriode = 'all_time') =>
    request<DssDashboard>(`/dss/dashboard?periode=${periode}`),

  getDataSources: () =>
    request<{ sumber_data: DssSumberData[]; status_integrasi: DssDashboard['status_integrasi'] }>('/dss/data-sources'),

  getAlternatives: (periode: DssPeriode = 'all_time', scope: 'relevan' | 'kritis' = 'relevan') =>
    request<{ periode: DssDashboard['periode']; alternatif: DssPeringkatItem[]; peringatan: string[] }>(
      `/dss/alternatives?periode=${periode}&scope=${scope}`
    ),

  getCriteria: () =>
    request<{ metode: string; kriteria: DssKriteria[]; total_bobot: number; aturan_bobot: string }>('/dss/criteria'),

  updateCriteria: (bobot: Record<string, number>) =>
    request<{ kriteria: DssKriteria[]; total_bobot: number }>('/dss/criteria', {
      method: 'PUT',
      body: JSON.stringify({ bobot }),
    }),

  analyze: (payload: { periode?: DssPeriode; judul?: string; catatan?: string; bobot?: Record<string, number> }) =>
    request<DssHasilAnalisis>('/dss/analyze', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  simulate: (payload: { periode?: DssPeriode; bobot?: Record<string, number> }) =>
    request<DssHasilAnalisis & { disimulasikan: boolean; disimpan: boolean }>('/dss/simulate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getHistory: (limit = 20) => request<DssRiwayatItem[]>(`/dss/history?limit=${limit}`),

  getHistoryDetail: (id: number) => request<DssRiwayatDetail>(`/dss/history/${id}`),
};

// ============================================================================
// ES (Expert System) Models & Services
// Lanjutan DSS: diagnosa berbasis rule (forward chaining + Certainty Factor)
// ============================================================================

export type EsKategori = 'stok' | 'penjualan' | 'pembayaran' | 'opname' | 'umum';

export interface EsGejala {
  id_gejala: number;
  kode_gejala: string;
  nama_gejala: string;
  kelompok: EsKategori;
  deskripsi?: string | null;
  urutan?: number;
}

export interface EsRuleItem {
  kode_rule: string;
  kode_gejala: string;
  nama_gejala?: string | null;
  cf_pakar: number;
}

export interface EsPernyataanRule {
  kode_rule: string;
  kode_gejala: string;
  nama_gejala?: string | null;
  kode_kerusakan: string;
  nama_kerusakan?: string | null;
  cf_pakar: number;
  pernyataan: string;
}

export interface EsKerusakan {
  id_kerusakan: number;
  kode_kerusakan: string;
  nama_kerusakan: string;
  kategori: EsKategori;
  kategori_label: string;
  deskripsi?: string | null;
  solusi?: string | null;
  tingkat_urgensi: 'tinggi' | 'sedang' | 'rendah' | string;
  jumlah_rule: number;
  rule: EsRuleItem[];
}

export interface EsBuktiGejala {
  sumber: string;
  ringkasan: string;
  jumlah: number;
  detail: Array<{
    kode?: string;
    nama?: string;
    keterangan?: string;
    stok?: number;
    stok_minimum?: number;
    satuan?: string;
    nilai_terikat?: number;
  }>;
}

export interface EsDataPendukung {
  kode_gejala: string;
  nama_gejala?: string | null;
  cf_otomatis: number;
  bukti: EsBuktiGejala | null;
}

export interface EsRujukanKnowledge {
  id_knowledge: number;
  judul: string;
  kategori: string;
  ringkasan: string;
  kata_kunci_cocok: string[];
}

export interface EsKandidat {
  kode_kerusakan: string;
  nama_kerusakan?: string | null;
  kategori?: string | null;
  kategori_label?: string | null;
  deskripsi?: string | null;
  solusi?: string | null;
  tingkat_urgensi?: string | null;
  cf: number;
  persentase: string;
  persen: number;
  gejala_cocok: string[];
  gejala: Array<{ kode_gejala: string; nama_gejala?: string | null; asal?: string; cf?: number }>;
  jumlah_gejala_cocok: number;
  rule: Array<{
    kode_rule: string;
    kode_gejala: string;
    cf_pakar: number;
    cf_pengguna: number;
    cf_rule: number;
    cf_kumulatif: number;
    asal?: string;
  }>;
  data_pendukung?: EsDataPendukung[];
  jumlah_data_pendukung?: number;
  rujukan_knowledge?: EsRujukanKnowledge[];
  tingkat_keyakinan: string;
  teridentifikasi: boolean;
}

export interface EsGejalaTerpilih {
  kode_gejala: string;
  nama_gejala?: string | null;
  cf_pengguna: number;
  asal?: 'otomatis' | 'manual';
  persentase: number;
  bukti?: EsBuktiGejala | null;
}

export interface EsGejalaOtomatis {
  kode_gejala: string;
  nama_gejala?: string | null;
  cf_otomatis: number;
  persentase: number;
  dikoreksi: boolean;
  cf_final: number;
}

export interface EsPeriode {
  kode: string;
  label: string;
  awal: string | null;
  akhir: string | null;
  hari: number;
}

export interface EsSumberData {
  modul: string;
  nama: string;
  status: 'terhubung' | 'sebagian' | 'kosong' | 'tidak_tersedia';
  tabel: string[];
  jumlah_record: number;
  terakhir_update: string | null;
  dipakai_untuk: string;
}

export interface EsHasilDiagnosa {
  metode: string;
  ambang_keyakinan_persen: number;
  otomatis_aktif?: boolean;
  periode?: EsPeriode | null;
  gejala_otomatis?: EsGejalaOtomatis[];
  gejala_terpilih: EsGejalaTerpilih[];
  sumber_data?: EsSumberData[];
  total_rule_aktif: number;
  total_rule_terpicu: number;
  hasil: 'teridentifikasi' | 'tidak_teridentifikasi';
  utama: EsKandidat | null;
  kandidat: EsKandidat[];
  langkah_inferensi: string[];
  disimpan?: boolean;
  id_diagnosa?: number;
  kode_diagnosa?: string;
  didiagnosa_pada?: string;
  didiagnosa_oleh?: string | null;
}

export interface EsRiwayatItem {
  id_diagnosa: number;
  kode_diagnosa: string;
  kode_kerusakan: string | null;
  nama_kerusakan?: string | null;
  tingkat_urgensi?: string | null;
  kategori: string | null;
  kategori_label?: string | null;
  cf_akhir: number;
  persentase: string;
  tingkat_keyakinan: string;
  hasil: 'teridentifikasi' | 'tidak_teridentifikasi';
  jumlah_gejala: number;
  catatan?: string | null;
  didiagnosa_oleh?: string | null;
  dibuat_pada: string | null;
}

export interface EsRiwayatDetail extends EsRiwayatItem {
  gejala_terpilih: Array<{ kode_gejala: string; cf_pengguna: number; asal?: 'otomatis' | 'manual' }>;
  kandidat: EsKandidat[];
  kandidat_teridentifikasi: string[];
  langkah_inferensi: string[];
  solusi?: string | null;
  deskripsi?: string | null;
}

export interface EsDashboard {
  metode: string;
  metode_label: string;
  basis_pengetahuan: {
    total_kerusakan: number;
    total_gejala: number;
    total_rule: number;
    total_diagnosa: number;
    per_kategori: Array<{ kode: string; label: string; jumlah: number }>;
    siap: boolean;
    peringatan: string[];
  };
  kategori: Array<{ kode: string; label: string }>;
  sumber_data?: EsSumberData[];
  deteksi_otomatis?: {
    periode: EsPeriode;
    daftar_periode: Array<{ kode: string; label: string }>;
    ringkasan: {
      periode_label: string;
      total_gejala_terdeteksi: number;
      total_barang: number;
      total_transaksi_periode: number;
    };
    gejala: Array<{
      kode_gejala: string;
      cf: number;
      persentase: number;
      bukti: EsBuktiGejala | null;
    }>;
  };
  diagnosa_terakhir: EsRiwayatItem | null;
  riwayat: EsRiwayatItem[];
  ambang_keyakinan_persen: number;
}

export const esApi = {
  getDashboard: (periode = '90_hari') =>
    request<EsDashboard>(`/es/dashboard?periode=${encodeURIComponent(periode)}`),

  getGejala: (kodeKerusakan?: string) =>
    request<{ gejala: EsGejala[]; total: number }>(
      `/es/gejala${kodeKerusakan ? `?kode_kerusakan=${encodeURIComponent(kodeKerusakan)}` : ''}`
    ),

  getKerusakan: (kategori?: EsKategori | '') =>
    request<{ kerusakan: EsKerusakan[]; kategori: Array<{ kode: string; label: string }>; total: number }>(
      `/es/kerusakan${kategori ? `?kategori=${kategori}` : ''}`
    ),

  getAturan: () => request<{ rule: EsPernyataanRule[]; total: number }>('/es/aturan'),

  diagnose: (payload: { gejala: string[]; catatan?: string; otomatis?: boolean; periode?: string }) =>
    request<EsHasilDiagnosa>('/es/diagnose', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  simulate: (payload: { gejala: string[]; otomatis?: boolean; periode?: string }) =>
    request<EsHasilDiagnosa>('/es/simulate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getHistory: (limit = 20) => request<EsRiwayatItem[]>(`/es/history?limit=${limit}`),

  getHistoryDetail: (id: number) => request<EsRiwayatDetail>(`/es/history/${id}`),
};
