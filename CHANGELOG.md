# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Added a `digits` option for the rating. This is to be used with [Number.toFixed](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/toFixed).

[Open an issue](https://github.com/rocambille/elo/issues/new) if you have any request/feedback :)

## [2.1.4] - 2022-10-31

### Fixed

- Fixed a bug in `Pool.pick` method when performing on an empty pool:
  the method didn't throw an error. The bug was introduced in v2.1.0.

- Fixed a bug in `Pool.pick` method when randomly performing on a size-2 pool:
  now the method always returns `[0, 1]` in this order. The bug was introduced in v2.1.3.

## [2.1.3] - 2022-10-30

### Fixed

- Fixed a bug in `Pool.pick` method when using `lastPlayedAt`:
  the method returned undefined indexes if every item had undefined `lastPlayedAt` value.
  The bug was introduced in v2.1.0.

## [2.1.2] - 2022-10-29

### Added

- Added tests using a 10 rounds scenario.

### Changed

- Refactored internal implementation of Pool.

## [2.1.1] - 2022-10-15

### Fixed

- Fixed a bug in meta calculation during a match, which impacted the delta amount. The bug was introduced in v1.2.

## [2.1.0] - 2022-10-08

### Added

- Added `Pool.pick` method to pick player indexes using various algorithms (random, new comers...).

## [2.0.0] - 2022-10-03

### Added

- Added [`CHANGELOG.md`](https://github.com/rocambille/elo/blob/main/CHANGELOG.md).

### Changed

- **Breaking change:** elo properties are stored in a subobject.

From:

```json
{
  "foo": 42,
  "elo": 1516,
  "matchCount": 1,
  "lastDelta": 16,
  "lastPlayedAt": 1629554837908
}
```

To:

```json
{
  "foo": 42,
  "elo": {
    "rating": 1516,
    "matchCount": 1,
    "lastDelta": 16,
    "lastPlayedAt": 1629554837908
  }
}
```

- **Breaking change:** changed config options:
  - Removed `fieldNames` object for a property `propsKey` representing the key of the elo properties subobject.
  - Renamed `initialElo` as `initialRating`.

From:

```js
const partialConfig = {
  initialElo: 1500,
  fieldNames: {
    elo: "myElo",
    matchCount: "myMatchCount",
    lastPlayedAt: "myLastPlayedAt",
    lastDelta: "myLastDelta",
  },
};

/*
sample object:
{
  "foo": 42,
  "myElo": 1500,
  "myMatchCount": 0,
  "myLastDelta": NaN,
  "myLastPlayedAt": NaN
}
*/
```

To:

```js
const partialConfig = {
  initialRating: 1500,
  propsKey: "myElo",
};

/*
sample object:
{
  "foo": 42,
  "myElo": {
    "rating": 1500,
    "matchCount": 0,
    "lastDelta": NaN,
    "lastPlayedAt": NaN
  }
}
*/
```

- **Breaking change:** changed `elo.Pool` syntax.

From:

```js
import elo from "@rocambille/elo";

// with default options

let pool = elo.Pool([{ a: 42 }, { z: 43 }, { x: 44 }]);

// with custom options

const options = {
  /* ... */
};

let pool = elo.Pool([{ a: 42 }, { z: 43 }, { x: 44 }], options);
```

To:

```js
import { Pool } from "@rocambille/elo";

// with default options

let pool = Pool.from([{ a: 42 }, { z: 43 }, { x: 44 }]);

// with custom options

const options = {
  /* ... */
};

let pool = Pool.config(options).from([{ a: 42 }, { z: 43 }, { x: 44 }]);
```
