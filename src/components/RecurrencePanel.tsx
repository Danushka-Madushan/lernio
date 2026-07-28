"use client";

// 1=Daily, 2=Weekly, 3=Monthly
type RecurrenceType = 1 | 2 | 3;

interface RecurrenceConfig {
  type: RecurrenceType;
  repeat_interval: number;
  weekly_days?: string; // comma-separated "1"=Sun "2"=Mon ... "7"=Sat
  end_times?: number;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_VALUES = ['1', '2', '3', '4', '5', '6', '7'];

const RecurrencePanel = ({
  scheduledAt,
  config,
  onChange,
  disabled,
}: {
  scheduledAt: string;
  config: RecurrenceConfig;
  onChange: (c: RecurrenceConfig) => void;
  disabled?: boolean;
}) => {
  const currentDayIndex = scheduledAt ? new Date(scheduledAt).getDay() : new Date().getDay();
  const currentDayValue = String(currentDayIndex + 1); // "1"=Sun.."7"=Sat
  const currentDayLabel = WEEKDAY_LABELS[currentDayIndex];

  const selectedDays = (config.weekly_days || currentDayValue).split(',').filter(Boolean);

  const toggleDay = (val: string) => {
    const days = new Set(selectedDays);
    if (days.has(val)) { days.delete(val); } else { days.add(val); }
    const sorted = WEEKDAY_VALUES.filter(v => days.has(v));
    onChange({ ...config, weekly_days: sorted.join(',') || currentDayValue });
  };

  // Preset options
  const presets = [
    { label: 'Daily', type: 1 as RecurrenceType, repeat_interval: 1, weekly_days: undefined },
    { label: `Weekly on ${currentDayLabel}`, type: 2 as RecurrenceType, repeat_interval: 1, weekly_days: currentDayValue },
    { label: 'Weekdays (Mon–Fri)', type: 2 as RecurrenceType, repeat_interval: 1, weekly_days: '2,3,4,5,6' },
    { label: 'Custom Days', type: 2 as RecurrenceType, repeat_interval: 1, weekly_days: selectedDays.join(',') },
  ];

  const activePreset = (() => {
    if (config.type === 1) return 0;
    if (config.type === 2 && config.weekly_days === currentDayValue) return 1;
    if (config.type === 2 && config.weekly_days === '2,3,4,5,6') return 2;
    return 3;
  })();

  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">Repeat Pattern</p>

      {/* Preset pills */}
      <div className="flex flex-wrap gap-1.5">
        {presets.map((p, i) => (
          <button key={i} type="button" disabled={disabled}
            onClick={() => onChange({ ...config, type: p.type, repeat_interval: p.repeat_interval, weekly_days: p.weekly_days })}
            className={[
              'rounded-full px-3 py-1 text-[11px] font-medium transition-colors border',
              activePreset === i
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-100',
            ].join(' ')}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom day picker */}
      {activePreset === 3 && config.type === 2 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium text-blue-700">Pick days:</p>
          <div className="flex gap-1">
            {WEEKDAY_LABELS.map((day, i) => {
              const val = WEEKDAY_VALUES[i];
              const active = selectedDays.includes(val);
              return (
                <button key={val} type="button" disabled={disabled}
                  onClick={() => toggleDay(val)}
                  className={[
                    'flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold transition-colors border',
                    active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-100',
                  ].join(' ')}>
                  {day[0]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Repeat interval (only for non-daily) */}
      {config.type === 2 && (
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-medium text-blue-700 whitespace-nowrap">Repeat every:</label>
          <input type="number" min={1} max={12} value={config.repeat_interval}
            disabled={disabled}
            onChange={(e) => onChange({ ...config, repeat_interval: Math.max(1, parseInt(e.target.value) || 1) })}
            className="w-12 rounded-md border border-blue-200 bg-white px-2 py-1 text-xs text-center outline-none" />
          <span className="text-[11px] text-blue-700">week(s)</span>
        </div>
      )}

      {/* End after N occurrences */}
      <div className="flex items-center gap-2">
        <label className="text-[11px] font-medium text-blue-700 whitespace-nowrap">End after:</label>
        <input type="number" min={1} max={100} value={config.end_times || 50}
          disabled={disabled}
          onChange={(e) => onChange({ ...config, end_times: Math.max(1, parseInt(e.target.value) || 50) })}
          className="w-14 rounded-md border border-blue-200 bg-white px-2 py-1 text-xs text-center outline-none" />
        <span className="text-[11px] text-blue-700">occurrences</span>
      </div>
    </div>
  );
}

export default RecurrencePanel;
