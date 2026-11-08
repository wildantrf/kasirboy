/**
 * Foto menu disimpan sebagai data URL terkompresi di state lokal.
 *
 * localStorage hanya ~5 MB dan dipakai bersama data transaksi, jadi foto
 * dipotong tengah menjadi persegi lalu dikompres JPEG. Setiap percobaan
 * menurunkan resolusi/kualitas sampai ukurannya wajar.
 */

const MAX_INPUT_BYTES = 8 * 1024 * 1024;
const MAX_DATA_URL_LENGTH = 320_000;

const ATTEMPTS: ReadonlyArray<{ edge: number; quality: number }> = [
  { edge: 640, quality: 0.72 },
  { edge: 480, quality: 0.6 },
  { edge: 360, quality: 0.55 },
];

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Foto tidak dapat dibaca. Coba berkas lain.'));
    };
    image.src = url;
  });
}

/** Potong tengah persegi (cover) lalu enkode sebagai JPEG. */
function encodeSquare(image: HTMLImageElement, edge: number, quality: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = edge;
  canvas.height = edge;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Browser ini tidak mendukung pemrosesan foto.');
  }

  const side = Math.min(image.naturalWidth, image.naturalHeight);
  if (!Number.isFinite(side) || side <= 0) {
    throw new Error('Foto tidak memiliki ukuran yang valid.');
  }

  const sourceX = (image.naturalWidth - side) / 2;
  const sourceY = (image.naturalHeight - side) / 2;
  context.drawImage(image, sourceX, sourceY, side, side, 0, 0, edge, edge);

  return canvas.toDataURL('image/jpeg', quality);
}

export async function prepareMenuPhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Berkas harus berupa gambar (JPG, PNG, atau WebP).');
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('Ukuran foto maksimal 8 MB.');
  }

  const image = await loadImage(file);

  for (const attempt of ATTEMPTS) {
    const dataUrl = encodeSquare(image, attempt.edge, attempt.quality);
    if (dataUrl.length <= MAX_DATA_URL_LENGTH) {
      return dataUrl;
    }
  }

  throw new Error('Foto masih terlalu besar setelah dikompres. Gunakan gambar yang lebih sederhana.');
}
