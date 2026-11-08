import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, useAppState } from '../state/AppProvider';
import { useToast } from '../components/toast';
import {
  Badge,
  Button,
  Card,
  CardHead,
  Field,
  KeyValue,
  Note,
  SegmentedControl,
  Select,
  Stat,
} from '../components/ui';
import { Icon } from '../components/icons';
import { Money } from '../components/domain';
import {
  FREE_LIMITS,
  PAID_LIMITS,
  PLAN_LABEL,
  PLAN_PRICES,
  TRIAL_DAYS,
  entitlementsFor,
} from '../lib/entitlements';
import { branchesOf } from '../lib/selectors';
import { can } from '../lib/permissions';
import { describeError } from '../lib/errors';
import { formatDateTime } from '../lib/format';
import type { BillingPeriod } from '../types/domain';

export function BillingPage() {
  const state = useAppState();
  const { actions } = useApp();
  const { pushToast } = useToast();
  const navigate = useNavigate();

  const [period, setPeriod] = useState<BillingPeriod>('monthly');
  const [downgradeBranch, setDowngradeBranch] = useState('');
  const [downgradeStaff, setDowngradeStaff] = useState('');
  const [resetBusy, setResetBusy] = useState(false);

  const session = state.session;
  const businessId = session?.businessId ?? '';
  const subscription = state.subscriptions.find((item) => item.businessId === businessId);
  const entitlements = entitlementsFor(subscription);
  const business = state.businesses.find((item) => item.id === businessId);
  const branches = useMemo(
    () => (businessId ? branchesOf(state, businessId) : []),
    [state, businessId],
  );
  const invoices = state.invoices
    .filter((invoice) => invoice.businessId === businessId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const merchant = state.merchantConnections.find((item) => item.businessId === businessId);
  const trial = state.trials.find((item) => item.businessId === businessId);

  if (!session) {
    return null;
  }

  if (!can(session.role, 'billing.manage')) {
    return (
      <Card>
        <CardHead title="Langganan hanya dikelola pemilik" description="Manajer dan staf tidak melihat penagihan SaaS." />
      </Card>
    );
  }

  const trialDaysLeft = subscription?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(subscription.trialEndsAt).getTime() - Date.now()) / 86_400_000))
    : 0;

  const staffForBranch = state.staff.filter((member) => member.branchId === downgradeBranch);
  const unpaid = invoices.find((invoice) => invoice.state === 'unpaid');

  function handleTrial() {
    try {
      actions.activateTrial();
      pushToast({
        tone: 'success',
        title: 'Trial 30 hari aktif',
        message: 'Tanpa metode pembayaran dan tanpa autodebit. Aktivasi QRIS tetap terpisah.',
      });
    } catch (error) {
      pushToast({ tone: 'error', title: 'Trial tidak dapat diaktifkan', message: describeError(error) });
    }
  }

  function handleInvoice() {
    try {
      const invoice = actions.createInvoice(period);
      pushToast({
        tone: 'info',
        title: 'Tagihan dibuat',
        message: `${invoice.priceSnapshot} · jatuh tempo ${formatDateTime(invoice.dueAt)}`,
      });
    } catch (error) {
      pushToast({ tone: 'error', title: 'Tagihan tidak dibuat', message: describeError(error) });
    }
  }

  function handlePay(invoiceId: string) {
    try {
      actions.payInvoice(invoiceId);
      pushToast({
        tone: 'success',
        title: 'Pembayaran tagihan diverifikasi',
        message: 'Paket aktif satu kali; callback ulang tidak memperpanjang dua kali.',
      });
    } catch (error) {
      pushToast({ tone: 'error', title: 'Pembayaran gagal', message: describeError(error) });
    }
  }

  function handleConnect() {
    try {
      actions.connectQris();
      pushToast({
        tone: 'success',
        title: 'Kanal QRIS sandbox aktif (simulasi)',
        message: 'Produksi memerlukan kontrak & bukti aktivasi merchant yang sah.',
      });
    } catch (error) {
      pushToast({ tone: 'error', title: 'Kanal gagal diaktifkan', message: describeError(error) });
    }
  }

  function handleDowngrade() {
    try {
      actions.selectDowngrade(downgradeBranch, downgradeStaff);
      pushToast({
        tone: 'success',
        title: 'Paket Free aktif',
        message: 'Satu cabang + satu staf tetap beroperasi. Data lain disimpan.',
      });
    } catch (error) {
      pushToast({ tone: 'error', title: 'Pilihan belum disimpan', message: describeError(error) });
    }
  }

  async function handleReset() {
    setResetBusy(true);
    try {
      await actions.resetDemo();
      pushToast({ tone: 'info', title: 'Data demo dimuat ulang' });
      navigate('/masuk', { replace: true });
    } finally {
      setResetBusy(false);
    }
  }

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="eyebrow">Paket & tagihan</p>
          <h1 className="page-title">Langganan</h1>
          <p className="page-lede">
            Free permanen atau satu paket Berbayar. Tidak ada autodebit; setiap periode dibayar lewat tagihan.
          </p>
        </div>
        <Badge
          tone={
            entitlements.state === 'active'
              ? 'success'
              : entitlements.state === 'trial'
                ? 'info'
                : entitlements.state === 'expired'
                  ? 'danger'
                  : 'neutral'
          }
        >
          {entitlements.state === 'active'
            ? 'Berbayar aktif'
            : entitlements.state === 'trial'
              ? 'Trial Berbayar'
              : entitlements.state === 'expired'
                ? 'Masa berbayar berakhir'
                : 'Free'}
        </Badge>
      </header>

      <div className="stat-grid stat-grid--three">
        <Stat
          label="Status paket"
          value={PLAN_LABEL[entitlements.plan]}
          meta={
            subscription?.validUntil
              ? `Aktif sampai ${formatDateTime(subscription.validUntil)}`
              : subscription?.trialEndsAt
                ? `${trialDaysLeft} hari trial tersisa`
                : 'Free permanen'
          }
        />
        <Stat label="Batas cabang" value={`${branches.length} / ${entitlements.branchLimit}`} meta="Data cabang nonaktif tidak dihapus" />
        <Stat
          label="Staf per cabang"
          value={`${state.staff.filter((member) => member.businessId === businessId && member.status === 'active').length} aktif`}
          meta={`Batas ${entitlements.plan === 'free' ? FREE_LIMITS.staffTotal + ' per bisnis' : PAID_LIMITS.staffPerBranch + ' per cabang'}`}
        />
      </div>

      {entitlements.needsDowngradeSelection ? (
        <Card className="card--tint">
          <CardHead
            eyebrow="Transisi wajib"
            title="Pilih satu cabang dan satu staf untuk paket Free"
            description="Akses operasional cabang/staf lain dinonaktifkan tanpa menghapus data. Pesanan lunas tidak dihapus atau ditandai belum bayar."
          />
          <div className="form-grid form-grid--2">
            <Field label="Cabang yang tetap aktif">
              {({ id, describedBy }) => (
                <Select
                  id={id}
                  aria-describedby={describedBy}
                  value={downgradeBranch}
                  onChange={(event) => {
                    setDowngradeBranch(event.target.value);
                    setDowngradeStaff(
                      state.staff.find((member) => member.branchId === event.target.value)?.id ?? '',
                    );
                  }}
                >
                  <option value="">Pilih cabang…</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Staf yang tetap aktif">
              {({ id, describedBy }) => (
                <Select
                  id={id}
                  aria-describedby={describedBy}
                  value={downgradeStaff}
                  onChange={(event) => setDowngradeStaff(event.target.value)}
                  disabled={!downgradeBranch}
                >
                  <option value="">Pilih staf…</option>
                  {staffForBranch.map((member) => {
                    const user = state.users.find((candidate) => candidate.id === member.userId);
                    return (
                      <option key={member.id} value={member.id}>
                        {user?.name} · {member.role}
                      </option>
                    );
                  })}
                </Select>
              )}
            </Field>
          </div>
          <div className="form-actions">
            <Button
              variant="primary"
              onClick={handleDowngrade}
              disabled={!downgradeBranch || !downgradeStaff}
            >
              Aktifkan pilihan Free
            </Button>
          </div>
          <Note tone="warning" title="TBD-04 masih terbuka">
            Perilaku sebelum pemilihan, pesanan QRIS pending, dan cara reaktivasi cabang/staf belum diputuskan PRD.
            Aplikasi menahan operasional sampai pilihan dibuat dan tidak menghapus data.
          </Note>
        </Card>
      ) : null}

      <div className="plan-grid">
        <article className={`plan-card ${entitlements.plan === 'free' ? 'plan-card--current' : ''}`}>
          <div className="plan-card__head">
            <p className="eyebrow">Paket</p>
            <h2 className="plan-card__name">Free</h2>
            <p className="plan-card__price money">Rp0</p>
            <p className="small muted">Permanen</p>
          </div>
          <ul className="feature-list">
            <li><Icon name="check" size={15} /> 1 cabang, 1 staf di luar pemilik</li>
            <li><Icon name="check" size={15} /> Kasir dine-in & takeaway</li>
            <li><Icon name="check" size={15} /> Tunai + digital manual (kasir)</li>
            <li><Icon name="check" size={15} /> KDS per cabang bila ada staf dapur</li>
            <li><Icon name="close" size={15} /> QRIS terintegrasi & QR meja</li>
          </ul>
          <Badge tone={entitlements.plan === 'free' ? 'success' : 'neutral'}>
            {entitlements.plan === 'free' ? 'Paket saat ini' : 'Turun otomatis saat masa berbayar habis'}
          </Badge>
        </article>

        <article className={`plan-card plan-card--featured ${entitlements.plan === 'paid' ? 'plan-card--current' : ''}`}>
          <div className="plan-card__head">
            <p className="eyebrow">Paket</p>
            <h2 className="plan-card__name">Berbayar</h2>
            <p className="plan-card__price money">
              <Money value={PLAN_PRICES[period]} />
            </p>
            <p className="small muted">{period === 'monthly' ? 'per bulan' : 'per tahun'} · harga contoh (TBD-01)</p>
          </div>
          <ul className="feature-list">
            <li><Icon name="check" size={15} /> Hingga 5 cabang</li>
            <li><Icon name="check" size={15} /> Hingga 10 staf per cabang</li>
            <li><Icon name="check" size={15} /> Tunai atau QRIS terintegrasi</li>
            <li><Icon name="check" size={15} /> Pelanggan memesan via QR meja</li>
            <li><Icon name="check" size={15} /> Trial 30 hari sekali per bisnis</li>
          </ul>

          <div className="plan-card__actions">
            <SegmentedControl
              label="Periode tagihan"
              size="sm"
              value={period}
              onChange={setPeriod}
              options={[
                { value: 'monthly', label: 'Bulanan' },
                { value: 'yearly', label: 'Tahunan' },
              ]}
            />
            <Button variant="primary" onClick={handleInvoice} disabled={Boolean(unpaid)}>
              Buat tagihan
            </Button>
          </div>
        </article>
      </div>

      {!trial && entitlements.state !== 'active' ? (
        <Card>
          <CardHead
            eyebrow="Trial"
            title={`Coba fitur Berbayar selama ${TRIAL_DAYS} hari`}
            description="Diaktifkan manual oleh pemilik, satu kali per bisnis, tanpa kartu dan tanpa autodebit. Email pemilik tetap wajib terverifikasi."
          />
          <Button variant="secondary" icon="spark" onClick={handleTrial}>
            Aktifkan trial
          </Button>
        </Card>
      ) : null}

      <div className="billing-grid">
        <Card>
          <CardHead
            title="Tagihan SaaS"
            description="Pemilik membayar tagihan; aktivasi paket setelah pembayaran terverifikasi. Tidak ada penarikan otomatis."
            actions={<Badge tone="neutral">{invoices.length} tagihan</Badge>}
          />
          {invoices.length === 0 ? (
            <p className="small muted">Belum ada tagihan pada bisnis ini.</p>
          ) : (
            <ul className="invoice-list">
              {invoices.map((invoice) => (
                <li key={invoice.id}>
                  <div>
                    <strong>{invoice.priceSnapshot}</strong>
                    <p className="small muted">
                      {invoice.providerRef} · dibuat {formatDateTime(invoice.createdAt)}
                      {invoice.paidAt ? ` · dibayar ${formatDateTime(invoice.paidAt)}` : ''}
                    </p>
                  </div>
                  <div className="invoice-list__right">
                    <Money value={invoice.amount} />
                    {invoice.state === 'paid' ? (
                      <Badge tone="success">Dibayar</Badge>
                    ) : (
                      <Button size="sm" onClick={() => handlePay(invoice.id)}>
                        Bayar & verifikasi
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="divider" />
          <dl className="kv-list">
            <KeyValue label="Harga bulanan" value={<Money value={PLAN_PRICES.monthly} />} />
            <KeyValue label="Harga tahunan" value={<Money value={PLAN_PRICES.yearly} />} />
            <KeyValue label="Metode" value="Invoice manual (tanpa autodebit)" />
          </dl>
          <p className="small muted">
            Nama komersial paket, proration, dan tanggal awal/akhir periode belum ditetapkan (TBD-01). Harga di atas
            hanya contoh demo.
          </p>
        </Card>

        <div className="stack">
          <Card>
            <CardHead title="Kanal QRIS restoran" description="Kandidat provider: Midtrans. Aktivasi bergantung kontrak merchant." />
            <dl className="kv-list">
              <KeyValue label="Provider" value="Midtrans (kandidat)" />
              <KeyValue
                label="Status"
                value={
                  <Badge tone={merchant?.status === 'active' ? 'success' : merchant?.status === 'pending' ? 'warning' : 'neutral'}>
                    {merchant?.status === 'active' ? 'Aktif (sandbox)' : merchant?.status === 'pending' ? 'Menunggu' : 'Belum terhubung'}
                  </Badge>
                }
              />
              <KeyValue label="Lingkungan" value={merchant?.environment ?? 'sandbox'} />
              <KeyValue label="Cakupan" value={merchant?.branchScopeId ? 'Satu cabang' : 'Seluruh bisnis'} />
            </dl>
            {merchant?.evidence ? <p className="small muted">{merchant.evidence}</p> : null}
            <div className="inline" style={{ marginTop: 12 }}>
              <Button variant="secondary" icon="qr" onClick={handleConnect} disabled={merchant?.status === 'active'}>
                Aktifkan kanal sandbox
              </Button>
            </div>
            <p className="small muted">
              Status langganan tidak sama dengan kesiapan merchant. QRIS produksi memerlukan bukti aktivasi dan
              kontrak yang sah.
            </p>
          </Card>

          <Card>
            <CardHead title="Batas paket" />
            <dl className="kv-list">
              <KeyValue label="Cabang" value={`${branches.length} / ${entitlements.branchLimit}`} />
              <KeyValue label="Staf per cabang" value={`maks ${entitlements.staffPerBranch}`} />
              <KeyValue label="Metode pembayaran" value={entitlements.methods.join(', ')} />
              <KeyValue label="QR meja" value={entitlements.qrisSelfOrder ? 'Tersedia' : 'Tidak tersedia'} />
            </dl>
          </Card>
        </div>
      </div>

      <Card>
        <CardHead
          eyebrow="Alat demo"
          title="Uji siklus langganan"
          description="Tindakan di bawah hanya untuk demo frontend; tidak memanggil penagihan nyata."
        />
        <div className="inline">
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              actions.endSubscriptionNow();
              pushToast({ tone: 'info', title: 'Masa berbayar diakhiri (demo)' });
            }}
          >
            Akhiri masa berbayar sekarang
          </Button>
          <Button variant="ghost" size="sm" onClick={handleReset} disabled={resetBusy}>
            {resetBusy ? 'Memuat ulang…' : 'Reset data demo'}
          </Button>
        </div>
        <p className="small muted" style={{ marginTop: 10 }}>
          {business?.name} · zona waktu {business?.timezone} · paket tidak mengubah snapshot transaksi lama.
        </p>
      </Card>
    </div>
  );
}
