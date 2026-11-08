import { useEffect, useState } from 'react';
import { useApp } from '../state/AppProvider';
import { useNetwork, setSimulatedOffline } from '../lib/network';
import { getLocalDeviceId } from '../lib/device';
import { formatDateTime, formatTime } from '../lib/format';
import { storageEstimate, requestPersistentStorage } from '../lib/offlineDb';
import { describeError } from '../lib/errors';
import { Badge, Button, KeyValue, Note, Switch } from './ui';
import { Money } from './domain';
import { Modal } from './ui';
import { useToast } from './toast';

export function SyncPanel({
  open,
  onClose,
  branchId,
  branchName,
}: {
  open: boolean;
  onClose: () => void;
  branchId: string;
  branchName: string;
}) {
  const { snapshot, actions } = useApp();
  const { pushToast } = useToast();
  const network = useNetwork();
  const [busy, setBusy] = useState(false);
  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    void storageEstimate().then(setStorage);
  }, [open]);

  const deviceId = `${getLocalDeviceId()}::${branchId}`;
  const device = snapshot.state.devices.find(
    (candidate) => candidate.id === deviceId && candidate.isPrimaryOffline,
  );
  const queued = snapshot.offlineOrders.filter((record) => record.state === 'queued');
  const failed = snapshot.offlineOrders.filter((record) => record.state === 'failed');
  const synced = snapshot.offlineOrders.filter((record) => record.state === 'synced');
  const lastSync = synced
    .map((record) => record.syncedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);

  async function handleSync() {
    setBusy(true);
    try {
      const result = await actions.syncOfflineOrders();
      if (result.failed > 0) {
        pushToast({
          tone: 'error',
          title: `${result.synced} tersinkron, ${result.failed} gagal`,
          message: 'Periksa catatan gagal sebelum menutup panel.',
        });
      } else if (result.synced > 0) {
        pushToast({
          tone: 'success',
          title: `${result.synced} transaksi tersinkron`,
          message: 'Transaksi masuk riwayat tepat satu kali dan tidak membuat tiket dapur.',
        });
      } else {
        pushToast({ tone: 'info', title: 'Tidak ada transaksi menunggu' });
      }
    } catch (error) {
      pushToast({ tone: 'error', title: 'Sinkronisasi gagal', message: describeError(error) });
    } finally {
      setBusy(false);
    }
  }

  function handleRegisterDevice() {
    try {
      actions.registerPrimaryDevice(branchId, `${branchName} — perangkat ini`);
      pushToast({
        tone: 'success',
        title: 'Perangkat utama terdaftar',
        message: 'Hanya perangkat ini yang dapat mencatat tunai saat offline.',
      });
    } catch (error) {
      pushToast({ tone: 'error', title: 'Tidak dapat mendaftarkan perangkat', message: describeError(error) });
    }
  }

  async function handlePersist() {
    const granted = await requestPersistentStorage();
    pushToast({
      tone: granted ? 'success' : 'info',
      title: granted ? 'Penyimpanan persisten disetujui' : 'Browser belum menyetujui penyimpanan persisten',
      message: 'Ini bukan jaminan data lokal tidak dapat dihapus pengguna.',
    });
  }

  const storageLabel = storage
    ? `${(storage.usage / 1024 / 1024).toFixed(1)} MB dari ${(storage.quota / 1024 / 1024 / 1024).toFixed(1)} GB`
    : 'Tidak tersedia';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Offline & sinkronisasi"
      description="Satu perangkat utama per cabang. Tunai saat offline disimpan lokal, lalu diimpor sekali tanpa membuat tiket KDS."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Tutup
          </Button>
          <Button
            variant="primary"
            icon="sync"
            onClick={handleSync}
            disabled={busy || !network.online || queued.length === 0}
          >
            {busy ? 'Menyinkronkan…' : `Sinkronkan ${queued.length} transaksi`}
          </Button>
        </>
      }
    >
      <div className="stack">
        {!network.online ? (
          <Note tone="warning" title="Mode offline aktif">
            QRIS dan digital manual tidak tersedia. Transaksi tunai baru dianggap berhasil setelah tersimpan di
            perangkat.
          </Note>
        ) : null}

        <dl className="kv-list">
          <KeyValue label="Koneksi" value={network.online ? 'Online' : 'Offline'} />
          <KeyValue
            label="Perangkat utama"
            value={device ? device.label : <Badge tone="warning">Belum terdaftar</Badge>}
          />
          <KeyValue label="Antrean lokal" value={`${queued.length} transaksi`} />
          <KeyValue label="Gagal sinkron" value={`${failed.length} transaksi`} />
          <KeyValue label="Terakhir sinkron" value={lastSync ? formatDateTime(lastSync) : 'Belum pernah'} />
          <KeyValue label="Penyimpanan lokal" value={storageLabel} />
        </dl>

        {!device ? (
          <Note tone="info" title="Daftarkan perangkat ini" icon="lock">
            Pendaftaran hanya dapat dilakukan saat online. Perangkat lain pada cabang yang sama tidak menerima
            transaksi tunai offline.
            <div className="note__action">
              <Button size="sm" icon="check" onClick={handleRegisterDevice} disabled={!network.online}>
                Jadikan perangkat utama
              </Button>
            </div>
          </Note>
        ) : null}

        <div>
          <p className="eyebrow">Antrean transaksi lokal</p>
          {snapshot.offlineOrders.length === 0 ? (
            <p className="muted small" style={{ marginTop: 8 }}>
              Belum ada transaksi offline di perangkat ini.
            </p>
          ) : (
            <ul className="sync-list">
              {snapshot.offlineOrders.slice(0, 12).map((record) => (
                <li key={record.localId} className="sync-item">
                  <div>
                    <strong className="sync-item__number">{record.number}</strong>
                    <p className="sync-item__meta">
                      {formatTime(record.recordedAt)} · {record.actorName}
                    </p>
                  </div>
                  <div className="sync-item__right">
                    <Money value={record.totals.finalTotal} />
                    <Badge
                      tone={
                        record.state === 'queued' ? 'warning' : record.state === 'synced' ? 'success' : 'danger'
                      }
                    >
                      {record.state === 'queued'
                        ? 'Menunggu'
                        : record.state === 'synced'
                          ? 'Tersinkron'
                          : 'Gagal'}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Note tone="warning" title="Laporan cloud belum mencakup transaksi yang masih lokal">
          Total di halaman Laporan hanya menghitung transaksi yang telah diakui server. Perangkat rusak atau data
          situs dihapus sebelum sinkron tidak dapat dipulihkan dari cloud.
        </Note>

        <div className="divider" />

        <div className="stack stack--tight">
          <p className="eyebrow">Alat demo</p>
          <Switch
            checked={network.simulatedOffline}
            onChange={setSimulatedOffline}
            label="Simulasikan koneksi terputus"
            description="Memaksa mode offline pada sesi ini untuk menguji alur tunai offline dan antrean sinkronisasi."
          />
          <Button variant="ghost" size="sm" onClick={handlePersist}>
            Minta penyimpanan persisten
          </Button>
        </div>
      </div>
    </Modal>
  );
}
