import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-revalidate-secret');
  if (!secret || secret !== process.env.REVALIDATE_SECRET) {
    console.warn('[revalidate] Unauthorized attempt — bad or missing secret');
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  // Revalidate all data-driven pages
  revalidatePath('/', 'layout');
  console.log('[revalidate] ISR triggered at', new Date().toISOString());

  return NextResponse.json({ revalidated: true, timestamp: Date.now() });
}
