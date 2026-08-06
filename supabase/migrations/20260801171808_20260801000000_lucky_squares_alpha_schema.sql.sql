/*
# Lucky Squares — Private Alpha Schema Extension (restructured)

Creates all new tables first, then updates policies that reference them.
Constraint fix already applied in 20260801000500.
*/

-- Helper
CREATE OR REPLACE FUNCTION public.hashtextcast(t text) RETURNS int
LANGUAGE sql IMMUTABLE AS $$ SELECT hashtext($1); $$;

-- ============================================================
-- games
-- ============================================================
CREATE TABLE IF NOT EXISTS games (
  id text PRIMARY KEY,
  season int NOT NULL,
  week int NOT NULL,
  season_type text NOT NULL DEFAULT 'regular' CHECK (season_type IN ('preseason','regular','postseason')),
  away_team text NOT NULL,
  away_abbr text NOT NULL,
  home_team text NOT NULL,
  home_abbr text NOT NULL,
  kickoff_utc timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','in_progress','final','postponed','canceled')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (season, week, away_abbr, home_abbr)
);
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "games_select_public" ON games;
CREATE POLICY "games_select_public" ON games FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_games_kickoff ON games(kickoff_utc);
CREATE INDEX IF NOT EXISTS idx_games_season_week ON games(season, week);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);

-- ============================================================
-- pools: add columns (additive, no data loss)
-- ============================================================
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pools' AND column_name='game_id') THEN ALTER TABLE pools ADD COLUMN game_id text REFERENCES games(id); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pools' AND column_name='host_message') THEN ALTER TABLE pools ADD COLUMN host_message text; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pools' AND column_name='square_value') THEN ALTER TABLE pools ADD COLUMN square_value numeric(10,2); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pools' AND column_name='max_squares_per_user') THEN ALTER TABLE pools ADD COLUMN max_squares_per_user int NOT NULL DEFAULT 10 CHECK (max_squares_per_user > 0 AND max_squares_per_user <= 100); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pools' AND column_name='lock_mode') THEN ALTER TABLE pools ADD COLUMN lock_mode text NOT NULL DEFAULT 'full' CHECK (lock_mode IN ('full','scheduled','either')); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pools' AND column_name='lock_at') THEN ALTER TABLE pools ADD COLUMN lock_at timestamptz; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pools' AND column_name='unclaimed_behavior') THEN ALTER TABLE pools ADD COLUMN unclaimed_behavior text NOT NULL DEFAULT 'open' CHECK (unclaimed_behavior IN ('open','host_assigns','void')); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pools' AND column_name='payout_first_pct') THEN ALTER TABLE pools ADD COLUMN payout_first_pct int NOT NULL DEFAULT 25 CHECK (payout_first_pct >= 0 AND payout_first_pct <= 100); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pools' AND column_name='payout_second_pct') THEN ALTER TABLE pools ADD COLUMN payout_second_pct int NOT NULL DEFAULT 25 CHECK (payout_second_pct >= 0 AND payout_second_pct <= 100); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pools' AND column_name='payout_third_pct') THEN ALTER TABLE pools ADD COLUMN payout_third_pct int NOT NULL DEFAULT 25 CHECK (payout_third_pct >= 0 AND payout_third_pct <= 100); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pools' AND column_name='payout_fourth_pct') THEN ALTER TABLE pools ADD COLUMN payout_fourth_pct int NOT NULL DEFAULT 25 CHECK (payout_fourth_pct >= 0 AND payout_fourth_pct <= 100); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pools' AND column_name='published_at') THEN ALTER TABLE pools ADD COLUMN published_at timestamptz; END IF; END $$;

ALTER TABLE pools DROP CONSTRAINT IF EXISTS pools_selection_mode_check;
ALTER TABLE pools ADD CONSTRAINT pools_selection_mode_check CHECK (selection_mode IN ('pick','random','host'));
ALTER TABLE pools DROP CONSTRAINT IF EXISTS pools_status_check;
ALTER TABLE pools ADD CONSTRAINT pools_status_check CHECK (status IN ('draft','open','full','locked','in_progress','final','completed','canceled'));
CREATE INDEX IF NOT EXISTS idx_pools_game ON pools(game_id);

-- ============================================================
-- pool_drafts
-- ============================================================
CREATE TABLE IF NOT EXISTS pool_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  step int NOT NULL DEFAULT 1 CHECK (step BETWEEN 1 AND 5),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id)
);
ALTER TABLE pool_drafts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "drafts_select_own" ON pool_drafts;
CREATE POLICY "drafts_select_own" ON pool_drafts FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "drafts_insert_own" ON pool_drafts;
CREATE POLICY "drafts_insert_own" ON pool_drafts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "drafts_update_own" ON pool_drafts;
CREATE POLICY "drafts_update_own" ON pool_drafts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "drafts_delete_own" ON pool_drafts;
CREATE POLICY "drafts_delete_own" ON pool_drafts FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS drafts_set_updated_at ON pool_drafts;
CREATE TRIGGER drafts_set_updated_at BEFORE UPDATE ON pool_drafts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- pool_rule_versions
-- ============================================================
CREATE TABLE IF NOT EXISTS pool_rule_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id uuid NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
  version int NOT NULL DEFAULT 1,
  rules jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (pool_id, version)
);
ALTER TABLE pool_rule_versions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_rule_versions_pool ON pool_rule_versions(pool_id);

-- ============================================================
-- pool_members
-- ============================================================
CREATE TABLE IF NOT EXISTS pool_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id uuid NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'player' CHECK (role IN ('host','player')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE (pool_id, user_id)
);
ALTER TABLE pool_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "members_select_in_pool" ON pool_members;
CREATE POLICY "members_select_in_pool" ON pool_members FOR SELECT TO authenticated USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM pools WHERE pools.id = pool_members.pool_id AND pools.creator_id = auth.uid())
  OR EXISTS (SELECT 1 FROM pool_members pm2 WHERE pm2.pool_id = pool_members.pool_id AND pm2.user_id = auth.uid())
);
DROP POLICY IF EXISTS "members_insert_own" ON pool_members;
CREATE POLICY "members_insert_own" ON pool_members FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM pools WHERE pools.id = pool_members.pool_id AND pools.creator_id = auth.uid())
);
DROP POLICY IF EXISTS "members_delete_host_or_own" ON pool_members;
CREATE POLICY "members_delete_host_or_own" ON pool_members FOR DELETE TO authenticated USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM pools WHERE pools.id = pool_members.pool_id AND pools.creator_id = auth.uid())
);
CREATE INDEX IF NOT EXISTS idx_members_pool ON pool_members(pool_id);
CREATE INDEX IF NOT EXISTS idx_members_user ON pool_members(user_id);

-- ============================================================
-- pool_invites
-- ============================================================
CREATE TABLE IF NOT EXISTS pool_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id uuid NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  secret text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz
);
ALTER TABLE pool_invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invites_select_host" ON pool_invites;
CREATE POLICY "invites_select_host" ON pool_invites FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM pools WHERE pools.id = pool_invites.pool_id AND pools.creator_id = auth.uid())
  OR EXISTS (SELECT 1 FROM pool_members WHERE pool_members.pool_id = pool_invites.pool_id AND pool_members.user_id = auth.uid())
);
DROP POLICY IF EXISTS "invites_insert_host" ON pool_invites;
CREATE POLICY "invites_insert_host" ON pool_invites FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM pools WHERE pools.id = pool_invites.pool_id AND pools.creator_id = auth.uid())
);
DROP POLICY IF EXISTS "invites_update_host" ON pool_invites;
CREATE POLICY "invites_update_host" ON pool_invites FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM pools WHERE pools.id = pool_invites.pool_id AND pools.creator_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM pools WHERE pools.id = pool_invites.pool_id AND pools.creator_id = auth.uid())
);
DROP POLICY IF EXISTS "invites_delete_host" ON pool_invites;
CREATE POLICY "invites_delete_host" ON pool_invites FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM pools WHERE pools.id = pool_invites.pool_id AND pools.creator_id = auth.uid())
);
CREATE INDEX IF NOT EXISTS idx_invites_pool ON pool_invites(pool_id);
CREATE INDEX IF NOT EXISTS idx_invites_code ON pool_invites(code);

-- ============================================================
-- audit_events
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id uuid REFERENCES pools(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_audit_pool ON audit_events(pool_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_events(user_id);

-- ============================================================
-- NOW update pools SELECT policy (pool_members exists)
-- ============================================================
DROP POLICY IF EXISTS "pools_select_all" ON pools;
CREATE POLICY "pools_select_all" ON pools FOR SELECT TO authenticated USING (
  creator_id = auth.uid()
  OR EXISTS (SELECT 1 FROM pool_members WHERE pool_members.pool_id = pools.id AND pool_members.user_id = auth.uid())
  OR status IN ('open','full','locked','in_progress','final','completed')
);

-- pool_rule_versions SELECT policy (pool_members exists)
DROP POLICY IF EXISTS "rule_versions_select_members" ON pool_rule_versions;
CREATE POLICY "rule_versions_select_members" ON pool_rule_versions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM pool_members WHERE pool_members.pool_id = pool_rule_versions.pool_id AND pool_members.user_id = auth.uid())
);

-- ============================================================
-- Functions
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_invite_preview(p_code text)
RETURNS TABLE (pool_name text, matchup text, kickoff timestamptz, host_name text, pool_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT p.name, COALESCE(g.away_abbr || ' @ ' || g.home_abbr, 'Matchup TBD'),
         g.kickoff_utc, pr.username, p.id
  FROM pool_invites inv
  JOIN pools p ON p.id = inv.pool_id
  LEFT JOIN games g ON g.id = p.game_id
  LEFT JOIN profiles pr ON pr.id = p.creator_id
  WHERE inv.code = upper(trim(p_code))
    AND (inv.expires_at IS NULL OR inv.expires_at > now())
    AND p.status NOT IN ('draft', 'canceled');
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_invite_preview TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.publish_pool(
  p_draft_id uuid, p_game_id text, p_name text, p_host_message text,
  p_square_value numeric, p_selection_mode text, p_max_squares int,
  p_lock_mode text, p_lock_at timestamptz, p_unclaimed_behavior text,
  p_payout_first int, p_payout_second int, p_payout_third int, p_payout_fourth int,
  p_existing_pool_id uuid DEFAULT NULL
)
RETURNS TABLE (pool_id uuid, invite_code text, invite_secret text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pool_id uuid; v_invite_code text; v_invite_secret text; v_rules jsonb;
  v_game_status text; v_game_kickoff timestamptz; v_game_home text; v_game_away text; v_total int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT status, kickoff_utc, home_team, away_team INTO v_game_status, v_game_kickoff, v_game_home, v_game_away
  FROM games WHERE id = p_game_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Selected game not found'; END IF;
  IF v_game_status IN ('in_progress','final','canceled') THEN RAISE EXCEPTION 'Selected game is no longer available'; END IF;
  v_total := p_payout_first + p_payout_second + p_payout_third + p_payout_fourth;
  IF v_total <> 100 THEN RAISE EXCEPTION 'Prize percentages must total 100'; END IF;
  IF p_lock_mode IN ('scheduled','either') AND p_lock_at IS NULL THEN RAISE EXCEPTION 'Scheduled lock time required'; END IF;
  IF p_lock_at IS NOT NULL AND p_lock_at >= v_game_kickoff THEN RAISE EXCEPTION 'Lock time must be before kickoff'; END IF;
  IF trim(p_name) = '' OR char_length(trim(p_name)) > 80 THEN RAISE EXCEPTION 'Pool name must be 1-80 characters'; END IF;

  IF p_existing_pool_id IS NOT NULL THEN
    SELECT id INTO v_pool_id FROM pools WHERE id = p_existing_pool_id AND creator_id = auth.uid() AND published_at IS NOT NULL;
    IF FOUND THEN
      SELECT code, secret INTO v_invite_code, v_invite_secret FROM pool_invites WHERE pool_id = v_pool_id LIMIT 1;
      RETURN QUERY SELECT v_pool_id, v_invite_code, v_invite_secret; RETURN;
    END IF;
  END IF;

  v_invite_code := upper(lpad(to_hex(abs(public.hashtextcast(p_draft_id::text || 'code')) % 2176782336), 6, '0'));
  v_invite_secret := encode(gen_random_bytes(16), 'hex');

  INSERT INTO pools (creator_id, name, team_home, team_away, game_id, host_message, square_value,
    selection_mode, max_squares_per_user, lock_mode, lock_at, unclaimed_behavior,
    payout_first_pct, payout_second_pct, payout_third_pct, payout_fourth_pct,
    status, cost_per_square, payout_first, payout_second, payout_third, payout_fourth, published_at)
  VALUES (auth.uid(), trim(p_name), v_game_home, v_game_away, p_game_id, p_host_message, p_square_value,
    p_selection_mode, p_max_squares, p_lock_mode, p_lock_at, p_unclaimed_behavior,
    p_payout_first, p_payout_second, p_payout_third, p_payout_fourth,
    'open', 0, 0, 0, 0, 0, now())
  RETURNING id INTO v_pool_id;

  INSERT INTO pool_members (pool_id, user_id, role) VALUES (v_pool_id, auth.uid(), 'host') ON CONFLICT (pool_id, user_id) DO NOTHING;

  v_rules := jsonb_build_object('selection_mode', p_selection_mode, 'max_squares_per_user', p_max_squares,
    'lock_mode', p_lock_mode, 'lock_at', p_lock_at, 'unclaimed_behavior', p_unclaimed_behavior,
    'payout_first_pct', p_payout_first, 'payout_second_pct', p_payout_second,
    'payout_third_pct', p_payout_third, 'payout_fourth_pct', p_payout_fourth, 'square_value', p_square_value);
  INSERT INTO pool_rule_versions (pool_id, version, rules) VALUES (v_pool_id, 1, v_rules);

  INSERT INTO pool_invites (pool_id, code, secret) VALUES (v_pool_id, v_invite_code, v_invite_secret);

  INSERT INTO audit_events (pool_id, user_id, action, metadata)
  VALUES (v_pool_id, auth.uid(), 'pool.published', jsonb_build_object('draft_id', p_draft_id, 'game_id', p_game_id));

  DELETE FROM pool_drafts WHERE id = p_draft_id;
  RETURN QUERY SELECT v_pool_id, v_invite_code, v_invite_secret;
END;
$$;
GRANT EXECUTE ON FUNCTION public.publish_pool TO authenticated;

-- Seed NFL games
INSERT INTO games (id, season, week, season_type, away_team, away_abbr, home_team, home_abbr, kickoff_utc, status) VALUES
  ('2026_W01_CIN_NE', 2026, 1, 'regular', 'Cincinnati Bengals', 'CIN', 'New England Patriots', 'NE', '2026-09-10 00:20:00+00', 'scheduled'),
  ('2026_W01_MIA_BUF', 2026, 1, 'regular', 'Miami Dolphins', 'MIA', 'Buffalo Bills', 'BUF', '2026-09-10 20:15:00+00', 'scheduled'),
  ('2026_W01_KC_LAR', 2026, 1, 'regular', 'Kansas City Chiefs', 'KC', 'Los Angeles Rams', 'LAR', '2026-09-11 00:20:00+00', 'scheduled'),
  ('2026_W01_DAL_TB', 2026, 1, 'regular', 'Dallas Cowboys', 'DAL', 'Tampa Bay Buccaneers', 'TB', '2026-09-11 20:25:00+00', 'scheduled'),
  ('2026_W01_GB_SF', 2026, 1, 'regular', 'Green Bay Packers', 'GB', 'San Francisco 49ers', 'SF', '2026-09-13 17:00:00+00', 'scheduled'),
  ('2026_W01_BAL_NYJ', 2026, 1, 'regular', 'Baltimore Ravens', 'BAL', 'New York Jets', 'NYJ', '2026-09-13 20:05:00+00', 'scheduled'),
  ('2026_W02_MIN_PHI', 2026, 2, 'regular', 'Minnesota Vikings', 'MIN', 'Philadelphia Eagles', 'PHI', '2026-09-18 00:20:00+00', 'scheduled'),
  ('2026_W02_LAC_KC', 2026, 2, 'regular', 'Los Angeles Chargers', 'LAC', 'Kansas City Chiefs', 'KC', '2026-09-18 20:15:00+00', 'scheduled')
ON CONFLICT (id) DO NOTHING;
