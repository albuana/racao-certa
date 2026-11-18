// Estado da app guardado no telemóvel (AsyncStorage).
// Quando houver servidor (Supabase/Firebase), é aqui que se liga a sincronização.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const STORAGE_KEY = 'racaocerta:v1';

const EMPTY = {
  account: null, // { mode: 'guest' } — mais tarde: { mode: 'apple' | 'google' | 'email', userId }
  house: null, // { name }
  animals: [], // ver criarAnimal() em src/app/animal/novo.js
  customProducts: [], // rações adicionadas à mão
};

const StoreContext = createContext(null);

function newId(prefix) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function StoreProvider({ children }) {
  const [state, setState] = useState(EMPTY);
  const [ready, setReady] = useState(false);
  // Resultado do seletor de ração (ecrã → formulário).
  const [pickedProductId, setPickedProductId] = useState(null);
  const loaded = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setState({ ...EMPTY, ...JSON.parse(raw) });
      } catch (e) {
        console.warn('Não foi possível ler os dados guardados', e);
      } finally {
        loaded.current = true;
        setReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch((e) =>
      console.warn('Não foi possível guardar os dados', e)
    );
  }, [state]);

  const continueAsGuest = useCallback(() => {
    setState((s) => ({ ...s, account: { mode: 'guest' } }));
  }, []);

  const setHouseName = useCallback((name) => {
    setState((s) => ({ ...s, house: { ...(s.house || {}), name } }));
  }, []);

  const saveAnimal = useCallback((animal) => {
    const id = animal.id || newId('a');
    const saved = { ...animal, id, updatedAt: new Date().toISOString() };
    setState((s) => {
      const exists = s.animals.some((a) => a.id === id);
      return {
        ...s,
        animals: exists ? s.animals.map((a) => (a.id === id ? saved : a)) : [...s.animals, saved],
      };
    });
    return id;
  }, []);

  const removeAnimal = useCallback((id) => {
    setState((s) => ({ ...s, animals: s.animals.filter((a) => a.id !== id) }));
  }, []);

  const openBag = useCallback((animalId, kg) => {
    setState((s) => ({
      ...s,
      animals: s.animals.map((a) =>
        a.id === animalId ? { ...a, bag: { kg, openedAt: new Date().toISOString() } } : a
      ),
    }));
  }, []);

  const addCustomProduct = useCallback((product) => {
    const id = newId('p');
    setState((s) => ({ ...s, customProducts: [...s.customProducts, { ...product, id, custom: true }] }));
    return id;
  }, []);

  const resetAll = useCallback(async () => {
    setState(EMPTY);
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn(e);
    }
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      ready,
      pickedProductId,
      setPickedProductId,
      continueAsGuest,
      setHouseName,
      saveAnimal,
      removeAnimal,
      openBag,
      addCustomProduct,
      resetAll,
    }),
    [state, ready, pickedProductId, continueAsGuest, setHouseName, saveAnimal, removeAnimal, openBag, addCustomProduct, resetAll]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore tem de estar dentro de <StoreProvider>');
  return ctx;
}
