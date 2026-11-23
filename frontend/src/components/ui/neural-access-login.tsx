import { cn } from "@/lib/utils";

/**
 * Halaman login "Neural Access".
 *
 * Tampilan diadaptasi dari komponen demo: latar hitam dengan blob mercury
 * yang melayang dan saling menyatu (SVG gooey filter), tipografi Space Mono
 * untuk label, serta tombol "mercury drop". Struktur form dibuat props-driven
 * agar komponen ini tetap presentational — pemanggil yang mengurus autentikasi.
 */
export interface NeuralAccessLoginProps {
  /** Nilai input identitas pengguna (username/email). */
  identity: string;
  onIdentityChange: (value: string) => void;
  /** Nilai input password. */
  password: string;
  onPasswordChange: (value: string) => void;
  /** Dipanggil saat form disubmit. */
  onSubmit: () => void;
  /** Sedang memproses login — tombol dinonaktifkan. */
  loading?: boolean;
  /** Pesan gagal login. */
  error?: string | null;
  /** Teks kecil di atas judul, mis. "System Node: 0x992". */
  brandId?: string;
  /** Judul besar dua baris. */
  title?: [string, string];
  /** Label & placeholder field identitas. */
  identityLabel?: string;
  identityPlaceholder?: string;
  /** Label & placeholder field password. */
  passwordLabel?: string;
  passwordPlaceholder?: string;
  /** Teks tombol submit. */
  submitLabel?: string;
  /** Konten tambahan di bawah form (mis. pemilih role atau akun demo). */
  children?: React.ReactNode;
  /** Kiri bawah panel: tautan/footer. */
  footer?: React.ReactNode;
  className?: string;
}

const BLOB_COUNT = 6;

/**
 * Posisi blob dibuat deterministik (bukan Math.random) supaya tampilan
 * stabil antar-render dan tidak memicu hidrasi/reflow acak.
 */
const BLOBS = Array.from({ length: BLOB_COUNT }).map((_, i) => {
  const seeds = [0.37, 0.81, 0.12, 0.64, 0.93, 0.46];
  const seed = seeds[i % seeds.length];
  return {
    size: 150 + seed * 200,
    left: 10 + seed * 80,
    top: 10 + ((seed * 7) % 1) * 80,
    animationDelay: -seed * 20,
    animationDuration: 15 + seed * 15,
  };
});

export default function NeuralAccessLogin({
  identity,
  onIdentityChange,
  password,
  onPasswordChange,
  onSubmit,
  loading = false,
  error = null,
  brandId = "System Node: 0x992",
  title = ["NEURAL", "ACCESS"],
  identityLabel = "User Identity",
  identityPlaceholder = "ID-492-BASE",
  passwordLabel = "Sequence Key",
  passwordPlaceholder = "••••••••",
  submitLabel = "Initialize Stream",
  children,
  footer,
  className,
}: NeuralAccessLoginProps) {
  return (
    <div
      className={cn(
        "neural-login relative flex min-h-full w-full items-center justify-center overflow-hidden bg-[#050505] text-white",
        className
      )}
      style={{ fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif" }}
    >
      <style>{`
        .neural-login {
          --mercury: #e0e0e0;
          --text-dim: rgba(255, 255, 255, 0.5);
          -webkit-font-smoothing: antialiased;
        }

        .neural-login .nl-stage {
          position: absolute;
          inset: 0;
          z-index: 0;
          opacity: 0.6;
          filter: url('#nl-gooey');
        }

        .neural-login .nl-blob {
          position: absolute;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--mercury), #888);
          filter: blur(20px);
          animation: nl-float 20s infinite alternate ease-in-out;
          box-shadow: inset -10px -10px 20px rgba(0, 0, 0, 0.5),
                      10px 10px 30px rgba(255, 255, 255, 0.2);
        }

        @keyframes nl-float {
          0%   { transform: translate(0, 0) scale(1); }
          33%  { transform: translate(10vw, 20vh) scale(1.2); }
          66%  { transform: translate(-5vw, 10vh) scale(0.8); }
          100% { transform: translate(5vw, -10vh) scale(1.1); }
        }

        @media (prefers-reduced-motion: reduce) {
          .neural-login .nl-blob { animation: none; }
          .neural-login .nl-group,
          .neural-login .nl-glow,
          .neural-login .nl-drop { transition: none !important; }
        }

        .neural-login .nl-group {
          position: relative;
          margin-bottom: 28px;
          transition: transform 0.4s cubic-bezier(0.2, 1, 0.3, 1);
        }

        .neural-login .nl-group:focus-within { transform: translateX(10px); }

        .neural-login .nl-label {
          display: block;
          font-family: 'Space Mono', ui-monospace, monospace;
          font-size: 11px;
          color: var(--text-dim);
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .neural-login .nl-input {
          width: 100%;
          background: transparent;
          border: none;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          color: #fff;
          padding: 12px 0;
          font-size: 18px;
          outline: none;
          transition: border-color 0.4s;
        }

        .neural-login .nl-input::placeholder { color: rgba(255, 255, 255, 0.25); }
        .neural-login .nl-input:focus { border-color: rgba(255, 255, 255, 0.3); }

        .neural-login .nl-glow {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 0%;
          height: 2px;
          background: var(--mercury);
          transition: width 0.6s cubic-bezier(0.2, 1, 0.3, 1);
          box-shadow: 0 0 15px var(--mercury);
        }

        .neural-login .nl-input:focus ~ .nl-glow { width: 100%; }

        .neural-login .nl-submit {
          margin-top: 40px;
          position: relative;
          filter: url('#nl-gooey');
        }

        .neural-login .nl-drop {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 100%;
          height: 100%;
          background: var(--mercury);
          transform: translate(-50%, -50%);
          z-index: 1;
          border-radius: 50px;
          transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .neural-login .nl-submit:hover .nl-drop {
          transform: translate(-50%, -50%) scale(1.05, 1.2);
          filter: brightness(1.2);
        }

        .neural-login .nl-btn {
          background: #fff;
          color: #000;
          border: none;
          padding: 18px 40px;
          font-size: 13px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 2px;
          cursor: pointer;
          width: 100%;
          position: relative;
          z-index: 2;
          transition: letter-spacing 0.3s, opacity 0.3s;
        }

        .neural-login .nl-btn:hover:not(:disabled) { letter-spacing: 4px; }
        .neural-login .nl-btn:disabled { cursor: not-allowed; opacity: 0.7; }
      `}</style>

      {/* Filter SVG gooey: membuat blob mercury saling melebur */}
      <svg aria-hidden className="absolute h-0 w-0">
        <defs>
          <filter id="nl-gooey">
            <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      <div aria-hidden className="nl-stage">
        {BLOBS.map((blob, index) => (
          <div
            key={index}
            className="nl-blob"
            style={{
              width: `${blob.size}px`,
              height: `${blob.size}px`,
              left: `${blob.left}%`,
              top: `${blob.top}%`,
              animationDelay: `${blob.animationDelay}s`,
              animationDuration: `${blob.animationDuration}s`,
            }}
          />
        ))}
      </div>

      <main className="relative z-10 w-full max-w-[420px] px-6 py-10">
        <header className="mb-10">
          <span className="mb-2 block font-mono text-[10px] uppercase tracking-[4px] text-white/50">
            {brandId}
          </span>
          <h1 className="text-[clamp(2.2rem,9vw,3rem)] font-extrabold leading-[0.9] tracking-[-2px]">
            {title[0]}
            <br />
            {title[1]}
          </h1>
        </header>

        <form
          autoComplete="off"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <div className="nl-group">
            <label htmlFor="nl-identity" className="nl-label">
              {identityLabel}
            </label>
            <input
              id="nl-identity"
              type="text"
              required
              autoComplete="username"
              className="nl-input"
              placeholder={identityPlaceholder}
              value={identity}
              onChange={(e) => onIdentityChange(e.target.value)}
            />
            <div className="nl-glow" />
          </div>

          <div className="nl-group">
            <label htmlFor="nl-password" className="nl-label">
              {passwordLabel}
            </label>
            <input
              id="nl-password"
              type="password"
              required
              autoComplete="current-password"
              className="nl-input"
              placeholder={passwordPlaceholder}
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
            />
            <div className="nl-glow" />
          </div>

          {error && (
            <p
              role="alert"
              className="mb-4 border-l-2 border-red-500 bg-red-500/10 px-3 py-2 text-[12px] text-red-300"
            >
              {error}
            </p>
          )}

          <div className="nl-submit">
            <div className="nl-drop" />
            <button type="submit" className="nl-btn" disabled={loading}>
              {loading ? "Menghubungkan…" : submitLabel}
            </button>
          </div>
        </form>

        {children && <div className="mt-8">{children}</div>}

        {footer && (
          <footer className="mt-8 flex items-center justify-between font-mono text-[10px] tracking-[1px] text-white/50">
            {footer}
          </footer>
        )}
      </main>
    </div>
  );
}
