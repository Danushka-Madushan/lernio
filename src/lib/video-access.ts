import { db } from '@/lib/db';
import { UserSession } from '@/lib/jwt';
import { VideoVisibility } from '@/generated/client/enums';

export interface VideoAccessResult {
  allowed: boolean;
  reason?: 'unauthorized' | 'not_found' | 'forbidden' | 'account_inactive';
  video?: {
    id: string;
    title: string;
    teacherId: string | null;
    grade: any;
    visibility: VideoVisibility;
    cloudflareR2Key: string;
    cloudflareR2ThumbnailKey: string | null;
  };
}

export function isAccountActive(activeFrom: Date | null, activeTo: Date | null): boolean {
  const now = new Date();
  if (activeFrom && now < activeFrom) return false;
  if (activeTo && now > activeTo) return false;
  return true;
}

export async function verifyVideoAccess(
  user: UserSession | null,
  videoId: string
): Promise<VideoAccessResult> {
  if (!user) {
    return { allowed: false, reason: 'unauthorized' };
  }

  const video = await db.video.findUnique({
    where: { id: videoId },
    select: {
      id: true,
      title: true,
      teacherId: true,
      grade: true,
      visibility: true,
      cloudflareR2Key: true,
      cloudflareR2ThumbnailKey: true,
    },
  });

  if (!video) {
    return { allowed: false, reason: 'not_found' };
  }

  // ADMIN has universal access
  if (user.role === 'ADMIN') {
    return { allowed: true, video };
  }

  // TEACHER can only access their own videos
  if (user.role === 'TEACHER') {
    if (video.teacherId === user.id) {
      return { allowed: true, video };
    }
    return { allowed: false, reason: 'forbidden' };
  }

  // STUDENT
  if (user.role === 'STUDENT') {
    const student = await db.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        grade: true,
        activeFrom: true,
        activeTo: true,
        accessMode: true,
        teacherId: true,
      },
    });

    if (!student) {
      return { allowed: false, reason: 'forbidden' };
    }

    if (!isAccountActive(student.activeFrom, student.activeTo)) {
      return { allowed: false, reason: 'account_inactive' };
    }

    // Must belong to the student's assigned teacher
    if (!student.teacherId || video.teacherId !== student.teacherId) {
      return { allowed: false, reason: 'forbidden' };
    }

    // CUSTOM mode: must be in customVideoAccess
    if (student.accessMode === 'CUSTOM') {
      const custom = await db.customVideoAccess.findUnique({
        where: {
          userId_videoId: {
            userId: user.id,
            videoId: video.id,
          },
        },
      });
      if (!custom) {
        return { allowed: false, reason: 'forbidden' };
      }
      return { allowed: true, video };
    }

    // GRADE mode
    if (video.visibility === VideoVisibility.GRADE) {
      if (!student.grade || student.grade !== video.grade) {
        return { allowed: false, reason: 'forbidden' };
      }
    }

    return { allowed: true, video };
  }

  return { allowed: false, reason: 'forbidden' };
}
