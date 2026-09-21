import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

import { s3, bucketName } from '@/lib/r2';
import { DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { deleteZoomMeeting } from '@/lib/zoom';

// Track in-progress deletions to prevent race conditions or duplicate runs
const activeTeacherDeletions = new Set<string>();

// PUT: Update teacher (reset password)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { password } = body;

    const updateData: any = {};

    if (password !== undefined) {
      if (password.length < 4) {
        return NextResponse.json(
          { error: 'Password must be at least 4 characters.' },
          { status: 400 }
        );
      }
      updateData.hashedPassword = await bcrypt.hash(password, 10);
    }

    const updated = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        role: true,
      },
    });

    return NextResponse.json({ success: true, teacher: updated });
  } catch (error: unknown) {
    console.error('Update teacher error:', error);
    return NextResponse.json({ error: 'Failed to update teacher' }, { status: 500 });
  }
}

// DELETE: Delete teacher account and all resources created by them (Admin only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Prevent admin from deleting themselves
  if (user.id === id) {
    return NextResponse.json(
      { error: 'Cannot delete your own admin account.' },
      { status: 400 }
    );
  }

  if (activeTeacherDeletions.has(id)) {
    return NextResponse.json(
      { error: 'Teacher deletion is already being processed on the server.' },
      { status: 409 }
    );
  }

  try {
    const targetTeacher = await db.user.findUnique({
      where: { id },
      select: { id: true, role: true, username: true },
    });

    if (!targetTeacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    if (targetTeacher.role === 'ADMIN') {
      return NextResponse.json(
        { error: 'Cannot delete an Admin account from teacher management.' },
        { status: 400 }
      );
    }

    // Require and verify exact confirmation username
    let confirmationUsername: string | null = null;
    try {
      const body = await request.json();
      confirmationUsername = body?.confirmationUsername;
    } catch {
      const { searchParams } = new URL(request.url);
      confirmationUsername = searchParams.get('confirmationUsername');
    }

    if (!confirmationUsername || confirmationUsername.trim() !== targetTeacher.username) {
      return NextResponse.json(
        { error: `Confirmation failed: you must type '${targetTeacher.username}' exactly to delete.` },
        { status: 400 }
      );
    }

    // Lock deletion
    activeTeacherDeletions.add(id);

    // ─── 1. Query all resources created by this teacher ────────────────
    const teacherVideos = await db.video.findMany({
      where: { teacherId: id },
      select: {
        id: true,
        cloudflareR2Key: true,
        cloudflareR2ThumbnailKey: true,
      },
    });
    const videoIds = teacherVideos.map((v) => v.id);

    const teacherMeetings = await db.zoomLink.findMany({
      where: { teacherId: id },
      include: { zoomAccount: true },
    });

    // ─── 2. Delete all video files & thumbnails from Cloudflare R2 ────
    const r2KeysToDelete: { Key: string }[] = [];
    for (const v of teacherVideos) {
      if (v.cloudflareR2Key && !v.cloudflareR2Key.startsWith('http')) {
        r2KeysToDelete.push({ Key: v.cloudflareR2Key });
      }
      if (v.cloudflareR2ThumbnailKey && !v.cloudflareR2ThumbnailKey.startsWith('http')) {
        r2KeysToDelete.push({ Key: v.cloudflareR2ThumbnailKey });
      }
    }

    if (r2KeysToDelete.length > 0) {
      try {
        // Delete in chunks of 1000 objects (S3 API limit)
        for (let i = 0; i < r2KeysToDelete.length; i += 1000) {
          const batch = r2KeysToDelete.slice(i, i + 1000);
          await s3.send(
            new DeleteObjectsCommand({
              Bucket: bucketName,
              Delete: { Objects: batch, Quiet: true },
            })
          );
        }
      } catch (r2Err) {
        console.error('Failed to batch delete teacher video files from R2 storage:', r2Err);
      }
    }

    // ─── 3. Delete meetings from Zoom API ──────────────────────────────
    const zoomMeetingsToDelete = teacherMeetings.filter(
      (m) => m.meetingId && m.zoomAccount
    );
    if (zoomMeetingsToDelete.length > 0) {
      await Promise.allSettled(
        zoomMeetingsToDelete.map(async (m) => {
          try {
            await deleteZoomMeeting(
              m.meetingId!,
              m.zoomAccount!.accountId,
              m.zoomAccount!.clientId,
              m.zoomAccount!.clientSecret
            );
          } catch (err) {
            console.error(`Failed to delete Zoom meeting ${m.meetingId} on Zoom API:`, err);
          }
        })
      );
    }

    // ─── 4. Atomic Database Cleanup ────────────────────────────────────
    await db.$transaction(async (tx) => {
      // Reassign assigned students to current admin so students are not left orphaned
      await tx.user.updateMany({
        where: { teacherId: id },
        data: { teacherId: user.id },
      });

      if (videoIds.length > 0) {
        // Delete dependencies on teacher's videos
        await tx.customVideoAccess.deleteMany({ where: { videoId: { in: videoIds } } });
        await tx.comment.deleteMany({ where: { videoId: { in: videoIds } } });
        await tx.like.deleteMany({ where: { videoId: { in: videoIds } } });
        await tx.view.deleteMany({ where: { videoId: { in: videoIds } } });
        // Delete videos
        await tx.video.deleteMany({ where: { id: { in: videoIds } } });
      }

      // Delete Zoom meetings
      await tx.zoomLink.deleteMany({ where: { teacherId: id } });

      // Unlink and delete Zoom accounts
      const teacherZoomAccounts = await tx.zoomAccount.findMany({
        where: { userId: id },
        select: { id: true },
      });
      const zoomAccountIds = teacherZoomAccounts.map((a) => a.id);
      if (zoomAccountIds.length > 0) {
        await tx.zoomLink.updateMany({
          where: { zoomAccountId: { in: zoomAccountIds } },
          data: { zoomAccountId: null },
        });
        await tx.zoomAccount.deleteMany({ where: { id: { in: zoomAccountIds } } });
      }

      // Delete teacher's own comments, likes, views, and custom video access
      await tx.customVideoAccess.deleteMany({ where: { userId: id } });
      await tx.comment.deleteMany({ where: { userId: id } });
      await tx.like.deleteMany({ where: { userId: id } });
      await tx.view.deleteMany({ where: { userId: id } });

      // Finally, delete the teacher account
      await tx.user.delete({ where: { id } });
    });

    return NextResponse.json({
      success: true,
      message: `Teacher '${targetTeacher.username}' and all resources (videos, storage files, meetings) have been permanently deleted.`,
    });
  } catch (error: unknown) {
    console.error('Delete teacher cleanup error:', error);
    return NextResponse.json({ error: 'Failed to complete teacher deletion and cleanup' }, { status: 500 });
  } finally {
    activeTeacherDeletions.delete(id);
  }
}
