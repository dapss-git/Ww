// Karakter kontrol dan karakter bidi/zero-width yang sering dipakai untuk spoofing.
const INVISIBLE = /[\u0000-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/g;

/** Membersihkan teks pengguna: hapus tag HTML, karakter tak terlihat, rapikan spasi, batasi panjang. */
export function sanitizeText(input: string, maxLength: number): string {
  return input
    .normalize('NFKC')
    .replace(/<[^>]*>/g, '')
    .replace(INVISIBLE, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function sanitizeMultiline(input: string, maxLength: number): string {
  return input
    .normalize('NFKC')
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxLength);
}
