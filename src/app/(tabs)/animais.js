import { router } from 'expo-router';
import { View } from 'react-native';
import AnimalRow from '../../components/AnimalRow';
import { Body, Button, Screen, Title } from '../../components/ui';
import { useStore } from '../../store/AppStore';

export default function Animais() {
  const { animals, house } = useStore();
  return (
    <Screen>
      <View>
        {house?.name ? <Body muted size={14}>{house.name}</Body> : null}
        <Title size={30}>Animais</Title>
      </View>
      <View style={{ gap: 10 }}>
        {animals.map((a) => (
          <AnimalRow key={a.id} animal={a} />
        ))}
      </View>
      <Button icon="add" title="Adicionar animal" onPress={() => router.push('/especie')} />
    </Screen>
  );
}
