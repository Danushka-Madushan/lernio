import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'lernio-super-secret-key-change-me-in-production';
const secretKey = new TextEncoder().encode(JWT_SECRET);

export interface PlaybackTicketPayload {
  classId: string;
  userId: string;
  youtubeId: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
}

/**
 * Extracts an 11-character YouTube video ID from various YouTube URL formats.
 */
export function extractYouTubeId(input: string | null | undefined): string | null {
  if (!input || typeof input !== 'string') return null;
  const raw = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw;

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
    /[?&]v=([a-zA-Z0-9_-]{11})/,
  ];

  for (const regex of patterns) {
    const match = raw.match(regex);
    if (match && match[1]) return match[1];
  }
  return null;
}

/**
 * Returns standard YouTube thumbnail for card preview.
 */
export function getYouTubeThumbnail(youtubeId: string): string {
  return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
}

/**
 * Signs an ephemeral playback ticket valid for 15 minutes.
 * Used so raw YouTube video IDs are not permanently exposed on client-rendered pages.
 */
export async function signPlaybackTicket(payload: PlaybackTicketPayload): Promise<string> {
  return await new SignJWT({
    classId: payload.classId,
    userId: payload.userId,
    youtubeId: payload.youtubeId,
    role: payload.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(secretKey);
}

/**
 * Verifies and decodes a signed playback ticket.
 */
export async function verifyPlaybackTicket(ticket: string): Promise<PlaybackTicketPayload | null> {
  try {
    const { payload } = await jwtVerify(ticket, secretKey, {
      algorithms: ['HS256'],
    });
    return {
      classId: payload.classId as string,
      userId: payload.userId as string,
      youtubeId: payload.youtubeId as string,
      role: payload.role as 'ADMIN' | 'TEACHER' | 'STUDENT',
    };
  } catch {
    return null;
  }
}
