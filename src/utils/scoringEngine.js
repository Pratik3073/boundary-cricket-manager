export const EXTRA_TYPES = ['wide', 'no_ball', 'bye', 'leg_bye'];

export const DISMISSALS = [
  'bowled',
  'caught',
  'lbw',
  'run_out',
  'stumped',
  'hit_wicket',
  'retired_hurt',
  'obstructing_the_field'
];

export function deliverySummary(delivery) {
  if (delivery.extra_type === 'wide') {
    return delivery.extra_runs === 1
      ? 'Wd'
      : `${delivery.extra_runs}Wd`;
  }

  if (delivery.extra_type === 'no_ball') {
    return `${delivery.batter_runs + delivery.extra_runs}Nb`;
  }

  if (delivery.extra_type === 'bye') {
    return `${delivery.extra_runs}B`;
  }

  if (delivery.extra_type === 'leg_bye') {
    return `${delivery.extra_runs}Lb`;
  }

  if (delivery.wicket_type) {
    return delivery.batter_runs ? `${delivery.batter_runs}W` : 'W';
  }

  return String(delivery.batter_runs);
}

export function calculateInnings(deliveries = []) {
  let runs = 0;
  let wickets = 0;
  let legalBalls = 0;
  let batterRuns = 0;
  let extras = 0;

  const batters = {};
  const bowlers = {};
  const recent = [];

  for (const delivery of deliveries) {
    const batterRunsThisBall = Number(delivery.batter_runs || 0);
    const extraRunsThisBall = Number(delivery.extra_runs || 0);
    const total = batterRunsThisBall + extraRunsThisBall;

    runs += total;
    batterRuns += batterRunsThisBall;
    extras += extraRunsThisBall;

    if (delivery.is_legal) legalBalls += 1;

    if (delivery.wicket_type && delivery.wicket_type !== 'retired_hurt') {
      wickets += 1;
    }

    const batterId = delivery.striker_id;

    if (batterId) {
      batters[batterId] ||= {
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        out: false
      };

      batters[batterId].runs += batterRunsThisBall;

      // A batter faces a delivery except when it is a wide.
      if (delivery.extra_type !== 'wide') {
        batters[batterId].balls += 1;
      }

      if (batterRunsThisBall === 4) batters[batterId].fours += 1;
      if (batterRunsThisBall === 6) batters[batterId].sixes += 1;

      if (
        delivery.wicket_type &&
        delivery.wicket_type !== 'retired_hurt' &&
        delivery.dismissed_player_id === batterId
      ) {
        batters[batterId].out = true;
      }
    }

    const bowlerId = delivery.bowler_id;

    if (bowlerId) {
      bowlers[bowlerId] ||= {
        runs: 0,
        balls: 0,
        wickets: 0,
        wides: 0,
        noBalls: 0
      };

      // Byes and leg-byes are not charged to the bowler.
      const chargedRuns =
        delivery.extra_type === 'bye' || delivery.extra_type === 'leg_bye'
          ? 0
          : total;

      bowlers[bowlerId].runs += chargedRuns;

      if (delivery.is_legal) bowlers[bowlerId].balls += 1;

      if (delivery.extra_type === 'wide') {
        bowlers[bowlerId].wides += extraRunsThisBall;
      }

      if (delivery.extra_type === 'no_ball') {
        bowlers[bowlerId].noBalls += 1;
      }

      if (
        delivery.wicket_type &&
        !['run_out', 'retired_hurt'].includes(delivery.wicket_type)
      ) {
        bowlers[bowlerId].wickets += 1;
      }
    }

    recent.push(deliverySummary(delivery));
  }

  return {
    runs,
    wickets,
    legalBalls,
    overs: `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`,
    runRate: legalBalls
      ? (runs / (legalBalls / 6)).toFixed(2)
      : '0.00',
    batterRuns,
    extras,
    batters,
    bowlers,
    recent: recent.slice(-12)
  };
}

export function getEndChange(delivery) {
  const batterRuns = Number(delivery.batter_runs || 0);
  const runningExtras = ['bye', 'leg_bye'].includes(delivery.extra_type)
    ? Number(delivery.extra_runs || 0)
    : 0;

  return (batterRuns + runningExtras) % 2 === 1;
}