export type Language = 'pt-BR' | 'en-US' | 'es-ES';

export type ReactionStatus = 'going' | 'not_going' | 'liked';

export type EventCategory =
  | 'Geral'
  | 'Festa'
  | 'Musica'
  | 'Esporte'
  | 'Comida'
  | 'Cultura'
  | 'Religioso'
  | 'Outro';

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  instagram_username: string | null;
  language: Language;
  created_at: string;
}

export interface EventRow {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  category: string;
  location: string;
  address_text: string | null;
  start_time: string;
  end_time: string;
  hidden: boolean;
  created_at: string;
}

export interface NearbyEvent {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  category: string;
  address_text: string | null;
  start_time: string;
  end_time: string;
  lat: number;
  lng: number;
  creator_username: string;
  going_count: number;
  not_going_count: number;
  liked_count: number;
  distance_m: number;
  avg_rating: number;
  rating_count: number;
}

export type EventRating = {
  id: string;
  event_id: string;
  user_id: string;
  stars: number;
  created_at: string;
};

export interface CommentRow {
  id: string;
  event_id: string;
  user_id: string;
  text_content: string | null;
  image_url: string | null;
  hidden: boolean;
  created_at: string;
}

export interface CommentWithUser extends CommentRow {
  username: string;
  avatar_url: string | null;
}

export interface EventReactionRow {
  id: string;
  event_id: string;
  user_id: string;
  status: ReactionStatus;
  created_at: string;
}

export const EVENT_CATEGORIES: EventCategory[] = [
  'Geral',
  'Festa',
  'Musica',
  'Esporte',
  'Comida',
  'Cultura',
  'Religioso',
  'Outro',
];

export const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: 'pt-BR', label: 'Português', flag: 'BR' },
  { code: 'en-US', label: 'English', flag: 'US' },
  { code: 'es-ES', label: 'Español', flag: 'ES' },
];
