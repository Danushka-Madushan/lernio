/**
 * ffmpegLoader.ts
 *
 * Singleton that loads the single-threaded FFmpeg WASM engine once per
 * browser session. All three artifacts — ffmpeg.js itself, ffmpeg-core.js,
 * and ffmpeg-core.wasm — are fetched from a CDN and cached in IndexedDB.
 *
 * IMPORTANT: @ffmpeg/ffmpeg's ESM source contains `new Worker(new URL(
 * classWorkerURL, import.meta.url))`, where classWorkerURL is a runtime
 * variable. Turbopack (and Webpack) statically parse that pattern and fail
 * with "Cannot find module as expression is too dynamic" as soon as the
 * package is anywhere in the bundle graph — even via dynamic import, even
 * with serverExternalPackages. The only reliable fix is to make sure
 * Turbopack never bundles the package at all: we load it as a real ESM
 * module straight from a CDN using the browser's native import(), with a
 * magic comment telling Turbopack to leave that import alone. The browser
 * then evaluates @ffmpeg/ffmpeg's own Worker/URL code at runtime, which is
 * completely normal JS and not a bundler problem.
 */

import type { FFmpeg as FFmpegType } from '@ffmpeg/ffmpeg'; // type-only, erased at build time — no runtime import

// Pinned versions — bump both together to invalidate the IndexedDB cache.
const FFMPEG_PKG_VERSION = '0.12.10';
const FFMPEG_CORE_VERSION = '0.12.10';

const FFMPEG_PKG_URL = `https://unpkg.com/@ffmpeg/ffmpeg@${FFMPEG_PKG_VERSION}/dist/esm/index.js`;
const CDN_BASE = `https://unpkg.com/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/esm`;

const IDB_NAME = 'lernio_ffmpeg_cache';
const IDB_STORE = 'files';
const CACHE_KEY_PREFIX = `v${FFMPEG_CORE_VERSION}:`;

// ─── IndexedDB helpers ────────────────────────────────────────────────────────

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(db: IDBDatabase, key: string): Promise<ArrayBuffer | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => resolve(req.result as ArrayBuffer | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(db: IDBDatabase, key: string, value: ArrayBuffer): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const req = tx.objectStore(IDB_STORE).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ─── Cached fetch → blob URL ──────────────────────────────────────────────────

async function getCachedBlobURL(
  db: IDBDatabase,
  url: string,
  mimeType: string,
  onProgress?: (downloaded: number, total: number) => void,
): Promise<string> {
  const cacheKey = CACHE_KEY_PREFIX + url;

  const cached = await idbGet(db, cacheKey);
  if (cached) {
    return URL.createObjectURL(new Blob([cached], { type: mimeType }));
  }

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);

  const contentLength = Number(response.headers.get('Content-Length') ?? 0);
  const reader = response.body!.getReader();
  const chunks: Uint8Array[] = [];
  let downloaded = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    downloaded += value.length;
    onProgress?.(downloaded, contentLength);
  }

  const total = chunks.reduce((acc, c) => acc + c.length, 0);
  const buffer = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.length;
  }

  try {
    await idbPut(db, cacheKey, buffer.buffer);
  } catch {
    // Storage quota exceeded or private browsing — not fatal.
  }

  return URL.createObjectURL(new Blob([buffer], { type: mimeType }));
}

// ─── Load @ffmpeg/ffmpeg itself from CDN, bypassing Turbopack entirely ────────

let ffmpegModulePromise: Promise<typeof import('@ffmpeg/ffmpeg')> | null = null;

function loadFFmpegModule(): Promise<typeof import('@ffmpeg/ffmpeg')> {
  if (!ffmpegModulePromise) {
    // The webpackIgnore/turbopackIgnore comments stop the bundler from
    // trying to statically resolve this import — it becomes a genuine
    // browser-native `import()` of a remote URL at runtime.
    ffmpegModulePromise = import(
      /* webpackIgnore: true */
      /* turbopackIgnore: true */
      FFMPEG_PKG_URL
    ) as Promise<typeof import('@ffmpeg/ffmpeg')>;
  }
  return ffmpegModulePromise;
}

// ─── Patched worker.js → blob URL ─────────────────────────────────────────────
// worker.js is same-origin-restricted as a Worker script when loaded directly
// from unpkg, so we fetch its text, rewrite its two relative imports to
// absolute CDN URLs, and serve it from a same-origin blob: URL instead.

async function getPatchedWorkerBlobURL(db: IDBDatabase): Promise<string> {
  const cacheKey = CACHE_KEY_PREFIX + 'worker.js:patched';

  const cached = await idbGet(db, cacheKey);
  if (cached) {
    return URL.createObjectURL(new Blob([cached], { type: 'text/javascript' }));
  }

  const base = `https://unpkg.com/@ffmpeg/ffmpeg@${FFMPEG_PKG_VERSION}/dist/esm`;
  const res = await fetch(`${base}/worker.js`);
  if (!res.ok) throw new Error(`Failed to fetch worker.js: ${res.status}`);

  let text = await res.text();
  text = text
    .replace('from "./const.js"', `from "${base}/const.js"`)
    .replace('from "./errors.js"', `from "${base}/errors.js"`);

  const bytes = new TextEncoder().encode(text);

  try {
    await idbPut(db, cacheKey, bytes.buffer);
  } catch {
    // not fatal
  }

  return URL.createObjectURL(new Blob([bytes], { type: 'text/javascript' }));
}

// ─── Singleton state ─────────────────────────────────────────────────────────

let ffmpegInstance: FFmpegType | null = null;
let loadPromise: Promise<FFmpegType> | null = null;

export type FFmpegLoadProgress = {
  phase: 'downloading' | 'initializing';
  percent: number;
};

export async function getFFmpeg(
  onProgress?: (progress: FFmpegLoadProgress) => void,
): Promise<FFmpegType> {
  if (ffmpegInstance) return ffmpegInstance;
  if (loadPromise) return loadPromise;

  loadPromise = (async (): Promise<FFmpegType> => {
    const [db, { FFmpeg }] = await Promise.all([openIDB(), loadFFmpegModule()]);

    let jsBytes = 0;   let jsTotal = 0;
    let wasmBytes = 0; let wasmTotal = 0;

    const reportProgress = () => {
      const total = jsTotal + wasmTotal;
      const done  = jsBytes + wasmBytes;
      const percent = total > 0 ? Math.round((done / total) * 100) : 0;
      onProgress?.({ phase: 'downloading', percent });
    };

    const [coreURL, wasmURL, classWorkerURL] = await Promise.all([
      getCachedBlobURL(
        db,
        `${CDN_BASE}/ffmpeg-core.js`,
        'text/javascript',
        (d, t) => { jsBytes = d; jsTotal = t; reportProgress(); },
      ),
      getCachedBlobURL(
        db,
        `${CDN_BASE}/ffmpeg-core.wasm`,
        'application/wasm',
        (d, t) => { wasmBytes = d; wasmTotal = t; reportProgress(); },
      ),
      getPatchedWorkerBlobURL(db),
    ]);

    onProgress?.({ phase: 'initializing', percent: 100 });

    const ffmpeg = new FFmpeg();
    await ffmpeg.load({ coreURL, wasmURL, classWorkerURL });

    URL.revokeObjectURL(coreURL);
    URL.revokeObjectURL(wasmURL);
    URL.revokeObjectURL(classWorkerURL);

    ffmpegInstance = ffmpeg as unknown as FFmpegType;
    return ffmpegInstance;
  })();

  return loadPromise;
}
