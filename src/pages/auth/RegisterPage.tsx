import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from './AuthLayout';
import { useAppActions } from '../../state/AppProvider';
import { useToast } from '../../components/toast';
import { Button, Field, Note, TextInput } from '../../components/ui';
import { describeError } from '../../lib/errors';

export function RegisterPage() {
  const actions = useAppActions();
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    try {
      actions.register({ name, email, password });
      pushToast({
        tone: 'info',
        title: 'Akun dibuat',
        message: 'Verifikasi email diperlukan sebelum bisnis dapat digunakan.',
      });
      navigate('/verifikasi-email');
    } catch (caught) {
      setError(describeError(caught));
    }
  }

  return (
    <AuthLayout>
      <div className="auth-card">
        <p className="eyebrow">Daftar pemilik</p>
        <h1 className="auth-title">Mulai dari satu cabang.</h1>
        <p className="auth-subtitle">
          Paket Free berlaku permanen untuk 1 cabang dan 1 staf. Trial Berbayar tidak dimulai otomatis dan tidak
          meminta metode pembayaran.
        </p>

        <form className="form-grid" onSubmit={handleSubmit} noValidate>
          <Field label="Nama lengkap">
            {({ id, describedBy }) => (
              <TextInput
                id={id}
                aria-describedby={describedBy}
                autoComplete="name"
                placeholder="Nama Anda"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            )}
          </Field>

          <Field label="Email" hint="Email wajib diverifikasi sebelum bisnis aktif.">
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

          <Field label="Kata sandi" hint="Minimal 8 karakter.">
            {({ id, describedBy }) => (
              <TextInput
                id={id}
                aria-describedby={describedBy}
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            )}
          </Field>

          <Field label="Ulangi kata sandi">
            {({ id, describedBy }) => (
              <TextInput
                id={id}
                aria-describedby={describedBy}
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                required
              />
            )}
          </Field>

          {error ? (
            <Note tone="danger" title="Pendaftaran belum selesai">
              {error}
            </Note>
          ) : null}

          <Button type="submit" variant="primary" size="lg" fullWidth>
            Buat akun
          </Button>
        </form>

        <p className="auth-switch">
          Sudah punya akun? <Link to="/masuk">Masuk</Link>
        </p>
      </div>
    </AuthLayout>
  );
}
