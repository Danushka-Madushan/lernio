'use client';

import { useState, useEffect, useRef, FormEvent, ChangeEvent, KeyboardEvent, ClipboardEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BrushCleaning } from 'lucide-react';
import { Button } from '@heroui/react/button';
import { Spinner } from '@heroui/react/spinner';
import { Description, FieldError, Form, Input, Label, TextField } from '@heroui/react';
import Image from 'next/image';

const DIGIT_COUNT = 4;

const LoginPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get('callbackUrl') || '/';

  const [username, setUsername] = useState('');
  const [digits, setDigits] = useState<string[]>(Array(DIGIT_COUNT).fill(''));
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const digitRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Clear errors when typing
  useEffect(() => {
    if (error) setError('');
     
  }, [username, password, digits]);

  const handleDigitChange = (index: number) => (e: ChangeEvent<HTMLInputElement>) => {
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
  };

  const handleDigitKeyDown = (index: number) => (e: KeyboardEvent<HTMLInputElement>) => {
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
  };

  const handleDigitPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, DIGIT_COUNT);
    if (!pasted) return;

    const next = Array(DIGIT_COUNT).fill('');
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);

    const focusIndex = Math.min(pasted.length, DIGIT_COUNT - 1);
    digitRefs.current[focusIndex]?.focus();
  };

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setDigits(Array(DIGIT_COUNT).fill(''));
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedUsername = username.trim();
    const studentId = digits.join('');

    if (!trimmedUsername || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    if (studentId.length !== DIGIT_COUNT) {
      setError('Please enter all 4 digits of your student ID.');
      return;
    }

    const fullUsername = `${trimmedUsername}-${studentId}`;

    setLoading(true);
    setError('');

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

      router.push(callbackUrl);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#f8f9fa] px-4 py-6 font-sans">
      <Image
        alt="Background"
        src="/auth-back.jpg"
        fill
        className="absolute top-0 left-0 select-none object-cover"
      />
      <div className="w-full z-10 max-w-md rounded-2xl border border-[#e8eaed] bg-white p-5 shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_2px_6px_2px_rgba(60,64,67,0.15)] transition-all duration-150 sm:p-8">
        <div className="mb-6 text-center">
          <Image
            alt="Logo"
            src="/icon.svg"
            width={56}
            height={56}
            className="mx-auto mb-2 select-none"
          />
          <h1 className="text-2xl font-medium tracking-tight text-slate-600 select-none sm:text-3xl">
            Welcome back!
          </h1>
        </div>

        {error && (
          <div
            className="mb-4 rounded-lg border border-[#fad2cf] bg-[#fce8e6] p-2.5 text-xs text-[#c5221f]"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* autoComplete="off" on the form itself is the first line of defense against
            browsers/managers trying to be "helpful" with grouped fields */}
        <Form className="flex w-full flex-col gap-4" onSubmit={onSubmit} autoComplete="off">
          <TextField
            isDisabled={loading}
            isRequired
            name="ewiz-username"
            type="text"
            fullWidth
            validate={(value) => {
              if (value.length < 5) {
                return 'username must be at least 5 characters long';
              }
              return null;
            }}
          >
            <Label>Username</Label>
            {/* Username input and the 4 ID digits share one visual row with a hyphen between
                them, so it reads as a single "username-XXXX" field instead of two separate
                inputs. The digit boxes are still plain <input>s outside the TextField's
                field/name context — that separation is what keeps browser autofill from
                grouping and duplicating values across all 5 boxes; only the layout is merged. */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              <Input
                autoComplete="off"
                aria-autocomplete="none"
                data-1p-ignore
                data-lpignore="true"
                data-bwignore
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="min-w-0 flex-1 text-base border border-slate-300 shadow-none sm:text-lg"
                placeholder="madushan"
              />
              <span className="select-none text-base font-medium text-slate-400 sm:text-lg">-</span>
              <div className="flex shrink-0 gap-1">
                {digits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      digitRefs.current[index] = el;
                    }}
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
                    onChange={handleDigitChange(index)}
                    onKeyDown={handleDigitKeyDown(index)}
                    onPaste={handleDigitPaste}
                    className="h-10 w-9 shrink-0 rounded-lg border border-slate-300 text-center text-base shadow-none outline-none focus:border-slate-500 sm:h-11 sm:w-10 sm:text-lg"
                    placeholder="#"
                  />
                ))}
              </div>
            </div>
            <Description>last 4 digits represent your student ID</Description>
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
              onChange={(event) => setPassword(event.target.value)}
              className="text-base border border-slate-300 shadow-none sm:text-lg"
              placeholder="••••••••"
            />
            <FieldError />
          </TextField>

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
      </div>
    </div>
  );
};

export default LoginPage;
