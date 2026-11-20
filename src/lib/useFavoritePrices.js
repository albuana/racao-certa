// Atualiza os preços das favoritas (no máximo de 6 em 6 horas), guarda o histórico e avisa
// quando uma baixa do preço-alvo (🔔).

import { useCallback, useRef, useState } from 'react';
import { formatEuro } from './nutrition';
import { notifyNow } from './notify';
import { addHistory, cleanHistory, findSame, searchEnabled, searchStores } from './search';

const SIX_HOURS = 6 * 60 * 60 * 1000;

export function useFavoritePrices(favorites, updateFavorite) {
  const [refreshing, setRefreshing] = useState(false);
  const running = useRef(false);

  const refresh = useCallback(
    async (force = false) => {
      if (!searchEnabled || running.current || !favorites?.length) return;
      // v2 = depois de tirarmos as lojas desconhecidas: as favoritas antigas atualizam logo.
      const due = favorites.filter((f) => force || f.v !== 2 || !f.checkedAt || Date.now() - new Date(f.checkedAt).getTime() > SIX_HOURS);
      if (!due.length) return;
      running.current = true;
      setRefreshing(true);
      try {
        for (const fav of due) {
          try {
            const groups = await searchStores(fav.query, { type: fav.type, species: fav.species });
            const same = findSame(groups, fav);
            if (!same) {
              updateFavorite(fav.key, { checkedAt: new Date().toISOString(), v: 2, history: cleanHistory(fav.history), best: null, offers: [] });
              continue;
            }
            const best = { price: same.best.price, unitValue: same.best.unitValue, store: same.best.store, link: same.best.link };
            const changes = {
              best,
              offers: same.offers.slice(0, 8).map((o) => ({ store: o.store, price: o.price, unitValue: o.unitValue, link: o.link, desde: o.desde })),
              image: fav.image || same.image,
              history: addHistory(cleanHistory(fav.history), best.unitValue, best.store),
              checkedAt: new Date().toISOString(),
              v: 2,
            };
            // 🔔 Alerta: avisa uma vez por cada preço novo abaixo do alvo.
            if (fav.target && best.unitValue <= fav.target && fav.notifiedPrice !== best.unitValue) {
              changes.notifiedPrice = best.unitValue;
              notifyNow(
                `Baixou! ${fav.name}`,
                `${formatEuro(best.unitValue)}${fav.type === 'wet' ? ' por unidade' : ''} no ${best.store} (o teu alvo era ${formatEuro(fav.target)}).`
              );
            }
            updateFavorite(fav.key, changes);
          } catch {
            /* sem rede: tenta da próxima vez */
          }
        }
      } finally {
        running.current = false;
        setRefreshing(false);
      }
    },
    [favorites, updateFavorite]
  );

  return { refresh, refreshing };
}
