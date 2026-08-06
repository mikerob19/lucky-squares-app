import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ============================================================
// nfl-scores edge function
//
// Generates simulated live NFL scores for active pools whose game has
// started, advances the quarter on each call, determines the winning
// square (last-digit match of cumulative scores), credits the winner's
// coins + coins_won, and fans out notifications.
//
// Designed to be polled by a scheduler / cron. In production this would
// call a real sports API; here we simulate realistic progressive scoring.
// ============================================================

const QUARTER_PAYOUT_MAP: Record<string, string> = {
  Q1: "payout_first",
  Q2: "payout_second",
  Q3: "payout_third",
  Q4: "payout_fourth",
};

function lastDigit(n: number): number {
  return ((n % 10) + 10) % 10;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Load all pools with their existing score rows
    const { data: pools, error: poolsErr } = await supabase
      .from("pools")
      .select("id, name, team_home, team_away, cost_per_square, payout_first, payout_second, payout_third, payout_fourth, status")
      .eq("status", "active");
    if (poolsErr) throw poolsErr;
    if (!pools || pools.length === 0) {
      return json({ updated: 0, message: "No active pools" });
    }

    const poolIds = pools.map((p) => p.id);
    const { data: existingScores } = await supabase
      .from("game_scores")
      .select("*")
      .in("pool_id", poolIds);
    const scoreByPool = new Map((existingScores || []).map((s) => [s.pool_id, s]));

    // Load all squares for these pools
    const { data: squares } = await supabase
      .from("squares")
      .select("id, pool_id, row, col, owner_id")
      .in("pool_id", poolIds);
    const squaresByPool = new Map<string, typeof squares>();
    (squares || []).forEach((sq) => {
      const arr = squaresByPool.get(sq.pool_id) ?? [];
      arr.push(sq);
      squaresByPool.set(sq.pool_id, arr);
    });

    const now = Date.now();
    const results: { pool: string; quarter: string; winner?: string }[] = [];

    for (const pool of pools) {
      const prev = scoreByPool.get(pool.id);
      // Determine game start: treat pools as "live" if they have a score row
      // already in a non-final quarter, OR if explicitly started via query param.
      // First call for a pool seeds it at Q1 with 0-0.
      const quarter: string = prev?.quarter ?? "pre";

      // Only advance pools that are already in play or explicitly triggered.
      if (quarter === "final") continue;
      if (quarter === "pre" && !req.url.includes("start")) continue;

      const nextQuarter = advanceQuarter(quarter);
      // Generate progressive scores: add to previous quarter totals.
      const base = prev ?? { home_score: 0, away_score: 0 };
      const added = quarterScore(prev?.quarter);
      const homeScore = base.home_score + added.home;
      const awayScore = base.away_score + added.away;

      // Determine winning square: row = away last digit, col = home last digit
      const winRow = lastDigit(awayScore);
      const winCol = lastDigit(homeScore);
      const winSquare = `${winRow}-${winCol}`;

      const poolSquares = squaresByPool.get(pool.id) ?? [];
      const winner = poolSquares.find((s) => s.row === winRow && s.col === winCol && s.owner_id);

      // Build quarter score fields
      const quarterField = `home_score_${nextQuarter.toLowerCase()}`;
      const awayField = `away_score_${nextQuarter.toLowerCase()}`;
      const scoreRow: Record<string, unknown> = {
        pool_id: pool.id,
        game_id: `pool-${pool.id}`,
        home_score: homeScore,
        away_score: awayScore,
        quarter: nextQuarter,
        last_quarter_winner_square: winSquare,
        last_quarter_winner_id: winner?.owner_id ?? null,
        updated_at: new Date().toISOString(),
      };
      // Set the cumulative quarter score for the just-completed quarter.
      if (nextQuarter !== "final") {
        scoreRow[quarterField] = homeScore;
        scoreRow[awayField] = awayScore;
      } else {
        scoreRow.home_score_q4 = homeScore;
        scoreRow.away_score_q4 = awayScore;
      }

      const { error: upsertErr } = await supabase
        .from("game_scores")
        .upsert(scoreRow, { onConflict: "pool_id" });
      if (upsertErr) {
        console.error(`Score upsert failed for ${pool.id}:`, upsertErr.message);
        continue;
      }

      // Credit winner
      if (winner?.owner_id) {
        const payoutCol = QUARTER_PAYOUT_MAP[nextQuarter];
        const payout = (pool as unknown as Record<string, number>)[payoutCol] ?? 0;
        if (payout > 0) {
          // Credit coins + coins_won atomically via RPC-free increments
          const { data: prof } = await supabase
            .from("profiles")
            .select("coins, coins_won")
            .eq("id", winner.owner_id)
            .maybeSingle();
          if (prof) {
            await supabase.from("profiles").update({
              coins: prof.coins + payout,
              coins_won: prof.coins_won + payout,
            }).eq("id", winner.owner_id);
          }

          // Notify all participants about the winner
          await supabase.rpc("notify_pool_participants", {
            p_type: "quarter_winner",
            p_pool_id: pool.id,
            p_title: `${nextQuarter} winner in ${pool.name}`,
            p_body: `Square ${winRow}-${winCol} won ${payout} coins for ${nextQuarter}!`,
          });
        }
      }

      results.push({ pool: pool.id, quarter: nextQuarter, winner: winner?.owner_id });
    }

    return json({ updated: results.length, results });
  } catch (err) {
    console.error("nfl-scores error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function advanceQuarter(q: string): string {
  const order = ["pre", "Q1", "Q2", "Q3", "Q4", "final"];
  const idx = order.indexOf(q);
  return order[Math.min(idx + 1, order.length - 1)];
}

// Simulate a quarter's scoring (TDs + FGs, 0-21 points)
function quarterScore(_prevQuarter?: string): { home: number; away: number } {
  const rand = () => Math.floor(Math.random() * 8);
  let h = 0, a = 0;
  for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) {
    if (Math.random() > 0.5) h += [7, 3, 7, 6][rand() % 4];
    else a += [7, 3, 7, 6][rand() % 4];
  }
  return { home: Math.min(h, 28), away: Math.min(a, 28) };
}
