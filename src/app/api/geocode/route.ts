import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get('place_id');
  
  if (!placeId) {
    return NextResponse.json({ error: 'Missing place_id parameter' }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?place_id=${placeId}&key=${apiKey}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Geocoding API error:", err);
    return NextResponse.json({ error: 'Failed to geocode place' }, { status: 500 });
  }
}
