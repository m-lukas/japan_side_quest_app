import { NextResponse } from 'next/server';
import { roleForToken } from '../../../lib/auth';
import { readyGameState } from '../../../lib/gist';
import { adminState, publicDanielState } from '../../../lib/schema';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const token = new URL(request.url).searchParams.get('t');
  const role = roleForToken(token);
  if (!role) return new NextResponse('Not found', { status: 404 });
  try {
    const state = await readyGameState();
    return NextResponse.json(role === 'admin' ? adminState(state) : publicDanielState(state), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
