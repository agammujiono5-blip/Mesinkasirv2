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
  pembelian_bulan_ini: number;
  laba_kotor_bulan_ini: number;
  total_barang: number;
  total_supplier: number;
  total_pelanggan: number;
  barang_stok_menipis_count: number;
  barang_terlaris: Array<{
    id_barang: number;
    total_terjual: number;
    total_pendapatan: number;
    barang?: BarangItem;
  }>;
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

// Base Fetch Function
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
    if (response.status === 401) {
      authStorage.removeToken();
    }
    const message = data.message || 'Terjadi kesalahan pada server';
    const error: Error & { errors?: Record<string, string[]> } = new Error(message);
    error.errors = data.errors;
    throw error;
  }

  return data.data !== undefined ? data.data : data;
}

// API Services
export const authApi = {
  login: (identifier: string, password: string) =>
    request<{ user: UserSession; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    }),
  register: (payload: { nama: string; username: string; email: string; password: string; password_confirmation: string; no_hp?: string; alamat?: string; role?: string }) =>
    request<{ user: UserSession; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  profile: () => request<UserSession>('/auth/profile'),
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
    return request<{ data: UserSession[]; total: number } | UserSession[]>(`/users?${query.toString()}`);
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
