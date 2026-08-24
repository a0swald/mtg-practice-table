import { NextRequest, NextResponse } from 'next/server';
import { mapScryfallCard, type ScryfallCard } from '@/lib/scryfall/map';
const headers = { 'User-Agent': 'MTGPracticeTable/0.1 (learning companion)', 'Accept': 'application/json;q=0.9,*/*;q=0.8' };
export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get('name')?.trim();
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
  const response = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`, { headers, next: { revalidate: 86400 } });
  if (!response.ok) return NextResponse.json({ error: 'Card not found.' }, { status: response.status });
  const json = await response.json() as ScryfallCard;
  return NextResponse.json(mapScryfallCard(json));
}
