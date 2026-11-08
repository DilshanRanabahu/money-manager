# Motion

Motion in this app has one job: **show what changed and where it went.** If an animation does not explain something, remove it.

## Principles

1. **Fast.** Most transitions are 150–300 ms. Nothing blocks input.
2. **Physical.** Use springs for anything the user moves (sheets, swipes, toggles). Use timing curves only for fades and color.
3. **Interruptible.** A gesture can grab an element mid-animation. Reanimated shared values make this natural.
4. **On the UI thread.** All animation uses Reanimated worklets. No `Animated` from React Native core, no JS-driven `setInterval` animation.
5. **No vibration.** Haptics are turned off (owner's preference); motion alone confirms actions. The calls stay in code behind `HAPTICS_ON` in `src/shared/lib/haptics.ts`.
6. **Reduce Motion respected.** When the OS setting is on, replace movement with short fades and skip number rolling.

## Tokens (`src/shared/motion`)

```ts
export const duration = {
  instant: 100,
  fast: 150,
  base: 220,
  slow: 320,
};

export const spring = {
  // buttons, chips, small UI
  snappy: { damping: 20, stiffness: 300, mass: 0.8 },
  // sheets, cards, list items
  gentle: { damping: 22, stiffness: 180, mass: 1 },
  // playful but controlled (success moments)
  bouncy: { damping: 14, stiffness: 220, mass: 0.9 },
};

export const easing = {
  out: Easing.bezier(0.2, 0.8, 0.2, 1),
  inOut: Easing.bezier(0.4, 0, 0.2, 1),
};
```

Tune these in one place. Components never invent their own numbers.

## The animations

| # | Where | What happens | How |
|---|-------|--------------|-----|
| 1 | Buttons, chips, keys | Scale to 0.97 on press in, spring back on release. List rows only tint their background (no per-row animation, for smooth scrolling) | `PressableScale`, `spring.snappy`; rows use plain `Pressable` |
| 2 | Balance & totals | Number rolls from old to new value (~400 ms) when data or month changes | `AnimatedNumber`: shared value + `withTiming`, tabular digits |
| 3 | Add button / tabs | Add button scales on press; active tab icon lifts 2 px and its dot springs in | `PressableScale`, `spring.snappy` |
| 4 | Add/Edit sheet | Native form sheet slides up; drag down to dismiss | Expo Router `presentation: 'formSheet'` |
| 5 | Type toggle | Indicator slides between Expense/Income; amount color cross-fades red↔green | `interpolateColor`, `spring.snappy` |
| 6 | Amount input | Amount pops (1.04→1) on each new digit; invalid key shakes it with a warning haptic | `spring.bouncy`; shake = `withSequence` |
| 7 | Category chip | Selected chip fills with its color and scales 1→1.05→1 | `spring.bouncy` + selection haptic |
| 8 | Save | Success haptic; sheet closes; the new row fades in (only rows added after the month opened animate) and the balance rolls | `entering={FadeIn}` + `AnimatedNumber`; day headers are plain text for speed |
| 9 | Delete | Swipe left reveals a static red area; past 110 px (or a fast fling) the row slides out, remaining rows spring into place; Undo toast slides in | Own light swipe row: one `usePanGesture` + one shared value; `layout={LinearTransition}` on the row |
| 10 | Month switch | Title and content slide in from the direction of travel (fade + small offset); the old month disappears at once | `FadeInRight` / `FadeInLeft` keyed by month, `LayoutAnimationConfig skipExiting` |
| 11 | Breakdown bars | Bars grow from 0 to their width, staggered 30 ms per row | `withDelay` + `withTiming` |
| 12 | Toast | Springs up from the bottom, auto-dismisses after 5 s, fades out | `SlideInDown` (gentle spring) + `FadeOutDown` |
| 13 | Empty state | Icon fades and floats in once (no looping) | `FadeInDown` |

## Haptics (`src/shared/lib/haptics.ts`) — currently OFF

All haptics are disabled with `HAPTICS_ON = false`. The table below is what each event would use if they are turned back on.

| Event              | Haptic                    |
| ------------------ | ------------------------- |
| Chip / toggle select | `selectionAsync`        |
| Save success       | `notificationAsync(Success)` |
| Delete threshold passed | `impactAsync(Medium)` |
| Invalid input      | `notificationAsync(Warning)` |

Wrap haptics so they can be disabled in one place and are no-ops on web.

## Do / Don't

- ✅ Animate `transform` and `opacity`. They are cheap.
- ✅ Keep list item animations short so fast scrolling stays smooth.
- ❌ No looping or idle animations.
- ❌ No animation longer than 500 ms.
- ❌ Don't animate layout of a whole screen on every render; key entering/exiting to real data changes.
