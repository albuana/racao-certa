// Gato ou cão escolhe-se agora no próprio formulário. Quem abrir este endereço vai para lá.
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function Especie() {
  const { species } = useLocalSearchParams();
  return <Redirect href={{ pathname: '/animal/novo', params: species ? { species } : {} }} />;
}
