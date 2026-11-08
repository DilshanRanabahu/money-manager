import { formatAmount, formatAmountCompact, formatNumber, groupDigits, parseAmount } from './money';

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
  });

  it('formats compact amounts', () => {
    expect(formatAmountCompact(50000)).toBe('Rs. 500');
    expect(formatAmountCompact(12500000)).toBe('Rs. 125K');
    expect(formatAmountCompact(150000)).toBe('Rs. 1.5K');
    expect(formatAmountCompact(250000000)).toBe('Rs. 2.5M');
  });
});
