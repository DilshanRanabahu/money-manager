import { formatAmount, formatAmountCompact, formatNumber, formatUsd, groupDigits, parseAmount } from './money';

describe('parseAmount', () => {
  it.each([
    ['1', 100],
    ['1250.50', 125050],
    ['1,250.5', 125050],
    ['0.01', 1],
    ['12.', 1200],
    [' 99 ', 9900],
  ])('parses %p -> %p', (input, expected) => {
    expect(parseAmount(input)).toBe(expected);
  });

  it.each(['', '0', '0.00', '.', '1,000.505', '-5', 'abc', '1.2.3', '9999999999999'])('rejects %p', (input) => {
    expect(parseAmount(input)).toBeNull();
  });

  it('avoids float errors', () => {
    expect(parseAmount('0.29')).toBe(29);
    expect(parseAmount('1.15')).toBe(115);
  });
});

describe('formatting', () => {
  it('groups digits', () => {
    expect(groupDigits('1')).toBe('1');
    expect(groupDigits('1000')).toBe('1,000');
    expect(groupDigits('1234567')).toBe('1,234,567');
    expect(groupDigits('123456')).toBe('123,456');
  });

  it('formats numbers', () => {
    expect(formatNumber(0)).toBe('0.00');
    expect(formatNumber(5)).toBe('0.05');
    expect(formatNumber(125050)).toBe('1,250.50');
    expect(formatNumber(-125050)).toBe('-1,250.50');
  });

  it('formats amounts', () => {
    expect(formatAmount(125050)).toBe('Rs. 1,250.50');
    expect(formatAmount(-85000)).toBe('−Rs. 850.00');
    expect(formatAmount(85000, { signed: true })).toBe('+Rs. 850.00');
    expect(formatAmount(0, { signed: true })).toBe('Rs. 0.00');
    expect(formatAmount(-85000, { bare: true })).toBe('−850.00');
    expect(formatAmount(10656000, { whole: true })).toBe('Rs. 106,560');
    expect(formatAmount(545750, { whole: true })).toBe('Rs. 5,458');
  });

  it('formats compact amounts', () => {
    expect(formatAmountCompact(50000)).toBe('Rs. 500');
    expect(formatAmountCompact(12500000)).toBe('Rs. 125K');
    expect(formatAmountCompact(150000)).toBe('Rs. 1.5K');
    expect(formatAmountCompact(250000000)).toBe('Rs. 2.5M');
  });
});

describe('formatUsd', () => {
  it('shows small API costs with 4 decimals', () => {
    expect(formatUsd(0)).toBe('$0.00');
    expect(formatUsd(40_000)).toBe('< $0.0001');
    expect(formatUsd(1_230_000)).toBe('$0.0012');
    expect(formatUsd(123_400_000)).toBe('$0.1234');
    expect(formatUsd(999_990_000)).toBe('$1.00');
  });

  it('shows a dollar or more with cents', () => {
    expect(formatUsd(1_000_000_000)).toBe('$1.00');
    expect(formatUsd(12_345_000_000)).toBe('$12.35');
    expect(formatUsd(1_234_560_000_000)).toBe('$1,234.56');
  });
});
