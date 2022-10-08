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
  elo: {
    rating: 1516,
    matchCount: 1,
    lastDelta: 16,
    lastPlayedAt: 1629554837908
  }
} {
  z: 43,
  elo: {
    rating: 1484,
    matchCount: 1,
    lastDelta: -16,
    lastPlayedAt: 1629554837908
  }
}
```

Note that the elo module keeps `foo.a` and `bar.z` untouched.
It enriches the objects with Elo stuff (rating, match count, last delta and last play timestamp).
This is useful if you want to add elo rating on top of existing data, e.g. coming from an API.

## The Pool object

You can manage a whole collection using the `Pool` object as follows:

```js
import { Pool } from "@rocambille/elo";

let pool = Pool.from([{ a: 42 }, { z: 43 }, { x: 44 }]);

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
    elo: {
      rating: 1516,
      matchCount: 1,
      lastDelta: 16,
      lastPlayedAt: 1629554837908
    }
  },
  {
    z: 43,
    elo: {
      rating: 1484,
      matchCount: 1,
      lastDelta: -16,
      lastPlayedAt: 1629554837908
    }
  },
  {
    x: 44,
    elo: {
      rating: 1500,
      matchCount: 0,
      lastDelta: NaN,
      lastPlayedAt: NaN
    }
  }
]
```

The `Pool` provides a useful method to `pick` player indices using multiple options:

```js
import { Pool } from "@rocambille/elo";

let pool = Pool.from([{ a: 42 }, { z: 43 }, { x: 44 }]);

// use one of the following lines to pick players

const [i, j] = Pool.pick("random"); // randomly pick
const [i, j] = Pool.pick("matchCount"); // pick players with a low match count
const [i, j] = Pool.pick("lastPlayedAt"); // pick players who have last played in the longest time
const [i, j] = Pool.pick(); // pick players by randomly choosing one the above method (recommended)

// then you can use i and j to trigger a match

pool = pool.player(i).wins(j);
```

## Configuration

You can pass a configuration object as parameter to the `elo` function.
Here is an example with the default values:

```js
import elo from "elo";

const player = elo({
  initialRating: 1500,
  DMax: 400,
  kGenerator: (eloData) => {
    if (eloData.matchCount < 30) {
      return 32;
    }

    return 24;
  },
  propsKey: "elo",
});
```

Same works with the `Pool` object, using the `Pool.config` method:

```js
import { Pool } from "elo";

const pool = Pool.config({
  initialRating: 1500,
  DMax: 400,
  kGenerator: (eloData) => {
    if (eloData.matchCount < 30) {
      return 32;
    }

    return 24;
  },
  propsKey: "elo",
}).from(...);
```

The module will use `initialRating` for players with an _undefined_ rating.
See details of [Elo rating system](https://en.wikipedia.org/wiki/Elo_rating_system) for the `DMax` and `k` factors.

## License

elo is open source software [licensed as MIT](https://github.com/rocambille/elo/blob/main/LICENSE).
