// ─── DateTimePicker ───────────────────────────────────────────────────────────

const DateTimePicker = ({
  label,
  value,
  onChange,
  disabled,
  minDate,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  minDate?: string;
}) => {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-[#5f6368]">{label}</label>
      <input
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        min={minDate}
        className="w-full rounded-lg border bg-white px-3 py-2 text-base text-[#202124] outline-none transition-all hover:border-[#c4c7cc] focus:ring-2 focus:ring-blue-500/20"
      />
    </div>
  );
}

export default DateTimePicker;
