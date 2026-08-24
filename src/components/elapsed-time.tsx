import { useEffect, useState } from 'react';

import { Txt } from './ui';

/**
 * Ticking clock, isolated on purpose: keeping the timer in the workout screen
 * re-rendered the whole exercise list (and the playing GIF) once per second.
 * Only this component repaints now.
 */
export function ElapsedTime({ startedAt, prefix }: { startedAt: number; prefix?: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsed = Math.max(0, Math.floor((now - startedAt) / 1000));
  const label = `${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, '0')}`;

  return (
    <Txt variant="caption" color="textTertiary">
      {prefix}
      {label}
    </Txt>
  );
}
