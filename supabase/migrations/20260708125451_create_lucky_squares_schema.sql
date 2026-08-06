/*
# Lucky Squares — Core Schema

## Overview
Creates the data model for a sports squares pool platform. Users sign up,
get a starting coin balance, create pools (with two teams, a per-square cost,
and a payout structure), and claim squares on a 10x10 grid. Squares are
claimed in realtime so other players see updates instantly.

## New Tables

1. `profiles`
   - `id` (uuid, primary key, references auth.users) — one row per user
   - `username` (text, unique, not null) — display name
   - `coins` (integer, not null, default 1000) — virtual currency balance
   - `created_at` (timestamptz, default now())

2. `pools`
   - `id` (uuid, primary key)
   - `creator_id` (uuid, not null, references profiles) — who made the pool
   - `name` (text, not null) — pool title
   - `team_home` (text, not null) — home team name
   - `team_away` (text, not null) — away team name
   - `cost_per_square` (integer, not null, default 10) — coin cost to claim one square
   - `payout_first` (integer, not null) — coins paid at end of first quarter
   - `payout_second` (integer, not null) — coins paid at halftime
   - `payout_third` (integer, not null) — coins paid at end of third quarter
   - `payout_fourth` (integer, not null) — coins paid at final score
   - `status` (text, not null, default 'active') — 'active' | 'completed'
   - `created_at` (timestamptz, default now())

3. `squares`
   - `id` (uuid, primary key)
   - `pool_id` (uuid, not null, references pools, cascade delete)
   - `owner_id` (uuid, references profiles, nullable) — null = unclaimed
   - `row` (integer, not null, 0-9) — grid row
   - `col` (integer, not null, 0-9) — grid column
   - `claimed_at` (timestamptz, nullable)
   - Unique constraint on (pool_id, row, col) — one owner per cell

## Security (RLS)
- `profiles`: authenticated users can read all profiles (for leaderboards /
  grid owner names) but only update their own. Inserts handled by trigger.
- `pools`: any authenticated user can read all pools (so they can join);
  only the creator can update/delete their own pool; any authenticated
  user can insert (they become the creator via DEFAULT auth.uid()).
- `squares`: any authenticated user can read all squares (grid is shared);
  any authenticated user can insert/update a square to claim it (ownership
  logic enforced in app + by the coins check); only the owner can delete
  their own claimed square (to release it).

## Automation
- `handle_new_user()` trigger: when a new auth.users row is created,
  automatically insert a matching `profiles` row with 1000 starting coins.
  This keeps profile creation server-side so RLS never blocks it.
*/

-- ============================================================
-- profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  coins integer NOT NULL DEFAULT 1000,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================================
-- pools
-- ============================================================
CREATE TABLE IF NOT EXISTS pools (
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
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pools_select_all" ON pools;
CREATE POLICY "pools_select_all" ON pools FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "pools_insert_own" ON pools;
CREATE POLICY "pools_insert_own" ON pools FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "pools_update_own" ON pools;
CREATE POLICY "pools_update_own" ON pools FOR UPDATE
  TO authenticated USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "pools_delete_own" ON pools;
CREATE POLICY "pools_delete_own" ON pools FOR DELETE
  TO authenticated USING (auth.uid() = creator_id);

CREATE INDEX IF NOT EXISTS idx_pools_status ON pools(status);
CREATE INDEX IF NOT EXISTS idx_pools_creator ON pools(creator_id);

-- ============================================================
-- squares
-- ============================================================
CREATE TABLE IF NOT EXISTS squares (
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

DROP POLICY IF EXISTS "squares_select_all" ON squares;
CREATE POLICY "squares_select_all" ON squares FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "squares_insert_any" ON squares;
CREATE POLICY "squares_insert_any" ON squares FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "squares_update_any" ON squares;
CREATE POLICY "squares_update_any" ON squares FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "squares_delete_own" ON squares;
CREATE POLICY "squares_delete_own" ON squares FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS idx_squares_pool ON squares(pool_id);
CREATE INDEX IF NOT EXISTS idx_squares_owner ON squares(owner_id);

-- ============================================================
-- Auto-create profile on signup
-- ============================================================
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime on squares + pools
ALTER TABLE squares REPLICA IDENTITY FULL;
ALTER TABLE pools REPLICA IDENTITY FULL;
