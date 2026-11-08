import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppActions, useAppState } from '../state/AppProvider';
import { useToast } from '../components/toast';
import { Button, Field, Note, TextInput } from '../components/ui';
import { Icon } from '../components/icons';
import { describeError } from '../lib/errors';

const STEPS = ['Akun', 'Verifikasi', 'Bisnis'];

export function OnboardingPage() {
  const state = useAppState();
  const actions = useAppActions();
  const navigate = useNavigate();
  const { pushToast } = useToast();

  const [businessName, setBusinessName] = useState('');
  const [branchName, setBranchName] = useState('Cabang Utama');
  const [address, setAddress] = useState('');
  const [taxRate, setTaxRate] = useState('10');
  const [serviceRate, setServiceRate] = useState('5');
  const [error, setError] = useState<string | null>(null);

  const user = state.users.find((candidate) => candidate.id === state.session?.userId);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      actions.completeOnboarding({
        businessName,
        branchName,
        branchAddress: address,
        taxRate: Number(taxRate) || 0,
        serviceRate: Number(serviceRate) || 0,
      });
      pushToast({
        tone: 'success',
        title: 'Bisnis siap',
        message: 'Paket Free aktif. Tambahkan produk pertama Anda di menu.',
      });
      navigate('/', { replace: true });
    } catch (caught) {
      setError(describeError(caught));
    }
  }

  return (
    <div className="onboarding">
      <header className="onboarding__top">
        <div className="auth__brand">
          <span className="brand__mark" aria-hidden="true">
            M
          </span>
          <span>
            <span className="brand__name">MejaFlow</span>
            <span className="brand__tag">Kasir restoran multi-cabang</span>
          </span>
        </div>
        <ol className="step-markers" aria-label="Langkah onboarding">
          {STEPS.map((step, index) => (
            <li key={step} className={index <= 1 ? 'is-done' : 'is-current'}>
              <span className="step-markers__dot" aria-hidden="true">
                {index <= 1 ? <Icon name="check" size={12} /> : index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </header>

      <main className="onboarding__main">
        <section className="onboarding__intro">
          <p className="eyebrow">Langkah 3 dari 3</p>
          <h1 className="display">Bisnis dan cabang pertama.</h1>
          <p className="onboarding__lede">
            {user ? `${user.name}, ` : ''}atur identitas bisnis dan dasar biaya cabang. Pajak dan layanan dapat
            diubah kemudian; setiap perubahan menaikkan versi konfigurasi cabang dan tidak menulis ulang snapshot
            transaksi lama.
          </p>

          <ul className="feature-list">
            <li>
              <Icon name="check" size={16} /> Paket Free: 1 cabang, 1 staf di luar pemilik.
            </li>
            <li>
              <Icon name="check" size={16} /> Katalog dan harga disimpan per cabang.
            </li>
            <li>
              <Icon name="check" size={16} /> KDS hanya aktif bila cabang punya staf dapur.
            </li>
            <li>
              <Icon name="alert" size={16} /> Trial 30 hari diaktifkan manual, tanpa autodebit.
            </li>
          </ul>
        </section>

        <section className="card onboarding__card">
          <div className="card__head">
            <div>
              <p className="eyebrow">Profil bisnis</p>
              <h2 className="card__title">Data awal</h2>
            </div>
          </div>

          <form className="form-grid" onSubmit={handleSubmit} noValidate>
            <Field label="Nama bisnis">
              {({ id, describedBy }) => (
                <TextInput
                  id={id}
                  aria-describedby={describedBy}
                  placeholder="Contoh: Kopi Senja Nusantara"
                  value={businessName}
                  onChange={(event) => setBusinessName(event.target.value)}
                  required
                />
              )}
            </Field>

            <Field label="Nama cabang pertama" hint="Identitas cabang tampil di kasir, menu, pesanan, dan laporan.">
              {({ id, describedBy }) => (
                <TextInput
                  id={id}
                  aria-describedby={describedBy}
                  value={branchName}
                  onChange={(event) => setBranchName(event.target.value)}
                  required
                />
              )}
            </Field>

            <Field label="Alamat cabang">
              {({ id, describedBy }) => (
                <TextInput
                  id={id}
                  aria-describedby={describedBy}
                  placeholder="Jalan, nomor, kota"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                />
              )}
            </Field>

            <div className="form-grid form-grid--2">
              <Field label="Pajak (%)" hint="Dihitung atas dasar setelah diskon.">
                {({ id, describedBy }) => (
                  <TextInput
                    id={id}
                    aria-describedby={describedBy}
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={taxRate}
                    onChange={(event) => setTaxRate(event.target.value)}
                  />
                )}
              </Field>

              <Field label="Biaya layanan (%)" hint="Hanya untuk dine-in pada pengaturan awal ini.">
                {({ id, describedBy }) => (
                  <TextInput
                    id={id}
                    aria-describedby={describedBy}
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={serviceRate}
                    onChange={(event) => setServiceRate(event.target.value)}
                  />
                )}
              </Field>
            </div>

            {error ? (
              <Note tone="danger" title="Bisnis belum dibuat">
                {error}
              </Note>
            ) : null}

            <div className="form-actions">
              <Button type="submit" variant="primary" size="lg" iconAfter="arrow-right">
                Buat bisnis & cabang
              </Button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
