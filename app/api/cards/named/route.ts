import { NextRequest, NextResponse } from 'next/server';
import { mapScryfallCard, type ScryfallCard } from '@/lib/scryfall/map';

const headers = {
  'User-Agent': 'MTGPracticeTable/0.1 (learning companion)',
  'Accept': 'application/json;q=0.9,*/*;q=0.8',
};

async function requestNamed(param: 'exact' | 'fuzzy', name: string) {
  return fetch(`https://api.scryfall.com/cards/named?${param}=${encodeURIComponent(name)}`, {
    headers,
    cache: 'no-store',
  });
}

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get('name')?.trim();
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

  let response = await requestNamed('exact', name);
  if (response.status === 404) response = await requestNamed('fuzzy', name);

  if (!response.ok) {
    const retryAfter = response.headers.get('retry-after');
    if (response.status === 429) {
      return NextResponse.json({ error: 'Scryfall is rate limiting requests. Please wait a moment and retry.', retryAfter }, { status: 429 });
    }
    if (response.status >= 500) {
      return NextResponse.json({ error: `Scryfall is temporarily unavailable (${response.status}).` }, { status: 503 });
    }
    if (response.status === 404) {
      return NextResponse.json({ error: `No Scryfall card matched “${name}”.` }, { status: 404 });
    }
    return NextResponse.json({ error: `Scryfall lookup failed (${response.status}).` }, { status: response.status });
  }

  const json = await response.json() as ScryfallCard;
  return NextResponse.json(mapScryfallCard(json));
}
