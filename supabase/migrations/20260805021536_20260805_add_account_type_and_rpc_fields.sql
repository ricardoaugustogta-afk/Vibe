/*
# Add account_type to profiles + extend nearby events RPC

## What this migration does

1. Adds `account_type` column to `profiles` table (TEXT, default 'personal').
   Accepted values: 'personal' (regular user) or 'business' (commercial establishment).
2. Recreates `vibe_nearby_events` RPC to also return `creator_avatar_url`, `creator_account_type`,
   and per-event `avg_rating` / `rating_count` so the map can render avatar markers with
   gold borders for business profiles and star ratings.

## Columns added

- `profiles.account_type` TEXT NOT NULL DEFAULT 'personal'
  - CHECK constraint ensures only 'personal' or 'business' are accepted.

## Modified functions

- `vibe_nearby_events`: now returns 4 additional columns:
  - `creator_avatar_url` (TEXT, nullable) — profile photo URL
  - `creator_account_type` (TEXT) — 'personal' or 'business'
  - `avg_rating` (DOUBLE PRECISION) — average star rating (0 if no ratings)
  - `rating_count` (BIGINT) — number of ratings

## Security

- No policy changes. The existing `profiles_select_all` SELECT policy already allows
  all authenticated users to read profiles.

## Notes

1. `account_type` defaults to 'personal' so all existing profiles are treated as
   personal accounts automatically.
2. The `event_ratings` table is joined with a LEFT JOIN so events without ratings
   still appear (avg_rating = 0, rating_count = 0).
3. The function signature (p_lat, p_lng, p_radius_m) is unchanged but the return
   type changed, so we DROP and recreate it.
*/

-- 1. Add account_type column to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'account_type'
  ) THEN
    ALTER TABLE profiles ADD COLUMN account_type TEXT NOT NULL DEFAULT 'personal';
    ALTER TABLE profiles ADD CONSTRAINT profiles_account_type_check
      CHECK (account_type IN ('personal', 'business'));
  END IF;
END $$;

-- 2. Drop and recreate nearby events RPC with new return columns
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
  creator_avatar_url TEXT,
  creator_account_type TEXT,
  going_count BIGINT,
  not_going_count BIGINT,
  liked_count BIGINT,
  distance_m DOUBLE PRECISION,
  avg_rating DOUBLE PRECISION,
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
    p.avatar_url AS creator_avatar_url,
    COALESCE(p.account_type, 'personal') AS creator_account_type,
    COUNT(r_going.id) FILTER (WHERE r_going.status = 'going') AS going_count,
    COUNT(r_notgoing.id) FILTER (WHERE r_notgoing.status = 'not_going') AS not_going_count,
    COUNT(r_liked.id) FILTER (WHERE r_liked.status = 'liked') AS liked_count,
    ST_Distance(e.location, ST_MakePoint(p_lng, p_lat)::geography) AS distance_m,
    COALESCE(AVG(er.stars), 0) AS avg_rating,
    COUNT(er.id) AS rating_count
  FROM events e
  LEFT JOIN profiles p ON p.id = e.creator_id
  LEFT JOIN event_reactions r_going ON r_going.event_id = e.id AND r_going.status = 'going'
  LEFT JOIN event_reactions r_notgoing ON r_notgoing.event_id = e.id AND r_notgoing.status = 'not_going'
  LEFT JOIN event_reactions r_liked ON r_liked.event_id = e.id AND r_liked.status = 'liked'
  LEFT JOIN event_ratings er ON er.event_id = e.id
  WHERE e.hidden = false
    AND e.end_time > now()
    AND ST_DWithin(e.location, ST_MakePoint(p_lng, p_lat)::geography, p_radius_m)
  GROUP BY e.id, p.username, p.avatar_url, p.account_type
  ORDER BY distance_m ASC;
$$;
