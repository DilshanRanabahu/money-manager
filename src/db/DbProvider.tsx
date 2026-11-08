import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { getDb } from './client';
import { migrate } from './migrations';
import { seed } from './seed';

type Props = {
  children: ReactNode;
  /** Runs once after migrations and seeding (e.g. purge old deleted rows). */
  onReady?: () => Promise<void> | void;
  /** Shown while the database is preparing. */
  splash: ReactNode;
  /** Shown if preparation fails. */
  renderError: (error: Error, retry: () => void) => ReactNode;
};

/** Opens the database, runs migrations and seed, and only then renders the app. */
export function DbProvider({ children, onReady, splash, renderError }: Props) {
  const [state, setState] = useState<'loading' | 'ready' | Error>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const db = getDb();
        await migrate(db);
        await seed(db);
        await onReady?.();
        if (!cancelled) setState('ready');
      } catch (e) {
        if (!cancelled) setState(e instanceof Error ? e : new Error(String(e)));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  if (state === 'loading') return <View style={styles.fill}>{splash}</View>;
  if (state instanceof Error) {
    return (
      <View style={styles.fill}>
        {renderError(state, () => {
          setState('loading');
          setAttempt((a) => a + 1);
        })}
      </View>
    );
  }
  return <>{children}</>;
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
