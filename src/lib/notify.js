// Notificações locais: 🔔 alerta de preço e 📦 "a ração acaba em 2 dias".
// Não precisam de servidor; funcionam no Expo Go e na app instalada.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const RUNOUT_KEY = 'racaocerta:lembretes-fim';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

let asked = null;
export async function allowNotifications() {
  if (asked) return asked;
  asked = (async () => {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', { name: 'Ração Certa', importance: Notifications.AndroidImportance.DEFAULT });
      }
      const current = await Notifications.getPermissionsAsync();
      if (current.granted) return true;
      if (!current.canAskAgain) return false;
      const res = await Notifications.requestPermissionsAsync();
      return res.granted;
    } catch {
      return false;
    }
  })();
  return asked;
}

export async function notifyNow(title, body) {
  if (!(await allowNotifications())) return;
  await Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: null }).catch(() => {});
}

// Um lembrete por animal, 2 dias antes de a ração seca acabar, às 10h. Substitui os anteriores.
// items: [{ animalId, name, daysLeft, store }]
export async function scheduleRunOutReminders(items) {
  let saved = {};
  try {
    saved = JSON.parse((await AsyncStorage.getItem(RUNOUT_KEY)) || '{}');
  } catch {
    saved = {};
  }
  const wanted = items.filter((i) => Number.isFinite(i.daysLeft) && i.daysLeft > 2);
  if (wanted.length && !(await allowNotifications())) return;

  const next = {};
  for (const id of Object.keys(saved)) {
    await Notifications.cancelScheduledNotificationAsync(saved[id]).catch(() => {});
  }
  for (const i of wanted) {
    const when = new Date();
    when.setDate(when.getDate() + i.daysLeft - 2);
    when.setHours(10, 0, 0, 0);
    if (when <= new Date()) continue;
    try {
      next[i.animalId] = await Notifications.scheduleNotificationAsync({
        content: {
          title: `A ração de ${i.name} acaba daqui a 2 dias`,
          body: i.store ? `Mais barata da última vez: ${i.store}. Abre a app para ver os preços de hoje.` : 'Abre a app para ver onde está mais barata hoje.',
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
      });
    } catch {
      /* sem permissão ou data inválida */
    }
  }
  await AsyncStorage.setItem(RUNOUT_KEY, JSON.stringify(next)).catch(() => {});
}
