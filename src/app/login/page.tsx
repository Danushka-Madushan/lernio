'use client';

import { useState, useCallback, useRef, useMemo, FormEvent, ChangeEvent, KeyboardEvent, ClipboardEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BrushCleaning, GraduationCap, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
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
      setActiveKey(key);
      resetForm();
    },
    [resetForm],
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
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, DIGIT_COUNT);
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

      const fullUsername = activeKey === 'student' ? `${trimmedUsername}-${studentId}` : trimmedUsername;

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
    <div className="flex min-h-dvh items-center justify-center bg-[#f8f9fa] px-4 py-6 font-sans">
      <Image
        alt="Background"
        src="/auth-back.jpg"
        fill
        className="absolute top-0 left-0 select-none object-cover"
      />
      <div className="w-full relative z-10 max-w-md rounded-2xl border border-[#e8eaed] bg-white p-5 shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_2px_6px_2px_rgba(60,64,67,0.15)] transition-all duration-150 sm:p-8">
        <div className="mb-6 text-center">
          <Image
            alt="Logo"
            src="/icon.svg"
            width={56}
            height={56}
            className="mx-auto mb-2 select-none"
          />
          <h1 className="text-2xl font-medium tracking-tight text-slate-600 select-none sm:text-3xl">
            Hi Lernio!
          </h1>
        </div>

        {/* Role Switcher Tabs */}
        <div className="flex w-full max-w-70 mx-auto mb-6 rounded-xl bg-[#f1f3f4] p-1 border border-[#dadce0]">
          <button
            type="button"
            onClick={() => handleSelectionChange('student')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
              activeKey === 'student'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-[#5f6368] hover:text-[#202124]'
            }`}
          >
            <GraduationCap size={17} />
            <span>Student</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelectionChange('staff')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
              activeKey === 'staff'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-[#5f6368] hover:text-[#202124]'
            }`}
          >
            <ShieldCheck size={17} />
            <span>Staff</span>
          </button>
        </div>

        {/* Error message alert */}
        {errorMessage && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-600 animate-in fade-in duration-150">
            <AlertCircle size={15} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form className="flex w-full flex-col gap-5" onSubmit={onSubmit} autoComplete="off">
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

          <div className="flex items-center justify-between gap-2.5 pt-2">
            <Button
              isDisabled={loading}
              isPending={loading}
              fullWidth
              type="submit"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Logging in...</span>
                </>
              ) : (
                <span>Log in</span>
              )}
            </Button>
            <Button
              onPress={resetForm}
              isIconOnly
              type="button"
              size="lg"
              variant="danger"
              title="Clear fields"
            >
              <BrushCleaning size={18} />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
