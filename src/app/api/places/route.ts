import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  
  if (!q) {
    return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(q)}&key=${apiKey}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Places API error:", err);
    return NextResponse.json({ error: 'Failed to fetch places' }, { status: 500 });
  }
}
