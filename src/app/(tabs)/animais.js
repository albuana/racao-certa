// Os animais passaram para o Início. Quem abrir este endereço vai para lá.
import { Redirect } from 'expo-router';

export default function Animais() {
  return <Redirect href="/inicio" />;
}
