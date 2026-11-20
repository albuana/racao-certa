// Decide para onde ir quando a app abre.
import { Redirect } from 'expo-router';
import { useStore } from '../store/AppStore';

export default function Start() {
  const { account, house } = useStore();
  if (!account) return <Redirect href="/login" />;
  if (!house?.name) return <Redirect href="/casa" />;
  return <Redirect href="/procurar" />;
}
