import { inlineSpans, parseRich } from './richText';

describe('inlineSpans', () => {
  it('bolds and colours amounts by sign', () => {
    expect(inlineSpans('Spent −Rs. 850.00, got +Rs. 5,000 and have Rs. 52,420')).toEqual([
      { text: 'Spent ' },
      { text: '−Rs. 850.00', bold: true, tone: 'expense' },
      { text: ', got ' },
      { text: '+Rs. 5,000', bold: true, tone: 'income' },
      { text: ' and have ' },
      { text: 'Rs. 52,420', bold: true, tone: undefined },
    ]);
  });

  it('handles **bold** and strips code ticks', () => {
    expect(inlineSpans('**Bills** went up `a lot`')).toEqual([
      { text: 'Bills', bold: true },
      { text: ' went up a lot' },
    ]);
  });
});

describe('parseRich', () => {
  it('splits paragraphs, bullets, numbers and single gaps', () => {
    const blocks = parseRich('## Hi there\n\n\n- one\n* two\n1. first\n2) second\n\nbye\n\n');
    expect(blocks.map((b) => b.kind)).toEqual(['p', 'gap', 'bullet', 'bullet', 'number', 'number', 'gap', 'p']);
    expect(blocks[4]).toMatchObject({ kind: 'number', n: '1', spans: [{ text: 'first' }] });
  });

  it('copes with partial text while streaming', () => {
    expect(parseRich('**Bil')).toEqual([{ kind: 'p', spans: [{ text: '**Bil' }] }]);
  });
});
