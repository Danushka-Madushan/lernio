import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signToken } from '@/lib/jwt';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    // Check if the database has any users
    const userCount = await db.user.count();

    let user;

    if (userCount === 0) {
      // Auto-seed default admin if database is empty
      if (username === 'admin' && password === 'admin123') {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        user = await db.user.create({
          data: {
            username: 'admin',
            hashedPassword,
            role: 'ADMIN',
          },
        });
      } else {
        return NextResponse.json(
          { error: 'Database is empty. Log in with admin / admin123 to initialize the system.' },
          { status: 401 }
        );
      }
    } else {
      // Regular login flow
      user = await db.user.findUnique({
        where: { username },
      });

      if (!user) {
        return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
      }

      const passwordMatch = await bcrypt.compare(password, user.hashedPassword);
      if (!passwordMatch) {
        return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
      }
    }

    // Generate JWT token
    const token = await signToken({
      id: user.id,
      username: user.username,
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });

    // Set cookie
    response.cookies.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
