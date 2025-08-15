// src/hooks/usePersistentState.ts
import { useState, useEffect } from 'react';

function usePersistentState<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const [state, setState] = useState<T>(() => {
    // Solo accedemos a localStorage en el cliente
    if (typeof window !== 'undefined') {
      const storedValue = window.localStorage.getItem(key);
      try {
        return storedValue ? JSON.parse(storedValue) : defaultValue;
      } catch (error) {
        console.error("Error parsing JSON from localStorage", error);
        return defaultValue;
      }
    }
    return defaultValue;
  });

  useEffect(() => {
    // Este efecto se ejecuta cada vez que el 'state' cambia
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, JSON.stringify(state));
    }
  }, [key, state]);

  return [state, setState];
}

export default usePersistentState;