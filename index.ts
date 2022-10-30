interface Elo {
  rating: number;
  lastDelta: number;
  lastPlayedAt: number;
  matchCount: number;
}

interface EloObject {
  [x: string]: Elo;
}

interface EloConfig {
  DMax: number;
  initialRating: number;
  kGenerator: (eloData: Elo) => number;
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

const full = (config: Readonly<Partial<EloConfig>>): EloConfig => ({
  ...defaultConfig,
  ...config,
});

const defaultElo = (initialRating: number): Elo => ({
  rating: initialRating,
  lastDelta: NaN,
  lastPlayedAt: NaN,
  matchCount: 0,
});

const elo = (config: Readonly<Partial<EloConfig>> = {}) => {
  const { DMax, initialRating, kGenerator, propsKey } = full(config);

  const dummy = { [propsKey]: defaultElo(initialRating) };

  return <A extends Readonly<EloObject | Object>>(a: A) => {
    const eloA: Elo = (a as EloObject)[propsKey] ?? dummy[propsKey];

    const oddsAgainst = <B extends EloObject | Object>(b: B) => {
      const eloB: Elo = (b as EloObject)[propsKey] ?? dummy[propsKey];

      const clamp = (value: number) => ({
        between: (lower: number, upper: number) =>
          Math.max(Math.min(value, upper), lower),
      });

      const D = clamp(eloA.rating - eloB.rating).between(-DMax, DMax);

      return 1 / (1 + 10 ** (-D / DMax));
    };

    const resolveMatch =
      (didAWin: number) =>
      <B extends Readonly<EloObject | Object>>(b: B) => {
        const eloB: Elo = (b as EloObject)[propsKey] ?? dummy[propsKey];

        interface EloMeta {
          k: number;
          didWin: number;
          p: number;
        }

        const metaA: Readonly<EloMeta> = {
          k: kGenerator(eloA),
          didWin: didAWin,
          p: oddsAgainst(b),
        };

        const metaB: Readonly<EloMeta> = {
          k: kGenerator(eloB),
          didWin: 1 - didAWin,
          p: 1 - metaA.p,
        };

        const from = (
          { rating: oldRating, matchCount }: Readonly<Elo>,
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
          { ...a, [propsKey]: from(eloA, metaA, playedAt) },
          { ...b, [propsKey]: from(eloB, metaB, playedAt) },
        ];
      };

    const reset = () => {
      const { [propsKey as keyof Object]: elo, ...cleanedA } = a;

      return cleanedA;
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

interface EloArray<T> extends Array<T> {
  player?: Function;
  pick?: Function;
}

export class Pool {
  static #config: Readonly<Partial<EloConfig>> = defaultConfig;

  static config(config: Readonly<Partial<EloConfig>>) {
    Pool.#config = config;

    return Pool;
  }

  static from<T extends EloObject | Object>(
    iterable: EloArray<T>
  ): Required<EloArray<T>> {
    const { initialRating, propsKey } = full(this.#config);

    const player = elo(this.#config);

    const dummy = { [propsKey]: defaultElo(initialRating) };

    iterable.player = (indexA: keyof EloArray<T>) => {
      const playerA = player(iterable[indexA] as EloObject);

      const resolveMatch = (
        indexB: keyof EloArray<T>,
        resolver: keyof Omit<typeof playerA, "oddsAgainst" | "reset">
      ) => {
        const [newA, newB] = playerA[resolver](iterable[indexB] as EloObject);
        (iterable[indexA] as EloObject) = newA;
        (iterable[indexB] as EloObject) = newB;

        return iterable;
      };

      return {
        wins: (indexB: keyof EloArray<T>) => resolveMatch(indexB, "wins"),
        ties: (indexB: keyof EloArray<T>) => resolveMatch(indexB, "ties"),
        loses: (indexB: keyof EloArray<T>) => resolveMatch(indexB, "loses"),
        oddsAgainst: (indexB: keyof EloArray<T>): number => {
          return playerA.oddsAgainst(iterable[indexB] as EloObject);
        },
        reset: () => {
          (iterable[indexA as keyof EloArray<T>] as EloObject) =
            playerA.reset();

          return iterable;
        },
      };
    };

    iterable.pick = (forcedMethod: string) => {
      const methods = ["random", "matchCount", "lastPlayedAt"];

      const pickRandom = (min: number, max: number) =>
        min + Math.floor(Math.random() * (max - min + 1));

      const method = forcedMethod ?? methods[pickRandom(0, methods.length - 1)];

      if (iterable.length === 1) {
        throw new Error("not enough players");
      }

      switch (method) {
        case "random": {
          const i = pickRandom(0, iterable.length - 1);
          const j = (i + pickRandom(1, iterable.length - 1)) % iterable.length;

          return [i, j, method];
        }
        default: {
          const fromProp = (key: keyof Elo) =>
            iterable.reduce(
              (
                [first, second, third]: Array<any>,
                challenger: EloObject | Object,
                index: number
              ) => {
                const challengerStat = ((challenger as EloObject)[propsKey] ??
                  dummy[propsKey])[key];

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
              [{ [key]: Infinity }, { [key]: Infinity }, { [key]: Infinity }]
            );

          const [{ index: i }, , { index: j }] = fromProp(method as keyof Elo);

          return [i ?? 0, j ?? 1, method];
        }
      }
    };

    return iterable as Required<EloArray<T>>;
  }
}

export default elo;
