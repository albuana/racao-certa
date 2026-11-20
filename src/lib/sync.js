// Sincronização da casa com a conta: junta o que está no telemóvel com o que está na conta.
// Sem dependências de React Native, para dar para testar com node.

// O que vai para a conta (a conta e os preços em cache ficam de fora do topo).
export function syncedPart(state) {
  return {
    house: state.house || null,
    animals: state.animals || [],
    customProducts: state.customProducts || [],
    deleted: state.deleted || [],
  };
}

function newer(a, b, field) {
  return String(a?.[field] || '') > String(b?.[field] || '');
}

// Junta duas listas por id. Fica a versão mais recente de cada; os apagados saem.
function mergeById(remoteList, localList, field, deletedIds) {
  const byId = new Map();
  for (const item of remoteList || []) if (item?.id) byId.set(item.id, item);
  for (const item of localList || []) {
    if (!item?.id) continue;
    const other = byId.get(item.id);
    if (!other || !newer(other, item, field)) byId.set(item.id, item);
  }
  return [...byId.values()].filter((item) => !deletedIds.has(item.id));
}

// local e remote têm a forma de syncedPart(). remote pode ser null (conta nova).
export function mergeHouseData(local, remote) {
  const l = syncedPart(local || {});
  if (!remote) return l;
  const r = syncedPart(remote);

  // Apagados: junta as duas listas, fica a data mais recente de cada id; só os últimos 500.
  const deletedMap = new Map();
  for (const d of [...r.deleted, ...l.deleted]) {
    if (!d?.id) continue;
    const prev = deletedMap.get(d.id);
    if (!prev || String(d.at || '') > String(prev.at || '')) deletedMap.set(d.id, d);
  }
  const deleted = [...deletedMap.values()].sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 500);
  const deletedIds = new Set(deleted.map((d) => d.id));

  const house = r.house?.name ? (newer(l.house, r.house, 'updatedAt') ? l.house : r.house) : l.house;

  return {
    house,
    animals: mergeById(r.animals, l.animals, 'updatedAt', deletedIds),
    customProducts: mergeById(r.customProducts, l.customProducts, 'pricesUpdatedAt', deletedIds),
    deleted,
  };
}
