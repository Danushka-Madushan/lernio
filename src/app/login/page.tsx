'use client';

import { useState, useCallback, useRef, useMemo, FormEvent, ChangeEvent, KeyboardEvent, ClipboardEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BrushCleaning, GraduationCap, ShieldCheck } from 'lucide-react';
import { Button } from '@heroui/react/button';
import { Spinner } from '@heroui/react/spinner';
import { Form, Tabs, Key, toast } from '@heroui/react';
import Image from 'next/image';
import { CredentialFields } from '@/components/CredentialFields';

const DIGIT_COUNT = 4;

const LoginPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get('callbackUrl') || '/';

  const [activeKey, setActiveKey] = useState<Key>('student');
  const [username, setUsername] = useState('');
  const [digits, setDigits] = useState<string[]>(Array(DIGIT_COUNT).fill(''));
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const digitRefs = useRef<Array<HTMLInputElement | null>>([]);

  const resetForm = useCallback(() => {
    setUsername('');
    setPassword('');
    setDigits(Array(DIGIT_COUNT).fill(''));
  }, []);

  const handleSelectionChange = useCallback(
    (key: Key) => {
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
      // Keep only the last typed digit; strips anything non-numeric
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

      const trimmedUsername = username.trim();
      const studentId = digits.join('');

      if (!trimmedUsername || !password.trim()) {
        toast.danger('Please fill in all fields.');
        return;
      }
      if (activeKey === 'student' && studentId.length !== DIGIT_COUNT) {
        toast.danger('Please enter all 4 digits of your student ID.');
        return;
      }

      const fullUsername = activeKey === 'student' ? `${trimmedUsername}-${studentId}` : trimmedUsername;

      setLoading(true);

      const loadingId = toast('Logging in...', {
        isLoading: true,
        timeout: 0,
      });

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

        toast.close(loadingId);
        toast.success('Logged in successfully');

        router.push(callbackUrl);
        router.refresh();
      } catch (err: any) {
        toast.close(loadingId);
        toast.danger(err.message || 'An error occurred during login.');
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

        <Tabs onSelectionChange={handleSelectionChange} defaultSelectedKey="student" orientation="horizontal" variant="primary">
          <Tabs.ListContainer className="w-fit mx-auto">
            <Tabs.List aria-label="sections">
              <Tabs.Tab id="student">
                <GraduationCap className={activeKey === 'student' ? 'text-blue-500' : 'text-slate-500'} size={20} />
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="staff">
                <ShieldCheck className={activeKey === 'staff' ? 'text-blue-500' : 'text-slate-500'} size={20} />
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>

          {/* autoComplete="off" on the form itself is the first line of defense against
            browsers/managers trying to be "helpful" with grouped fields */}
          <Form className="flex w-full flex-col gap-2" onSubmit={onSubmit} autoComplete="off">
            <Tabs.Panel id="student">
              <CredentialFields
                variant="student"
                loading={loading}
                username={username}
                password={password}
                onUsernameChange={setUsername}
                onPasswordChange={setPassword}
                digitProps={digitProps}
              />
            </Tabs.Panel>

            <Tabs.Panel id="staff">
              <CredentialFields
                variant="staff"
                loading={loading}
                username={username}
                password={password}
                onUsernameChange={setUsername}
                onPasswordChange={setPassword}
              />
            </Tabs.Panel>

            <div className="flex items-center justify-between gap-2">
              <Button isDisabled={loading} isPending={loading} fullWidth type="submit" size="lg">
                {({ isPending }) => (
                  <>
                    {isPending ? <Spinner color="current" size="sm" /> : null}
                    {isPending ? 'Logging in...' : 'Log in'}
                  </>
                )}
              </Button>
              <div className="w-fit">
                <Button onPress={resetForm} isIconOnly type="reset" size="lg" variant="danger">
                  <BrushCleaning />
                </Button>
              </div>
            </div>
          </Form>
        </Tabs>
      </div>
    </div>
  );
};

export default LoginPage;
