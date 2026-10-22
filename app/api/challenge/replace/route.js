import { NextResponse } from 'next/server';
import { roleForToken } from '../../../../lib/auth';
import { updateGameState } from '../../../../lib/gist';
import { replace, refillActive } from '../../../../lib/game';
import { publicDanielState } from '../../../../lib/schema';

export const dynamic = 'force-dynamic';
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  if (roleForToken(body.token) !== 'daniel') return new NextResponse('Not found', { status: 404 });
  if (!body.challengeId) return NextResponse.json({ error: 'Challenge-ID fehlt.' }, { status: 400 });
  try {
    const { state } = await updateGameState(s => { refillActive(s); return replace(s, body.challengeId); });
    return NextResponse.json(publicDanielState(state), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return NextResponse.json({ error: error.message }, { status: 409 }); }
}
