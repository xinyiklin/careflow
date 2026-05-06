import { useEffect, useState } from "react";

export default function useCurrentTime(intervalMs = 60000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return now;
}
