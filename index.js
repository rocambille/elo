const defaultConfig = {
  initialElo: 1500,
  DMax: 400,
  kGenerator: ({ matchCount }) => {
    if (matchCount < 30) {
      return 32;
    }

    return 24;
  },
};

const elo =
  (config = {}) =>
  ({ ...a }) => {
    const { initialElo, DMax, kGenerator } = { ...defaultConfig, ...config };

    a.elo = a.elo ?? initialElo;

    const oddsAgainst = ({ elo: eloB = initialElo }) => {
      const clamp = (value) => ({
        between: (lower, upper) => Math.max(Math.min(value, upper), lower),
      });

      const D = clamp(a.elo - eloB).between(-DMax, DMax);

      return 1 / (1 + 10 ** (-D / DMax));
    };

    const resolveMatch =
      (didAWin) =>
      ({ ...b }) => {
        a.matchCount = a.matchCount ?? 0;
        a.k = kGenerator(a);
        a.didWin = didAWin;
        a.p = oddsAgainst(b);

        b.elo = b.elo ?? initialElo;
        b.matchCount = b.matchCount ?? 0;
        b.k = kGenerator(b);
        b.didWin = 1 - a.didWin;
        b.p = 1 - a.p;

        const update = ({ elo: oldElo, matchCount, k, didWin, p, ...rest }) => {
          const newElo = oldElo + k * (didWin - p);
          return {
            ...rest,
            elo: newElo,
            matchCount: matchCount + 1,
            lastDelta: newElo - oldElo,
            lastPlayedAt: Date.now(),
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
