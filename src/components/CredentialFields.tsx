import { DigitInputProps, DigitInputs } from './DigitInputs';

type CredentialFieldsProps = {
  variant: 'student' | 'staff';
  loading: boolean;
  username: string;
  password: string;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  digitProps?: Omit<DigitInputProps, 'loading'>;
};

export const CredentialFields = ({
  variant,
  loading,
  username,
  password,
  onUsernameChange,
  onPasswordChange,
  digitProps,
}: CredentialFieldsProps) => {
  const isUsernameShort = username.length > 0 && username.length < 5;

  return (
    <div className="flex w-full flex-col gap-4">
      {/* Username / Student ID Field */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-slate-700">
          {variant === 'student' ? 'Student ID' : 'Username'}
        </label>
        {variant === 'student' ? (
          <div className="flex items-center gap-1 sm:gap-1.5">
            <input
              type="text"
              name="ewiz-username"
              disabled={loading}
              required
              autoComplete="off"
              aria-autocomplete="none"
              data-1p-ignore
              data-lpignore="true"
              data-bwignore
              value={username}
              onChange={(event) => onUsernameChange(event.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-base text-[#202124] outline-none transition-all hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 disabled:opacity-60 sm:text-lg"
              placeholder="kamal"
            />
            <span className="select-none text-base font-medium text-slate-400 sm:text-lg">-</span>
            {digitProps ? <DigitInputs {...digitProps} loading={loading} /> : null}
          </div>
        ) : (
          <input
            type="text"
            name="ewiz-username"
            disabled={loading}
            required
            autoComplete="off"
            aria-autocomplete="none"
            data-1p-ignore
            data-lpignore="true"
            data-bwignore
            value={username}
            onChange={(event) => onUsernameChange(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-base text-[#202124] outline-none transition-all hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 disabled:opacity-60 sm:text-lg"
            placeholder="Administrator"
          />
        )}
        <p className="text-[11px] text-slate-500">
          {variant === 'student' ? 'Last 4 digits represent your student ID' : 'You are accessing the system'}
        </p>
        {isUsernameShort && (
          <p className="text-[11px] text-red-500 font-medium">Username must be at least 5 characters long</p>
        )}
      </div>

      {/* Password Field */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-slate-700">Password</label>
        <input
          type="password"
          name="ewiz-password"
          disabled={loading}
          required
          autoComplete="off"
          aria-autocomplete="none"
          data-1p-ignore
          data-lpignore="true"
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-base text-[#202124] outline-none transition-all hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 disabled:opacity-60 sm:text-lg"
          placeholder="••••••••"
        />
      </div>
    </div>
  );
};
