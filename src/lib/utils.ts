import { Grade } from './db';

const secureRandInt = (max: number): number => {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % max;
}

export const generatePassword = (length = 6): string => {
  const U = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const L = 'abcdefghijklmnopqrstuvwxyz';
  const D = '0123456789';
  const all = U + L + D;
  const chars = [
    U[secureRandInt(U.length)],
    L[secureRandInt(L.length)],
    D[secureRandInt(D.length)],
    ...Array.from({ length: Math.max(0, length - 3) }, () => all[secureRandInt(all.length)]),
  ];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = secureRandInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

type AccessMode = 'GRADE' | 'CUSTOM';

interface Student {
  id: string;
  username: string;
  grade: Grade | null;
  activeFrom: string | null;
  activeTo: string | null;
  accessMode: AccessMode;
  createdAt: string;
}

/** Returns account status for a student */
export const getAccountStatus = (student: Student): 'active' | 'expired' | 'not_yet' | 'no_expiry' => {
  const now = new Date();
  const from = student.activeFrom ? new Date(student.activeFrom) : null;
  const to = student.activeTo ? new Date(student.activeTo) : null;
  if (from && now < from) return 'not_yet';
  if (to && now > to) return 'expired';
  if (!from && !to) return 'no_expiry';
  return 'active';
}
