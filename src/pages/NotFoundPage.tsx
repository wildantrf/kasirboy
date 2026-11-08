import { Link } from 'react-router-dom';
import { Icon } from '../components/icons';

export function NotFoundPage() {
  return (
    <div className="notfound">
      <span className="notfound__mark" aria-hidden="true">
        <Icon name="compass" size={26} />
      </span>
      <p className="eyebrow">404</p>
      <h1 className="display">Meja ini tidak ada.</h1>
      <p className="muted">Alamat yang dibuka tidak cocok dengan halaman MejaFlow mana pun.</p>
      <Link to="/" className="btn btn--primary">
        Kembali ke ringkasan
      </Link>
    </div>
  );
}
