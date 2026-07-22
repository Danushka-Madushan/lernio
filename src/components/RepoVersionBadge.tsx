'use client';

import { useEffect, useRef, useState } from 'react';
import { Tag, GitCommit, Copy, Check, ExternalLink, AlertTriangle } from 'lucide-react';

interface RepoVersionBadgeProps {
  /** e.g. "vercel" */
  owner: string;
  /** e.g. "next.js" */
  repo: string;
  /** Optional: override the display label prefix. Defaults to "v". */
  prefix?: string;
  className?: string;
}

interface TagInfo {
  tag: string;
  sha: string;
  shortSha: string;
  date: string | null;
  message: string;
  author: string;
  htmlUrl: string;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes — public API, no need to hammer it

// Best-effort semver compare. Tags that don't parse fall back to string
// comparison so the badge still shows *something* sensible.
function compareVersions(a: string, b: string): number {
  const parse = (v: string) => {
    const clean = v.replace(/^v/i, '');
    const [core, ...preParts] = clean.split('-');
    const pre = preParts.join('-');
    const parts = core.split('.').map((n) => parseInt(n, 10));
    return { parts, pre, valid: parts.every((n) => !Number.isNaN(n)) && parts.length > 0 };
  };

  const pa = parse(a);
  const pb = parse(b);

  if (!pa.valid || !pb.valid) return a.localeCompare(b);

  for (let i = 0; i < Math.max(pa.parts.length, pb.parts.length); i++) {
    const diff = (pa.parts[i] ?? 0) - (pb.parts[i] ?? 0);
    if (diff !== 0) return diff;
  }

  // No prerelease suffix outranks any prerelease suffix (1.0.0 > 1.0.0-beta)
  if (!pa.pre && pb.pre) return 1;
  if (pa.pre && !pb.pre) return -1;
  return pa.pre.localeCompare(pb.pre);
}

async function fetchLatestTag(owner: string, repo: string): Promise<TagInfo> {
  const cacheKey = `repo-version-badge:${owner}/${repo}`;

  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const { data, cachedAt } = JSON.parse(cached);
      if (Date.now() - cachedAt < CACHE_TTL_MS) return data;
    }
  } catch {
    // sessionStorage unavailable or corrupted entry — just refetch
  }

  const tagsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/tags?per_page=100`, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!tagsRes.ok) {
    throw new Error(tagsRes.status === 404 ? 'Repository not found.' : `GitHub API error (${tagsRes.status})`);
  }
  const tags: Array<{ name: string; commit: { sha: string; url: string } }> = await tagsRes.json();
  if (!tags.length) throw new Error('This repository has no tags yet.');

  const latest = [...tags].sort((a, b) => compareVersions(b.name, a.name))[0];

  const commitRes = await fetch(latest.commit.url, { headers: { Accept: 'application/vnd.github+json' } });
  if (!commitRes.ok) throw new Error(`GitHub API error (${commitRes.status})`);
  const commit = await commitRes.json();

  const data: TagInfo = {
    tag: latest.name,
    sha: latest.commit.sha,
    shortSha: latest.commit.sha.slice(0, 7),
    date: commit.commit?.committer?.date ?? commit.commit?.author?.date ?? null,
    message: (commit.commit?.message ?? '').split('\n')[0],
    author: commit.commit?.author?.name ?? commit.author?.login ?? 'Unknown',
    htmlUrl: commit.html_url,
  };

  try {
    sessionStorage.setItem(cacheKey, JSON.stringify({ data, cachedAt: Date.now() }));
  } catch {
    // ignore quota errors
  }

  return data;
}

export default function RepoVersionBadge({ owner, repo, prefix = 'v', className = '' }: RepoVersionBadgeProps) {
  const [info, setInfo] = useState<TagInfo | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    fetchLatestTag(owner, repo)
      .then((data) => {
        if (isMounted) setInfo(data);
      })
      .catch((err) => {
        if (isMounted) setError(err instanceof Error ? err.message : 'Failed to load version.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [owner, repo]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const handleCopy = async () => {
    if (!info) return;
    try {
      await navigator.clipboard.writeText(info.sha);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — silently ignore
    }
  };

  const formattedDate = info?.date
    ? new Date(info.date).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const displayLabel = error ? 'unknown' : loading ? '···' : `${prefix}${info?.tag.replace(/^v/i, '')}`;

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => !error && setOpen((o) => !o)}
        disabled={!!error && !info}
        className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 font-mono text-[11px] leading-none text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:text-gray-900 disabled:cursor-default disabled:hover:border-gray-200 disabled:hover:bg-gray-50"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {error ? (
          <AlertTriangle size={11} className="text-amber-500" />
        ) : (
          <span
            className={`h-1.5 w-1.5 rounded-full ${loading ? 'animate-pulse bg-gray-400' : 'bg-emerald-500'}`}
          />
        )}
        {displayLabel}
      </button>

      {open && info && (
        <div
          role="dialog"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-72 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
        >
          <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
            <Tag size={14} className="text-emerald-600" />
            <span className="font-mono text-[13px] font-medium text-gray-900">{info.tag}</span>
          </div>

          <div className="space-y-3 px-4 py-3">
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-gray-500">Commit</div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[12px] text-gray-700">
                  <GitCommit size={13} className="text-gray-400" />
                  <span className="font-mono">{info.shortSha}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
                >
                  {copied ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                  {copied ? 'Copied' : 'Copy SHA'}
                </button>
              </div>
            </div>

            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-gray-500">Message</div>
              <p className="text-[12px] leading-snug text-gray-700">{info.message}</p>
            </div>

            <div className="flex items-center justify-between text-[11px] text-gray-500">
              <span>{info.author}</span>
              {formattedDate && <span>{formattedDate}</span>}
            </div>
          </div>

          <a
            href={info.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 border-t border-gray-100 px-4 py-2.5 text-[11px] font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            View on GitHub
            <ExternalLink size={11} />
          </a>
        </div>
      )}

      {open && error && (
        <div
          role="dialog"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 rounded-xl border border-gray-200 bg-white px-4 py-3 text-[12px] text-gray-600 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
        >
          {error}
        </div>
      )}
    </div>
  );
}
