export function newId(prefix: string): string {
  const cryptoObject = globalThis.crypto;

  if (cryptoObject && typeof cryptoObject.randomUUID === 'function') {
    return `${prefix}_${cryptoObject.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  }

  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}${random}`;
}

export function newOrderNumber(branchCode: string, sequence: number): string {
  return `${branchCode}-${String(sequence).padStart(3, '0')}`;
}

export function newProviderRef(): string {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `QRIS-${new Date().getFullYear()}${random}`;
}
