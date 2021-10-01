const defaultConfig = {
  initialElo: 1500,
  DMax: 400,
  kGenerator: ({ matchCount }) => {
    if (matchCount < 30) {
      return 32;
    }

    return 24;
  },
  fieldNames: {
    elo: "elo",
    matchCount: "matchCount",
    lastPlayedAt: "lastPlayedAt",
    lastDelta: "lastDelta",
  },
};

const elo =
  (config = {}) =>
  ({ ...a }) => {
    const { initialElo, DMax, kGenerator, fieldNames } = {
      ...defaultConfig,
      ...config,
    };

    a.elo = a[fieldNames.elo] ?? initialElo;

    const oddsAgainst = ({ [fieldNames.elo]: eloB = initialElo }) => {
      const clamp = (value) => ({
        between: (lower, upper) => Math.max(Math.min(value, upper), lower),
      });

      const D = clamp(a.elo - eloB).between(-DMax, DMax);

      return 1 / (1 + 10 ** (-D / DMax));
    };

    const resolveMatch =
      (didAWin) =>
      ({ ...b }) => {
        a.matchCount = a[fieldNames.matchCount] ?? 0;
        a.k = kGenerator(a);
        a.didWin = didAWin;
        a.p = oddsAgainst(b);

        b.elo = b[fieldNames.elo] ?? initialElo;
        b.matchCount = b[fieldNames.matchCount] ?? 0;
        b.k = kGenerator(b);
        b.didWin = 1 - a.didWin;
        b.p = 1 - a.p;

        const update = ({ elo: oldElo, matchCount, k, didWin, p, ...rest }) => {
          const newElo = oldElo + k * (didWin - p);
          return {
            ...rest,
            [fieldNames.elo]: newElo,
            [fieldNames.matchCount]: matchCount + 1,
            [fieldNames.lastDelta]: newElo - oldElo,
            [fieldNames.lastPlayedAt]: Date.now(),
          };
        };

        return [update(a), update(b)];
      };

    return {
      wins: resolveMatch(1),
      ties: resolveMatch(0.5),
      loses: resolveMatch(0),
      oddsAgainst,
    };
  };

export default elo;
