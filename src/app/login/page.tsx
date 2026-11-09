'use client';

import {
  useState,
  useCallback,
  useRef,
  useMemo,
  FormEvent,
  ChangeEvent,
  KeyboardEvent,
  ClipboardEvent,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  BrushCleaning,
  GraduationCap,
  ShieldCheck,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import Image from 'next/image';
import { CredentialFields } from '@/components/CredentialFields';
import Button from '@/components/ui/Button';

const DIGIT_COUNT = 4;
type LoginRoleKey = 'student' | 'staff';

const LoginPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get('callbackUrl') || '/';

  const [activeKey, setActiveKey] = useState<LoginRoleKey>('student');
  const [username, setUsername] = useState('');
  const [digits, setDigits] = useState<string[]>(Array(DIGIT_COUNT).fill(''));
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const digitRefs = useRef<Array<HTMLInputElement | null>>([]);

  const resetForm = useCallback(() => {
    setUsername('');
    setPassword('');
    setDigits(Array(DIGIT_COUNT).fill(''));
    setErrorMessage('');
  }, []);

  const handleSelectionChange = useCallback(
    (key: LoginRoleKey) => {
      if (key === activeKey) return;
      setActiveKey(key);
      resetForm();
    },
    [activeKey, resetForm],
  );

  const setDigitRef = useCallback(
    (index: number) => (el: HTMLInputElement | null) => {
      digitRefs.current[index] = el;
    },
    [],
  );

  const handleDigitChange = useCallback(
    (index: number) => (e: ChangeEvent<HTMLInputElement>) => {
      setErrorMessage('');
      const value = e.target.value.replace(/\D/g, '').slice(-1);

      setDigits((prev) => {
        const next = [...prev];
        next[index] = value;
        return next;
      });

      if (value && index < DIGIT_COUNT - 1) {
        digitRefs.current[index + 1]?.focus();
      }
    },
    [],
  );

  const handleDigitKeyDown = useCallback(
    (index: number) => (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace') {
        if (!digits[index] && index > 0) {
          digitRefs.current[index - 1]?.focus();
        }
        return;
      }
      if (e.key === 'ArrowLeft' && index > 0) {
        digitRefs.current[index - 1]?.focus();
      } else if (e.key === 'ArrowRight' && index < DIGIT_COUNT - 1) {
        digitRefs.current[index + 1]?.focus();
      }
    },
    [digits],
  );

  const handleDigitPaste = useCallback((e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    setErrorMessage('');
    const pasted = e.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, DIGIT_COUNT);
    if (!pasted) return;

    const next = Array(DIGIT_COUNT).fill('');
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);

    const focusIndex = Math.min(pasted.length, DIGIT_COUNT - 1);
    digitRefs.current[focusIndex]?.focus();
  }, []);

  const digitProps = useMemo(
    () => ({
      digits,
      onChange: handleDigitChange,
      onKeyDown: handleDigitKeyDown,
      onPaste: handleDigitPaste,
      setRef: setDigitRef,
    }),
    [digits, handleDigitChange, handleDigitKeyDown, handleDigitPaste, setDigitRef],
  );

  const onSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setErrorMessage('');

      const trimmedUsername = username.trim();
      const studentId = digits.join('');

      if (!trimmedUsername || !password.trim()) {
        setErrorMessage('Please fill in all fields.');
        return;
      }
      if (activeKey === 'student' && studentId.length !== DIGIT_COUNT) {
        setErrorMessage('Please enter all 4 digits of your student ID.');
        return;
      }

      const fullUsername =
        activeKey === 'student' ? `${trimmedUsername}-${studentId}` : trimmedUsername;

      setLoading(true);

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: fullUsername, password }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Invalid credentials');
        }

        if (data.needsTeacherSelect) {
          router.push('/teacher-select');
        } else {
          router.push(callbackUrl);
        }
        router.refresh();
      } catch (err: any) {
        setErrorMessage(err.message || 'An error occurred during login.');
      } finally {
        setLoading(false);
      }
    },
    [activeKey, callbackUrl, digits, password, router, username],
  );

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#f8f9fa] px-4 py-8 font-sans antialiased">
      <Image
        alt="Background"
        src="/auth-back.jpg"
        fill
        priority
        className="pointer-events-none absolute inset-0 select-none object-cover"
      />
      <div className="pointer-events-none absolute inset-0 bg-slate-900/5" />

      <div className="relative z-10 w-full max-w-105 rounded-2xl border border-slate-200/90 bg-white/95 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.08),0_2px_6px_rgb(0,0,0,0.04)] backdrop-blur-sm transition-all duration-200 sm:p-8">
        {/* Brand Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3.5 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 ring-1 ring-slate-200/80">
            <Image
              alt="Logo"
              src="/icon.svg"
              width={40}
              height={40}
              priority
              className="select-none"
            />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 select-none sm:text-[26px]">
            Hi Lernio!
          </h1>
        </div>

        {/* Role Switcher Tabs */}
        <div
          role="tablist"
          aria-label="Login role"
          className="mb-6 grid w-full grid-cols-2 gap-1 rounded-xl border border-slate-200/80 bg-slate-100/90 p-1"
        >
          <button
            role="tab"
            aria-selected={activeKey === 'student'}
            disabled={loading}
            type="button"
            onClick={() => handleSelectionChange('student')}
            className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:pointer-events-none disabled:opacity-60 ${
              activeKey === 'student'
                ? 'bg-white text-blue-600 shadow-xs ring-1 ring-slate-900/5'
                : 'text-slate-600 hover:bg-white/50 hover:text-slate-900'
            }`}
          >
            <GraduationCap size={18} strokeWidth={2} className="shrink-0" />
            <span>Student</span>
          </button>
          <button
            role="tab"
            aria-selected={activeKey === 'staff'}
            disabled={loading}
            type="button"
            onClick={() => handleSelectionChange('staff')}
            className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:pointer-events-none disabled:opacity-60 ${
              activeKey === 'staff'
                ? 'bg-white text-blue-600 shadow-xs ring-1 ring-slate-900/5'
                : 'text-slate-600 hover:bg-white/50 hover:text-slate-900'
            }`}
          >
            <ShieldCheck size={18} strokeWidth={2} className="shrink-0" />
            <span>Staff</span>
          </button>
        </div>

        {/* Error Message Alert */}
        {errorMessage && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/90 px-3.5 py-3 text-[13px] leading-snug font-medium text-red-700 animate-in fade-in duration-150"
          >
            <AlertCircle
              size={18}
              strokeWidth={2}
              className="mt-0.5 shrink-0 text-red-600"
            />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form
          className="flex w-full flex-col gap-5"
          onSubmit={onSubmit}
          autoComplete="off"
        >
          <CredentialFields
            variant={activeKey}
            loading={loading}
            username={username}
            password={password}
            onUsernameChange={(v) => {
              setUsername(v);
              setErrorMessage('');
            }}
            onPasswordChange={(v) => {
              setPassword(v);
              setErrorMessage('');
            }}
            digitProps={activeKey === 'student' ? digitProps : undefined}
          />

          <div className="flex items-center justify-between gap-3 pt-1.5">
            <Button
              isDisabled={loading}
              isPending={loading}
              fullWidth
              type="submit"
              size="lg"
            >
              {({ isPending }) => (
                <span className="inline-flex items-center justify-center gap-2">
                  {isPending ? (
                    <Loader2
                      size={19}
                      strokeWidth={2.25}
                      className="shrink-0 animate-spin"
                    />
                  ) : null}
                  <span>{isPending ? 'Logging in...' : 'Log in'}</span>
                </span>
              )}
            </Button>
            <Button
              onPress={resetForm}
              isDisabled={loading}
              isIconOnly
              type="button"
              size="lg"
              variant="danger"
              title="Clear fields"
            >
              <BrushCleaning size={19} strokeWidth={2} className="shrink-0" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
