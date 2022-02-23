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

const defaultConfig: Readonly<EloConfig> = {
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

const elo = (config: Readonly<Partial<EloConfig>> = {}) => {
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

      const metaA: Readonly<EloMeta> = {
        k: kGenerator(eloA),
        didWin: didAWin,
        p: oddsAgainst(eloB),
      };

      const metaB: Readonly<EloMeta> = {
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
        { k, didWin, p }: Readonly<EloMeta>,
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

class PoolHandler<T extends object> {
  player: ReturnType<typeof elo>;

  constructor(config: Readonly<Partial<EloConfig>>) {
    this.player = elo(config);
  }

  get(target: T, prop: string | symbol, receiver: any) {
    if (prop === "player") {
      return (indexA: keyof T) => {
        const playerA = this.player(target[indexA] as Object);

        const resolveMatch = (
          indexB: keyof T,
          resolver: keyof Omit<typeof playerA, "oddsAgainst" | "reset">
        ) => {
          const [newA, newB] = playerA[resolver](target[indexB] as Object);
          target[indexA] = newA as unknown as T[keyof T];
          target[indexB] = newB as unknown as T[keyof T];

          return receiver;
        };

        return {
          wins: (indexB: keyof T) => resolveMatch(indexB, "wins"),
          ties: (indexB: keyof T) => resolveMatch(indexB, "ties"),
          loses: (indexB: keyof T) => resolveMatch(indexB, "loses"),
          oddsAgainst: (indexB: keyof T): number => {
            return playerA.oddsAgainst(target[indexB] as Object);
          },
          reset: () => {
            target[indexA] = playerA.reset() as unknown as T[keyof T];

            return receiver;
          },
        };
      };
    }

    return Reflect.get(target, prop, receiver);
  }
}

elo.Pool = <T extends object>(
  iterable: T,
  config: Readonly<Partial<EloConfig>> = {}
): T & { player: Function } =>
  new Proxy(iterable, new PoolHandler<T>(config)) as T & { player: Function };

export default elo;
