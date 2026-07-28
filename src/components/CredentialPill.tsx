import CopyButton from './CopyButton';

const CredentialPill = ({ label, value }: { label: string; value: string }) => {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[#e8eaed] bg-[#f8f9fa] px-3.5 py-2.5">
      <div className="min-w-0">
        <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-[#9aa0a6]">{label}</p>
        <p className="truncate font-mono text-sm font-semibold text-[#202124]">{value}</p>
      </div>
      <CopyButton text={value} />
    </div>
  );
}

export default CredentialPill;
