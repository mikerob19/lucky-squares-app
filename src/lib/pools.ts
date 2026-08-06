import { supabase } from './supabase';
import type { InvitePreview, PoolDraft, WizardData, PublishResult, Pool, PoolInvite } from './types';

export async function lookupInviteByCode(code: string): Promise<InvitePreview | null> {
  const { data, error } = await supabase
    .rpc('get_invite_preview', { p_code: code.toUpperCase().trim() });
  if (error) throw error;
  if (!data || data.length === 0) return null;
  const row = data[0];
  return {
    pool_name: row.pool_name,
    matchup: row.matchup,
    kickoff: row.kickoff,
    host_name: row.host_name,
    pool_id: row.pool_id,
  };
}

export async function getDraft(): Promise<PoolDraft | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('pool_drafts')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .maybeSingle();
  if (error) throw error;
  return data as PoolDraft | null;
}

export async function saveDraft(draftId: string | null, step: number, data: WizardData): Promise<PoolDraft> {
  const payload = { step, data };
  if (draftId) {
    const { data: updated, error } = await supabase
      .from('pool_drafts')
      .update(payload)
      .eq('id', draftId)
      .select('*')
      .single();
    if (error) throw error;
    return updated as PoolDraft;
  } else {
    const { data: created, error } = await supabase
      .from('pool_drafts')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw error;
    return created as PoolDraft;
  }
}

export async function deleteDraft(draftId: string): Promise<void> {
  const { error } = await supabase.from('pool_drafts').delete().eq('id', draftId);
  if (error) throw error;
}

export async function publishPool(
  draftId: string,
  data: WizardData,
  existingPoolId?: string,
): Promise<PublishResult> {
  const { data: result, error } = await supabase.rpc('publish_pool', {
    p_draft_id: draftId,
    p_game_id: data.gameId!,
    p_name: data.poolName,
    p_host_message: data.hostMessage || null,
    p_square_value: data.squareValue ? parseFloat(data.squareValue) : null,
    p_selection_mode: data.selectionMode,
    p_max_squares: data.maxSquaresPerUser,
    p_lock_mode: data.lockMode,
    p_lock_at: data.lockMode !== 'full' && data.lockAt ? new Date(data.lockAt).toISOString() : null,
    p_unclaimed_behavior: data.unclaimedBehavior,
    p_payout_first: data.payoutFirst,
    p_payout_second: data.payoutSecond,
    p_payout_third: data.payoutThird,
    p_payout_fourth: data.payoutFourth,
    p_existing_pool_id: existingPoolId ?? null,
  });
  if (error) throw error;
  if (!result || result.length === 0) throw new Error('Publication failed');
  return result[0] as PublishResult;
}

export async function getUserPools(): Promise<{ hosted: Pool[]; joined: Pool[]; drafts: PoolDraft[] }> {
  const { data, error: authError } = await supabase.auth.getUser();
  if (authError || !data.user) return { hosted: [], joined: [], drafts: [] };
  const userId = data.user.id;

  // Pools the user created — fail gracefully, return empty on error
  const { data: hosted, error: e1 } = await supabase
    .from('pools')
    .select('*')
    .eq('creator_id', userId)
    .order('created_at', { ascending: false });
  if (e1) console.error('getUserPools hosted error:', e1);

  // Drafts
  const { data: drafts, error: e2 } = await supabase
    .from('pool_drafts')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (e2) console.error('getUserPools drafts error:', e2);

  // Pools the user joined (via pool_members)
  const { data: memberRows, error: e3 } = await supabase
    .from('pool_members')
    .select('pool_id, role')
    .eq('user_id', userId);
  if (e3) console.error('getUserPools members error:', e3);

  const joinedPoolIds = (memberRows ?? [])
    .filter(m => m.role === 'player')
    .map(m => m.pool_id);

  let joined: Pool[] = [];
  if (joinedPoolIds.length > 0) {
    const { data: joinedData, error: e4 } = await supabase
      .from('pools')
      .select('*')
      .in('id', joinedPoolIds)
      .order('created_at', { ascending: false });
    if (e4) console.error('getUserPools joined error:', e4);
    joined = joinedData ?? [];
  }

  return {
    hosted: hosted ?? [],
    joined,
    drafts: (drafts ?? []) as PoolDraft[],
  };
}

export async function getPool(poolId: string): Promise<Pool | null> {
  const { data, error } = await supabase
    .from('pools')
    .select('*')
    .eq('id', poolId)
    .maybeSingle();
  if (error) throw error;
  return data as Pool | null;
}

export async function getPoolInvite(poolId: string): Promise<PoolInvite | null> {
  const { data, error } = await supabase
    .from('pool_invites')
    .select('*')
    .eq('pool_id', poolId)
    .maybeSingle();
  if (error) throw error;
  return data as PoolInvite | null;
}

export async function getSquaresFilled(poolId: string): Promise<number> {
  const { count, error } = await supabase
    .from('squares')
    .select('*', { count: 'exact', head: true })
    .eq('pool_id', poolId)
    .not('owner_id', 'is', null);
  if (error) throw error;
  return count ?? 0;
}

export async function joinPool(poolId: string): Promise<void> {
  const { error } = await supabase
    .from('pool_members')
    .insert({ pool_id: poolId, role: 'player' });
  if (error) {
    // Already a member is fine
    if (!error.message.includes('duplicate')) throw error;
  }
}
