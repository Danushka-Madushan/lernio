'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BrushCleaning } from 'lucide-react';
import { Button } from '@heroui/react/button';
import { Spinner } from '@heroui/react/spinner';
import { Description, FieldError, Form, Input, Label, TextField } from '@heroui/react';
import Image from 'next/image';

const LoginPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get('callbackUrl') || '/';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Clear errors when typing
  useEffect(() => {
    if (error) setError('');
  }, [username, password]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
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
    <div className="flex min-h-screen items-center justify-center bg-[#f8f9fa] px-4 font-sans">
      <Image
        alt="Background"
        src="/auth-back.jpg"
        fill
        className="absolute top-0 left-0 select-none object-cover"
      />
      <div className="w-full z-10 max-w-md rounded-2xl border border-[#e8eaed] bg-white p-8 shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_2px_6px_2px_rgba(60,64,67,0.15)] transition-all duration-150">
        <div className="mb-6 text-center">
          <Image
            alt="Logo"
            src="/icon.svg"
            width={56}
            height={56}
            className="mx-auto mb-2 select-none"
          />
          <h1 className="text-3xl font-medium tracking-tight text-slate-600 select-none">
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

        <Form className="flex w-96 flex-col gap-4" onSubmit={onSubmit}>
          <TextField
            isDisabled={loading}
            isRequired
            name="ewiz-username"
            type="text"
            fullWidth
            validate={(value) => {
              if (value.length < 5) {
                return "username must be at least 5 characters long";
              }
              return null;
            }}
          >
            <Label>Username</Label>
            <div className='flex gap-2'>
              <Input
                autoComplete='off'
                aria-autocomplete='none'
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="text-lg border border-slate-300 shadow-none" placeholder="madushan" />
              <div className='flex gap-2 '>
                <Input
                  aria-label="id-digit-1"
                  autoComplete='off'
                  aria-autocomplete='none'
                  className="text-lg border border-slate-300 w-12 text-center shadow-none" placeholder="#" />
                <Input
                  aria-label="id-digit-2"
                  autoComplete='off'
                  aria-autocomplete='none'
                  className="text-lg border border-slate-300 w-12 text-center shadow-none" placeholder="#" />
                <Input
                  aria-label="id-digit-3"
                  autoComplete='off'
                  aria-autocomplete='none'
                  className="text-lg border border-slate-300 w-12 text-center shadow-none" placeholder="#" />
                <Input
                  aria-label="id-digit-4"
                  autoComplete='off'
                  aria-autocomplete='none'
                  className="text-lg border border-slate-300 w-12 text-center shadow-none" placeholder="#" />
              </div>
            </div>
            <Description>last 4 digits represents your student id</Description>
            <FieldError />
          </TextField>

          <TextField
            isDisabled={loading}
            isRequired
            name="ewiz-password"
          >
            <Label>Password</Label>
            <Input
              autoComplete='off'
              aria-autocomplete='none'
              fullWidth
              type='password'
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="text-lg border border-slate-300 shadow-none" placeholder="••••••••" />
            <FieldError />
          </TextField>

          <div className="flex items-center justify-between gap-2">
            <Button
              isDisabled={loading}
              isPending={loading}
              fullWidth
              type="submit"
              size='lg'
            >
              {({ isPending }) => (
                <>
                  {isPending ? <Spinner color="current" size="sm" /> : null}
                  {isPending ? "Logging in..." : "Log in"}
                </>
              )}
            </Button>
            <div className='w-fit'>
              <Button onPress={() => {
                setUsername("")
                setPassword("")
              }} isIconOnly type="reset" variant="danger">
                <BrushCleaning />
              </Button>
            </div>
          </div>
        </Form>
      </div>

    </div>
  );
}

export default LoginPage;
