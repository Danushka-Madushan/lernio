// ─── UsernameInput ────────────────────────────────────────────────────────────

import { useRef } from 'react';

const UsernameInput = ({ prefix, suffix, disabled, onPrefixChange, onSuffixChange, onSuffixBulkSet }: {
  prefix: string; suffix: string[]; disabled: boolean;
  onPrefixChange: (v: string) => void;
  onSuffixChange: (i: number, v: string) => void;
  onSuffixBulkSet: (digits: string[]) => void;
}) => {
  const digitRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null]);
  const fieldBase = [
    'border border-[#dadce0] bg-white text-sm text-[#202124] outline-none transition-all',
    'placeholder:text-[#9aa0a6] hover:border-[#c4c7cc]',
    ' focus:ring-2 focus:ring-blue-500/20',
    ' ',
  ].join(' ');

  const handleDigitChange = (i: number, raw: string) => {
    const digit = raw.replace(/\D/g, '').slice(-1);
    onSuffixChange(i, digit);
    if (digit && i < 3) digitRefs.current[i + 1]?.focus();
  };

  const handleDigitKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !suffix[i] && i > 0) digitRefs.current[i - 1]?.focus();
    else if (e.key === 'ArrowLeft' && i > 0) { e.preventDefault(); digitRefs.current[i - 1]?.focus(); }
    else if (e.key === 'ArrowRight' && i < 3) { e.preventDefault(); digitRefs.current[i + 1]?.focus(); }
  };

  const handleDigitPaste = (startIdx: number, e: React.ClipboardEvent) => {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '');
    if (!digits) return;
    const updated = [...suffix];
    let lastIdx = startIdx;
    for (let j = 0; j < digits.length && startIdx + j < 4; j++) {
      updated[startIdx + j] = digits[j];
      lastIdx = startIdx + j;
    }
    onSuffixBulkSet(updated);
    requestAnimationFrame(() => { digitRefs.current[Math.min(lastIdx + 1, 3)]?.focus(); });
  };

  return (
    <div className="flex items-center w-full gap-1.5">
      <input type="text" value={prefix} onChange={(e) => onPrefixChange(e.target.value.replace(/[\s-]/g, ''))}
        disabled={disabled} placeholder="e.g. kamal"
        className={`min-w-0 flex-1 rounded-lg px-3.5 py-2.5 ${fieldBase}`} required />
      <span className="shrink-0 select-none text-sm font-semibold text-[#9aa0a6]">-</span>
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <input key={i} ref={(el) => { digitRefs.current[i] = el; }} type="text" inputMode="numeric"
            maxLength={1} value={suffix[i]}
            onChange={(e) => handleDigitChange(i, e.target.value)}
            onKeyDown={(e) => handleDigitKeyDown(i, e)}
            onPaste={(e) => handleDigitPaste(i, e)}
            onFocus={(e) => e.target.select()}
            disabled={disabled} aria-label={`Student ID digit ${i + 1}`}
            className={`h-10 w-9 shrink-0 rounded-lg text-center font-mono font-bold ${fieldBase}`} />
        ))}
      </div>
    </div>
  );
}

export default UsernameInput;
