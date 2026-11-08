import { useMemo } from 'react';

const GRID = 21;

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Placeholder QRIS visual untuk demo. Bukan kode QR yang dapat dibayar.
 * Pada produksi, gambar QR berasal dari respons provider yang diverifikasi server.
 */
export function QrPlaceholder({ value, label }: { value: string; label: string }) {
  const cells = useMemo(() => {
    const bits = new Array<boolean>(GRID * GRID).fill(false);
    let seed = hashString(value);
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    for (let index = 0; index < bits.length; index += 1) {
      bits[index] = random() > 0.52;
    }

    const setFinder = (top: number, left: number) => {
      for (let row = 0; row < 7; row += 1) {
        for (let column = 0; column < 7; column += 1) {
          const isBorder = row === 0 || row === 6 || column === 0 || column === 6;
          const isCore = row >= 2 && row <= 4 && column >= 2 && column <= 4;
          bits[(top + row) * GRID + (left + column)] = isBorder || isCore;
        }
      }
    };

    setFinder(0, 0);
    setFinder(0, GRID - 7);
    setFinder(GRID - 7, 0);

    return bits;
  }, [value]);

  return (
    <div
      className="qr-placeholder"
      role="img"
      aria-label={label}
      style={{ gridTemplateColumns: `repeat(${GRID}, 1fr)` }}
    >
      {cells.map((isOn, index) => (
        <span
          key={index}
          className={isOn ? 'qr-placeholder__cell is-on' : 'qr-placeholder__cell'}
        />
      ))}
    </div>
  );
}
