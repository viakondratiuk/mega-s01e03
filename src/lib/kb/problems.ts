// The problems in a merged ticket, counted the desk's way: every report under its cause by tenant
// (causes.ts), plus the reports the desk read as a one-day move (desk-notes.json). A day/month swap
// moves a date by months, never by one day, so a one-day move is its own problem. Its reports stay
// counted under their cause too, where the desk filed them.

import { groupByCause, readAs, type Cause, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = Cause | 'unplaced' | 'one-day move';

export type ProblemRow = {
  problem: Problem;
  reports: number;
  tenants: number;
  // What intake tagged these reports as: tag → count.
  taggedAs: Record<string, number>;
  firstSeen: string;
  lastSeen: string;
  // For a one-day move: the cause its reports are also counted under.
  alsoIn: Problem[];
};

export function problemRows(
  reports: Report[],
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): ProblemRow[] {
  const groups = groupByCause(reports, tenantOf);
  const rows: ProblemRow[] = groups.map((g) => ({
    problem: g.cause,
    reports: g.reports.length,
    tenants: g.tenants,
    taggedAs: g.taggedAs,
    firstSeen: g.firstSeen,
    lastSeen: g.lastSeen,
    alsoIn: [],
  }));
  const moved = reports.filter((r) => oneDayMove.includes(r.id));
  if (moved.length) {
    const days = moved.map((r) => r.receivedAt.slice(0, 10)).sort();
    rows.push({
      problem: 'one-day move',
      reports: moved.length,
      tenants: new Set(moved.map((r) => r.tenant)).size,
      taggedAs: moved.reduce<Record<string, number>>((n, r) => ({ ...n, [r.meta.intakeTag]: (n[r.meta.intakeTag] ?? 0) + 1 }), {}),
      firstSeen: days[0],
      lastSeen: days[days.length - 1],
      alsoIn: groups.filter((g) => readAs(g, oneDayMove) > 0).map((g) => g.cause),
    });
  }
  return rows;
}
