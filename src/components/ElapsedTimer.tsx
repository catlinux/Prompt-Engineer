import { useEffect, useState } from "react";

interface ElapsedTimerProps {
  active: boolean;
}

export function ElapsedTimer({ active }: ElapsedTimerProps) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!active) {
      setSeconds(0);
      return;
    }
    const start = Date.now();
    const interval = setInterval(() => {
      setSeconds(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [active]);

  if (!active) return null;

  return <span className="elapsed-timer">{seconds}s</span>;
}
