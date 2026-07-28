// ─── StatCard ──────────────────────────────────────────────────────────────────

const StatCard = ({ label, value, icon, tone = 'default' }: {
  label: string; value: number | string; icon: React.ReactNode;
  tone?: 'default' | 'success' | 'danger' | 'info';
}) => {
  const toneClasses: Record<string, string> = {
    default: 'bg-[#f1f3f4] text-[#5f6368]',
    success: 'bg-green-50 text-green-700',
    danger: 'bg-red-50 text-red-500',
    info: 'bg-blue-100 text-blue-500',
  };
  return (
    <div className="flex items-center gap-3.5 rounded-2xl bg-white p-4 shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)]">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${toneClasses[tone]}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[20px] font-medium leading-tight text-[#202124]">{value}</p>
        <p className="truncate text-[12px] text-[#5f6368]">{label}</p>
      </div>
    </div>
  );
}

export default StatCard;
