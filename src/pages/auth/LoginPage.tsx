import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from './AuthLayout';
import { useAppActions } from '../../state/AppProvider';
import { useToast } from '../../components/toast';
import { Button, Field, Note, TextInput } from '../../components/ui';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../../data/seed';
import { AppError, describeError } from '../../lib/errors';

export function LoginPage() {
  const actions = useAppActions();
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function signIn(nextEmail: string, nextPassword: string) {
    setBusy(true);
    setError(null);
    try {
      const session = actions.login(nextEmail, nextPassword);
      pushToast({
        tone: 'success',
        title: 'Masuk berhasil',
        message: session.businessId ? 'Selamat datang kembali.' : 'Lanjutkan membuat bisnis.',
      });
      navigate(session.businessId ? '/' : '/onboarding/bisnis', { replace: true });
    } catch (caught) {
      if (caught instanceof AppError && caught.code === 'auth/unverified') {
        navigate('/verifikasi-email');
        return;
      }
      setError(describeError(caught));
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    signIn(email, password);
  }

  return (
    <AuthLayout>
      <div className="auth-card">
        <p className="eyebrow">Masuk</p>
        <h1 className="auth-title">Kembali ke meja kasir.</h1>
        <p className="auth-subtitle">
          Pemilik memakai email dan kata sandi yang sudah diverifikasi. Staf memakai akun yang dibuat manajer.
        </p>

        <form className="form-grid" onSubmit={handleSubmit} noValidate>
          <Field label="Email">
            {({ id, describedBy }) => (
              <TextInput
                id={id}
                aria-describedby={describedBy}
                type="email"
                autoComplete="email"
                placeholder="nama@bisnis.id"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            )}
          </Field>

          <Field label="Kata sandi">
            {({ id, describedBy }) => (
              <TextInput
                id={id}
                aria-describedby={describedBy}
                type="password"
                autoComplete="current-password"
                placeholder="Minimal 8 karakter"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            )}
          </Field>

          {error ? (
            <Note tone="danger" title="Tidak dapat masuk">
              {error}
            </Note>
          ) : null}

          <Button type="submit" variant="primary" size="lg" fullWidth disabled={busy}>
            {busy ? 'Memeriksa…' : 'Masuk'}
          </Button>
        </form>

        <p className="auth-switch">
          Belum punya akun? <Link to="/daftar">Daftar sebagai pemilik</Link>
        </p>
      </div>

      <div className="demo-accounts">
        <div className="row-between">
          <p className="eyebrow">Akun demo</p>
          <span className="small muted">Kata sandi: {DEMO_PASSWORD}</span>
        </div>
        <div className="demo-accounts__grid">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              className="demo-account"
              onClick={() => signIn(account.email, DEMO_PASSWORD)}
            >
              <span className="demo-account__role">{account.role}</span>
              <span className="demo-account__name">{account.name}</span>
              <span className="demo-account__hint">{account.hint}</span>
            </button>
          ))}
        </div>
        <p className="demo-accounts__note">
          Peran staf hanya melihat permukaan yang diizinkan, termasuk KDS per cabang dan penyerahan takeaway.
        </p>
      </div>
    </AuthLayout>
  );
}
