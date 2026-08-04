/*
# Event star ratings system

## What this migration does

1. Creates `event_ratings` table so users can rate events 1-5 stars.
2. Adds RLS policies: authenticated users can read all ratings, and insert/update/delete only their own rating.
3. Updates `vibe_nearby_events` RPC to also return `avg_rating` (numeric 1-5) and `rating_count` (integer) for each event.

## New Tables
- `event_ratings`
  - `id` (uuid, primary key)
  - `event_id` (uuid, references events, cascade delete)
  - `user_id` (uuid, references profiles, cascade delete)
  - `stars` (integer 1-5, not null)
  - `created_at` (timestamptz)
  - UNIQUE(event_id, user_id) — one rating per user per event

## Security
- RLS enabled on `event_ratings`.
- SELECT: all authenticated users can see ratings (social proof).
- INSERT/UPDATE/DELETE: only the rating owner (auth.uid() = user_id).

## Notes
1. The RPC is replaced (DROP FUNCTION + CREATE FUNCTION) to add two new return columns: avg_rating and rating_count.
*/

-- 1. Create event_ratings table
CREATE TABLE IF NOT EXISTS event_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  stars INTEGER NOT NULL CHECK (stars >= 1 AND stars <= 5),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS event_ratings_event_index ON event_ratings (event_id);

ALTER TABLE event_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ratings_select_all" ON event_ratings;
CREATE POLICY "ratings_select_all" ON event_ratings FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "ratings_insert_own" ON event_ratings;
CREATE POLICY "ratings_insert_own" ON event_ratings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ratings_update_own" ON event_ratings;
CREATE POLICY "ratings_update_own" ON event_ratings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ratings_delete_own" ON event_ratings;
CREATE POLICY "ratings_delete_own" ON event_ratings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- 2. Update vibe_nearby_events RPC to include avg_rating and rating_count
DROP FUNCTION IF EXISTS vibe_nearby_events(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER);

CREATE OR REPLACE FUNCTION vibe_nearby_events(p_lat DOUBLE PRECISION, p_lng DOUBLE PRECISION, p_radius_m INTEGER DEFAULT 20000)
RETURNS TABLE (
  id UUID,
  creator_id UUID,
  title TEXT,
  description TEXT,
  category TEXT,
  address_text TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  creator_username TEXT,
  going_count BIGINT,
  not_going_count BIGINT,
  liked_count BIGINT,
  distance_m DOUBLE PRECISION,
  avg_rating NUMERIC,
  rating_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.id,
    e.creator_id,
    e.title,
    e.description,
    e.category,
    e.address_text,
    e.start_time,
    e.end_time,
    ST_Y(e.location::geometry) AS lat,
    ST_X(e.location::geometry) AS lng,
    p.username AS creator_username,
    COUNT(r_going.id) FILTER (WHERE r_going.status = 'going') AS going_count,
    COUNT(r_notgoing.id) FILTER (WHERE r_notgoing.status = 'not_going') AS not_going_count,
    COUNT(r_liked.id) FILTER (WHERE r_liked.status = 'liked') AS liked_count,
    ST_Distance(e.location, ST_MakePoint(p_lng, p_lat)::geography) AS distance_m,
    COALESCE(AVG(rat.stars), 0) AS avg_rating,
    COUNT(rat.id) AS rating_count
  FROM events e
  LEFT JOIN profiles p ON p.id = e.creator_id
  LEFT JOIN event_reactions r_going ON r_going.event_id = e.id AND r_going.status = 'going'
  LEFT JOIN event_reactions r_notgoing ON r_notgoing.event_id = e.id AND r_notgoing.status = 'not_going'
  LEFT JOIN event_reactions r_liked ON r_liked.event_id = e.id AND r_liked.status = 'liked'
  LEFT JOIN event_ratings rat ON rat.event_id = e.id
  WHERE e.hidden = false
    AND e.end_time > now()
    AND ST_DWithin(e.location, ST_MakePoint(p_lng, p_lat)::geography, p_radius_m)
  GROUP BY e.id, p.username
  ORDER BY distance_m ASC;
$$;
