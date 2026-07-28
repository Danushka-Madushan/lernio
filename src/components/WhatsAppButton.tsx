"use client"

/**
 * Attempts to open the WhatsApp desktop app (e.g. on Windows, via its registered
 * `whatsapp://` URI scheme) with the given text pre-filled. If the app isn't
 * installed/registered, the page won't lose focus in time, so we fall back to
 * opening web.whatsapp.com in a new tab - the user can still copy the message
 * manually (via the Copy button) and paste it into whatever app they prefer.
 */
const openWhatsApp = (text: string): void => {
  if (!text) return;
  const encoded = encodeURIComponent(text);
  const appUrl = `whatsapp://send?text=${encoded}`;
  const webUrl = `https://wa.me/?text=${encoded}`;

  let appLikelyOpened = false;
  const onVisibilityChange = () => {
    if (document.hidden) appLikelyOpened = true;
  };
  document.addEventListener('visibilitychange', onVisibilityChange);

  window.location.href = appUrl;

  setTimeout(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    if (!appLikelyOpened) {
      window.open(webUrl, '_blank', 'noopener,noreferrer');
    }
  }, 1000);
}

const WhatsAppIcon = ({ size = 12 }: { size?: number }) => {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12.004 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.868-1.426A9.953 9.953 0 0 0 12.004 22C17.523 22 22 17.523 22 12c0-5.522-4.478-10-9.996-10zm0 18.18a8.17 8.17 0 0 1-4.34-1.24l-.31-.186-3.23.946.97-3.148-.202-.323A8.19 8.19 0 0 1 3.82 12c0-4.512 3.673-8.18 8.184-8.18 4.514 0 8.18 3.668 8.18 8.18 0 4.513-3.666 8.18-8.18 8.18z" />
    </svg>
  );
}

const WhatsAppButton = ({ text, label, tiny = false }: { text: string; label?: string; tiny?: boolean }) => {
  return (
    <button type="button" disabled={!text} onClick={() => openWhatsApp(text)}
      title="Share via WhatsApp"
      className={[
        'inline-flex shrink-0 items-center gap-1 rounded-full font-medium text-white shadow-sm transition-all hover:bg-[#20bd5a] disabled:opacity-40 bg-[#25D366]',
        tiny ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs',
      ].join(' ')}>
      <WhatsAppIcon size={tiny ? 11 : 12} />
      {label && <span>{label}</span>}
    </button>
  );
}

export default WhatsAppButton;
