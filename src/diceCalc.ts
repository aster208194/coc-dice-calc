/**
 * CoC (Call of Cthulhu) 6th Edition Dice Calculator
 *
 * Implements bonus dice and penalty dice correction calculation for
 * percentile (d100) skill checks.
 *
 * Mechanics:
 * - Standard check: roll d100, success if result ≤ skill value
 * - Bonus die:   roll an extra tens die; take the LOWER final result (favorable)
 * - Penalty die: roll an extra tens die; take the HIGHER final result (unfavorable)
 * - Multiple bonus/penalty dice cancel each other (only the net value matters)
 *
 * d100 construction:
 *   tens die  : 0–9 (represents 0, 10, 20, …, 90)
 *   units die : 0–9 (represents 0,  1,  2, …,  9)
 *   result    : tens * 10 + units; the combination 00 + 0 maps to 100 (not 0)
 */

/** Full result of a CoC 6th edition skill check calculation. */
export interface CheckResult {
  /** The base skill value used for the check (1–100). */
  skillValue: number;
  /** Number of bonus dice applied (0 or more). */
  bonusDice: number;
  /** Number of penalty dice applied (0 or more). */
  penaltyDice: number;
  /**
   * Probability of a regular success (roll ≤ skillValue) as a value in [0, 1].
   */
  successRate: number;
  /**
   * Probability of a special success (roll ≤ ⌊skillValue / 5⌋) as a value in [0, 1].
   */
  specialSuccessRate: number;
  /**
   * Probability of a fumble as a value in [0, 1].
   * Fumble threshold: roll ≥ 96 when skillValue ≤ 50; roll = 100 when skillValue > 50.
   */
  fumbleRate: number;
  /**
   * Equivalent flat skill value (integer, 0–100) that gives the same success
   * probability as the corrected roll.  This is Math.round(successRate * 100).
   */
  effectiveSkill: number;
}

/**
 * Convert a tens die and a units die into a d100 result (1–100).
 *
 * @param tens  - Tens die value (0–9).
 * @param units - Units die value (0–9).
 * @returns A value in the range [1, 100].  The combination tens = 0, units = 0
 *          yields 100 (representing "00" on the percentile die + "0" on the units die).
 */
export function getDiceResult(tens: number, units: number): number {
  const raw = tens * 10 + units;
  return raw === 0 ? 100 : raw;
}

/**
 * Calculate the probability of rolling ≤ threshold on a d100 with bonus or
 * penalty dice applied.
 *
 * Algorithm: enumerate all combinations of tens dice values (each 0–9) and
 * units die values (0–9), select the best/worst result according to the
 * bonus/penalty rule, then count the fraction of combinations that succeed.
 *
 * @param threshold      - Target value; success when result ≤ threshold (1–100).
 * @param extraDiceCount - Number of *extra* tens dice rolled (= number of bonus
 *                         or penalty dice).  0 means a plain d100.
 * @param isBonus        - true → take the LOWER result (bonus);
 *                         false → take the HIGHER result (penalty).
 * @returns Probability in [0, 1].
 */
function calcProbabilityForThreshold(
  threshold: number,
  extraDiceCount: number,
  isBonus: boolean,
): number {
  const totalTensDice = 1 + extraDiceCount;
  const tensCombinations = Math.pow(10, totalTensDice);
  const totalCombinations = tensCombinations * 10; // × 10 units die faces

  let successCount = 0;

  for (let u = 0; u <= 9; u++) {
    for (let tCombo = 0; tCombo < tensCombinations; tCombo++) {
      // Decode tCombo into individual tens die values.
      const tensValues: number[] = [];
      let remaining = tCombo;
      for (let i = 0; i < totalTensDice; i++) {
        tensValues.push(remaining % 10);
        remaining = Math.floor(remaining / 10);
      }

      // Compute d100 result for each tens die paired with the same units die.
      const results = tensValues.map((t) => getDiceResult(t, u));

      // Bonus: take the lowest result; penalty: take the highest result.
      const selected = isBonus
        ? Math.min(...results)
        : Math.max(...results);

      if (selected <= threshold) {
        successCount++;
      }
    }
  }

  return successCount / totalCombinations;
}

/**
 * Calculate success probabilities for a CoC 6th edition skill check with
 * optional bonus and/or penalty dice.
 *
 * Bonus and penalty dice cancel each other out one-for-one; only the net
 * difference is used (e.g. 2 bonus + 1 penalty = 1 net bonus die).
 *
 * @param skillValue  - Skill value in [1, 100].
 * @param bonusDice   - Number of bonus dice (0 or more, default 0).
 * @param penaltyDice - Number of penalty dice (0 or more, default 0).
 * @returns A {@link CheckResult} containing all probability values and the
 *          effective skill after correction.
 *
 * @throws {RangeError} If skillValue is not in [1, 100].
 * @throws {RangeError} If bonusDice or penaltyDice is negative.
 */
export function calculateCheck(
  skillValue: number,
  bonusDice = 0,
  penaltyDice = 0,
): CheckResult {
  if (!Number.isInteger(skillValue) || skillValue < 1 || skillValue > 100) {
    throw new RangeError('skillValue must be an integer between 1 and 100');
  }
  if (!Number.isInteger(bonusDice) || bonusDice < 0) {
    throw new RangeError('bonusDice must be a non-negative integer');
  }
  if (!Number.isInteger(penaltyDice) || penaltyDice < 0) {
    throw new RangeError('penaltyDice must be a non-negative integer');
  }

  // Bonus and penalty cancel: only the net direction and magnitude matter.
  const netDice = bonusDice - penaltyDice;
  const extraDiceCount = Math.abs(netDice);
  const isBonus = netDice > 0;

  // CoC 6th edition success thresholds.
  const specialThreshold = Math.floor(skillValue / 5);
  // Fumble: roll ≥ 96 for skill ≤ 50; roll = 100 for skill > 50.
  const fumbleThreshold = skillValue > 50 ? 100 : 96;

  /**
   * Helper: probability of rolling ≤ t with the current dice configuration.
   * Falls back to a simple division when there are no extra dice (no iteration needed).
   */
  const calcProb = (t: number): number => {
    if (t <= 0) return 0;
    if (t >= 100) return 1;
    if (extraDiceCount === 0) return t / 100;
    return calcProbabilityForThreshold(t, extraDiceCount, isBonus);
  };

  const successRate = calcProb(skillValue);
  const specialSuccessRate = calcProb(specialThreshold);
  // Fumble probability = P(result ≥ fumbleThreshold) = 1 - P(result ≤ fumbleThreshold - 1).
  const fumbleRate = 1 - calcProb(fumbleThreshold - 1);
  const effectiveSkill = Math.round(successRate * 100);

  return {
    skillValue,
    bonusDice,
    penaltyDice,
    successRate,
    specialSuccessRate,
    fumbleRate,
    effectiveSkill,
  };
}
