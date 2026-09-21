import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'lernio-super-secret-key-change-me-in-production';
const secretKey = new TextEncoder().encode(JWT_SECRET);

export interface UserSession {
  id: string;
  username: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
  teacherId?: string | null;
}

export async function signToken(payload: UserSession): Promise<string> {
  return await new SignJWT({
    id: payload.id,
    username: payload.username,
    role: payload.role,
    ...(payload.teacherId ? { teacherId: payload.teacherId } : {}),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey);
}

export async function verifyToken(token: string): Promise<UserSession | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
    });
    return {
      id: payload.id as string,
      username: payload.username as string,
      role: payload.role as 'ADMIN' | 'TEACHER' | 'STUDENT',
      teacherId: (payload.teacherId as string | undefined) || null,
    };
  } catch (error) {
    return null;
  }
}
