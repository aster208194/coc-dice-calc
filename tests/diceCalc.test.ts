import { calculateCheck, getDiceResult } from '../src/diceCalc';

// ---------------------------------------------------------------------------
// getDiceResult
// ---------------------------------------------------------------------------

describe('getDiceResult', () => {
  it('returns the correct value for a normal combination', () => {
    expect(getDiceResult(3, 7)).toBe(37);
    expect(getDiceResult(0, 5)).toBe(5);
    expect(getDiceResult(9, 9)).toBe(99);
    expect(getDiceResult(5, 0)).toBe(50);
  });

  it('maps tens=0, units=0 to 100 (not 0)', () => {
    expect(getDiceResult(0, 0)).toBe(100);
  });

  it('returns 1 for the lowest normal combination', () => {
    expect(getDiceResult(0, 1)).toBe(1);
  });

  it('returns 90 for tens=9, units=0', () => {
    expect(getDiceResult(9, 0)).toBe(90);
  });
});

// ---------------------------------------------------------------------------
// calculateCheck - input validation
// ---------------------------------------------------------------------------

describe('calculateCheck - validation', () => {
  it('throws RangeError for skillValue = 0', () => {
    expect(() => calculateCheck(0)).toThrow(RangeError);
  });

  it('throws RangeError for skillValue = 101', () => {
    expect(() => calculateCheck(101)).toThrow(RangeError);
  });

  it('throws RangeError for negative bonusDice', () => {
    expect(() => calculateCheck(50, -1, 0)).toThrow(RangeError);
  });

  it('throws RangeError for negative penaltyDice', () => {
    expect(() => calculateCheck(50, 0, -1)).toThrow(RangeError);
  });

  it('throws RangeError for non-integer skillValue', () => {
    expect(() => calculateCheck(50.5)).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// calculateCheck - plain d100 (no bonus/penalty dice)
// ---------------------------------------------------------------------------

describe('calculateCheck - no bonus/penalty dice', () => {
  it('returns exact skill/100 success rate for skill 50', () => {
    const result = calculateCheck(50);
    expect(result.successRate).toBeCloseTo(0.5, 10);
    expect(result.effectiveSkill).toBe(50);
  });

  it('returns 1% success rate for skill 1', () => {
    const result = calculateCheck(1);
    expect(result.successRate).toBeCloseTo(0.01, 10);
    expect(result.effectiveSkill).toBe(1);
  });

  it('returns 100% success rate for skill 100', () => {
    const result = calculateCheck(100);
    expect(result.successRate).toBeCloseTo(1.0, 10);
    expect(result.effectiveSkill).toBe(100);
  });

  it('returns correct special success rate for skill 50', () => {
    // specialThreshold = floor(50/5) = 10 → 10%
    const result = calculateCheck(50);
    expect(result.specialSuccessRate).toBeCloseTo(0.1, 10);
  });

  it('returns 0 special success rate for skill 4 (floor(4/5) = 0)', () => {
    const result = calculateCheck(4);
    expect(result.specialSuccessRate).toBe(0);
  });

  it('returns 5% fumble rate for skill 50 (fumble ≥ 96)', () => {
    const result = calculateCheck(50);
    expect(result.fumbleRate).toBeCloseTo(0.05, 10);
  });

  it('returns 1% fumble rate for skill 51 (fumble = 100 only)', () => {
    const result = calculateCheck(51);
    expect(result.fumbleRate).toBeCloseTo(0.01, 10);
  });

  it('passes through skillValue, bonusDice and penaltyDice unchanged', () => {
    const result = calculateCheck(70);
    expect(result.skillValue).toBe(70);
    expect(result.bonusDice).toBe(0);
    expect(result.penaltyDice).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// calculateCheck - bonus dice
// ---------------------------------------------------------------------------

describe('calculateCheck - bonus dice', () => {
  /**
   * For skill = 50, 1 bonus die:
   *   For each units digit u (0–9), roll two tens dice and take the LOWER result.
   *   For u ≠ 0: P(min_tens ≤ 4) = 1 − (5/10)² = 3/4
   *   For u = 0: P(at least one tens ∈ {1,...,5}) = 1 − (5/10)² = 3/4
   *   Overall: 3/4 = 75%
   */
  it('gives 75% success rate for skill 50 with 1 bonus die', () => {
    const result = calculateCheck(50, 1, 0);
    expect(result.successRate).toBeCloseTo(0.75, 10);
    expect(result.effectiveSkill).toBe(75);
  });

  /**
   * For skill = 50, 2 bonus dice (3 tens dice, take minimum):
   *   P(min_3_tens ≤ 4) = 1 − (5/10)³ = 7/8 = 87.5%
   */
  it('gives 87.5% success rate for skill 50 with 2 bonus dice', () => {
    const result = calculateCheck(50, 2, 0);
    expect(result.successRate).toBeCloseTo(0.875, 10);
    expect(result.effectiveSkill).toBe(88);
  });

  it('records bonusDice correctly', () => {
    const result = calculateCheck(50, 1);
    expect(result.bonusDice).toBe(1);
    expect(result.penaltyDice).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// calculateCheck - penalty dice
// ---------------------------------------------------------------------------

describe('calculateCheck - penalty dice', () => {
  /**
   * For skill = 50, 1 penalty die:
   *   For each units digit u (0–9), roll two tens dice and take the HIGHER result.
   *   For u ≠ 0: P(max_tens ≤ 4) = (5/10)² = 1/4
   *   For u = 0: P(all tens ∈ {1,...,5}) = (5/10)² = 1/4
   *   Overall: 1/4 = 25%
   */
  it('gives 25% success rate for skill 50 with 1 penalty die', () => {
    const result = calculateCheck(50, 0, 1);
    expect(result.successRate).toBeCloseTo(0.25, 10);
    expect(result.effectiveSkill).toBe(25);
  });

  /**
   * For skill = 50, 2 penalty dice (3 tens dice, take maximum):
   *   P(max_3_tens ≤ 4) = (5/10)³ = 1/8 = 12.5%
   */
  it('gives 12.5% success rate for skill 50 with 2 penalty dice', () => {
    const result = calculateCheck(50, 0, 2);
    expect(result.successRate).toBeCloseTo(0.125, 10);
    expect(result.effectiveSkill).toBe(13);
  });

  it('records penaltyDice correctly', () => {
    const result = calculateCheck(50, 0, 1);
    expect(result.bonusDice).toBe(0);
    expect(result.penaltyDice).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// calculateCheck - bonus/penalty cancellation
// ---------------------------------------------------------------------------

describe('calculateCheck - bonus and penalty cancellation', () => {
  it('1 bonus + 1 penalty cancels out → same as no modifier', () => {
    const base = calculateCheck(50);
    const cancelled = calculateCheck(50, 1, 1);
    expect(cancelled.successRate).toBeCloseTo(base.successRate, 10);
    expect(cancelled.effectiveSkill).toBe(base.effectiveSkill);
  });

  it('2 bonus + 1 penalty = net 1 bonus → same as 1 bonus die', () => {
    const oneBonusResult = calculateCheck(50, 1, 0);
    const netBonusResult = calculateCheck(50, 2, 1);
    expect(netBonusResult.successRate).toBeCloseTo(oneBonusResult.successRate, 10);
  });

  it('1 bonus + 2 penalty = net 1 penalty → same as 1 penalty die', () => {
    const onePenaltyResult = calculateCheck(50, 0, 1);
    const netPenaltyResult = calculateCheck(50, 1, 2);
    expect(netPenaltyResult.successRate).toBeCloseTo(onePenaltyResult.successRate, 10);
  });

  it('stores original bonusDice and penaltyDice values (not net)', () => {
    const result = calculateCheck(50, 2, 1);
    expect(result.bonusDice).toBe(2);
    expect(result.penaltyDice).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// calculateCheck - edge skill values with bonus/penalty dice
// ---------------------------------------------------------------------------

describe('calculateCheck - edge cases with modifiers', () => {
  it('skill 100 with 1 penalty die still gives 100% success', () => {
    // Even worst result (100) is ≤ 100, so always succeeds
    const result = calculateCheck(100, 0, 1);
    expect(result.successRate).toBeCloseTo(1.0, 10);
  });

  it('skill 1 with 1 bonus die increases success above 1%', () => {
    const result = calculateCheck(1, 1, 0);
    expect(result.successRate).toBeGreaterThan(0.01);
  });

  it('skill 1 with 1 penalty die has very low success rate', () => {
    const result = calculateCheck(1, 0, 1);
    // 1 penalty die with skill 1: P(max(t1,t2)*10+u ≤ 1)
    // Only (t=0,u=1) succeeds, but with penalty we need BOTH t values to give result ≤ 1
    // t=0, u=1: result=1 for both dice → result = 1 ≤ 1 ✓
    // So P = 1/100 (only t1=0,t2=0,u=1 out of 1000 total)
    expect(result.successRate).toBeCloseTo(0.001, 10);
  });
});
