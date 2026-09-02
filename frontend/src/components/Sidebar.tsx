type Page =
  | "dashboard"
  | "barang"
  | "kategori"
  | "supplier"
  | "transaksi"
  | "pembelian"
  | "diskon"
  | "stok-log"
  | "users"
  | "laporan";

interface SidebarProps {
  current: Page;
  onNavigate: (page: Page) => void;
}

const navGroups = [
  {
    label: "Utama",
    items: [
      { id: "dashboard", label: "Dashboard", icon: DashboardIcon },
    ],
  },
  {
    label: "Penjualan",
    items: [
      { id: "transaksi", label: "Transaksi", icon: TransaksiIcon },
      { id: "diskon", label: "Diskon", icon: DiskonIcon },
    ],
  },
  {
    label: "Pembelian",
    items: [
      { id: "pembelian", label: "Pembelian", icon: PembelianIcon },
      { id: "supplier", label: "Supplier", icon: SupplierIcon },
    ],
  },
  {
    label: "Inventori",
    items: [
      { id: "barang", label: "Barang", icon: BarangIcon },
      { id: "kategori", label: "Kategori", icon: KategoriIcon },
      { id: "stok-log", label: "Log Stok", icon: StokLogIcon },
    ],
  },
  {
    label: "Pengaturan",
    items: [
      { id: "users", label: "Pengguna", icon: UsersIcon },
      { id: "laporan", label: "Laporan", icon: LaporanIcon },
    ],
  },
];

export default function Sidebar({ current, onNavigate }: SidebarProps) {
  return (
    <aside className="w-56 shrink-0 h-full flex flex-col" style={{ background: "#0f172a" }}>
      {/* Brand */}
      <div className="px-5 py-5 border-b" style={{ borderColor: "#1e293b" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#2563eb" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M2 8h8M2 12h10" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-none">KasirPro</p>
            <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>v2.0</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest px-2 mb-1.5" style={{ color: "#475569" }}>
              {group.label}
            </p>
            {group.items.map((item) => {
              const active = current === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id as Page)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors mb-0.5 text-left"
                  style={{
                    background: active ? "#1e3a5f" : "transparent",
                    color: active ? "#93c5fd" : "#94a3b8",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLButtonElement).style.background = "#1e293b";
                      (e.currentTarget as HTMLButtonElement).style.color = "#cbd5e1";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                      (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8";
                    }
                  }}
                >
                  <item.icon active={active} />
                  {item.label}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t" style={{ borderColor: "#1e293b" }}>
        <div className="flex items-center gap-2.5 px-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white" style={{ background: "#7c3aed" }}>
            A
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">Admin</p>
            <p className="text-xs" style={{ color: "#64748b" }}>Super Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function DashboardIcon({ active }: { active: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1" y="1" width="5.5" height="5.5" rx="1" fill={active ? "#93c5fd" : "#64748b"} />
      <rect x="8.5" y="1" width="5.5" height="5.5" rx="1" fill={active ? "#93c5fd" : "#64748b"} />
      <rect x="1" y="8.5" width="5.5" height="5.5" rx="1" fill={active ? "#93c5fd" : "#64748b"} />
      <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1" fill={active ? "#93c5fd" : "#64748b"} />
    </svg>
  );
}

function TransaksiIcon({ active }: { active: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1" y="1" width="13" height="13" rx="2" stroke={active ? "#93c5fd" : "#64748b"} strokeWidth="1.2" />
      <path d="M4 5h7M4 7.5h5M4 10h6" stroke={active ? "#93c5fd" : "#64748b"} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function DiskonIcon({ active }: { active: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M5 5l5 5M5.5 5a.5.5 0 100-1 .5.5 0 000 1zM9.5 10a.5.5 0 100-1 .5.5 0 000 1z" stroke={active ? "#93c5fd" : "#64748b"} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M1.5 7.5a6 6 0 1111.999 0A6 6 0 011.5 7.5z" stroke={active ? "#93c5fd" : "#64748b"} strokeWidth="1.2" />
    </svg>
  );
}

function PembelianIcon({ active }: { active: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M2 3h11l-1.5 7H3.5L2 3z" stroke={active ? "#93c5fd" : "#64748b"} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M1 1h1.5M5.5 12.5a.5.5 0 100 1 .5.5 0 000-1zM10.5 12.5a.5.5 0 100 1 .5.5 0 000-1z" stroke={active ? "#93c5fd" : "#64748b"} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function SupplierIcon({ active }: { active: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M1 11V6l5-4 5 4v5H1z" stroke={active ? "#93c5fd" : "#64748b"} strokeWidth="1.2" strokeLinejoin="round" />
      <rect x="5" y="8" width="3" height="3" rx="0.5" stroke={active ? "#93c5fd" : "#64748b"} strokeWidth="1.2" />
      <path d="M11 11h2V8l-2-1.5" stroke={active ? "#93c5fd" : "#64748b"} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BarangIcon({ active }: { active: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M7.5 1L13 4v7l-5.5 3L2 11V4L7.5 1z" stroke={active ? "#93c5fd" : "#64748b"} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M7.5 1v13M2 4l5.5 3L13 4" stroke={active ? "#93c5fd" : "#64748b"} strokeWidth="1.2" />
    </svg>
  );
}

function KategoriIcon({ active }: { active: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1" y="1" width="5" height="5" rx="1" stroke={active ? "#93c5fd" : "#64748b"} strokeWidth="1.2" />
      <rect x="9" y="1" width="5" height="5" rx="1" stroke={active ? "#93c5fd" : "#64748b"} strokeWidth="1.2" />
      <rect x="1" y="9" width="5" height="5" rx="1" stroke={active ? "#93c5fd" : "#64748b"} strokeWidth="1.2" />
      <path d="M9 11.5h5M11.5 9v5" stroke={active ? "#93c5fd" : "#64748b"} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function StokLogIcon({ active }: { active: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M7.5 1.5v4M10.5 3l-3 2.5M4.5 3l3 2.5" stroke={active ? "#93c5fd" : "#64748b"} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M1 7h13M1 10h13M1 13h8" stroke={active ? "#93c5fd" : "#64748b"} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function UsersIcon({ active }: { active: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="5.5" cy="4.5" r="2.5" stroke={active ? "#93c5fd" : "#64748b"} strokeWidth="1.2" />
      <path d="M1 13c0-2.5 2-4.5 4.5-4.5S10 10.5 10 13" stroke={active ? "#93c5fd" : "#64748b"} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M10.5 2.5a2.5 2.5 0 010 4M12 9c1.5.5 2.5 2 2.5 3.5" stroke={active ? "#93c5fd" : "#64748b"} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function LaporanIcon({ active }: { active: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1" y="1" width="13" height="13" rx="1.5" stroke={active ? "#93c5fd" : "#64748b"} strokeWidth="1.2" />
      <path d="M4 10V7M7 10V5M10 10V8" stroke={active ? "#93c5fd" : "#64748b"} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
