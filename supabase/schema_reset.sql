-- ============================================================
-- LUCKY SQUARES — COMPLETE SCHEMA RESET
-- ============================================================
-- Drop and recreate every table the app references.
-- Paste into Supabase SQL Editor and run.
--
-- Status enum: 'active' | 'completed'
-- Quarter enum: 'pre' | 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'final'
-- Selection mode: 'pick' | 'random'
-- Notification type: 'game_starting' | 'quarter_winner' | 'square_claimed'
-- ============================================================

-- ============================================================
-- 1. DROP (order respects foreign keys)
-- ============================================================
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS game_scores CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS squares CASCADE;
DROP TABLE IF EXISTS pools CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.notify_pool_participants(text, uuid, text, text, uuid);

-- ============================================================
-- 2. CREATE TABLES
-- ============================================================

-- profiles: one row per auth user, created by trigger on signup
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  coins integer NOT NULL DEFAULT 1000,
  coins_won integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- pools: a squares pool. creator_id defaults to auth.uid() so RLS
-- WITH CHECK passes even when the client omits it on insert.
CREATE TABLE pools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  team_home text NOT NULL,
  team_away text NOT NULL,
  cost_per_square integer NOT NULL DEFAULT 10 CHECK (cost_per_square > 0),
  payout_first integer NOT NULL DEFAULT 0 CHECK (payout_first >= 0),
  payout_second integer NOT NULL DEFAULT 0 CHECK (payout_second >= 0),
  payout_third integer NOT NULL DEFAULT 0 CHECK (payout_third >= 0),
  payout_fourth integer NOT NULL DEFAULT 0 CHECK (payout_fourth >= 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed')),
  selection_mode text NOT NULL DEFAULT 'pick' CHECK (selection_mode IN ('pick','random')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE pools ENABLE ROW LEVEL SECURITY;

-- squares: the 10x10 grid. owner_id NULL = unclaimed.
CREATE TABLE squares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id uuid NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
  owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  row integer NOT NULL CHECK (row >= 0 AND row <= 9),
  col integer NOT NULL CHECK (col >= 0 AND col <= 9),
  claimed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE (pool_id, row, col)
);
ALTER TABLE squares ENABLE ROW LEVEL SECURITY;

-- messages: per-pool chat
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id uuid NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 280),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- game_scores: one row per pool, updated by the nfl-scores edge function
CREATE TABLE game_scores (
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

-- notifications: in-app notifications, one row per user
CREATE TABLE notifications (
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

-- ============================================================
-- 3. INDEXES
-- ============================================================
CREATE INDEX idx_pools_status ON pools(status);
CREATE INDEX idx_pools_creator ON pools(creator_id);
CREATE INDEX idx_squares_pool ON squares(pool_id);
CREATE INDEX idx_squares_owner ON squares(owner_id);
CREATE INDEX idx_messages_pool_time ON messages(pool_id, created_at);
CREATE INDEX idx_game_scores_game ON game_scores(game_id);
CREATE INDEX idx_game_scores_quarter ON game_scores(quarter);
CREATE INDEX idx_notifications_user_time ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read);

-- ============================================================
-- 4. RLS POLICIES (4 per table, one per CRUD verb)
-- ============================================================

-- profiles: read all (leaderboard / owner names), update own.
-- Inserts happen via the handle_new_user trigger (SECURITY DEFINER).
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- pools: read all (join), insert own, update/delete own only.
CREATE POLICY "pools_select_all" ON pools FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "pools_insert_own" ON pools FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "pools_update_own" ON pools FOR UPDATE
  TO authenticated USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "pools_delete_own" ON pools FOR DELETE
  TO authenticated USING (auth.uid() = creator_id);

-- squares: grid is shared, any authenticated user may claim (insert/update).
-- Delete is owner-only (release a square).
CREATE POLICY "squares_select_all" ON squares FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "squares_insert_any" ON squares FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "squares_update_any" ON squares FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "squares_delete_own" ON squares FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

-- messages: read all in a pool; insert/delete own only.
CREATE POLICY "messages_select_all" ON messages FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "messages_insert_own" ON messages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "messages_delete_own" ON messages FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- game_scores: read all; writes only from edge function (service role
-- bypasses RLS), so no client INSERT/UPDATE/DELETE policies.
CREATE POLICY "game_scores_select_all" ON game_scores FOR SELECT
  TO authenticated USING (true);

-- notifications: fully owner-scoped.
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notifications_insert_own" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notifications_delete_own" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 5. TRIGGERS / FUNCTIONS
-- ============================================================

-- Auto-create a profile row when a new auth.users row is created.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    coalesce(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Fan-out a notification to every square owner in a pool.
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
-- 6. REALTIME
-- ============================================================
ALTER TABLE pools REPLICA IDENTITY FULL;
ALTER TABLE squares REPLICA IDENTITY FULL;
ALTER TABLE messages REPLICA IDENTITY FULL;
ALTER TABLE game_scores REPLICA IDENTITY FULL;
ALTER TABLE notifications REPLICA IDENTITY FULL;
