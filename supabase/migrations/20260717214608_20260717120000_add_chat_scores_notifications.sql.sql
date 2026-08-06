/*
# Lucky Squares — Chat, Live Scores, Notifications, Leaderboard

## Overview
Adds five new capabilities to the existing Lucky Squares schema:
1. Per-pool real-time chat messages.
2. Live NFL game scores with per-quarter updates and winning-square tracking.
3. In-app/push notifications for game events and pool activity.
4. Season-long leaderboard via a coins_won aggregate on profiles.
5. Admin-configurable square-selection mode (pick your own vs random).

## New Columns (additive — no data loss)

### pools
- `selection_mode` (text, NOT NULL, DEFAULT 'pick') — 'pick' lets users tap
  their own square on the grid; 'random' auto-assigns a random unclaimed square.

### profiles
- `coins_won` (integer, NOT NULL, DEFAULT 0) — cumulative coins won across all
  pools this season. Drives the leaderboard.

## New Tables

### messages
- `id` (uuid PK)
- `pool_id` (uuid NOT NULL, FK to pools, cascade delete)
- `user_id` (uuid NOT NULL, DEFAULT auth.uid(), FK to profiles, cascade delete)
- `content` (text NOT NULL, length 1-280)
- `created_at` (timestamptz DEFAULT now())
- Index on pool_id + created_at for chat ordering.
- RLS: authenticated users can SELECT all messages in a pool; a user can only
  INSERT/DELETE their own messages.

### game_scores
- `id` (uuid PK)
- `pool_id` (uuid NOT NULL, FK to pools, cascade delete) — one score row per pool
- `game_id` (text NOT NULL) — matches the id in src/lib/nfl.ts schedule
- `home_score` (int NOT NULL DEFAULT 0)
- `away_score` (int NOT NULL DEFAULT 0)
- `quarter` (text NOT NULL DEFAULT 'pre') — 'pre'|'Q1'|'Q2'|'Q3'|'Q4'|'final'
- `home_score_q1` / `away_score_q1` (int, quarter scores used for square digits)
- `home_score_q2` / `away_score_q2`
- `home_score_q3` / `away_score_q3`
- `home_score_q4` / `away_score_q4`
- `last_quarter_winner_square` (text, nullable) — 'row-col' of the winning square
- `last_quarter_winner_id` (uuid, nullable, FK to profiles)
- `updated_at` (timestamptz DEFAULT now())
- Unique constraint on pool_id.
- RLS: authenticated SELECT all; UPDATE/INSERT only via service role (edge fn).

### notifications
- `id` (uuid PK)
- `user_id` (uuid NOT NULL, DEFAULT auth.uid(), FK to profiles, cascade delete)
- `pool_id` (uuid, nullable, FK to pools, cascade delete)
- `type` (text NOT NULL) — 'game_starting'|'quarter_winner'|'square_claimed'
- `title` (text NOT NULL)
- `body` (text NOT NULL)
- `read` (boolean NOT NULL DEFAULT false)
- `created_at` (timestamptz DEFAULT now())
- Index on user_id + created_at, and user_id + read.
- RLS: a user can SELECT/UPDATE only their own notifications; INSERT only own.

## Automation
- `notify_pool_participants(trigger_type, pool_id, title, body, exclude_user)`:
  SECURITY DEFINER function that inserts a notification row for every user who
  owns a square in the given pool. Used by the square-claim flow and the
  scores edge function to fan out notifications.

## Realtime
- Enable realtime (REPLICA IDENTITY FULL) on messages, game_scores, notifications.
*/

-- ============================================================
-- pools: add selection_mode
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pools' AND column_name = 'selection_mode'
  ) THEN
    ALTER TABLE pools ADD COLUMN selection_mode text NOT NULL DEFAULT 'pick'
      CHECK (selection_mode IN ('pick','random'));
  END IF;
END $$;

-- ============================================================
-- profiles: add coins_won
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'coins_won'
  ) THEN
    ALTER TABLE profiles ADD COLUMN coins_won integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- ============================================================
-- messages
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id uuid NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 280),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select_all" ON messages;
CREATE POLICY "messages_select_all" ON messages FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "messages_insert_own" ON messages;
CREATE POLICY "messages_insert_own" ON messages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "messages_delete_own" ON messages;
CREATE POLICY "messages_delete_own" ON messages FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_messages_pool_time ON messages(pool_id, created_at);

-- ============================================================
-- game_scores
-- ============================================================
CREATE TABLE IF NOT EXISTS game_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id uuid NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
  game_id text NOT NULL,
  home_score integer NOT NULL DEFAULT 0,
  away_score integer NOT NULL DEFAULT 0,
  quarter text NOT NULL DEFAULT 'pre' CHECK (quarter IN ('pre','Q1','Q2','Q3','Q4','final')),
  home_score_q1 integer NOT NULL DEFAULT 0,
  away_score_q1 integer NOT NULL DEFAULT 0,
  home_score_q2 integer NOT NULL DEFAULT 0,
  away_score_q2 integer NOT NULL DEFAULT 0,
  home_score_q3 integer NOT NULL DEFAULT 0,
  away_score_q3 integer NOT NULL DEFAULT 0,
  home_score_q4 integer NOT NULL DEFAULT 0,
  away_score_q4 integer NOT NULL DEFAULT 0,
  last_quarter_winner_square text,
  last_quarter_winner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (pool_id)
);

ALTER TABLE game_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "game_scores_select_all" ON game_scores;
CREATE POLICY "game_scores_select_all" ON game_scores FOR SELECT
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_game_scores_game ON game_scores(game_id);
CREATE INDEX IF NOT EXISTS idx_game_scores_quarter ON game_scores(quarter);

-- ============================================================
-- notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  pool_id uuid REFERENCES pools(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('game_starting','quarter_winner','square_claimed')),
  title text NOT NULL,
  body text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_insert_own" ON notifications;
CREATE POLICY "notifications_insert_own" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;
CREATE POLICY "notifications_delete_own" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_time ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read);

-- ============================================================
-- notify_pool_participants — fan-out helper
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_pool_participants(
  p_type text,
  p_pool_id uuid,
  p_title text,
  p_body text,
  p_exclude_user uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (user_id, pool_id, type, title, body)
  SELECT DISTINCT s.owner_id, p_pool_id, p_type, p_title, p_body
  FROM squares s
  WHERE s.pool_id = p_pool_id
    AND s.owner_id IS NOT NULL
    AND s.owner_id IS DISTINCT FROM COALESCE(p_exclude_user, '00000000-0000-0000-0000-000000000000'::uuid);
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_pool_participants TO authenticated;

-- ============================================================
-- Realtime
-- ============================================================
ALTER TABLE messages REPLICA IDENTITY FULL;
ALTER TABLE game_scores REPLICA IDENTITY FULL;
ALTER TABLE notifications REPLICA IDENTITY FULL;
