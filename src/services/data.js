
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
    ? db.from('players').update({
        name: player.name,
        phone: player.phone || null
      }).eq('id', player.id)
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
    db.from('matches').select('*').eq('id', matchId).single(),
    db.from('match_players').select('*, players(*)')
      .eq('match_id', matchId).order('batting_order'),
    db.from('innings')
      .select('*, deliveries(*, striker:players!deliveries_striker_id_fkey(id,name), non_striker:players!deliveries_non_striker_id_fkey(id,name), bowler:players!deliveries_bowler_id_fkey(id,name))')
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

export async function startInnings(
  matchId, number, battingTeam, striker,
  nonStriker, bowler, tossWinner, tossDecision
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

  const { data, error } = await db
    .from('innings')
    .insert({
      match_id: matchId,
      innings_number: number,
      batting_team: battingTeam,
      striker_id: striker,
      non_striker_id: nonStriker,
      current_bowler_id: bowler,
      status: 'live'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function recordDelivery(innings, delivery, nextState) {
  const db = requireSupabase();

  const { error } = await db.from('deliveries').insert({
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

// Delete match and its related records.
export async function deleteMatch(matchId) {
  const db = requireSupabase();

  // Delete deliveries belonging to the match's innings first.
  const { data: innings, error: inningsReadError } = await db
    .from('innings')
    .select('id')
    .eq('match_id', matchId);

  if (inningsReadError) throw inningsReadError;

  const inningsIds = (innings || []).map(item => item.id);

  if (inningsIds.length) {
    const { error: deliveriesError } = await db
      .from('deliveries')
      .delete()
      .in('innings_id', inningsIds);

    if (deliveriesError) throw deliveriesError;
  }

  const { error: inningsError } = await db
    .from('innings')
    .delete()
    .eq('match_id', matchId);

  if (inningsError) throw inningsError;

  const { error: playersError } = await db
    .from('match_players')
    .delete()
    .eq('match_id', matchId);

  if (playersError) throw playersError;

  const { error: matchError } = await db
    .from('matches')
    .delete()
    .eq('id', matchId);

  if (matchError) throw matchError;
}
