// ─── AccountStatusBadge ────────────────────────────────────────────────────────

import { Grade } from '@/lib/db';
import { getAccountStatus } from '@/lib/utils';
import { Check, Clock, Globe, ShieldAlert } from 'lucide-react';

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

const AccountStatusBadge = ({ student }: { student: Student }) => {
  const status = getAccountStatus(student);
  if (status === 'expired') return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">
      <ShieldAlert size={9} /> Expired
    </span>
  );
  if (status === 'not_yet') return (
    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-2 py-0.5 text-[10px] font-semibold text-yellow-700">
      <Clock size={9} /> Not Yet Active
    </span>
  );
  if (status === 'no_expiry') return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-500">
      <Globe size={9} /> No Expiry
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">
      <Check size={9} /> Active
    </span>
  );
}


export default AccountStatusBadge;
