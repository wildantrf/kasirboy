import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/icons';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth">
      <div className="auth__panel">
        <Link to="/masuk" className="auth__brand" aria-label="MejaFlow">
          <span className="brand__mark" aria-hidden="true">
            M
          </span>
          <span>
            <span className="brand__name">MejaFlow</span>
            <span className="brand__tag">Kasir restoran multi-cabang</span>
          </span>
        </Link>

        <div className="auth__content">{children}</div>

        <p className="auth__legal">
          Prototipe frontend MejaFlow. Tidak ada pembayaran nyata; data demo tersimpan di perangkat ini.
        </p>
      </div>

      <aside className="auth__art" aria-hidden="true">
        <div className="auth__art-head">
          <p className="eyebrow">Satu alur, tiga meja</p>
          <p className="auth__art-title">
            Pesanan lunas masuk dapur. Tunai tetap jalan saat koneksi putus.
          </p>
        </div>

        <div className="receipt-mini">
          <div className="receipt-mini__head">
            <span>Kopi Senja — Kemang</span>
            <span className="receipt-mini__badge">Lunas</span>
          </div>
          <div className="receipt-mini__row">
            <span>2 × Kopi Susu Senja</span>
            <span className="money">Rp52.000</span>
          </div>
          <div className="receipt-mini__row">
            <span>1 × Nasi Goreng Kampung</span>
            <span className="money">Rp38.000</span>
          </div>
          <div className="receipt-mini__rule" />
          <div className="receipt-mini__row receipt-mini__row--muted">
            <span>Pajak 10%</span>
            <span className="money">Rp9.000</span>
          </div>
          <div className="receipt-mini__row receipt-mini__row--muted">
            <span>Layanan 5%</span>
            <span className="money">Rp4.500</span>
          </div>
          <div className="receipt-mini__row receipt-mini__row--muted">
            <span>Pembulatan tunai</span>
            <span className="money">+Rp500</span>
          </div>
          <div className="receipt-mini__row receipt-mini__row--total">
            <span>Total</span>
            <span className="money">Rp104.000</span>
          </div>
          <p className="receipt-mini__foot">KMG-004 · Meja 3 · 12:04</p>
        </div>

        <ul className="auth__points">
          <li>
            <Icon name="check" size={16} /> Lunas sebelum jadi pekerjaan dapur
          </li>
          <li>
            <Icon name="check" size={16} /> KDS per cabang, bukan per bisnis
          </li>
          <li>
            <Icon name="check" size={16} /> Tunai offline tersimpan, bukan sukses palsu
          </li>
        </ul>
      </aside>
    </div>
  );
}
