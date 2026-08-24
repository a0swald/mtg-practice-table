import { NextRequest, NextResponse } from 'next/server';
const headers = { 'User-Agent': 'MTGPracticeTable/0.1 (learning companion)', 'Accept': 'application/json;q=0.9,*/*;q=0.8' };
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 2) return NextResponse.json({ data: [] });
  const response = await fetch(`https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(q)}&include_extras=false`, { headers, next: { revalidate: 3600 } });
  if (!response.ok) return NextResponse.json({ error: 'Scryfall autocomplete failed.' }, { status: response.status });
  const json = await response.json() as { data?: string[] };
  return NextResponse.json({ data: json.data ?? [] });
}
