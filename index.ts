interface EloProps {
  rating: number;
  lastDelta: number;
  lastPlayedAt: number;
  matchCount: number;
}

interface EloConfig {
  DMax: number;
  initialRating: number;
  kGenerator: (eloProps: EloProps) => number;
  propsKey: string;
}

type Eloable = {[x: string]: any};

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

const complete = (config: Readonly<Partial<EloConfig>>): EloConfig => ({
  ...defaultConfig,
  ...config,
});

const makeProps = (initialRating: number): EloProps => ({
  rating: initialRating,
  lastDelta: NaN,
  lastPlayedAt: NaN,
  matchCount: 0,
});

const elo = (partialConfig: Readonly<Partial<EloConfig>> = {}) => {
  const { DMax, initialRating, kGenerator, propsKey } = complete(partialConfig);

  const dummy = { [propsKey]: makeProps(initialRating) };

  return (a: Eloable) => {
    const eloA = a[propsKey] as EloProps ?? dummy[propsKey];

    const oddsAgainst = (b: Eloable) => {
      const eloB = b[propsKey] as EloProps ?? dummy[propsKey];

      const clamp = (value: number) => ({
        between: (lower: number, upper: number) =>
          Math.max(Math.min(value, upper), lower),
      });

      const D = clamp(eloA.rating - eloB.rating).between(-DMax, DMax);

      return 1 / (1 + 10 ** (-D / DMax));
    };

    const resolveMatch =
      (didAWin: number) =>
      (b: Eloable) => {
        const eloB = b[propsKey] as EloProps ?? dummy[propsKey];

        interface EloMeta {
          k: number;
          didWin: number;
          p: number;
        }

        const metaA = {
          k: kGenerator(eloA),
          didWin: didAWin,
          p: oddsAgainst(b),
        };

        const metaB = {
          k: kGenerator(eloB),
          didWin: 1 - didAWin,
          p: 1 - metaA.p,
        };

        const from = (
          { rating: oldRating, matchCount }: Readonly<EloProps>,
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
      const { [propsKey]: elo, ...cleanedA } = a;

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

export class Pool {
  static #config = defaultConfig;

  static config(config: Readonly<Partial<EloConfig>>) {
    Pool.#config = complete(config);

    return Pool;
  }

  static from(iterable: Eloable[]) {
    const eloIterable = iterable as Eloable[] & {
      player: Function;
      pick: Function;
    };

    const { initialRating, propsKey } = complete(this.#config);

    const player = elo(this.#config);

    const dummy = { [propsKey]: makeProps(initialRating) };

    eloIterable.player = (indexA: number) => {
      const playerA = player(iterable[indexA]);

      const resolveMatch = (
        indexB: number,
        resolver: "wins" | "ties" | "loses"
      ) => {
        const [newA, newB] = playerA[resolver](iterable[indexB]);
        iterable[indexA] = newA;
        iterable[indexB] = newB;

        return iterable;
      };

      return {
        wins: (indexB: number) => resolveMatch(indexB, "wins"),
        ties: (indexB: number) => resolveMatch(indexB, "ties"),
        loses: (indexB: number) => resolveMatch(indexB, "loses"),
        oddsAgainst: (indexB: number): number => {
          return playerA.oddsAgainst(iterable[indexB]);
        },
        reset: () => {
          iterable[indexA] = playerA.reset();

          return iterable;
        },
      };
    };

    eloIterable.pick = (forcedMethod: string) => {
      const length = [...iterable].length;

      if (length <= 1) {
        throw new Error("not enough players");
      }

      enum Method {
        Random = "random", MatchCount = "matchCount", LastPlayedAt = "lastPlayedAt"
      }

      const randomMethod = () => {
        const keys = Object.keys(Method);

        return keys[Math.floor(Math.random() * keys.length)];
      }

      const method = forcedMethod ?? randomMethod();

      if (length === 2) {
        return [0, 1, method]; // should be handled explicitly because of random option
      }

      switch (method) {
        case Method.Random: {
          const pickRandom = (min: number, max: number) =>
            min + Math.floor(Math.random() * (max - min + 1));

          const i = pickRandom(0, length - 1);
          const j = (i + pickRandom(1, length - 1)) % length;

          return [i, j, method];
        }
        default: {
          const fromProp = (key: keyof EloProps) =>
            iterable.reduce(
              (
                [first, second, third]: Array<any>,
                challenger: Eloable,
                index: number
              ) => {
                const challengerStats =
                  challenger[propsKey] as EloProps ?? dummy[propsKey];

                if (challengerStats[key] < first[key]) {
                  return [{ index, ...challengerStats }, first, second];
                }
                if (challengerStats[key] < second[key]) {
                  return [first, { index, ...challengerStats }, second];
                }
                if (challengerStats[key] < third[key]) {
                  return [first, second, { index, ...challengerStats }];
                }

                return [first, second, third];
              },
              [{ [key]: Infinity }, { [key]: Infinity }, { [key]: Infinity }]
            );

          let [a, b, c] = fromProp(method as keyof EloProps);

          if (method === "matchCount" && a.lastPlayedAt === c.lastPlayedAt) {
            [c, b] = [b, c];
          }
          return [a.index ?? 0, c.index ?? 1, method]; // i and j may be undefined if all lastPlayedAt are NaN
        }
      }
    };

    return eloIterable;
  }
}

export default elo;
