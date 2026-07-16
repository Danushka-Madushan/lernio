import { ChangeEvent, ClipboardEvent, KeyboardEvent } from 'react';

export type DigitInputProps = {
  digits: string[];
  loading: boolean;
  onChange: (index: number) => (e: ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (index: number) => (e: KeyboardEvent<HTMLInputElement>) => void;
  onPaste: (e: ClipboardEvent<HTMLInputElement>) => void;
  setRef: (index: number) => (el: HTMLInputElement | null) => void;
};

export const DigitInputs = ({ digits, loading, onChange, onKeyDown, onPaste, setRef }: DigitInputProps) => (
  <div className="flex shrink-0 gap-1">
    {digits.map((digit, index) => (
      <input
        key={index}
        ref={setRef(index)}
        name={`student-id-segment-${index}`}
        aria-label={`student id digit ${index + 1}`}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={1}
        autoComplete="off"
        aria-autocomplete="none"
        data-1p-ignore
        data-lpignore="true"
        data-bwignore
        data-form-type="other"
        disabled={loading}
        value={digit}
        onChange={onChange(index)}
        onKeyDown={onKeyDown(index)}
        onPaste={onPaste}
        className="h-10 w-9 shrink-0 rounded-lg border border-slate-300 text-center text-base shadow-none outline-none focus:border-slate-500 sm:h-11 sm:w-10 sm:text-lg"
        placeholder="#"
      />
    ))}
  </div>
);
