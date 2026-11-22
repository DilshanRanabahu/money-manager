import { monthAfterDayChange, useUiStore } from './uiStore';

describe('monthAfterDayChange', () => {
  it('moves to the new month when the old current month was on screen', () => {
    expect(monthAfterDayChange({ viewing: '2026-11', previousToday: '2026-11-30', now: '2026-12-01' })).toBe('2026-12');
    expect(monthAfterDayChange({ viewing: '2026-12', previousToday: '2026-12-31', now: '2027-01-01' })).toBe('2027-01');
  });

  it('also catches up after several months away', () => {
    expect(monthAfterDayChange({ viewing: '2026-11', previousToday: '2026-11-20', now: '2027-02-03' })).toBe('2027-02');
  });

  it('stays on a month the user chose to browse', () => {
    expect(monthAfterDayChange({ viewing: '2026-10', previousToday: '2026-11-30', now: '2026-12-01' })).toBe('2026-10');
  });

  it('does nothing when only the day changed', () => {
    expect(monthAfterDayChange({ viewing: '2026-11', previousToday: '2026-11-08', now: '2026-11-09' })).toBe('2026-11');
  });
});

describe('confirm dialog', () => {
  const base = { title: 'Delete?', confirmLabel: 'Delete' };
  beforeEach(() => useUiStore.setState({ confirm: null }));

  it('runs onConfirm once when accepted', () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    useUiStore.getState().askConfirm({ ...base, onConfirm, onCancel });
    const { id } = useUiStore.getState().confirm!;
    useUiStore.getState().settleConfirm(id, true);
    useUiStore.getState().settleConfirm(id, true);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
    expect(useUiStore.getState().confirm).toBeNull();
  });

  it('runs onCancel when dismissed', () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    useUiStore.getState().askConfirm({ ...base, onConfirm, onCancel });
    useUiStore.getState().settleConfirm(useUiStore.getState().confirm!.id, false);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('cancels an open dialog when a new one is asked', () => {
    const firstCancel = jest.fn();
    useUiStore.getState().askConfirm({ ...base, onConfirm: jest.fn(), onCancel: firstCancel });
    const first = useUiStore.getState().confirm!.id;
    useUiStore.getState().askConfirm({ ...base, title: 'Second', onConfirm: jest.fn() });
    expect(firstCancel).toHaveBeenCalledTimes(1);
    expect(useUiStore.getState().confirm?.title).toBe('Second');
    useUiStore.getState().settleConfirm(first, true); // stale id is ignored
    expect(useUiStore.getState().confirm?.title).toBe('Second');
  });
});
