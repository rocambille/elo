interface Elo {
  rating: number;
  lastDelta: number;
  lastPlayedAt: number;
  matchCount: number;
}

interface EloConfig {
  DMax: number;
  initialRating: number;
  kGenerator: (eloObject: Elo) => number;
  propsKey: string;
}

const defaultConfig: Readonly<EloConfig> = {
  DMax: 400,
  initialRating: 1500,
  kGenerator: ({ matchCount }) => {
    if (matchCount < 30) {
      return 32;
    }

    return 24;
  },
  propsKey: "elo",
};

const elo = (config: Readonly<Partial<EloConfig>> = {}) => {
  const { DMax, initialRating, kGenerator, propsKey } = {
    ...defaultConfig,
    ...config,
  };

  const defaultElo: Elo = {
    rating: initialRating,
    lastDelta: NaN,
    lastPlayedAt: NaN,
    matchCount: 0,
  };

  return <A extends Object>(a: A) => {
    const eloA: Elo = (a[propsKey as keyof A] as Elo) ?? { ...defaultElo };

    const oddsAgainst = <B extends Object>(b: B) => {
      const eloB: Elo = (b[propsKey as keyof B] as Elo) ?? {
        ...defaultElo,
      };

      const clamp = (value: number) => ({
        between: (lower: number, upper: number) =>
          Math.max(Math.min(value, upper), lower),
      });

      const D = clamp(eloA.rating - eloB.rating).between(-DMax, DMax);

      return 1 / (1 + 10 ** (-D / DMax));
    };

    const resolveMatch =
      (didAWin: number) =>
      <B extends Object>(b: B) => {
        const eloB: Elo = (b[propsKey as keyof B] as Elo) ?? {
          ...defaultElo,
        };

        interface EloMeta {
          k: number;
          didWin: number;
          p: number;
        }

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
          { rating: oldRating, matchCount }: Elo,
          { k, didWin, p }: Readonly<EloMeta>,
          playedAt: number
        ) => {
          const newRating = oldRating + k * (didWin - p);

          return {
            rating: newRating,
            matchCount: matchCount + 1,
            lastDelta: newRating - oldRating,
            lastPlayedAt: playedAt,
          };
        };

        const playedAt = Date.now();

        return [
          { ...a, [propsKey]: update(eloA, metaA, playedAt) },
          { ...b, [propsKey]: update(eloB, metaB, playedAt) },
        ];
      };

    const reset = () => {
      delete a[propsKey as keyof A];

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
};

class PoolHandler<T extends Object> {
  config: EloConfig;
  player: ReturnType<typeof elo>;

  constructor(config: Readonly<Partial<EloConfig>>) {
    this.config = { ...defaultConfig, ...config };
    this.player = elo(config);
  }

  get(target: T, prop: string | symbol, receiver: any) {
    switch (prop) {
      case "player":
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
      case "pick":
        return (forcedMethod: string) => {
          const methods = ["random", "matchCount", "lastPlayedAt"];

          const pickRandom = (min: number, max: number) =>
            min + Math.floor(Math.random() * (max - min + 1));

          const method =
            forcedMethod ?? methods[pickRandom(0, methods.length - 1)];

          if (receiver.length === 1) {
            throw new Error("not enough players");
          }
          if (receiver.length === 2) {
            return [0, 1, method];
          }

          switch (method) {
            case "random": {
              const i = pickRandom(0, receiver.length - 1);
              const j =
                (i + pickRandom(1, receiver.length - 1)) % receiver.length;

              return [i, j, method];
            }
            default: {
              const defaultElo: Elo = {
                rating: NaN,
                lastDelta: NaN,
                lastPlayedAt: NaN,
                matchCount: 0,
              };

              const fromProp = (key: keyof Elo) =>
                receiver.reduce(
                  (
                    [first, second, third]: Array<any>,
                    challenger: typeof receiver[0],
                    index: number
                  ) => {
                    const challengerStat =
                      challenger[this.config.propsKey] != null
                        ? challenger[this.config.propsKey][key] ??
                          defaultElo[key]
                        : defaultElo[key];

                    if (challengerStat < first[key]) {
                      return [{ index, [key]: challengerStat }, first, second];
                    }
                    if (challengerStat < second[key]) {
                      return [first, { index, [key]: challengerStat }, second];
                    }
                    if (challengerStat < third[key]) {
                      return [first, second, { index, [key]: challengerStat }];
                    }

                    return [first, second, third];
                  },
                  [
                    { [key]: Infinity },
                    { [key]: Infinity },
                    { [key]: Infinity },
                  ]
                );

              const [{ index: i }, , { index: j }] = fromProp(method as keyof Elo);

              return [i, j, method];
            }
          }
        };
      default:
        return Reflect.get(target, prop, receiver);
    }
  }
}

interface PoolProps {
  player: Function;
  pick: Function;
}

const makePoolFactory =
  (config: Readonly<Partial<EloConfig>>) =>
  <T extends object>(iterable: T): T & PoolProps =>
    new Proxy(iterable, new PoolHandler<T>(config)) as T & PoolProps;

export const Pool = {
  config: function (config: Readonly<Partial<EloConfig>>) {
    return {
      from: makePoolFactory(config),
    };
  },
  from: makePoolFactory({}),
};

export default elo;
