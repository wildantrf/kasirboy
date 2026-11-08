/**
 * Kesalahan domain yang pesannya aman ditampilkan ke pengguna.
 * Pesan teknis tetap dicatat terpisah; UI tidak menampilkan stack trace.
 */
export class AppError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
  }
}

export function describeError(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Terjadi kesalahan tak terduga. Coba lagi.';
}
