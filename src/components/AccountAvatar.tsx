import { UserCircle2 } from 'lucide-react';
import Image from 'next/image';

const AccountAvatar = ({ name, picUrl }: { name: string, picUrl?: string | null }) => {
  if (picUrl) {
    return (
      <Image width={40} height={40} src={picUrl} alt={name} className="h-9 w-9 shrink-0 rounded-full object-cover shadow-sm ring-1 ring-black/5" />
    );
  }
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const colors = ['from-blue-400 to-blue-500', 'from-blue-400 to-pink-500', 'from-green-400 to-teal-500', 'from-orange-400 to-red-500'];
  const colorIdx = name.charCodeAt(0) % colors.length;
  return (
    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br ${colors[colorIdx]} text-[13px] font-bold text-white shadow-sm`}>
      {initials || <UserCircle2 size={16} />}
    </div>
  );
}

export default AccountAvatar;
