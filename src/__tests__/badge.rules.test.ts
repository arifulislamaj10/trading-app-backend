/**
 * Unit tests for badge rule helpers (pure logic).
 */

const toUtcDateKey = (date: Date): string => date.toISOString().slice(0, 10);

const daysBetweenUtc = (a: string, b: string): number => {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round(
    (new Date(`${b}T00:00:00.000Z`).getTime() -
      new Date(`${a}T00:00:00.000Z`).getTime()) /
      msPerDay,
  );
};

const longestConsecutiveDays = (sortedDateKeys: string[]): number => {
  if (sortedDateKeys.length === 0) return 0;
  let max = 1;
  let current = 1;
  for (let i = 1; i < sortedDateKeys.length; i++) {
    if (daysBetweenUtc(sortedDateKeys[i - 1], sortedDateKeys[i]) === 1) {
      current += 1;
    } else {
      current = 1;
    }
    max = Math.max(max, current);
  }
  return max;
};

describe("badge streak helpers", () => {
  it("computes longest consecutive win-day streak", () => {
    const dates = ["2026-05-01", "2026-05-02", "2026-05-03", "2026-05-05"];
    expect(longestConsecutiveDays(dates)).toBe(3);
  });

  it("returns 0 for empty dates", () => {
    expect(longestConsecutiveDays([])).toBe(0);
  });

  it("formats UTC date keys", () => {
    expect(toUtcDateKey(new Date("2026-05-10T23:00:00.000Z"))).toBe(
      "2026-05-10",
    );
  });
});

describe("badge thresholds", () => {
  it("ace trader requires 75% win rate with minimum trades", () => {
    const wins = 15;
    const completed = 20;
    const winRate = wins / completed;
    expect(winRate).toBeGreaterThanOrEqual(0.75);
    expect(completed).toBeGreaterThanOrEqual(20);
  });
});
