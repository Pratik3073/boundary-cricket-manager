export const EXTRA_TYPES = ['wide', 'no_ball', 'bye', 'leg_bye'];
export const DISMISSALS = ['bowled', 'caught', 'lbw', 'run_out', 'stumped', 'hit_wicket', 'retired_hurt', ' obstructing_the_field'];

export function deliverySummary(delivery) {
  if (delivery.extra_type === 'wide') return delivery.extra_runs === 1 ? 'Wd' : `${delivery.extra_runs}Wd`;
  if (delivery.extra_type === 'no_ball') return `${delivery.batter_runs + delivery.extra_runs}Nb`;
  if (delivery.extra_type === 'bye') return `${delivery.extra_runs}B`;
  if (delivery.extra_type === 'leg_bye') return `${delivery.extra_runs}Lb`;
  if (delivery.wicket_type) return delivery.batter_runs ? `${delivery.batter_runs}W` : 'W';
  return String(delivery.batter_runs);
}

export function calculateInnings(deliveries = []) {
  let runs = 0, wickets = 0, legalBalls = 0, batterRuns = 0, extras = 0;
  const batters = {}, bowlers = {}, recent = [];
  for (const d of deliveries) {
    const total = Number(d.batter_runs || 0) + Number(d.extra_runs || 0);
    runs += total;
    batterRuns += Number(d.batter_runs || 0);
    extras += Number(d.extra_runs || 0);
    if (d.is_legal) legalBalls++;
    if (d.wicket_type && !['retired_hurt'].includes(d.wicket_type)) wickets++;
    const batterId = d.striker_id;
    if (batterId) {
      batters[batterId] ||= { runs: 0, balls: 0, fours: 0, sixes: 0, out: false };
      batters[batterId].runs += Number(d.batter_runs || 0);
      if (d.is_legal) batters[batterId].balls++;
      if (Number(d.batter_runs) === 4) batters[batterId].fours++;
      if (Number(d.batter_runs) === 6) batters[batterId].sixes++;
      if (d.wicket_type && d.wicket_type !== 'retired_hurt' && d.dismissed_player_id === batterId) batters[batterId].out = true;
    }
    const bowlerId = d.bowler_id;
    if (bowlerId) {
      bowlers[bowlerId] ||= { runs: 0, balls: 0, wickets: 0, wides: 0, noBalls: 0 };
      // Byes and leg-byes are not charged to the bowler.
      const charged = d.extra_type === 'bye' || d.extra_type === 'leg_bye' ? 0 : total;
      bowlers[bowlerId].runs += charged;
      if (d.is_legal) bowlers[bowlerId].balls++;
      if (d.extra_type === 'wide') bowlers[bowlerId].wides += Number(d.extra_runs || 0);
      if (d.extra_type === 'no_ball') bowlers[bowlerId].noBalls += 1;
      if (d.wicket_type && !['run_out', 'retired_hurt'].includes(d.wicket_type)) bowlers[bowlerId].wickets++;
    }
    recent.push(deliverySummary(d));
  }
  return { runs, wickets, legalBalls, overs: `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`, runRate: legalBalls ? (runs / (legalBalls / 6)).toFixed(2) : '0.00', batterRuns, extras, batters, bowlers, recent: recent.slice(-12) };
}

export function getEndChange(delivery) {
  const batterRuns = Number(delivery.batter_runs || 0);
  const runningExtras = ['bye', 'leg_bye'].includes(delivery.extra_type) ? Number(delivery.extra_runs || 0) : 0;
  return (batterRuns + runningExtras) % 2 === 1;
}
