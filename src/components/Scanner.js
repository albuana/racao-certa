// Leitor de código de barras em ecrã inteiro (com campo para escrever o código à mão).
import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { Body, Button, Title, styles as ui } from './ui';

export default function Scanner({ onClose, onCode }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [typed, setTyped] = useState('');
  const handled = useRef(false);

  const submitTyped = () => {
    const code = typed.replace(/\D/g, '');
    if (code.length >= 8) onCode(code);
    else Alert.alert('Código incompleto', 'Escreve os números por baixo das barras (8 a 13 dígitos).');
  };

  const typeBox = (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <TextInput
        value={typed}
        onChangeText={setTyped}
        placeholder="Ou escreve o código"
        placeholderTextColor={colors.textMuted}
        keyboardType="number-pad"
        returnKeyType="done"
        onSubmitEditing={submitTyped}
        maxLength={14}
        accessibilityLabel="Escrever código de barras"
        style={[ui.input, { flex: 1 }]}
      />
      <Button title="OK" onPress={submitTyped} style={{ paddingHorizontal: 18 }} />
    </View>
  );

  if (!permission) return <View style={{ flex: 1, backgroundColor: '#000' }} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 16, backgroundColor: colors.bg }}>
        <Title size={24}>Ler o código de barras</Title>
        <Body muted>Precisamos da câmara para ler o código de barras do saco.</Body>
        <Button
          title="Permitir câmara"
          onPress={async () => {
            const res = await requestPermission();
            if (!res.granted && !res.canAskAgain) {
              Alert.alert('Câmara bloqueada', 'Ativa a câmara para a Ração Certa (ou para o Expo Go) nas Definições do telemóvel.', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Abrir Definições', onPress: () => Linking.openSettings() },
              ]);
            }
          }}
        />
        {typeBox}
        <Button variant="ghost" title="Cancelar" onPress={onClose} />
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] }}
        onBarcodeScanned={({ data }) => {
          if (handled.current || !data) return;
          handled.current = true;
          onCode(String(data));
        }}
      />
      <SafeAreaView style={{ flex: 1, justifyContent: 'space-between', padding: 20 }}>
        {/* Topo: fechar e escrever o código (fica acima do teclado) */}
        <View style={{ gap: 10 }}>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar" style={{ alignSelf: 'flex-start', width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="close" size={24} color="#fff" />
          </Pressable>
          <View style={{ backgroundColor: 'rgba(255,246,244,0.95)', borderRadius: 14, padding: 10 }}>{typeBox}</View>
        </View>
        <View style={{ alignSelf: 'center', width: '85%', height: 160, borderWidth: 3, borderColor: colors.coral, borderRadius: 16 }} />
        <Text style={{ color: '#fff', fontFamily: fonts.semibold, fontSize: 15, textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.55)', padding: 10, borderRadius: 12, overflow: 'hidden' }}>
          Aponta para o código de barras do saco, com boa luz
        </Text>
      </SafeAreaView>
    </View>
  );
}
