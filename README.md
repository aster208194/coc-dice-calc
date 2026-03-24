# coc-dice-calc

クトゥルフ神話TRPG（CoC）6版向けのボーナスダイス・ペナルティダイス補正計算ライブラリです。

A TypeScript library that calculates corrected success probabilities for
Call of Cthulhu (CoC) 6th edition skill checks when bonus or penalty dice
are applied.

---

## Mechanics / ルールの概要

CoC 6版のスキルチェックはd100（1–100）を振り、結果がスキル値以下なら成功です。

**ボーナスダイス（Bonus Die）**  
追加の10の位ダイスを振り、**より低い（有利な）結果**を選択します。

**ペナルティダイス（Penalty Die）**  
追加の10の位ダイスを振り、**より高い（不利な）結果**を選択します。

**相殺（Cancellation）**  
ボーナスダイスとペナルティダイスは1対1で相殺されます。差分のみが適用されます。

---

## Installation

```sh
npm install
npm run build
```

## Testing

```sh
npm test
```

## Usage

```typescript
import { calculateCheck } from './src/diceCalc';

// スキル値50、ボーナスダイス1個の場合
const result = calculateCheck(50, 1, 0);
console.log(result.successRate);     // 0.75  (75%)
console.log(result.effectiveSkill);  // 75

// スキル値50、ペナルティダイス1個の場合
const result2 = calculateCheck(50, 0, 1);
console.log(result2.successRate);    // 0.25  (25%)
console.log(result2.effectiveSkill); // 25

// スキル値50、ボーナスダイス2個の場合
const result3 = calculateCheck(50, 2, 0);
console.log(result3.successRate);    // 0.875 (87.5%)
```

### `calculateCheck(skillValue, bonusDice?, penaltyDice?)`

| Parameter    | Type   | Description                            |
|-------------|--------|----------------------------------------|
| `skillValue` | number | Skill value 1–100                     |
| `bonusDice`  | number | Number of bonus dice (default: `0`)   |
| `penaltyDice`| number | Number of penalty dice (default: `0`) |

Returns a `CheckResult` object:

| Field                | Type   | Description                                                           |
|----------------------|--------|-----------------------------------------------------------------------|
| `skillValue`         | number | The base skill value                                                  |
| `bonusDice`          | number | Bonus dice count as passed                                            |
| `penaltyDice`        | number | Penalty dice count as passed                                          |
| `successRate`        | number | Probability of regular success (0–1)                                  |
| `specialSuccessRate` | number | Probability of special success (roll ≤ ⌊skill/5⌋) (0–1)             |
| `fumbleRate`         | number | Probability of fumble (0–1)                                           |
| `effectiveSkill`     | number | Equivalent flat skill value after correction (= `round(successRate × 100)`) |

### `getDiceResult(tens, units)`

Low-level helper that converts a tens die value (0–9) and a units die value
(0–9) into a d100 result (1–100).  The combination `tens = 0, units = 0`
returns `100` (not `0`), consistent with CoC dice conventions.

---

## Probability Reference / 確率表

| Skill | 2 Penalty | 1 Penalty | No modifier | 1 Bonus | 2 Bonus |
|------:|----------:|----------:|------------:|--------:|--------:|
|    20 |      0.8% |      4.0% |       20.0% |   36.0% |   48.8% |
|    30 |      2.7% |      9.0% |       30.0% |   51.0% |   65.7% |
|    40 |      6.4% |     16.0% |       40.0% |   64.0% |   78.4% |
|    50 |     12.5% |     25.0% |       50.0% |   75.0% |   87.5% |
|    60 |     21.6% |     36.0% |       60.0% |   84.0% |   93.6% |
|    70 |     34.3% |     49.0% |       70.0% |   91.0% |   97.3% |
|    80 |     51.2% |     64.0% |       80.0% |   96.0% |   99.2% |