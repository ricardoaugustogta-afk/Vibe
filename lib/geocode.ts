export interface GeocodeResult {
  displayName: string;
  lat: number;
  lng: number;
}

export async function searchPlace(query: string): Promise<GeocodeResult[]> {
  if (!query.trim()) return [];
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&accept-language=pt-BR,en`;
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
  });
  if (!res.ok) throw new Error('geocode_failed');
  const data = await res.json();
  return (data as Array<{ display_name: string; lat: string; lon: string }>).map((r) => ({
    displayName: r.display_name,
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
  }));
}
