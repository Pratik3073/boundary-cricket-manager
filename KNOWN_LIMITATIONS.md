# Known limitations — review before official use

This is a first working MVP intended for local club/friendly matches. Cricket scoring has many edge cases; test thoroughly before relying on it for a tournament.

1. No-ball scoring currently records the no-ball extra but does not yet provide a combined batter-runs + no-ball workflow (for example, 1 off the bat plus 1 no-ball).
2. Wide/no-ball penalty configuration is fixed to the scorer-entered extra value; competition-specific penalty rules are not configurable.
3. Run-out and non-striker dismissal scorecard attribution needs additional validation.
4. Undo is a two-step delete/update operation rather than a database transaction. Avoid two scorers operating on the same match simultaneously.
5. Bowler over limits, retired hurt/return, penalty runs, dead-ball, timed-out, obstructing the field, free hits, super overs, DLS and detailed fall-of-wickets are not implemented.
6. The authenticated-write RLS policies grant admin capability to every authenticated account. Keep only one trusted user account until role-based authorization is added.
7. Public read policies expose the player directory and match data. Store only names intended for public display.
8. Scoreboard summaries are calculated in the browser from delivery records. Very long tournaments may need server-side aggregate views or RPC functions.

Before live use, test at least: dot ball, odd/even runs, boundary, over completion, wide, no-ball, bye, leg-bye, bowled, caught, run-out of either batter, undo, refresh, second innings and two different viewer devices.
