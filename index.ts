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

const makePoolFactory =
  (config: Readonly<Partial<EloConfig>>) =>
  <T extends object>(iterable: T): T & { player: Function } =>
    new Proxy(iterable, new PoolHandler<T>(config)) as T & { player: Function };

export const Pool = {
  config: function (config: Readonly<Partial<EloConfig>>) {
    return {
      from: makePoolFactory(config),
    };
  },
  from: makePoolFactory({}),
};

export default elo;
