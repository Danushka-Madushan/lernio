import { Description, FieldError, Input, Label, TextField } from '@heroui/react';
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

const usernameValidate = (value: string) => value.length < 5 ? 'username must be at least 5 characters long' : null;

export const CredentialFields = ({
  variant,
  loading,
  username,
  password,
  onUsernameChange,
  onPasswordChange,
  digitProps,
}: CredentialFieldsProps) => (
  <div className="flex w-full flex-col gap-2">
    <TextField
      isDisabled={loading}
      isRequired
      name="ewiz-username"
      type="text"
      fullWidth
      validate={usernameValidate}
    >
      <Label>{variant === 'student' ? 'Student ID' : 'Username'}</Label>
      {variant === 'student' ? (
        // Username input and the 4 ID digits share one visual row with a hyphen between
        // them, so it reads as a single "username-XXXX" field instead of two separate
        // inputs. The digit boxes are still plain <input>s outside the TextField's
        // field/name context — that separation is what keeps browser autofill from
        // grouping and duplicating values across all 5 boxes; only the layout is merged.
        <div className="flex items-center gap-1 sm:gap-1.5">
          <Input
            autoComplete="off"
            aria-autocomplete="none"
            data-1p-ignore
            data-lpignore="true"
            data-bwignore
            value={username}
            onChange={(event) => onUsernameChange(event.target.value)}
            className="min-w-0 flex-1 text-base border border-slate-300 shadow-none sm:text-lg"
            placeholder="kamal"
          />
          <span className="select-none text-base font-medium text-slate-400 sm:text-lg">-</span>
          {digitProps ? <DigitInputs {...digitProps} loading={loading} /> : null}
        </div>
      ) : (
        <Input
          autoComplete="off"
          aria-autocomplete="none"
          data-1p-ignore
          data-lpignore="true"
          data-bwignore
          value={username}
          onChange={(event) => onUsernameChange(event.target.value)}
          className="min-w-0 flex-1 text-base border border-slate-300 shadow-none sm:text-lg"
          placeholder="Administrator"
        />
      )}
      <Description>
        {variant === 'student' ? 'Last 4 digits represent your student ID' : 'You are accessing the system'}
      </Description>
      <FieldError />
    </TextField>

    <TextField isDisabled={loading} isRequired name="ewiz-password">
      <Label>Password</Label>
      <Input
        autoComplete="off"
        aria-autocomplete="none"
        data-1p-ignore
        data-lpignore="true"
        fullWidth
        type="password"
        value={password}
        onChange={(event) => onPasswordChange(event.target.value)}
        className="text-base border border-slate-300 shadow-none sm:text-lg"
        placeholder="••••••••"
      />
      <FieldError />
    </TextField>
  </div>
);
