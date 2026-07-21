import dynamic from 'next/dynamic';

export const MediaChrome = dynamic(() => import('./CustomPlayer'), {
  ssr: false,
  loading: () => (
    <div className="w-full aspect-video rounded-2xl bg-[#05070B] animate-pulse" />
  ),
});
