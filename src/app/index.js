// Decide para onde ir quando a app abre.
import { Redirect } from 'expo-router';
import { useStore } from '../store/AppStore';

export default function Start() {
  const { account, house, animals } = useStore();
  if (!account) return <Redirect href="/login" />;
  if (!house?.name) return <Redirect href="/casa" />;
  if (animals.length === 0) return <Redirect href="/especie" />;
  return <Redirect href="/inicio" />;
}
