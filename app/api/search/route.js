import { NextResponse } from 'next/server';
import { roleForToken } from '../../../lib/auth';
import { readGameState } from '../../../lib/gist';
import { searchChallenges } from '../../../lib/schema';
export const dynamic = 'force-dynamic';
export async function GET(request) {
  const url = new URL(request.url);
  if (!roleForToken(url.searchParams.get('t'))) return new NextResponse('Not found', { status: 404 });
  const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
  if (q.length < 2) return NextResponse.json({ results: [], total: 0 });
  try {
    return NextResponse.json(searchChallenges(await readGameState(), q), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }
}
