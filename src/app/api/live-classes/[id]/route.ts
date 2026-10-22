import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import { db } from '@/lib/db';
import { extractYouTubeId } from '@/lib/youtube';
import { Grade, VideoVisibility } from '@/generated/client/enums';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/live-classes/[id]
export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    const user = token ? await verifyToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const liveClass = await db.youTubeClass.findUnique({
      where: { id },
      include: {
        teacher: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    if (!liveClass) {
      return NextResponse.json({ error: 'Live class not found' }, { status: 404 });
    }

    // Role-based validation
    if (user.role === 'STUDENT') {
      const studentRecord = await db.user.findUnique({
        where: { id: user.id },
        select: {
          grade: true,
          activeFrom: true,
          activeTo: true,
          teacherId: true,
        },
      });

      if (!studentRecord) {
        return NextResponse.json({ error: 'Student record not found' }, { status: 404 });
      }

      // Teacher isolation check
      if (liveClass.teacherId !== studentRecord.teacherId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      // Grade visibility check
      if (
        liveClass.visibility === VideoVisibility.GRADE &&
        liveClass.grade !== studentRecord.grade
      ) {
        return NextResponse.json({ error: 'Access denied for this grade' }, { status: 403 });
      }

      // For students: do NOT return raw youtubeId in this standard metadata endpoint
      const { youtubeId: _hiddenId, ...safeMetadata } = liveClass;
      return NextResponse.json({ class: safeMetadata });
    }

    // Teachers can only view their own classes unless Admin
    if (user.role === 'TEACHER' && liveClass.teacherId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ class: liveClass });
  } catch (error) {
    console.error('Failed to get live class:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/live-classes/[id]
export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    const user = token ? await verifyToken(token) : null;

    if (!user || (user.role !== 'ADMIN' && user.role !== 'TEACHER')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const liveClass = await db.youTubeClass.findUnique({
      where: { id },
    });

    if (!liveClass) {
      return NextResponse.json({ error: 'Live class not found' }, { status: 404 });
    }

    if (user.role === 'TEACHER' && liveClass.teacherId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, youtubeUrl, grade, visibility, customThumbnailUrl } = body;

    const updateData: {
      title?: string;
      description?: string | null;
      youtubeId?: string;
      customThumbnailUrl?: string | null;
      grade?: Grade | null;
      visibility?: VideoVisibility;
    } = {};

    if (title && typeof title === 'string') {
      updateData.title = title.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    if (customThumbnailUrl !== undefined) {
      updateData.customThumbnailUrl =
        customThumbnailUrl && typeof customThumbnailUrl === 'string' && customThumbnailUrl.trim()
          ? customThumbnailUrl.trim()
          : null;
    }

    if (youtubeUrl) {
      const parsedId = extractYouTubeId(youtubeUrl);
      if (!parsedId) {
        return NextResponse.json({ error: 'Invalid YouTube link or Video ID' }, { status: 400 });
      }
      updateData.youtubeId = parsedId;
    }

    if (grade !== undefined) {
      updateData.grade = grade && Object.values(Grade).includes(grade) ? (grade as Grade) : null;
    }

    if (visibility) {
      updateData.visibility = visibility === 'GRADE' ? VideoVisibility.GRADE : VideoVisibility.PUBLIC;
    }

    const finalVisibility =
      visibility !== undefined
        ? visibility === 'GRADE'
          ? VideoVisibility.GRADE
          : VideoVisibility.PUBLIC
        : liveClass.visibility;

    const finalGrade =
      grade !== undefined
        ? grade && Object.values(Grade).includes(grade)
          ? (grade as Grade)
          : null
        : liveClass.grade;

    if (finalVisibility === VideoVisibility.GRADE && !finalGrade) {
      return NextResponse.json(
        { error: 'A specific target grade is required when visibility is set to Target Grade Only' },
        { status: 400 }
      );
    }

    const updated = await db.youTubeClass.update({
      where: { id },
      data: updateData,
      include: {
        teacher: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    return NextResponse.json({ class: updated });
  } catch (error) {
    console.error('Failed to update live class:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/live-classes/[id] - Atomic delete with zero leftovers
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    const user = token ? await verifyToken(token) : null;

    if (!user || (user.role !== 'ADMIN' && user.role !== 'TEACHER')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const liveClass = await db.youTubeClass.findUnique({
      where: { id },
    });

    if (!liveClass) {
      return NextResponse.json({ error: 'Live class not found' }, { status: 404 });
    }

    if (user.role === 'TEACHER' && liveClass.teacherId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.youTubeClass.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Live class deleted' });
  } catch (error) {
    console.error('Failed to delete live class:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
