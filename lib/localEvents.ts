import type { NearbyEvent } from '@/types/database';

const DEFAULT_LAT = -11.8563;
const DEFAULT_LNG = -55.5084;

const minutesAgo = (m: number) => new Date(Date.now() - m * 60000).toISOString();
const minutesAhead = (m: number) => new Date(Date.now() + m * 60000).toISOString();

function makeMockEvents(userLat: number, userLng: number): NearbyEvent[] {
  const offset = (dlat: number, dlng: number) => ({
    lat: userLat + dlat,
    lng: userLng + dlng,
  });

  const base: Omit<NearbyEvent, 'distance_m'>[] = [
    {
      id: 'mock-festa-praia',
      creator_id: 'mock-user-1',
      title: 'Festa na Praia do Mirante',
      description: 'Som na areia, gente bonita e pôr do sol garantido. Leve sua cerveja!',
      category: 'Festa',
      address_text: 'Praia do Mirante, Sinop - MT',
      start_time: minutesAgo(20),
      end_time: minutesAhead(100),
      ...offset(0.018, 0.012),
      creator_username: 'Julia',
      going_count: 12,
      not_going_count: 1,
      liked_count: 8,
      avg_rating: 5,
      rating_count: 3,
    },
    {
      id: 'mock-musica-praca',
      creator_id: 'mock-user-2',
      title: 'Som na Praça ao Vivo',
      description: 'Banda local tocando forró e sertanejo na praça central. Entrada franca!',
      category: 'Musica',
      address_text: 'Praça da Bandeira, Centro',
      start_time: minutesAgo(5),
      end_time: minutesAhead(180),
      ...offset(-0.012, 0.008),
      creator_username: 'Marcos',
      going_count: 25,
      not_going_count: 0,
      liked_count: 15,
      avg_rating: 4,
      rating_count: 5,
    },
    {
      id: 'mock-comida-feira',
      creator_id: 'mock-user-3',
      title: 'Feira Gastronômica Noturna',
      description: 'Food trucks com culinária local e internacional. Das 18h até meia-noite.',
      category: 'Comida',
      address_text: 'Av. das Flores, 1200',
      start_time: minutesAhead(60),
      end_time: minutesAhead(360),
      ...offset(0.022, -0.016),
      creator_username: 'Pedro',
      going_count: 7,
      not_going_count: 2,
      liked_count: 4,
      avg_rating: 4,
      rating_count: 2,
    },
    {
      id: 'mock-esporte-park',
      creator_id: 'mock-user-4',
      title: 'Roda de Futebol no Parque',
      description: 'Pelada aberta no campo do parque. Leiteiros bem-vindos, tragam bola reserva!',
      category: 'Esporte',
      address_text: 'Parque das Águas, Setor B',
      start_time: minutesAhead(30),
      end_time: minutesAhead(150),
      ...offset(-0.019, -0.011),
      creator_username: 'Ana',
      going_count: 18,
      not_going_count: 0,
      liked_count: 9,
      avg_rating: 5,
      rating_count: 4,
    },
    {
      id: 'mock-cultura-cine',
      creator_id: 'mock-user-5',
      title: 'Cine na Rua: Clássicos Brasileiros',
      description: 'Sessão ao ar livre com filme clássico nacional. Leve sua cadeira ou canga.',
      category: 'Cultura',
      address_text: 'Largo da Matriz',
      start_time: minutesAhead(120),
      end_time: minutesAhead(270),
      ...offset(0.009, 0.021),
      creator_username: 'Beatriz',
      going_count: 5,
      not_going_count: 1,
      liked_count: 12,
      avg_rating: 3,
      rating_count: 1,
    },
  ];

  return base.map((e) => {
    const dist = haversine(userLat, userLng, e.lat, e.lng);
    return { ...e, distance_m: dist };
  });
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

const localEventStore: NearbyEvent[] = [];

export function addLocalEvent(event: NearbyEvent): void {
  const idx = localEventStore.findIndex((e) => e.id === event.id);
  if (idx >= 0) {
    localEventStore[idx] = event;
  } else {
    localEventStore.unshift(event);
  }
}

export function getLocalEvents(userLat: number, userLng: number): NearbyEvent[] {
  const mock = makeMockEvents(userLat, userLng);
  const userCreated = localEventStore.map((e) => ({
    ...e,
    distance_m: haversine(userLat, userLng, e.lat, e.lng),
  }));
  return [...userCreated, ...mock];
}
