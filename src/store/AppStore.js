// Estado da app guardado no telemóvel (AsyncStorage).
// Com conta (Supabase), a casa também fica guardada na conta e sincroniza entre telemóveis.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { mergeHouseData, syncedPart } from '../lib/sync';

const STORAGE_KEY = 'racaocerta:v1';

const EMPTY = {
  account: null, // { mode: 'guest' } ou { mode: 'apple' | 'google' | 'email', userId, email }
  house: null, // { name, updatedAt }
  animals: [], // ver criarAnimal() em src/app/animal/novo.js
  customProducts: [], // rações adicionadas
  deleted: [], // [{ id, at }] — para um animal apagado não voltar noutro telemóvel
};

const StoreContext = createContext(null);

function newId(prefix) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

const now = () => new Date().toISOString();

async function loadRemote(userId) {
  const { data, error } = await supabase.from('casas').select('dados').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data?.dados || null;
}

async function saveRemote(userId, dados) {
  const { error } = await supabase.from('casas').upsert({ user_id: userId, dados, updated_at: now() });
  if (error) throw error;
}

export function StoreProvider({ children }) {
  const [state, setState] = useState(EMPTY);
  const [ready, setReady] = useState(false);
  // { status: 'idle' | 'syncing' | 'ok' | 'error', at }
  const [sync, setSync] = useState({ status: 'idle', at: null });
  // Resultado do seletor de ração (ecrã → formulário).
  const [pickedProductId, setPickedProductId] = useState(null);
  const loaded = useRef(false);
  const stateRef = useRef(EMPTY);
  // Só se envia para a conta depois de ler o que lá está (para não apagar dados de outro telemóvel).
  const remoteReady = useRef(false);
  const pushTimer = useRef(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Lê a conta e junta com o que está no telemóvel.
  const pullAndMerge = useCallback(async (userId) => {
    setSync({ status: 'syncing', at: null });
    try {
      const remote = await loadRemote(userId);
      setState((s) => ({ ...s, ...mergeHouseData(s, remote) }));
      remoteReady.current = true;
      setSync({ status: 'ok', at: now() });
    } catch (e) {
      console.warn('Não foi possível ler a conta', e);
      setSync({ status: 'error', at: null });
    }
  }, []);

  useEffect(() => {
    (async () => {
      let saved = EMPTY;
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) saved = { ...EMPTY, ...JSON.parse(raw) };
        setState(saved);
      } catch (e) {
        console.warn('Não foi possível ler os dados guardados', e);
      } finally {
        loaded.current = true;
        setReady(true);
      }
      // Com sessão iniciada, vai buscar as novidades da conta (sem prender a abertura da app).
      if (supabase && saved.account?.userId) {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user?.id === saved.account.userId) pullAndMerge(saved.account.userId);
      }
    })();
  }, [pullAndMerge]);

  // Guarda no telemóvel.
  useEffect(() => {
    if (!loaded.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch((e) =>
      console.warn('Não foi possível guardar os dados', e)
    );
  }, [state]);

  // Envia para a conta, 1,5 s depois da última alteração.
  const userId = state.account?.userId;
  useEffect(() => {
    if (!supabase || !userId || !remoteReady.current) return;
    clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(async () => {
      try {
        await saveRemote(userId, syncedPart(stateRef.current));
        setSync({ status: 'ok', at: now() });
      } catch (e) {
        console.warn('Não foi possível guardar na conta', e);
        setSync({ status: 'error', at: null });
      }
    }, 1500);
    return () => clearTimeout(pushTimer.current);
  }, [userId, state.house, state.animals, state.customProducts, state.deleted]);

  const continueAsGuest = useCallback(() => {
    setState((s) => ({ ...s, account: { mode: 'guest' } }));
  }, []);

  // Depois de entrar (Apple, Google ou email): marca a conta e junta os dados.
  const completeSignIn = useCallback(
    async (user, mode) => {
      remoteReady.current = false;
      setState((s) => ({ ...s, account: { mode, userId: user.id, email: user.email || null } }));
      await pullAndMerge(user.id);
    },
    [pullAndMerge]
  );

  // Sai da conta e limpa o telemóvel (os dados continuam na conta).
  const signOut = useCallback(async () => {
    remoteReady.current = false;
    clearTimeout(pushTimer.current);
    try {
      await supabase?.auth.signOut();
    } catch (e) {
      console.warn(e);
    }
    setState(EMPTY);
    setSync({ status: 'idle', at: null });
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, []);

  // Apaga a conta e tudo o que lá está (obrigatório na App Store).
  const deleteAccount = useCallback(async () => {
    const { error } = await supabase.rpc('apagar_conta');
    if (error) throw error;
    await signOut();
  }, [signOut]);

  const setHouseName = useCallback((name) => {
    setState((s) => ({ ...s, house: { ...(s.house || {}), name, updatedAt: now() } }));
  }, []);

  const saveAnimal = useCallback((animal) => {
    const id = animal.id || newId('a');
    const saved = { ...animal, id, updatedAt: now() };
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
    setState((s) => ({
      ...s,
      animals: s.animals.filter((a) => a.id !== id),
      deleted: [{ id, at: now() }, ...(s.deleted || [])].slice(0, 500),
    }));
  }, []);

  const openBag = useCallback((animalId, kg) => {
    setState((s) => ({
      ...s,
      animals: s.animals.map((a) =>
        a.id === animalId ? { ...a, bag: { kg, openedAt: now() }, updatedAt: now() } : a
      ),
    }));
  }, []);

  const addCustomProduct = useCallback((product) => {
    const id = newId('p');
    setState((s) => ({ ...s, customProducts: [...s.customProducts, { ...product, id, custom: true }] }));
    return id;
  }, []);

  // Guarda os preços das lojas de uma ração (vindos do servidor de preços).
  const updateProductOffers = useCallback((productId, offers, updatedAt) => {
    setState((s) => ({
      ...s,
      customProducts: s.customProducts.map((p) => (p.id === productId ? { ...p, offers, pricesUpdatedAt: updatedAt } : p)),
    }));
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
      sync,
      pickedProductId,
      setPickedProductId,
      continueAsGuest,
      completeSignIn,
      signOut,
      deleteAccount,
      setHouseName,
      saveAnimal,
      removeAnimal,
      openBag,
      addCustomProduct,
      updateProductOffers,
      resetAll,
    }),
    [
      state,
      ready,
      sync,
      pickedProductId,
      continueAsGuest,
      completeSignIn,
      signOut,
      deleteAccount,
      setHouseName,
      saveAnimal,
      removeAnimal,
      openBag,
      addCustomProduct,
      updateProductOffers,
      resetAll,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore tem de estar dentro de <StoreProvider>');
  return ctx;
}
