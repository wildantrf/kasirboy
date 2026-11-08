import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAppActions, useAppState } from '../state/AppProvider';
import { useToast } from '../components/toast';
import {
  Badge,
  Button,
  Card,
  CardHead,
  EmptyState,
  Field,
  Modal,
  Note,
  Select,
  TextInput,
} from '../components/ui';
import { RoleBadge } from '../components/domain';
import { entitlementsFor } from '../lib/entitlements';
import { ROLE_DESCRIPTION, ROLE_LABEL, can, canManageStaffRole } from '../lib/permissions';
import { staffOf } from '../lib/selectors';
import { describeError } from '../lib/errors';
import { formatDate } from '../lib/format';
import { DEMO_PASSWORD } from '../data/seed';
import type { Role } from '../types/domain';

const STAFF_ROLES: Array<Exclude<Role, 'owner'>> = ['manager', 'cashier', 'kitchen', 'waiter'];

export function StaffPage() {
  const state = useAppState();
  const actions = useAppActions();
  const { pushToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Exclude<Role, 'owner'>>('cashier');
  const [branchId, setBranchId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const session = state.session;
  const branch = state.branches.find((item) => item.id === session?.branchId);

  if (!session || !branch) {
    return null;
  }

  const activeBranch = branch;
  const canManageAny = can(session.role, 'staff.manage');
  const canManageOwn = can(session.role, 'staff.manage.own_branch');

  if (!canManageAny && !canManageOwn) {
    return (
      <Card>
        <EmptyState
          icon="lock"
          title="Manajemen staf hanya untuk pemilik/manajer"
          description="Rincian izin tiap peran masih TBD-14. Nilai default: pemilik mengelola semua cabang, manajer hanya cabangnya."
        />
      </Card>
    );
  }

  const subscription = state.subscriptions.find((item) => item.businessId === session.businessId);
  const entitlements = entitlementsFor(subscription);
  const members = staffOf(state, branch.id);
  const activeMembers = members.filter((member) => member.status === 'active');
  const activeInBusiness = state.staff.filter(
    (member) => member.businessId === session.businessId && member.status === 'active',
  );
  const kitchenCount = activeMembers.filter((member) => member.role === 'kitchen').length;
  const branches = state.branches.filter(
    (item) => item.businessId === session.businessId && item.status === 'operational',
  );

  const quotaLabel =
    entitlements.plan === 'free'
      ? `${activeInBusiness.length} / ${entitlements.staffTotal} staf bisnis`
      : `${activeMembers.length} / ${entitlements.staffPerBranch} staf cabang ini`;

  const selectableRoles = STAFF_ROLES.filter((candidate) => canManageStaffRole(session.role, candidate));
  const openBranches = canManageAny ? branches : [branch];

  function openModal() {
    setName('');
    setEmail('');
    setRole(selectableRoles.includes('cashier') ? 'cashier' : (selectableRoles[0] ?? 'cashier'));
    setBranchId(activeBranch.id);
    setError(null);
    setModalOpen(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      const created = actions.addStaff({ name, email, role, branchId: branchId || activeBranch.id });
      setModalOpen(false);
      pushToast({
        tone: 'success',
        title: 'Staf ditambahkan',
        message: `${created.note}. Kata sandi demo: ${DEMO_PASSWORD}`,
      });
    } catch (caught) {
      setError(describeError(caught));
    }
  }

  function toggleStatus(staffId: string, currentStatus: 'active' | 'inactive') {
    try {
      actions.setStaffStatus(staffId, currentStatus === 'active' ? 'inactive' : 'active');
      pushToast({
        tone: 'info',
        title: currentStatus === 'active' ? 'Staf dinonaktifkan' : 'Staf diaktifkan kembali',
        message: 'Pesanan lama dan tiket dapur yang sudah ada tidak diubah.',
      });
    } catch (caught) {
      pushToast({ tone: 'error', title: 'Perubahan gagal', message: describeError(caught) });
    }
  }

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="eyebrow">Akses · {branch.code}</p>
          <h1 className="page-title">Staf</h1>
          <p className="page-lede">
            Satu akun staf memiliki satu peran dan satu cabang. Pemilik tidak dihitung dalam kuota staf.
          </p>
        </div>
        <div className="page-actions">
          <Badge tone={activeMembers.length >= entitlements.staffPerBranch && entitlements.plan === 'paid' ? 'danger' : 'neutral'}>
            {quotaLabel}
          </Badge>
          <Button variant="primary" icon="plus" onClick={openModal}>
            Tambah staf
          </Button>
        </div>
      </header>

      {kitchenCount === 0 ? (
        <Note tone="warning" title="Cabang ini belum punya staf dapur aktif">
          KDS tidak aktif; pesanan lunas langsung Selesai tanpa tracking. Menambahkan staf dapur mengaktifkan KDS
          untuk cabang ini saja.
        </Note>
      ) : null}

      <Card className="card--flush">
        {members.length === 0 ? (
          <div style={{ padding: 16 }}>
            <EmptyState
              icon="users"
              title="Belum ada staf"
              description="Pemilik dapat menjalankan operasional tanpa akun staf tambahan."
              action={<Button onClick={openModal}>Tambah staf pertama</Button>}
            />
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Nama</th>
                  <th scope="col">Email</th>
                  <th scope="col">Peran</th>
                  <th scope="col">Status</th>
                  <th scope="col">Ditambahkan</th>
                  <th scope="col">
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const user = state.users.find((candidate) => candidate.id === member.userId);
                  const canManageThis = canManageStaffRole(session.role, member.role) && member.userId !== session.userId;
                  return (
                    <tr key={member.id}>
                      <td>
                        <strong>{user?.name ?? 'Tanpa nama'}</strong>
                      </td>
                      <td className="small muted">{user?.email}</td>
                      <td>
                        <RoleBadge role={member.role} />
                      </td>
                      <td>
                        <Badge tone={member.status === 'active' ? 'success' : 'neutral'}>
                          {member.status === 'active' ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </td>
                      <td className="small muted">{formatDate(member.createdAt)}</td>
                      <td>
                        <Button
                          variant={member.status === 'active' ? 'ghost' : 'secondary'}
                          size="sm"
                          disabled={!canManageThis}
                          onClick={() => toggleStatus(member.id, member.status)}
                        >
                          {member.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <CardHead
          title="Peran yang tersedia"
          description="Bisnis tidak wajib mengisi semua peran. Rincian izin di luar yang disepakati PRD masih TBD-14."
        />
        <ul className="role-list">
          {STAFF_ROLES.map((candidate) => (
            <li key={candidate}>
              <RoleBadge role={candidate} />
              <span>{ROLE_DESCRIPTION[candidate]}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Tambah staf"
        description={`Paket saat ini: ${entitlements.plan === 'free' ? 'Free (1 staf per bisnis)' : `Berbayar (${entitlements.staffPerBranch} staf per cabang)`}.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" type="submit" form="staff-form">
              Tambah staf
            </Button>
          </>
        }
      >
        <form id="staff-form" className="form-grid" onSubmit={handleSubmit}>
          <Field label="Nama staf">
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

          <Field label="Email" hint="Dipakai untuk masuk. Kata sandi awal demo: mejaflow123.">
            {({ id, describedBy }) => (
              <TextInput
                id={id}
                aria-describedby={describedBy}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            )}
          </Field>

          <div className="form-grid form-grid--2">
            <Field label="Peran">
              {({ id, describedBy }) => (
                <Select
                  id={id}
                  aria-describedby={describedBy}
                  value={role}
                  onChange={(event) => setRole(event.target.value as Exclude<Role, 'owner'>)}
                >
                  {selectableRoles.map((candidate) => (
                    <option key={candidate} value={candidate}>
                      {ROLE_LABEL[candidate]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <Field label="Cabang" hint={canManageAny ? 'Satu akun hanya untuk satu cabang.' : 'Manajer hanya menambah staf cabangnya.'}>
              {({ id, describedBy }) => (
                <Select
                  id={id}
                  aria-describedby={describedBy}
                  value={branchId || branch.id}
                  onChange={(event) => setBranchId(event.target.value)}
                  disabled={!canManageAny}
                >
                  {openBranches.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>

          <p className="small muted">{ROLE_DESCRIPTION[role]}</p>

          {error ? (
            <Note tone="danger" title="Staf belum ditambahkan">
              {error}
            </Note>
          ) : null}
        </form>
      </Modal>
    </div>
  );
}
