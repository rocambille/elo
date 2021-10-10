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
    const { initialElo, DMax, kGenerator } = {
      ...defaultConfig,
      ...config,
    };
    const fieldNames = {
      ...defaultConfig.fieldNames,
      ...config.fieldNames,
    };

    a[fieldNames.elo] = a[fieldNames.elo] ?? initialElo;

    const oddsAgainst = ({ [fieldNames.elo]: eloB = initialElo }) => {
      const clamp = (value) => ({
        between: (lower, upper) => Math.max(Math.min(value, upper), lower),
      });

      const D = clamp(a[fieldNames.elo] - eloB).between(-DMax, DMax);

      return 1 / (1 + 10 ** (-D / DMax));
    };

    const resolveMatch =
      (didAWin) =>
      ({ ...b }) => {
        a[fieldNames.matchCount] = a[fieldNames.matchCount] ?? 0;

        const metaA = {
          k: kGenerator(a),
          didWin: didAWin,
          p: oddsAgainst(b),
        };

        b[fieldNames.elo] = b[fieldNames.elo] ?? initialElo;
        b[fieldNames.matchCount] = b[fieldNames.matchCount] ?? 0;

        const metaB = {
          k: kGenerator(b),
          didWin: 1 - didAWin,
          p: 1 - metaA.p,
        };

        const update = (
          {
            [fieldNames.elo]: oldElo,
            [fieldNames.matchCount]: matchCount,
            ...rest
          },
          { k, didWin, p }
        ) => {
          const newElo = oldElo + k * (didWin - p);
          return {
            ...rest,
            [fieldNames.elo]: newElo,
            [fieldNames.matchCount]: matchCount + 1,
            [fieldNames.lastDelta]: newElo - oldElo,
            [fieldNames.lastPlayedAt]: Date.now(),
          };
        };

        return [update(a, metaA), update(b, metaB)];
      };

    const reset = () => {
      delete a[fieldNames.elo];
      delete a[fieldNames.matchCount];
      delete a[fieldNames.lastDelta];
      delete a[fieldNames.lastPlayedAt];

      return a;
    };

    return {
      wins: resolveMatch(1),
      ties: resolveMatch(0.5),
      loses: resolveMatch(0),
      oddsAgainst,
      reset,
    };
  };

export default elo;
