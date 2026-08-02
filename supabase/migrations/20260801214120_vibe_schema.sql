/*
# Vibe — core schema, RLS, moderation, ephemeral cleanup

## What this migration does

1. Enables PostGIS (geolocation by radius) and pg_cron (scheduled cleanup).
2. Creates the Vibe tables: profiles, events, comments, event_reactions, reports.
3. Adds a `hidden` column to events and comments for community moderation
   (3 distinct reports auto-hides the item).
4. Enables Row Level Security on every table and scopes CRUD by ownership.
5. Creates a SECURITY DEFINER RPC `vibe_nearby_events` that returns active,
   non-hidden events within a radius of a point (used by the map).
6. Schedules a pg_cron job that permanently deletes expired events and, via
   ON DELETE CASCADE, their comments, reactions, and reports.
7. Creates a public Storage bucket `event-photos` for comment photos, with
   policies so authenticated users can upload/delete only inside their own
   folder and anyone can view.

## Tables

- `profiles` — id (uuid, links to auth.users), username, avatar_url,
  instagram_username (optional), language (pt-BR/en-US/es-ES), created_at.
- `events` — id, creator_id, title, description, category, location (geography
  point), address_text, start_time, end_time (required), hidden, created_at.
- `comments` — id, event_id, user_id, text_content, image_url, hidden, created_at.
- `event_reactions` — id, event_id, user_id, status (going/not_going/liked),
  created_at; unique per (event, user, status).
- `reports` — id, reporter_id, event_id (nullable), comment_id (nullable),
  reason, created_at.

## Security

- RLS enabled on all tables; scoped `TO authenticated` with auth.uid() ownership
  checks. profiles and events are readable by all authenticated users (social
  map), writable only by the owner. comments deletable by the commenter OR the
  event creator (creator moderation). reactions insert/delete by owner only.
  reports insert-only by the reporter.
- Moderation: a trigger hides an event or comment once 3 distinct users report it.
- Storage bucket `event-photos` is public-read; writes/deletes are scoped to each
  user's own folder (`{user_id}/...`).

## Notes

- The app has a sign-in screen, so all policies target `authenticated`.
- `end_time` is NOT NULL on events (required by product spec).
- pg_cron runs as postgres (bypasses RLS) so the cleanup job can delete freely.
*/

-- Extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 1. Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  instagram_username TEXT,
  language TEXT DEFAULT 'pt-BR' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Events
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'Geral',
  location GEOGRAPHY(POINT) NOT NULL,
  address_text TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  hidden BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS events_geo_index ON events USING GIST (location);
CREATE INDEX IF NOT EXISTS events_end_time_index ON events (end_time);
CREATE INDEX IF NOT EXISTS events_not_hidden_active_index ON events (end_time) WHERE hidden = false;

-- 3. Comments
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  text_content TEXT,
  image_url TEXT,
  hidden BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. Reactions / presence
CREATE TABLE IF NOT EXISTS event_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('going', 'not_going', 'liked')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(event_id, user_id, status)
);

-- 5. Reports
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CHECK (event_id IS NOT NULL OR comment_id IS NOT NULL)
);

-- Enable RLS on every table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- profiles policies
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- events policies
DROP POLICY IF EXISTS "events_select_active" ON events;
CREATE POLICY "events_select_active" ON events FOR SELECT
  TO authenticated USING (hidden = false OR auth.uid() = creator_id);

DROP POLICY IF EXISTS "events_insert_own" ON events;
CREATE POLICY "events_insert_own" ON events FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "events_update_own" ON events;
CREATE POLICY "events_update_own" ON events FOR UPDATE
  TO authenticated USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "events_delete_own" ON events;
CREATE POLICY "events_delete_own" ON events FOR DELETE
  TO authenticated USING (auth.uid() = creator_id);

-- comments policies
DROP POLICY IF EXISTS "comments_select_visible" ON comments;
CREATE POLICY "comments_select_visible" ON comments FOR SELECT
  TO authenticated USING (
    hidden = false
    OR auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM events e WHERE e.id = comments.event_id AND e.creator_id = auth.uid())
  );

DROP POLICY IF EXISTS "comments_insert_own" ON comments;
CREATE POLICY "comments_insert_own" ON comments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "comments_delete_own_or_creator" ON comments;
CREATE POLICY "comments_delete_own_or_creator" ON comments FOR DELETE
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM events e WHERE e.id = comments.event_id AND e.creator_id = auth.uid())
  );

-- event_reactions policies
DROP POLICY IF EXISTS "reactions_select_all" ON event_reactions;
CREATE POLICY "reactions_select_all" ON event_reactions FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "reactions_insert_own" ON event_reactions;
CREATE POLICY "reactions_insert_own" ON event_reactions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reactions_delete_own" ON event_reactions;
CREATE POLICY "reactions_delete_own" ON event_reactions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- reports policies (insert-only by reporter; creators can't see who reported)
DROP POLICY IF EXISTS "reports_insert_own" ON reports;
CREATE POLICY "reports_insert_own" ON reports FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = reporter_id);

-- Auto-hide trigger: 3 distinct reporters => hidden = true
CREATE OR REPLACE FUNCTION vibe_apply_auto_hide()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  report_count INTEGER;
BEGIN
  IF NEW.event_id IS NOT NULL THEN
    SELECT COUNT(DISTINCT reporter_id) INTO report_count
    FROM reports WHERE event_id = NEW.event_id;
    IF report_count >= 3 THEN
      UPDATE events SET hidden = true WHERE id = NEW.event_id AND hidden = false;
    END IF;
  END IF;
  IF NEW.comment_id IS NOT NULL THEN
    SELECT COUNT(DISTINCT reporter_id) INTO report_count
    FROM reports WHERE comment_id = NEW.comment_id;
    IF report_count >= 3 THEN
      UPDATE comments SET hidden = true WHERE id = NEW.comment_id AND hidden = false;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_report_auto_hide ON reports;
CREATE TRIGGER on_report_auto_hide
AFTER INSERT ON reports
FOR EACH ROW EXECUTE FUNCTION vibe_apply_auto_hide();

-- Nearby events RPC (used by the map). Returns active, non-hidden events
-- within radius_m of (p_lat, p_lng), with creator username and reaction counts.
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
  distance_m DOUBLE PRECISION
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
    ST_Distance(e.location, ST_MakePoint(p_lng, p_lat)::geography) AS distance_m
  FROM events e
  LEFT JOIN profiles p ON p.id = e.creator_id
  LEFT JOIN event_reactions r_going ON r_going.event_id = e.id AND r_going.status = 'going'
  LEFT JOIN event_reactions r_notgoing ON r_notgoing.event_id = e.id AND r_notgoing.status = 'not_going'
  LEFT JOIN event_reactions r_liked ON r_liked.event_id = e.id AND r_liked.status = 'liked'
  WHERE e.hidden = false
    AND e.end_time > now()
    AND ST_DWithin(e.location, ST_MakePoint(p_lng, p_lat)::geography, p_radius_m)
  GROUP BY e.id, p.username
  ORDER BY distance_m ASC;
$$;

-- Ephemeral cleanup: permanently delete expired events (cascade removes
-- comments, reactions, reports). Storage photos are cleaned by an edge function.
CREATE OR REPLACE FUNCTION vibe_cleanup_expired()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH deleted AS (
    DELETE FROM events WHERE end_time <= now() RETURNING id
  )
  SELECT COUNT(*)::INTEGER FROM deleted;
$$;

-- Schedule cleanup every 5 minutes (idempotent: unschedule then reschedule)
DO $$
BEGIN
  PERFORM cron.unschedule('vibe-cleanup-expired');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
SELECT cron.schedule('vibe-cleanup-expired', '*/5 * * * *', 'SELECT vibe_cleanup_expired();');

-- Storage bucket for comment photos (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-photos', 'event-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "event_photos_read_public" ON storage.objects;
CREATE POLICY "event_photos_read_public" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'event-photos');

DROP POLICY IF EXISTS "event_photos_upload_own_folder" ON storage.objects;
CREATE POLICY "event_photos_upload_own_folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'event-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "event_photos_delete_own_folder" ON storage.objects;
CREATE POLICY "event_photos_delete_own_folder" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'event-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
