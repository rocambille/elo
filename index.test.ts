import elo, { Pool } from "./index";

describe("no side effects", () => {
  const player = elo();

  const foo = { a: 42 };
  const bar = { z: 43 };

  const fooAsJson = JSON.stringify(foo);
  const barAsJson = JSON.stringify(bar);

  test("wins", () => {
    player(foo).wins(bar);

    expect(JSON.stringify(foo)).toBe(fooAsJson);
    expect(JSON.stringify(bar)).toBe(barAsJson);
  });
  test("loses", () => {
    player(foo).loses(bar);

    expect(JSON.stringify(foo)).toBe(fooAsJson);
    expect(JSON.stringify(bar)).toBe(barAsJson);
  });
  test("ties", () => {
    player(foo).ties(bar);

    expect(JSON.stringify(foo)).toBe(fooAsJson);
    expect(JSON.stringify(bar)).toBe(barAsJson);
  });
  test("oddsAgainst", () => {
    player(foo).oddsAgainst(bar);

    expect(JSON.stringify(foo)).toBe(fooAsJson);
    expect(JSON.stringify(bar)).toBe(barAsJson);
  });
  test("reset", () => {
    player(foo).reset();

    expect(JSON.stringify(foo)).toBe(fooAsJson);
  });
});

describe("data conservation", () => {
  const player = elo();

  const foo = { a: 42 };
  const bar = { z: 43 };

  test("wins", () => {
    const [fooWithElo, barWithElo] = player(foo).wins(bar);

    expect(fooWithElo.a).toBe(foo.a);
    expect(barWithElo.z).toBe(bar.z);
  });
  test("loses", () => {
    const [fooWithElo, barWithElo] = player(foo).loses(bar);

    expect(fooWithElo.a).toBe(foo.a);
    expect(barWithElo.z).toBe(bar.z);
  });
  test("ties", () => {
    const [fooWithElo, barWithElo] = player(foo).ties(bar);

    expect(fooWithElo.a).toBe(foo.a);
    expect(barWithElo.z).toBe(bar.z);
  });
  test("reset", () => {
    const fooAfterReset = player(foo).reset();

    expect(fooAfterReset.a).toBe(foo.a);
  });
});

describe("first match", () => {
  const player = elo();

  const foo = { a: 42 };
  const bar = { z: 43 };

  test("wins", () => {
    const [fooWithElo, barWithElo] = player(foo).wins(bar);

    expect(fooWithElo.elo.rating).toBeCloseTo(1516);
    expect(fooWithElo.elo.lastDelta).toBeCloseTo(16);
    expect(fooWithElo.elo.lastPlayedAt).toBeDefined();
    expect(fooWithElo.elo.matchCount).toBe(1);

    expect(barWithElo.elo.rating).toBeCloseTo(1484);
    expect(barWithElo.elo.lastDelta).toBeCloseTo(-16);
    expect(barWithElo.elo.lastPlayedAt).toBeDefined();
    expect(barWithElo.elo.matchCount).toBe(1);

    expect(fooWithElo.elo.lastPlayedAt).toBe(barWithElo.elo.lastPlayedAt);
  });
  test("loses", () => {
    const [fooWithElo, barWithElo] = player(foo).loses(bar);

    expect(fooWithElo.elo.rating).toBeCloseTo(1484);
    expect(fooWithElo.elo.lastDelta).toBeCloseTo(-16);
    expect(fooWithElo.elo.lastPlayedAt).toBeDefined();
    expect(fooWithElo.elo.matchCount).toBe(1);

    expect(barWithElo.elo.rating).toBeCloseTo(1516);
    expect(barWithElo.elo.lastDelta).toBeCloseTo(16);
    expect(barWithElo.elo.lastPlayedAt).toBeDefined();
    expect(barWithElo.elo.matchCount).toBe(1);

    expect(fooWithElo.elo.lastPlayedAt).toBe(barWithElo.elo.lastPlayedAt);
  });
  test("ties", () => {
    const [fooWithElo, barWithElo] = player(foo).ties(bar);

    expect(fooWithElo.elo.rating).toBeCloseTo(1500);
    expect(fooWithElo.elo.lastDelta).toBeCloseTo(0);
    expect(fooWithElo.elo.lastPlayedAt).toBeDefined();
    expect(fooWithElo.elo.matchCount).toBe(1);

    expect(barWithElo.elo.rating).toBeCloseTo(1500);
    expect(barWithElo.elo.lastDelta).toBeCloseTo(0);
    expect(barWithElo.elo.lastPlayedAt).toBeDefined();
    expect(barWithElo.elo.matchCount).toBe(1);

    expect(fooWithElo.elo.lastPlayedAt).toBe(barWithElo.elo.lastPlayedAt);
  });
  test("oddsAgainst", () => {
    const odds = player(foo).oddsAgainst(bar);

    expect(odds).toBeCloseTo(0.5);
  });
  test("reset", () => {
    const [fooWithElo, barWithElo] = player(foo).wins(bar);
    expect(fooWithElo.elo).toBeDefined();
    expect(barWithElo.elo).toBeDefined();

    const fooAfterReset = player(fooWithElo).reset();
    expect(fooAfterReset.elo).toBeUndefined();

    const barAfterReset = player(barWithElo).reset();
    expect(barAfterReset.elo).toBeUndefined();
  });
});

const scenario: Readonly<Array<{ action: string; result: Array<number> }>> = [
  { action: "start", result: [1500, 1500] },
  { action: "loses", result: [1484, 1516] },
  { action: "ties", result: [1485.47, 1514.53] },
  { action: "ties", result: [1486.805, 1513.195] },
  { action: "wins", result: [1504.018, 1495.982] },
  { action: "loses", result: [1487.648, 1512.352] },
  { action: "ties", result: [1488.783, 1511.217] },
  { action: "wins", result: [1505.815, 1494.185] },
  { action: "ties", result: [1505.28, 1494.72] },
  { action: "wins", result: [1520.794, 1479.206] },
  { action: "loses", result: [1502.888, 1497.112] },
];

describe("10 rounds", () => {
  for (let i = 1; i < scenario.length; i++) {
    test(`round ${i}`, () => {
      const {
        result: [previousFooRating, previousBarRating],
      } = scenario[i - 1];
      const {
        action,
        result: [newFooRating, newBarRating],
      } = scenario[i];

      const player = elo();

      const [foo, bar] = player({
        a: 42,
        elo: {
          rating: previousFooRating,
          matchCount: i - 1,
          lastDelta: NaN,
          lastPlayedAt: NaN,
        },
      })[
        action as keyof {
          wins: Function;
          loses: Function;
          ties: Function;
        }
      ]({
        a: 42,
        elo: {
          rating: previousBarRating,
          matchCount: i - 1,
          lastDelta: NaN,
          lastPlayedAt: NaN,
        },
      });

      expect(foo.elo.rating).toBeCloseTo(newFooRating);
      expect(foo.elo.lastDelta).toBeCloseTo(newFooRating - previousFooRating);
      expect(foo.elo.lastPlayedAt).toBeDefined();
      expect(foo.elo.matchCount).toBe(i);

      expect(bar.elo.rating).toBeCloseTo(newBarRating);
      expect(bar.elo.lastDelta).toBeCloseTo(newBarRating - previousBarRating);
      expect(bar.elo.lastPlayedAt).toBeDefined();
      expect(bar.elo.matchCount).toBe(i);

      expect(foo.elo.lastPlayedAt).toBe(bar.elo.lastPlayedAt);
    });
  }
});

describe("10 rounds (using Pool)", () => {
  for (let i = 1; i < scenario.length; i++) {
    test(`round ${i}`, () => {
      const {
        result: [previous1stRating, previous2ndRating],
      } = scenario[i - 1];
      const {
        action,
        result: [new1stRating, new2ndRating],
      } = scenario[i];

      let pool = Pool.from([
        {
          a: 42,
          elo: {
            rating: previous1stRating,
            matchCount: i - 1,
            lastDelta: NaN,
            lastPlayedAt: NaN,
          },
        },
        {
          z: 43,
          elo: {
            rating: previous2ndRating,
            matchCount: i - 1,
            lastDelta: NaN,
            lastPlayedAt: NaN,
          },
        },
      ])
        .player(0)
        [
          action as keyof {
            wins: Function;
            loses: Function;
            ties: Function;
          }
        ](1);

      expect(pool[0].elo.rating).toBeCloseTo(new1stRating);
      expect(pool[0].elo.lastDelta).toBeCloseTo(
        new1stRating - previous1stRating
      );
      expect(pool[0].elo.lastPlayedAt).toBeDefined();
      expect(pool[0].elo.matchCount).toBe(i);

      expect(pool[1].elo.rating).toBeCloseTo(new2ndRating);
      expect(pool[1].elo.lastDelta).toBeCloseTo(
        new2ndRating - previous2ndRating
      );
      expect(pool[1].elo.lastPlayedAt).toBeDefined();
      expect(pool[1].elo.matchCount).toBe(i);

      expect(pool[0].elo.lastPlayedAt).toBe(pool[1].elo.lastPlayedAt);
    });
  }
});

describe("pool picking", () => {
  test("random", () => {
    const pool = Pool.from([{ a: 42 }, { b: 43 }, { c: 44 }]);

    for (let c = 100; c--; ) {
      const [i, j, method] = pool.pick("random").sort();

      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(pool.length);
      expect(j).toBeGreaterThanOrEqual(0);
      expect(j).toBeLessThan(pool.length);
      expect(i).not.toBe(j);
      expect(method).toBe("random");
    }
  });
  test("matchCount", () => {
    const pool = Pool.from([
      { a: 42 }, // new comer: picked
      { b: 43, elo: { matchCount: 2 } }, // veteran: we're looking for newcomers
      { c: 44, elo: { matchCount: 1 } }, // second: not picked to avoid rematch
      { d: 45, elo: { matchCount: 1 } }, // third: picked
    ]);

    const [i, j, method] = pool.pick("matchCount");

    expect(i).toBe(0);
    expect(j).toBe(3);
    expect(method).toBe("matchCount");
  });
  test("lastPlayedAt", () => {
    const pool = Pool.from([
      { a: 42, elo: { lastPlayedAt: 0 } }, // first: picked
      { b: 43 }, // newcomer: we're looking for veterans
      { c: 44, elo: { lastPlayedAt: 1 } }, // second: not picked to avoid rematch
      { d: 45, elo: { lastPlayedAt: 1 } }, // third: picked
    ]);

    const [i, j, method] = pool.pick("lastPlayedAt");

    expect(i).toBe(0);
    expect(j).toBe(3);
    expect(method).toBe("lastPlayedAt");
  });
  test("lastPlayedAt with undefined dates", () => {
    const pool = Pool.from([{ a: 42 }, { b: 43 }, { c: 44 }, { d: 45 }]);

    const [i, j, method] = pool.pick("lastPlayedAt");

    expect(i).toBe(0);
    expect(j).toBe(1);
    expect(method).toBe("lastPlayedAt");
  });
  ["random", "matchCount", "lastPlayedAt"].forEach((wantedMethod) => {
    test(`small pool (length = 2, ${wantedMethod})`, () => {
      const pool = Pool.from([{ a: 42 }, { b: 43 }]);

      const [i, j, method] = pool.pick(wantedMethod);

      expect(i).toBe(0);
      expect(j).toBe(1);
      expect(method).toBe(wantedMethod);
    });
    test(`very small pool (length = 1, ${wantedMethod})`, () => {
      expect(() => Pool.from([{ a: 42 }]).pick(wantedMethod)).toThrow(
        new Error("not enough players")
      );
    });
    test(`empty pool (length = 0, ${wantedMethod})`, () => {
      expect(() => Pool.from([]).pick(wantedMethod)).toThrow(
        new Error("not enough players")
      );
    });
  });
});
