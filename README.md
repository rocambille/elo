# Elo

![npm (scoped)](https://img.shields.io/npm/v/@rocambille/elo)
![npm bundle size (scoped)](https://img.shields.io/bundlephobia/minzip/@rocambille/elo)

Enrich your objects with [Elo rating](https://en.wikipedia.org/wiki/Elo_rating_system).

## Basic usage

```js
import elo from "@rocambille/elo";

const player = elo();

let foo = { a: 42 };
let bar = { z: 43 };

const odds = player(foo).oddsAgainst(bar);

console.log(`foo has a ${odds * 100}% chance of winning against bar`);

[foo, bar] = player(foo).wins(bar);
// or [foo, bar] = player(foo).loses(bar);
// or [foo, bar] = player(foo).ties(bar);

console.log(foo, bar);
```

Should print something like this:

```bash
foo has a 50% chance of winning against bar
{
  a: 42,
  elo: 1516,
  matchCount: 1,
  lastDelta: 16,
  lastPlayedAt: 1629554837908
} {
  z: 43,
  elo: 1484,
  matchCount: 1,
  lastDelta: -16,
  lastPlayedAt: 1629554837908
}
```

Note that the elo module keeps `foo.a` and `bar.z` untouched.
It enriches the objects with Elo stuff (rating, match count, last delta and last play timestamp).
This is useful if you want to add elo rating on existing data, e.g. coming from an API.

## Advanced usage

You can manage a whole collection using the `elo.Pool` factory as follows:

```js
import elo from "@rocambille/elo";

let pool = elo.Pool([{ a: 42 }, { z: 43 }, { x: 44 }]);

const odds = pool.player(0).oddsAgainst(1);

console.log(`player 0 has a ${odds * 100}% chance of winning against player 1`);

pool = pool.player(0).wins(1);
// or pool = pool.player(0).loses(1);
// or pool = pool.player(0).ties(1);

console.log(pool);
```

Should print something like this:

```bash
player 0 has a 50% chance of winning against player 1
[
  {
    a: 42,
    elo: 1516,
    matchCount: 1,
    lastDelta: 16,
    lastPlayedAt: 1629554837908
  },
  {
    z: 43,
    elo: 1484,
    matchCount: 1,
    lastDelta: -16,
    lastPlayedAt: 1629554837908
  },
  {
    x: 44,
    elo: 1500,
    matchCount: 0,
    lastDelta: NaN,
    lastPlayedAt: NaN
  }
]
```

You can pass a configuration object as parameter to the `elo` function, or as second parameter to the `elo.Pool` factory.
Here is an example with the default values:

```js
const player = elo({
  initialElo: 1500,
  DMax: 400,
  kGenerator: (player) => {
    if (player.matchCount < 30) {
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
});
```

The module will use `initialElo` for players with an _undefined_ rating.
See details of [Elo rating system](https://en.wikipedia.org/wiki/Elo_rating_system) for the `DMax` and `k` factors.

## License

elo is open source software [licensed as MIT](https://github.com/rocambille/elo/blob/main/LICENSE).
