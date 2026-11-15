import { useCallback, useEffect, useState } from 'react';

/** Тема: клас `dark` на <html>. Початково — збережений вибір або prefers-color-scheme (див. index.html). */
export function useTheme() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  const toggle = useCallback(() => {
    setDark((d) => {
      const next = !d;
      try {
        localStorage.setItem('theme', next ? 'dark' : 'light');
      } catch {
        /* приватний режим — просто не запам'ятовуємо */
      }
      return next;
    });
  }, []);

  return { dark, toggle };
}
