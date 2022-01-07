interface Elo {
  elo: number;
  lastDelta: number;
  lastPlayedAt: number;
  matchCount: number;
}

interface EloMeta {
  k: number;
  didWin: number;
  p: number;
}

type EloFieldNames = {
  [Property in keyof Elo]: string;
};

interface EloConfig {
  DMax: number;
  fieldNames: EloFieldNames;
  initialElo: number;
  kGenerator: (eloObject: any) => number;
}

const defaultConfig: EloConfig = {
  DMax: 400,
  fieldNames: {
    elo: "elo",
    matchCount: "matchCount",
    lastPlayedAt: "lastPlayedAt",
    lastDelta: "lastDelta",
  },
  initialElo: 1500,
  kGenerator: ({ matchCount }) => {
    if (matchCount < 30) {
      return 32;
    }

    return 24;
  },
};

const elo = (config: Partial<EloConfig> = {}) => {
  const { initialElo, DMax, kGenerator } = {
    ...defaultConfig,
    ...config,
  };

  const fieldNames = {
    ...defaultConfig.fieldNames,
    ...config.fieldNames,
  };

  const defaultElo = {
    [fieldNames.elo]: initialElo,
    [fieldNames.lastDelta]: NaN,
    [fieldNames.lastPlayedAt]: NaN,
    [fieldNames.matchCount]: 0,
  };

  type EloObject = object & typeof defaultElo;

  return (a: object) => {
    const eloA = {
      ...defaultElo,
      ...a,
    };

    const oddsAgainst = (b: object) => {
      const eloB = {
        ...defaultElo,
        ...b,
      };
      const clamp = (value: number) => ({
        between: (lower: number, upper: number) =>
          Math.max(Math.min(value, upper), lower),
      });

      const D = clamp(eloA[fieldNames.elo] - eloB[fieldNames.elo]).between(
        -DMax,
        DMax
      );

      return 1 / (1 + 10 ** (-D / DMax));
    };

    const resolveMatch = (didAWin: number) => (b: object) => {
      const eloB = {
        ...defaultElo,
        ...b,
      };

      const metaA: EloMeta = {
        k: kGenerator(eloA),
        didWin: didAWin,
        p: oddsAgainst(eloB),
      };

      const metaB: EloMeta = {
        k: kGenerator(eloB),
        didWin: 1 - didAWin,
        p: 1 - metaA.p,
      };

      const update = (
        {
          [fieldNames.elo]: oldElo,
          [fieldNames.matchCount]: matchCount,
          ...rest
        },
        { k, didWin, p }: EloMeta,
        playedAt: number
      ) => {
        const newElo = oldElo + k * (didWin - p);

        return {
          ...rest,
          [fieldNames.elo]: newElo,
          [fieldNames.matchCount]: matchCount + 1,
          [fieldNames.lastDelta]: newElo - oldElo,
          [fieldNames.lastPlayedAt]: playedAt,
        };
      };

      const playedAt = Date.now();

      return [update(eloA, metaA, playedAt), update(eloB, metaB, playedAt)];
    };

    const reset = () => {
      [
        fieldNames.elo,
        fieldNames.matchCount,
        fieldNames.lastDelta,
        fieldNames.lastPlayedAt,
      ].forEach((fieldName) => {
        delete eloA[fieldName];
      });

      return eloA;
    };

    return {
      wins: resolveMatch(1),
      ties: resolveMatch(0.5),
      loses: resolveMatch(0),
      oddsAgainst,
      reset,
    };
  };
};

export default elo;
