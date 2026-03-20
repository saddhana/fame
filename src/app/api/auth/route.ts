import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { password } = await request.json();
  const familyPassword = process.env.FAMILY_PASSWORD;

  if (!familyPassword) {
    return NextResponse.json(
      { error: 'Password belum dikonfigurasi di server' },
      { status: 500 }
    );
  }

  if (password === familyPassword) {
    const response = NextResponse.json({ success: true });
    response.cookies.set('fame-auth', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });
    return response;
  }

  return NextResponse.json(
    { error: 'Password salah. Silakan coba lagi.' },
    { status: 401 }
  );
}
