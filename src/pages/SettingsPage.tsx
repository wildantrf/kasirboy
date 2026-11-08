import { useEffect, useState, type FormEvent } from 'react';
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
  Modal,
  Note,
  Select,
  Switch,
  TextInput,
} from '../components/ui';
import { entitlementsFor } from '../lib/entitlements';
import { can } from '../lib/permissions';
import { branchesOf, staffOf } from '../lib/selectors';
import { getLocalDeviceId } from '../lib/device';
import { formatDateTime } from '../lib/format';
import { describeError } from '../lib/errors';
import type { AuditAction, OrderType } from '../types/domain';

const AUDIT_LABEL: Record<AuditAction, string> = {
  'discount.applied': 'Diskon',
  'staff.created': 'Staf',
  'staff.deactivated': 'Staf',
  'pickup.override': 'Pickup override',
  'plan.trial_activated': 'Trial',
  'plan.invoice_paid': 'Tagihan',
  'plan.downgraded': 'Paket',
  'qr.connected': 'QRIS',
  'payment.qris_verified': 'QRIS',
  'payment.qris_expired': 'QRIS',
  'offline.device_registered': 'Perangkat',
  'offline.order_synced': 'Offline',
  'menu.updated': 'Menu',
  'branch.updated': 'Cabang',
};

export function SettingsPage() {
  const state = useAppState();
  const { actions } = useApp();
  const { pushToast } = useToast();
  const navigate = useNavigate();

  const session = state.session;
  const branch = state.branches.find((item) => item.id === session?.branchId);
  const business = state.businesses.find((item) => item.id === session?.businessId);
  const subscription = state.subscriptions.find((item) => item.businessId === session?.businessId);
  const entitlements = entitlementsFor(subscription);
  const canManageBranch = can(session?.role, 'branch.settings');
  const canAddBranch = session?.role === 'owner';
  const canManageDevices = can(session?.role, 'device.manage');

  const [name, setName] = useState(branch?.name ?? '');
  const [address, setAddress] = useState(branch?.address ?? '');
  const [taxRate, setTaxRate] = useState(String(branch?.taxRate ?? 0));
  const [serviceRate, setServiceRate] = useState(String(branch?.serviceRate ?? 0));
  const [taxDineIn, setTaxDineIn] = useState(true);
  const [taxTakeaway, setTaxTakeaway] = useState(true);
  const [serviceDineIn, setServiceDineIn] = useState(true);
  const [serviceTakeaway, setServiceTakeaway] = useState(false);
  const [status, setStatus] = useState<'operational' | 'inactive'>('operational');
  const [formError, setFormError] = useState<string | null>(null);

  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchAddress, setNewBranchAddress] = useState('');
  const [newBranchTax, setNewBranchTax] = useState('10');
  const [newBranchService, setNewBranchService] = useState('5');
  const [branchError, setBranchError] = useState<string | null>(null);

  useEffect(() => {
    if (!branch) {
      return;
    }
    setName(branch.name);
    setAddress(branch.address);
    setTaxRate(String(branch.taxRate));
    setServiceRate(String(branch.serviceRate));
    setTaxDineIn(branch.taxAppliesTo.includes('dine_in'));
    setTaxTakeaway(branch.taxAppliesTo.includes('takeaway'));
    setServiceDineIn(branch.serviceAppliesTo.includes('dine_in'));
    setServiceTakeaway(branch.serviceAppliesTo.includes('takeaway'));
    setStatus(branch.status);
    setFormError(null);
  }, [branch?.id]);

  if (!session || !branch || !business) {
    return null;
  }

  if (!canManageBranch) {
    return (
      <Card>
        <CardHead title="Pengaturan cabang tidak tersedia" description="Hanya pemilik dan manajer cabang." />
      </Card>
    );
  }

  const activeBranch = branch;
  const branches = branchesOf(state, business.id);
  const devices = state.devices.filter((device) => device.branchId === branch.id);
  const currentDeviceId = `${getLocalDeviceId()}::${branch.id}`;
  const currentDevice = devices.find((device) => device.id === currentDeviceId);
  const kitchenCount = staffOf(state, branch.id).filter(
    (member) => member.role === 'kitchen' && member.status === 'active',
  ).length;

  function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const taxAppliesTo: OrderType[] = [
      ...(taxDineIn ? (['dine_in'] as OrderType[]) : []),
      ...(taxTakeaway ? (['takeaway'] as OrderType[]) : []),
    ];
    const serviceAppliesTo: OrderType[] = [
      ...(serviceDineIn ? (['dine_in'] as OrderType[]) : []),
      ...(serviceTakeaway ? (['takeaway'] as OrderType[]) : []),
    ];

    try {
      actions.updateBranchSettings({
        branchId: activeBranch.id,
        name,
        address,
        taxRate: Number(taxRate) || 0,
        serviceRate: Number(serviceRate) || 0,
        taxAppliesTo,
        serviceAppliesTo,
        status,
      });
      pushToast({
        tone: 'success',
        title: 'Pengaturan cabang disimpan',
        message: 'Transaksi lama memakai snapshot biaya sebelumnya.',
      });
    } catch (caught) {
      setFormError(describeError(caught));
    }
  }

  function addBranch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBranchError(null);
    try {
      const created = actions.addBranch({
        name: newBranchName,
        address: newBranchAddress,
        taxRate: Number(newBranchTax) || 0,
        serviceRate: Number(newBranchService) || 0,
      });
      setBranchModalOpen(false);
      setNewBranchName('');
      setNewBranchAddress('');
      pushToast({ tone: 'success', title: 'Cabang ditambahkan', message: created.name });
    } catch (caught) {
      setBranchError(describeError(caught));
    }
  }

  function registerDevice() {
    try {
      actions.registerPrimaryDevice(activeBranch.id, `${activeBranch.name} — perangkat ini`);
      pushToast({
        tone: 'success',
        title: 'Perangkat utama terdaftar',
        message: 'Hanya perangkat ini yang dapat menerima tunai offline di cabang ini.',
      });
    } catch (caught) {
      pushToast({ tone: 'error', title: 'Perangkat gagal didaftarkan', message: describeError(caught) });
    }
  }

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="eyebrow">Pengaturan · {branch.code}</p>
          <h1 className="page-title">Cabang & perangkat</h1>
          <p className="page-lede">
            Biaya, status cabang, dan perangkat utama offline. Perubahan tercatat pada audit dan menaikkan versi
            konfigurasi.
          </p>
        </div>
        <div className="page-actions">
          <Badge tone={entitlements.plan === 'paid' ? 'success' : 'neutral'}>
            {entitlements.plan === 'paid' ? 'Berbayar' : 'Free'}
          </Badge>
          <Badge tone={branch.status === 'operational' ? 'success' : 'danger'}>
            {branch.status === 'operational' ? 'Operasional' : 'Nonaktif'}
          </Badge>
        </div>
      </header>

      <div className="settings-grid">
        <Card>
          <CardHead
            eyebrow="Konfigurasi"
            title="Biaya & status cabang"
            description="Pajak dan layanan dihitung atas dasar setelah diskon. Perubahan tidak menulis ulang transaksi lama."
          />
          <form className="form-grid" onSubmit={saveSettings}>
            <Field label="Nama cabang">
              {({ id, describedBy }) => (
                <TextInput
                  id={id}
                  aria-describedby={describedBy}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              )}
            </Field>
            <Field label="Alamat">
              {({ id, describedBy }) => (
                <TextInput
                  id={id}
                  aria-describedby={describedBy}
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                />
              )}
            </Field>

            <div className="form-grid form-grid--2">
              <Field label="Pajak (%)">
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
              <Field label="Biaya layanan (%)">
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

            <div className="switch-block">
              <p className="eyebrow">Penerapan pajak</p>
              <Switch checked={taxDineIn} onChange={setTaxDineIn} label="Dine-in" />
              <Switch checked={taxTakeaway} onChange={setTaxTakeaway} label="Takeaway" />
            </div>

            <div className="switch-block">
              <p className="eyebrow">Penerapan biaya layanan</p>
              <Switch checked={serviceDineIn} onChange={setServiceDineIn} label="Dine-in" />
              <Switch checked={serviceTakeaway} onChange={setServiceTakeaway} label="Takeaway" />
            </div>

            <Field label="Status cabang" hint="Nonaktif bukan penghapusan: data dan transaksi tetap tersimpan.">
              {({ id, describedBy }) => (
                <Select
                  id={id}
                  aria-describedby={describedBy}
                  value={status}
                  onChange={(event) => setStatus(event.target.value as 'operational' | 'inactive')}
                >
                  <option value="operational">Operasional</option>
                  <option value="inactive">Nonaktif</option>
                </Select>
              )}
            </Field>

            {formError ? (
              <Note tone="danger" title="Belum tersimpan">
                {formError}
              </Note>
            ) : null}

            <div className="form-actions">
              <Button variant="ghost" type="button" onClick={() => navigate('/laporan')}>
                Lihat laporan
              </Button>
              <Button variant="primary" type="submit">
                Simpan pengaturan
              </Button>
            </div>
          </form>
        </Card>

        <div className="stack">
          <Card>
            <CardHead eyebrow="KDS" title="Kelayakan dapur" />
            <dl className="kv-list">
              <KeyValue label="Staf dapur aktif" value={kitchenCount} />
              <KeyValue
                label="KDS"
                value={<Badge tone={kitchenCount > 0 ? 'success' : 'warning'}>{kitchenCount > 0 ? 'Aktif' : 'Tidak aktif'}</Badge>}
              />
              <KeyValue label="Versi konfigurasi" value={branch.configVersion} />
            </dl>
            <p className="small muted">
              KDS per cabang. Menonaktifkan staf dapur tidak mengubah pesanan lama menjadi Selesai (TBD-13).
            </p>
          </Card>

          <Card>
            <CardHead
              eyebrow="Offline"
              title="Perangkat utama"
              description="Satu perangkat per cabang menerima tunai offline."
            />
            <dl className="kv-list">
              <KeyValue
                label="Perangkat ini"
                value={
                  currentDevice ? (
                    <Badge tone="success">Utama · {currentDevice.label}</Badge>
                  ) : (
                    <Badge tone="warning">Belum terdaftar</Badge>
                  )
                }
              />
              {devices.map((device) => (
                <KeyValue
                  key={device.id}
                  label={device.label}
                  value={device.isPrimaryOffline ? 'Utama' : 'Cadangan'}
                />
              ))}
            </dl>
            <Button
              variant="secondary"
              size="sm"
              icon="lock"
              onClick={registerDevice}
              disabled={!canManageDevices || Boolean(currentDevice)}
            >
              Jadikan perangkat ini utama
            </Button>
            <p className="small muted">
              Pemindahan kendali ditolak bila perangkat utama lama masih memiliki antrean belum sinkron.
            </p>
          </Card>

          <Card>
            <CardHead eyebrow="Bisnis" title={business.name} />
            <dl className="kv-list">
              <KeyValue label="Pemilik" value={state.users.find((user) => user.id === business.ownerUserId)?.name} />
              <KeyValue label="Email" value={state.users.find((user) => user.id === business.ownerUserId)?.email} />
              <KeyValue label="Zona waktu" value={business.timezone} />
              <KeyValue label="Paket" value={entitlements.plan === 'paid' ? 'Berbayar' : 'Free'} />
            </dl>
          </Card>
        </div>
      </div>

      <Card>
        <CardHead
          eyebrow="Cabang"
          title="Daftar cabang"
          description={`${branches.length} dari maksimum ${entitlements.branchLimit} cabang pada paket saat ini.`}
          actions={
            canAddBranch ? (
              <Button size="sm" variant="secondary" icon="plus" onClick={() => setBranchModalOpen(true)}>
                Tambah cabang
              </Button>
            ) : null
          }
        />
        <ul className="branch-list">
          {branches.map((item) => (
            <li key={item.id} className={item.id === branch.id ? 'is-current' : ''}>
              <div>
                <strong>{item.name}</strong>
                <p className="small muted">
                  {item.code} · {item.address || 'Alamat belum diisi'}
                </p>
              </div>
              <div className="inline">
                <Badge tone={item.status === 'operational' ? 'success' : 'neutral'}>
                  {item.status === 'operational' ? 'Operasional' : 'Nonaktif'}
                </Badge>
                {item.id === branch.id ? <Badge tone="ember">Aktif</Badge> : null}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardHead eyebrow="Audit" title="Jejak tindakan" description="Tanpa secret atau data pelanggan berlebihan." />
        {state.auditEvents.filter((event) => event.businessId === business.id).length === 0 ? (
          <p className="small muted">Belum ada peristiwa audit.</p>
        ) : (
          <ul className="audit-list">
            {state.auditEvents
              .filter((event) => event.businessId === business.id)
              .slice(0, 10)
              .map((event) => (
                <li key={event.id}>
                  <span className="audit-list__tag">{AUDIT_LABEL[event.action]}</span>
                  <div>
                    <p>{event.detail}</p>
                    <p className="small muted">
                      {event.actorName} · {formatDateTime(event.at)}
                    </p>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </Card>

      <Note tone="info" title="Batas versi pertama">
        Tidak ada pengaturan tema, printer thermal, voucher, shift kas, atau integrasi pengiriman struk pelanggan.
        Desain visual dan format nomor pesanan masih TBD-19.
      </Note>

      <Modal
        open={branchModalOpen}
        onClose={() => setBranchModalOpen(false)}
        title="Tambah cabang"
        description={`Batas paket ${entitlements.branchLimit} cabang. Katalog dibuat terpisah per cabang.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setBranchModalOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" type="submit" form="branch-form">
              Tambah cabang
            </Button>
          </>
        }
      >
        <form id="branch-form" className="form-grid" onSubmit={addBranch}>
          <Field label="Nama cabang">
            {({ id, describedBy }) => (
              <TextInput
                id={id}
                aria-describedby={describedBy}
                value={newBranchName}
                onChange={(event) => setNewBranchName(event.target.value)}
                required
              />
            )}
          </Field>
          <Field label="Alamat">
            {({ id, describedBy }) => (
              <TextInput
                id={id}
                aria-describedby={describedBy}
                value={newBranchAddress}
                onChange={(event) => setNewBranchAddress(event.target.value)}
              />
            )}
          </Field>
          <div className="form-grid form-grid--2">
            <Field label="Pajak (%)">
              {({ id, describedBy }) => (
                <TextInput
                  id={id}
                  aria-describedby={describedBy}
                  type="number"
                  min={0}
                  max={100}
                  value={newBranchTax}
                  onChange={(event) => setNewBranchTax(event.target.value)}
                />
              )}
            </Field>
            <Field label="Layanan (%)">
              {({ id, describedBy }) => (
                <TextInput
                  id={id}
                  aria-describedby={describedBy}
                  type="number"
                  min={0}
                  max={100}
                  value={newBranchService}
                  onChange={(event) => setNewBranchService(event.target.value)}
                />
              )}
            </Field>
          </div>
          {branchError ? (
            <Note tone="danger" title="Cabang belum dibuat">
              {branchError}
            </Note>
          ) : null}
        </form>
      </Modal>
    </div>
  );
}
