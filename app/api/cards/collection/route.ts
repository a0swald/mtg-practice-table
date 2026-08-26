import { NextRequest, NextResponse } from 'next/server';
import { mapScryfallCard, type ScryfallCard } from '@/lib/scryfall/map';

const headers = {
  'User-Agent': 'MTGPracticeTable/0.1 (learning companion)',
  'Accept': 'application/json;q=0.9,*/*;q=0.8',
  'Content-Type': 'application/json',
};

type CollectionRequest = { names?: string[] };
type ScryfallCollection = {
  data?: ScryfallCard[];
  not_found?: Array<{ name?: string }>;
};

export async function POST(request: NextRequest) {
  let body: CollectionRequest;
  try {
    body = await request.json() as CollectionRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const names = [...new Set((body.names ?? []).map(name => name.trim()).filter(Boolean))];
  if (!names.length) return NextResponse.json({ cards: [], notFound: [] });
  if (names.length > 75) return NextResponse.json({ error: 'A maximum of 75 card names may be looked up at once.' }, { status: 400 });

  const response = await fetch('https://api.scryfall.com/cards/collection', {
    method: 'POST',
    headers,
    body: JSON.stringify({ identifiers: names.map(name => ({ name })) }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const retryAfter = response.headers.get('retry-after');
    const message = response.status === 429
      ? 'Scryfall is rate limiting requests. Please wait a moment and retry.'
      : `Scryfall collection lookup failed (${response.status}).`;
    return NextResponse.json({ error: message, retryAfter }, { status: response.status });
  }

  const json = await response.json() as ScryfallCollection;
  return NextResponse.json({
    cards: (json.data ?? []).map(mapScryfallCard),
    notFound: (json.not_found ?? []).map(item => item.name).filter((name): name is string => Boolean(name)),
  });
}
