// Family codes: 16 characters from a 32-letter alphabet without look-alikes
// (no 0/O, 1/I) = 80 bits, so a code can't be guessed. Shown as ABCD-EFGH-JKLM-NPQR.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 chars → byte % 32 is unbiased
export const CODE_LENGTH = 16;

export function generateFamilyCode(random: (n: number) => Uint8Array = defaultRandom): string {
  const bytes = random(CODE_LENGTH);
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

function defaultRandom(n: number): Uint8Array {
  const a = new Uint8Array(n);
  globalThis.crypto.getRandomValues(a);
  return a;
}

/** Accepts what people paste or type (lowercase, spaces, dashes); null if it isn't a valid code. */
export function normalizeFamilyCode(input: string): string | null {
  const s = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (s.length !== CODE_LENGTH) return null;
  for (const ch of s) if (!ALPHABET.includes(ch)) return null;
  return s;
}

export function formatFamilyCode(code: string): string {
  return code.match(/.{1,4}/g)?.join('-') ?? code;
}
