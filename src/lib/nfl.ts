import { supabase } from './supabase';
import type { NFLGame } from './types';

/**
 * NFL data service — abstracts the source of game schedule data.
 * Currently reads from the `games` table (seeded with dev data).
 * Replace with a live sports-data API proxied through an edge function
 * when a real integration is available.
 */

export async function getUpcomingGames(): Promise<NFLGame[]> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .gte('kickoff_utc', nowIso)
    .order('kickoff_utc', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getGameById(gameId: string): Promise<NFLGame | null> {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export function formatKickoff(kickoffUtc: string): { date: string; time: string; timezone: string } {
  const d = new Date(kickoffUtc);
  const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const tzStr = d.toLocaleTimeString('en-US', { timeZoneName: 'short' }).split(' ').slice(-1)[0] ?? '';
  return { date: dateStr, time: timeStr, timezone: tzStr };
}

export function groupGamesByDate(games: NFLGame[]): { date: string; games: NFLGame[] }[] {
  const groups: Record<string, NFLGame[]> = {};
  for (const game of games) {
    const dateKey = new Date(game.kickoff_utc).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
    });
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(game);
  }
  return Object.entries(groups).map(([date, games]) => ({ date, games }));
}
