
import { requireSupabase } from './supabase';

export async function getPlayers() {
  const { data, error } = await requireSupabase()
    .from('players')
    .select('*')
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function savePlayer(player) {
  const db = requireSupabase();

  const query = player.id
    ? db.from('players')
        .update({
          name: player.name,
          phone: player.phone || null
        })
        .eq('id', player.id)
    : db.from('players').insert({
        name: player.name,
        phone: player.phone || null
      });

  const { error } = await query;
  if (error) throw error;
}

export async function deletePlayer(id) {
  const { error } = await requireSupabase()
    .from('players')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getMatches() {
  const { data, error } = await requireSupabase()
    .from('matches')
    .select('*, innings(*)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createMatch(input) {
  const db = requireSupabase();

  const { data: match, error } = await db
    .from('matches')
    .insert({
      title: input.title,
      team_a_name: input.teamA,
      team_b_name: input.teamB,
      overs_limit: input.overs,
      status: 'setup',
      created_by: (await db.auth.getUser()).data.user?.id
    })
    .select()
    .single();

  if (error) throw error;

  const roster = [
    ...input.teamAPlayers.map((p, i) => ({
      match_id: match.id,
      player_id: p,
      team: 'A',
      is_captain: p === input.captainA,
      batting_order: i + 1
    })),
    ...input.teamBPlayers.map((p, i) => ({
      match_id: match.id,
      player_id: p,
      team: 'B',
      is_captain: p === input.captainB,
      batting_order: i + 1
    }))
  ];

  const { error: rosterError } = await db
    .from('match_players')
    .insert(roster);

  if (rosterError) throw rosterError;

  return match;
}

export async function getMatchBundle(matchId) {
  const db = requireSupabase();

  const [matchRes, rosterRes, inningsRes] = await Promise.all([
    db.from('matches')
      .select('*')
      .eq('id', matchId)
      .single(),

    db.from('match_players')
      .select('*, players(*)')
      .eq('match_id', matchId)
      .order('batting_order'),

    db.from('innings')
      .select(`
        *,
        deliveries(
          *,
          striker:players!deliveries_striker_id_fkey(id,name),
          non_striker:players!deliveries_non_striker_id_fkey(id,name),
          bowler:players!deliveries_bowler_id_fkey(id,name)
        )
      `)
      .eq('match_id', matchId)
      .order('innings_number')
  ]);

  if (matchRes.error) throw matchRes.error;
  if (rosterRes.error) throw rosterRes.error;
  if (inningsRes.error) throw inningsRes.error;

  return {
    match: matchRes.data,
    roster: rosterRes.data || [],
    innings: inningsRes.data || []
  };
}

// Super Over is optional, so existing regular innings calls remain compatible.
export async function startInnings(
  matchId,
  number,
  battingTeam,
  striker,
  nonStriker,
  bowler,
  wicketkeeper,
  tossWinner,
  tossDecision,
  superOver = null
) {
  const db = requireSupabase();

  const { error: matchError } = await db
    .from('matches')
    .update({
      status: 'live',
      toss_winner: tossWinner,
      toss_decision: tossDecision
    })
    .eq('id', matchId);

  if (matchError) throw matchError;

  const row = {
    match_id: matchId,
    innings_number: number,
    batting_team: battingTeam,
    striker_id: striker,
    non_striker_id: nonStriker,
    current_bowler_id: bowler,
    wicketkeeper_id: wicketkeeper,
    status: 'live',

    // Super Over metadata
    is_super_over: Boolean(superOver?.isSuperOver),
    super_over_number: superOver?.isSuperOver
      ? superOver.superOverNumber
      : null,
    super_over_innings: superOver?.isSuperOver
      ? superOver.superOverInnings
      : null
  };

  const { data, error } = await db
    .from('innings')
    .insert(row)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function recordDelivery(innings, delivery, nextState) {
  const db = requireSupabase();

  const { error } = await db
    .from('deliveries')
    .insert({
      innings_id: innings.id,
      ...delivery
    });

  if (error) throw error;

  const { error: updateError } = await db
    .from('innings')
    .update(nextState)
    .eq('id', innings.id);

  if (updateError) throw updateError;
}

export async function undoDelivery(innings, previousState) {
  const db = requireSupabase();

  const { data: last, error } = await db
    .from('deliveries')
    .select('id')
    .eq('innings_id', innings.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) throw error;

  const { error: deleteError } = await db
    .from('deliveries')
    .delete()
    .eq('id', last.id);

  if (deleteError) throw deleteError;

  const { error: updateError } = await db
    .from('innings')
    .update(previousState)
    .eq('id', innings.id);

  if (updateError) throw updateError;
}

export async function finishMatch(matchId) {
  const { error } = await requireSupabase()
    .from('matches')
    .update({ status: 'completed' })
    .eq('id', matchId);

  if (error) throw error;
}

export async function deleteMatch(matchId) {
  const { error } = await requireSupabase()
    .from('matches')
    .delete()
    .eq('id', matchId);

  if (error) throw error;
}

// Career records intentionally exclude Super Over deliveries.
export async function getPlayerRecords() {
  const db = requireSupabase();

  const [playersRes, appearancesRes, inningsRes] = await Promise.all([
    db.from('players')
      .select('id, name, created_at')
      .order('name'),

    db.from('match_players')
      .select('player_id, match_id'),

    db.from('innings')
      .select('id, match_id, batting_team, is_super_over, deliveries(*)')
  ]);

  if (playersRes.error) throw playersRes.error;
  if (appearancesRes.error) throw appearancesRes.error;
  if (inningsRes.error) throw inningsRes.error;

  const regularInnings = (inningsRes.data || [])
    .filter(innings => !innings.is_super_over);

  const stats = new Map();

  for (const player of playersRes.data || []) {
    stats.set(player.id, {
      id: player.id,
      name: player.name,
      matches: new Set(),
      runs: 0,
      ballsFaced: 0,
      fours: 0,
      sixes: 0,
      highestScore: 0,
      outs: 0,
      wickets: 0,
      bowlingRuns: 0,
      bowlingBalls: 0
    });
  }

  for (const appearance of appearancesRes.data || []) {
    const row = stats.get(appearance.player_id);
    if (row) row.matches.add(appearance.match_id);
  }

  for (const innings of regularInnings) {
    for (const delivery of innings.deliveries || []) {
      const batter = stats.get(delivery.striker_id);
      const bowler = stats.get(delivery.bowler_id);

      const batterRuns = Number(delivery.batter_runs || 0);
      const totalRuns =
        batterRuns + Number(delivery.extra_runs || 0);

      if (batter) {
        batter.runs += batterRuns;

        if (delivery.extra_type !== 'wide') {
          batter.ballsFaced += 1;
        }

        if (batterRuns === 4) batter.fours += 1;
        if (batterRuns === 6) batter.sixes += 1;
      }

      const dismissed = stats.get(delivery.dismissed_player_id);

      if (
        dismissed &&
        delivery.wicket_type &&
        delivery.wicket_type !== 'retired_hurt'
      ) {
        dismissed.outs += 1;
      }

      if (bowler) {
        if (delivery.is_legal) {
          bowler.bowlingBalls += 1;
        }

        if (!['bye', 'leg_bye'].includes(delivery.extra_type)) {
          bowler.bowlingRuns += totalRuns;
        }

        if (
          delivery.wicket_type &&
          !['run_out', 'retired_hurt'].includes(delivery.wicket_type)
        ) {
          bowler.wickets += 1;
        }
      }
    }
  }

  // Calculate each player's highest score in regular innings only.
  for (const innings of regularInnings) {
    const inningsRuns = new Map();

    for (const delivery of innings.deliveries || []) {
      if (!delivery.striker_id) continue;

      inningsRuns.set(
        delivery.striker_id,
        (inningsRuns.get(delivery.striker_id) || 0) +
          Number(delivery.batter_runs || 0)
      );
    }

    for (const [playerId, score] of inningsRuns) {
      const row = stats.get(playerId);

      if (row) {
        row.highestScore = Math.max(row.highestScore, score);
      }
    }
  }

  return [...stats.values()].map(row => ({
    ...row,
    matches: row.matches.size,

    battingAverage: row.outs
      ? (row.runs / row.outs).toFixed(2)
      : row.runs
        ? '—'
        : '0.00',

    strikeRate: row.ballsFaced
      ? ((row.runs / row.ballsFaced) * 100).toFixed(2)
      : '0.00',

    economy: row.bowlingBalls
      ? (row.bowlingRuns / (row.bowlingBalls / 6)).toFixed(2)
      : '0.00',

    bowlingOvers:
      `${Math.floor(row.bowlingBalls / 6)}.${row.bowlingBalls % 6}`
  }));
}
