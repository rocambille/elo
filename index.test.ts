import elo from "./index";

describe("immutability", () => {
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

    expect(fooWithElo.elo).toBeCloseTo(1516);
    expect(fooWithElo.lastDelta).toBeCloseTo(16);
    expect(fooWithElo.lastPlayedAt).toBeDefined();
    expect(fooWithElo.matchCount).toBe(1);

    expect(barWithElo.elo).toBeCloseTo(1484);
    expect(barWithElo.lastDelta).toBeCloseTo(-16);
    expect(barWithElo.lastPlayedAt).toBeDefined();
    expect(barWithElo.matchCount).toBe(1);

    expect(fooWithElo.lastPlayedAt).toBe(barWithElo.lastPlayedAt);
  });
  test("loses", () => {
    const [fooWithElo, barWithElo] = player(foo).loses(bar);

    expect(fooWithElo.elo).toBeCloseTo(1484);
    expect(fooWithElo.lastDelta).toBeCloseTo(-16);
    expect(fooWithElo.lastPlayedAt).toBeDefined();
    expect(fooWithElo.matchCount).toBe(1);

    expect(barWithElo.elo).toBeCloseTo(1516);
    expect(barWithElo.lastDelta).toBeCloseTo(16);
    expect(barWithElo.lastPlayedAt).toBeDefined();
    expect(barWithElo.matchCount).toBe(1);

    expect(fooWithElo.lastPlayedAt).toBe(barWithElo.lastPlayedAt);
  });
  test("ties", () => {
    const [fooWithElo, barWithElo] = player(foo).ties(bar);

    expect(fooWithElo.elo).toBeCloseTo(1500);
    expect(fooWithElo.lastDelta).toBeCloseTo(0);
    expect(fooWithElo.lastPlayedAt).toBeDefined();
    expect(fooWithElo.matchCount).toBe(1);

    expect(barWithElo.elo).toBeCloseTo(1500);
    expect(barWithElo.lastDelta).toBeCloseTo(0);
    expect(barWithElo.lastPlayedAt).toBeDefined();
    expect(barWithElo.matchCount).toBe(1);

    expect(fooWithElo.lastPlayedAt).toBe(barWithElo.lastPlayedAt);
  });
  test("oddsAgainst", () => {
    const odds = player(foo).oddsAgainst(bar);

    expect(odds).toBeCloseTo(0.5);
  });
  test("reset", () => {
    const [fooWithElo /*, barWithElo*/] = player(foo).wins(bar);
    const fooAfterReset = player(fooWithElo).reset();

    expect(fooAfterReset.elo).toBeUndefined();
    expect(fooAfterReset.lastDelta).toBeUndefined();
    expect(fooAfterReset.lastPlayedAt).toBeUndefined();
    expect(fooAfterReset.matchCount).toBeUndefined();
  });
});
