import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../state/AppProvider';
import { useAppState } from '../state/AppProvider';
import { can } from '../lib/permissions';
import { entitlementsFor, PLAN_LABEL } from '../lib/entitlements';
import { businessById, branchById } from '../lib/selectors';
import { useNetwork } from '../lib/network';
import { formatDate } from '../lib/format';
import { describeError } from '../lib/errors';
import { Icon, type IconName } from './icons';
import { Badge, Button, IconButton } from './ui';
import { SyncPanel } from './SyncPanel';
import { useToast } from './toast';

interface NavEntry {
  to: string;
  label: string;
  icon: IconName;
  show: boolean;
  hint?: string;
}

export function AppShell({ children }: { children: ReactNode }) {
  const state = useAppState();
  const { snapshot, actions } = useApp();
  const { pushToast } = useToast();
  const network = useNetwork();
  const navigate = useNavigate();
  const location = useLocation();

  const [navOpen, setNavOpen] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const branchMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!branchOpen) {
      return;
    }
    const onPointerDown = (event: MouseEvent) => {
      if (branchMenuRef.current && !branchMenuRef.current.contains(event.target as Node)) {
        setBranchOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [branchOpen]);

  const session = state.session;
  if (!session) {
    return null;
  }

  const business = session.businessId ? businessById(state, session.businessId) : undefined;
  const branch = session.branchId ? branchById(state, session.branchId) : undefined;
  const subscription = session.businessId
    ? state.subscriptions.find((item) => item.businessId === session.businessId)
    : undefined;
  const entitlements = entitlementsFor(subscription);
  const user = state.users.find((candidate) => candidate.id === session.userId);
  const branches = state.branches.filter(
    (candidate) =>
      candidate.businessId === session.businessId &&
      candidate.status === 'operational' &&
      (session.role === 'owner' || candidate.id === session.branchId),
  );
  const queued = snapshot.offlineOrders.filter((record) => record.state === 'queued').length;

  const role = session.role;
  const navSections: Array<{ label: string; entries: NavEntry[] }> = [
    {
      label: 'Operasional',
      entries: [
        { to: '/', label: 'Ringkasan', icon: 'grid', show: can(role, 'reports.view') },
        { to: '/kasir', label: 'Kasir', icon: 'receipt', show: can(role, 'pos.run') },
        {
          to: '/pesanan',
          label: 'Pesanan',
          icon: 'list',
          show: can(role, 'pos.run') || can(role, 'handover.confirm') || can(role, 'reports.view'),
        },
        { to: '/dapur', label: 'Dapur', icon: 'flame', show: can(role, 'kds.view') },
        { to: '/meja', label: 'Meja', icon: 'table', show: can(role, 'table.manage') },
      ],
    },
    {
      label: 'Kelola',
      entries: [
        { to: '/menu', label: 'Menu & harga', icon: 'book', show: can(role, 'menu.manage') },
        {
          to: '/staf',
          label: 'Staf',
          icon: 'users',
          show: can(role, 'staff.manage') || can(role, 'staff.manage.own_branch'),
        },
      ],
    },
    {
      label: 'Bisnis',
      entries: [
        { to: '/laporan', label: 'Laporan', icon: 'chart', show: can(role, 'reports.view') },
        { to: '/langganan', label: 'Langganan', icon: 'card', show: can(role, 'billing.manage') },
        { to: '/pengaturan', label: 'Pengaturan', icon: 'settings', show: can(role, 'branch.settings') },
      ],
    },
  ];

  const planLabel =
    entitlements.state === 'trial'
      ? 'Trial Berbayar'
      : entitlements.state === 'active'
        ? 'Berbayar'
        : PLAN_LABEL.free;

  function handleSwitchBranch(branchId: string) {
    try {
      actions.switchBranch(branchId);
      setBranchOpen(false);
      pushToast({ tone: 'info', title: 'Cabang aktif diperbarui' });
    } catch (error) {
      pushToast({ tone: 'error', title: 'Tidak dapat berpindah cabang', message: describeError(error) });
    }
  }

  function handleLogout() {
    actions.logout();
    navigate('/masuk', { replace: true });
  }

  const initials = (user?.name ?? 'MejaFlow')
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <div className="app-shell" data-nav={navOpen ? 'open' : undefined}>
      <a className="skip-link" href="#main-content">
        Lewati ke konten utama
      </a>

      <aside className="sidebar" aria-label="Navigasi utama">
        <div className="sidebar__brand">
          <span className="brand__mark" aria-hidden="true">
            M
          </span>
          <div>
            <p className="brand__name">MejaFlow</p>
            <p className="brand__tag">Kasir restoran</p>
          </div>
        </div>

        <nav className="sidebar__nav">
          {navSections.map((section) => {
            const entries = section.entries.filter((entry) => entry.show);
            if (entries.length === 0) {
              return null;
            }
            return (
              <div className="nav-section" key={section.label}>
                <p className="nav-section__label">{section.label}</p>
                {entries.map((entry) => (
                  <NavLink
                    key={entry.to}
                    to={entry.to}
                    end={entry.to === '/'}
                    className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}
                  >
                    <Icon name={entry.icon} size={18} className="nav-link__icon" />
                    <span className="nav-link__label">{entry.label}</span>
                    {entry.to === '/dapur' && can(role, 'kds.view') ? (
                      <span className="nav-link__hint">{state.kitchenJobs.filter((job) => job.status !== 'completed').length}</span>
                    ) : null}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="sidebar__foot">
          <div className="rail-card">
            <p className="rail-card__label">Bisnis</p>
            <p className="rail-card__value">{business?.name ?? 'Belum ada bisnis'}</p>
            <div className="rail-card__meta">
              <span>{branch?.code ?? '—'}</span>
              <span>·</span>
              <span>{planLabel}</span>
            </div>
          </div>
          <button type="button" className="rail-sync" onClick={() => setSyncOpen(true)}>
            <Icon name={network.online ? 'wifi' : 'wifi-off'} size={16} />
            <span>{network.online ? 'Online' : 'Offline'}</span>
            {queued > 0 ? <span className="rail-sync__count">{queued}</span> : null}
          </button>
          <p className="rail-date">{formatDate(new Date().toISOString())}</p>
        </div>
      </aside>

      {navOpen ? (
        <button
          type="button"
          className="nav-overlay"
          aria-label="Tutup navigasi"
          onClick={() => setNavOpen(false)}
        />
      ) : null}

      <div className="main">
        <header className="topbar">
          <div className="topbar__left">
            <button
              type="button"
              className="nav-toggle"
              aria-label={navOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
              aria-expanded={navOpen}
              onClick={() => setNavOpen((open) => !open)}
            >
              <Icon name="list" size={20} />
            </button>

            <div className="branch-switch" ref={branchMenuRef}>
              <button
                type="button"
                className="branch-switch__btn"
                aria-haspopup="listbox"
                aria-expanded={branchOpen}
                onClick={() => setBranchOpen((open) => !open)}
              >
                <span className="branch-switch__pin" aria-hidden="true">
                  <Icon name="store" size={16} />
                </span>
                <span className="branch-switch__text">
                  <span className="branch-switch__label">Cabang aktif</span>
                  <span className="branch-switch__name">{branch?.name ?? 'Pilih cabang'}</span>
                </span>
                <Icon name="chevron-down" size={16} />
              </button>

              {branchOpen ? (
                <div className="branch-switch__menu" role="listbox" aria-label="Pilih cabang">
                  {branches.length === 0 ? (
                    <p className="branch-switch__empty">Tidak ada cabang operasional.</p>
                  ) : (
                    branches.map((candidate) => (
                      <button
                        key={candidate.id}
                        type="button"
                        role="option"
                        aria-selected={candidate.id === session.branchId}
                        className={`branch-switch__item ${candidate.id === session.branchId ? 'is-active' : ''}`}
                        onClick={() => handleSwitchBranch(candidate.id)}
                        disabled={session.role !== 'owner' && candidate.id !== session.branchId}
                      >
                        <span>
                          <strong>{candidate.name}</strong>
                          <span className="branch-switch__item-meta">
                            {candidate.code} · pajak {candidate.taxRate}% · layanan {candidate.serviceRate}%
                          </span>
                        </span>
                        {candidate.id === session.branchId ? <Icon name="check" size={16} /> : null}
                      </button>
                    ))
                  )}
                  {session.role !== 'owner' ? (
                    <p className="branch-switch__note">Staf hanya dapat beroperasi pada cabang yang ditugaskan.</p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <NavLink to="/langganan" className="plan-chip" aria-label={`Paket ${planLabel}`}>
              <span className="plan-chip__dot" aria-hidden="true" />
              {planLabel}
            </NavLink>
          </div>

          <div className="topbar__right">
            <button
              type="button"
              className={`connection-chip ${network.online ? '' : 'connection-chip--offline'}`}
              onClick={() => setSyncOpen(true)}
            >
              <Icon name={network.online ? 'wifi' : 'wifi-off'} size={16} />
              <span>{network.online ? 'Online' : 'Offline'}</span>
              {queued > 0 ? <span className="connection-chip__count">{queued}</span> : null}
            </button>

            <div className="user-chip">
              <span className="avatar" aria-hidden="true">
                {initials}
              </span>
              <span className="user-chip__text">
                <strong>{user?.name ?? 'Pengguna'}</strong>
                <span>{session.role === 'owner' ? 'Pemilik' : 'Staf'}</span>
              </span>
            </div>

            <IconButton icon="logout" label="Keluar dari akun" onClick={handleLogout} />
          </div>
        </header>

        {!network.online ? (
          <div className="offline-banner" role="status">
            <div className="offline-banner__main">
              <Icon name="wifi-off" size={18} />
              <div>
                <strong>Mode offline</strong>
                <p>
                  Hanya tunai pada perangkat utama. {queued > 0 ? `${queued} transaksi menunggu sinkron.` : 'Belum ada transaksi lokal.'}
                </p>
              </div>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setSyncOpen(true)}>
              Lihat antrean
            </Button>
          </div>
        ) : null}

        {entitlements.needsDowngradeSelection ? (
          <div className="offline-banner offline-banner--plan" role="status">
            <div className="offline-banner__main">
              <Icon name="alert" size={18} />
              <div>
                <strong>Masa berbayar berakhir</strong>
                <p>Pilih satu cabang dan satu staf untuk melanjutkan pada paket Free. Data lain disimpan.</p>
              </div>
            </div>
            <Button size="sm" onClick={() => navigate('/langganan')}>
              Pilih cabang Free
            </Button>
          </div>
        ) : null}

        <main id="main-content" className="page">
          {children}
        </main>
      </div>

      <SyncPanel
        open={syncOpen}
        onClose={() => setSyncOpen(false)}
        branchId={session.branchId ?? ''}
        branchName={branch?.name ?? 'Cabang'}
      />
    </div>
  );
}
