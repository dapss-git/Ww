import { randomInt } from 'crypto';

/** RNG kriptografis untuk pengacakan role dan kode room. */
export function secureRandom(): number {
  return randomInt(0, 2 ** 31) / 2 ** 31;
}

export function randomString(length: number, alphabet: string): string {
  let out = '';
  for (let i = 0; i < length; i++) out += alphabet[randomInt(0, alphabet.length)];
  return out;
}
