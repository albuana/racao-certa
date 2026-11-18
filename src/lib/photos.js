// Escolher ou tirar uma foto do animal e guardá-la numa pasta da app
// (as fotos temporárias do sistema podem ser apagadas).

import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

const OPTIONS = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 };

async function keep(uri) {
  try {
    const ext = (uri.split('.').pop() || 'jpg').split('?')[0];
    const dest = new File(Paths.document, `animal_${Date.now()}.${ext}`);
    await new File(uri).copy(dest);
    return dest.uri;
  } catch (e) {
    console.warn('Não foi possível copiar a foto; usa-se o original', e);
    return uri;
  }
}

export async function takePhoto() {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Sem acesso à câmara', 'Podes dar acesso nas Definições do telemóvel.');
    return null;
  }
  const res = await ImagePicker.launchCameraAsync(OPTIONS);
  if (res.canceled || !res.assets?.length) return null;
  return keep(res.assets[0].uri);
}

export async function pickPhoto() {
  const res = await ImagePicker.launchImageLibraryAsync(OPTIONS);
  if (res.canceled || !res.assets?.length) return null;
  return keep(res.assets[0].uri);
}

// Pergunta: câmara ou galeria. Devolve o uri guardado (ou null).
export function choosePhoto(onPicked, onRemove) {
  const buttons = [
    { text: 'Tirar foto', onPress: async () => { const u = await takePhoto(); if (u) onPicked(u); } },
    { text: 'Escolher da galeria', onPress: async () => { const u = await pickPhoto(); if (u) onPicked(u); } },
  ];
  if (onRemove) buttons.push({ text: 'Remover foto', style: 'destructive', onPress: onRemove });
  buttons.push({ text: 'Cancelar', style: 'cancel' });
  Alert.alert('Foto do animal', undefined, buttons);
}
