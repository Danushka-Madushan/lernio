'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

/**
 * Slim animated top-bar that fires on every Next.js App Router navigation.
 * Works by detecting when pathname/searchParams change and running a
 * CSS-driven "progress" bar that completes once the new page renders.
 */
function LoaderBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [completing, setCompleting] = useState(false);
  const mountedRef = useRef(false);
  const completeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Skip the very first render (initial page load)
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }

    // Clear any pending timers
    if (completeTimer.current) clearTimeout(completeTimer.current);
    if (hideTimer.current) clearTimeout(hideTimer.current);

    // Show the bar and start animating
    setCompleting(false);
    setVisible(true);

    // After a short delay, "complete" the bar (slide to 100%)
    completeTimer.current = setTimeout(() => {
      setCompleting(true);
      // Hide it after the complete animation finishes
      hideTimer.current = setTimeout(() => {
        setVisible(false);
        setCompleting(false);
      }, 400);
    }, 80);

    return () => {
      if (completeTimer.current) clearTimeout(completeTimer.current);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [pathname, searchParams]);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className={`nav-loader-bar${completing ? ' nav-loader-complete' : ''}`}
    />
  );
}

/**
 * Must be wrapped in <Suspense> because useSearchParams() suspends.
 * Import and render this in the root layout.
 */
const NavigationLoader = () => {
  return (
    <LoaderBar />
  );
}

export default NavigationLoader;
