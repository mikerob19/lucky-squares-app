CREATE OR REPLACE FUNCTION public.publish_pool(
  p_draft_id uuid,
  p_game_id text,
  p_name text,
  p_host_message text,
  p_square_value numeric,
  p_selection_mode text,
  p_max_squares integer,
  p_lock_mode text,
  p_lock_at timestamp with time zone,
  p_unclaimed_behavior text,
  p_payout_first integer,
  p_payout_second integer,
  p_payout_third integer,
  p_payout_fourth integer,
  p_existing_pool_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(pool_id uuid, invite_code text, invite_secret text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_pool_id uuid;
  v_invite_code text;
  v_invite_secret text;
  v_rules jsonb;
  v_game_status text;
  v_game_kickoff timestamptz;
  v_game_home text;
  v_game_away text;
  v_total int;
  v_cost numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT status, kickoff_utc, home_team, away_team
    INTO v_game_status, v_game_kickoff, v_game_home, v_game_away
  FROM games WHERE id = p_game_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Selected game not found'; END IF;
  IF v_game_status IN ('in_progress','final','canceled') THEN RAISE EXCEPTION 'Selected game is no longer available'; END IF;

  v_total := p_payout_first + p_payout_second + p_payout_third + p_payout_fourth;
  IF v_total <> 100 THEN RAISE EXCEPTION 'Prize percentages must total 100'; END IF;

  IF p_lock_mode IN ('scheduled','either') AND p_lock_at IS NULL THEN RAISE EXCEPTION 'Scheduled lock time required'; END IF;
  IF p_lock_at IS NOT NULL AND p_lock_at >= v_game_kickoff THEN RAISE EXCEPTION 'Lock time must be before kickoff'; END IF;

  IF trim(p_name) = '' OR char_length(trim(p_name)) > 80 THEN RAISE EXCEPTION 'Pool name must be 1-80 characters'; END IF;

  IF p_existing_pool_id IS NOT NULL THEN
    SELECT id INTO v_pool_id FROM pools
    WHERE id = p_existing_pool_id AND creator_id = auth.uid() AND published_at IS NOT NULL;
    IF FOUND THEN
      SELECT code, secret INTO v_invite_code, v_invite_secret
      FROM pool_invites WHERE pool_id = v_pool_id LIMIT 1;
      RETURN QUERY SELECT v_pool_id, v_invite_code, v_invite_secret;
      RETURN;
    END IF;
  END IF;

  v_invite_code := upper(lpad(to_hex(abs(public.hashtextcast(p_draft_id::text || 'code')) % 2176782336), 6, '0'));
  v_invite_secret := encode(gen_random_bytes(16), 'hex');

  v_cost := COALESCE(p_square_value, 10);

  INSERT INTO pools (
    creator_id, name, team_home, team_away, game_id, host_message, square_value,
    selection_mode, max_squares_per_user, lock_mode, lock_at, unclaimed_behavior,
    payout_first_pct, payout_second_pct, payout_third_pct, payout_fourth_pct,
    status, cost_per_square, payout_first, payout_second, payout_third, payout_fourth, published_at
  )
  VALUES (
    auth.uid(), trim(p_name), v_game_home, v_game_away, p_game_id, p_host_message, p_square_value,
    p_selection_mode, p_max_squares, p_lock_mode, p_lock_at, p_unclaimed_behavior,
    p_payout_first, p_payout_second, p_payout_third, p_payout_fourth,
    'open', v_cost, 0, 0, 0, 0, now()
  )
  RETURNING id INTO v_pool_id;

  INSERT INTO pool_members (pool_id, user_id, role)
  VALUES (v_pool_id, auth.uid(), 'host')
  ON CONFLICT (pool_id, user_id) DO NOTHING;

  v_rules := jsonb_build_object(
    'selection_mode', p_selection_mode,
    'max_squares_per_user', p_max_squares,
    'lock_mode', p_lock_mode,
    'lock_at', p_lock_at,
    'unclaimed_behavior', p_unclaimed_behavior,
    'payout_first_pct', p_payout_first,
    'payout_second_pct', p_payout_second,
    'payout_third_pct', p_payout_third,
    'payout_fourth_pct', p_payout_fourth,
    'square_value', p_square_value
  );
  INSERT INTO pool_rule_versions (pool_id, version, rules) VALUES (v_pool_id, 1, v_rules);

  INSERT INTO pool_invites (pool_id, code, secret) VALUES (v_pool_id, v_invite_code, v_invite_secret);

  INSERT INTO audit_events (pool_id, user_id, action, metadata)
  VALUES (v_pool_id, auth.uid(), 'pool.published', jsonb_build_object('draft_id', p_draft_id, 'game_id', p_game_id));

  DELETE FROM pool_drafts WHERE id = p_draft_id;

  RETURN QUERY SELECT v_pool_id, v_invite_code, v_invite_secret;
END;
$function$;
