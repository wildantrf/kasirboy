import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from './AuthLayout';
import { useAppState, useAppActions } from '../../state/AppProvider';
import { useToast } from '../../components/toast';
import { Button, Field, Note, TextInput } from '../../components/ui';
import { describeError } from '../../lib/errors';

export function VerifyEmailPage() {
  const state = useAppState();
  const actions = useAppActions();
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const pendingUser = state.users.find((user) => user.id === state.pendingVerificationUserId);
  const demoCode = state.demoVerificationCode;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      actions.verifyEmail(code);
      pushToast({
        tone: 'success',
        title: 'Email terverifikasi',
        message: 'Sekarang buat bisnis dan cabang pertama Anda.',
      });
      navigate('/onboarding/bisnis', { replace: true });
    } catch (caught) {
      setError(describeError(caught));
    }
  }

  function handleResend() {
    try {
      actions.resendVerification();
      setResent(true);
      pushToast({ tone: 'info', title: 'Kode verifikasi dikirim ulang (demo)' });
    } catch (caught) {
      pushToast({ tone: 'error', title: 'Gagal mengirim ulang', message: describeError(caught) });
    }
  }

  return (
    <AuthLayout>
      <div className="auth-card">
        <p className="eyebrow">Verifikasi email</p>
        <h1 className="auth-title">Satu langkah sebelum buka meja.</h1>

        {!pendingUser ? (
          <>
            <p className="auth-subtitle">
              Tidak ada pendaftaran yang menunggu verifikasi pada perangkat ini. Masuk atau daftar terlebih dahulu.
            </p>
            <div className="inline">
              <Link to="/masuk">
                <Button variant="primary">Ke halaman masuk</Button>
              </Link>
              <Link to="/daftar">
                <Button variant="ghost">Daftar</Button>
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="auth-subtitle">
              Kode 6 digit dikirim ke <strong>{pendingUser.email}</strong>. Bisnis tidak dapat dipakai sebelum email
              terverifikasi.
            </p>

            <form className="form-grid" onSubmit={handleSubmit} noValidate>
              <Field label="Kode verifikasi" hint="Masukkan 6 digit dari email.">
                {({ id, describedBy }) => (
                  <TextInput
                    id={id}
                    aria-describedby={describedBy}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="000000"
                    className="input--code"
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                  />
                )}
              </Field>

              {error ? (
                <Note tone="danger" title="Kode tidak diterima">
                  {error}
                </Note>
              ) : null}

              <Button type="submit" variant="primary" size="lg" fullWidth disabled={code.length !== 6}>
                Verifikasi email
              </Button>
            </form>

            <Note tone="info" title="Demo: kode ditampilkan di sini">
              Pada produksi, kode dikirim lewat layanan email transaksional dan tidak pernah ditampilkan di UI.{' '}
              <strong className="code-chip">{demoCode ?? '------'}</strong>
            </Note>

            <div className="inline">
              <Button variant="ghost" size="sm" onClick={handleResend}>
                Kirim ulang kode
              </Button>
              {resent ? <span className="small muted">Kode baru dibuat.</span> : null}
            </div>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
