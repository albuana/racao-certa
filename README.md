# Ração Certa

App para iOS e Android que calcula a dose diária de ração de cada animal (gatos e cães), estima o custo por dia e por mês e mostra onde a ração está mais barata (preços sem portes).

Feita com **Expo SDK 58 / React Native**, em **JavaScript** (sem TypeScript).

---

## O que já faz

- **Entrar:** “Continuar sem registo” (funciona já). Apple, Google e email mostram “em breve” até haver servidor.
- **Casa:** nome da casa (passo 1 de 3).
- **Animal:** gato ou cão (passo 2), depois o formulário (passo 3):
  - foto (câmara ou galeria), nome, peso;
  - porte (cães), **fase de vida** (Júnior, Adulto, Maduro, Sénior) com os intervalos de idade; se indicares a idade, a fase é escolhida sozinha;
  - sexo e **castrado / esterilizada** (a pergunta muda conforme macho ou fêmea);
  - estilo de vida, objetivo (manter ou perder peso), refeições por dia;
  - ração e estimativa da dose em tempo real.
- **Escolher ração:** pesquisa, filtros (fase, seca, húmida), **leitor de código de barras**, ordenar pela **mais barata por dia** para aquele animal, e adicionar uma ração à mão (com as kcal/kg do rótulo e um preço opcional).
- **Início:** custo da casa por mês e por dia, gramas por dia, aviso quando um saco está a acabar.
- **Perfil do animal:** dose diária, dose por refeição, “Abri um saco novo” (conta os dias até acabar), custo por dia e por mês.
- **Comparar preços:** lojas ordenadas por custo/dia ou €/kg, quanto dura cada saco e quanto poupas por ano.
- Tudo fica guardado **no telemóvel** (AsyncStorage).

## Como é feito o cálculo

`RER = 70 × peso^0,75` kcal/dia, multiplicado por um fator conforme a espécie, fase de vida, esterilização, atividade e objetivo. Gramas/dia = kcal ÷ (kcal/kg da ração ÷ 1000). Está tudo em `src/lib/nutrition.js`, com testes em `src/lib/nutrition.test.js`.

São estimativas de referência. A app diz sempre para confirmar com o veterinário.

---

## Experimentar no teu telemóvel

1. Instala o **Node.js** (versão 20 ou mais recente): https://nodejs.org
2. Numa pasta com este projeto:
   ```bash
   npm install
   npx expo start
   ```
3. Instala a app **Expo Go** no telemóvel e lê o QR code que aparece no terminal.
   - Se o Expo Go ainda não suportar o SDK 58, usa um *development build*: `npx eas-cli@latest build --profile development`.

Testes do cálculo: `npm test`

## Estrutura

```
src/
  app/                  ← cada ficheiro é um ecrã (Expo Router)
    _layout.js          ← fontes, armazenamento, navegação
    index.js            ← decide para onde ir ao abrir
    login.js, casa.js, especie.js   ← onboarding
    animal/novo.js      ← formulário (criar e editar)
    animal/[id].js      ← perfil do animal
    racao.js            ← escolher ração + código de barras
    comparar/[productId].js ← comparador de preços
    (tabs)/             ← Início, Animais, Preços, Perfil
  components/           ← botões, cartões, campos…
  data/products.js      ← catálogo de rações (DEMONSTRAÇÃO)
  lib/nutrition.js      ← cálculos
  lib/household.js      ← junta animal + ração + preços
  lib/photos.js         ← fotos dos animais
  store/AppStore.js     ← dados guardados no telemóvel
  theme.js              ← cores (Coral e marinho) e fontes
```

---

## ⚠️ Antes de publicar

1. **Rações e preços são fictícios.** Estão em `src/data/products.js`. Substitui por dados reais:
   - produtos, kcal/kg e códigos de barras: por exemplo, [Open Pet Food Facts](https://world.openpetfoodfacts.org) (base aberta);
   - preços: programas de afiliados das lojas, ou um servidor teu que os atualize. Não copies fotos ou preços dos sites sem autorização.
   - Quando houver servidor, troca `PRODUCTS` por um pedido à tua API.
2. **Identificador da app:** em `app.json`, `ios.bundleIdentifier` e `android.package` estão como `pt.racaocerta.app`. Muda para um domínio teu (não dá para mudar depois de publicar).
3. **Ícone:** `assets/icon.png` é provisório (pata branca sobre coral). Põe o ícone final em 1024×1024.
4. **Política de privacidade:** as duas lojas exigem um link. A app guarda dados no telemóvel e usa câmara e fotos.
5. **Login:** se ativares o “Entrar com o Google” no iOS, a Apple exige também uma opção de login com privacidade equivalente (o “Entrar com a Apple” cumpre isso).

## Publicar com o EAS (sem precisar de Xcode nem Android Studio)

Contas necessárias:
- **Apple Developer Program:** 99 USD por ano.
- **Google Play Console:** 25 USD, pagamento único. Contas pessoais criadas depois de 13/11/2023 têm de fazer um **teste fechado com pelo menos 12 testadores durante 14 dias seguidos** antes de publicar.

Passos:
```bash
npm install -g eas-cli        # ou usa: npx eas-cli@latest …
eas login                     # conta Expo (grátis)
eas init                      # liga o projeto à tua conta Expo
eas build --platform android  # gera o .aab para a Play Store
eas build --platform ios      # gera o .ipa para a App Store
eas submit --platform android
eas submit --platform ios
```
O ficheiro `eas.json` já tem os perfis `development`, `preview` (APK para testar) e `production`.

## Ligar contas (próximo passo)

O estado da app está todo em `src/store/AppStore.js`. Para sincronizar entre telemóveis e famílias:
1. Cria um projeto **Supabase** ou **Firebase**.
2. Junta “Entrar com a Apple” (`expo-apple-authentication`) e “Entrar com o Google”.
3. Em `continueAsGuest`/`saveAnimal`/…, grava também no servidor. Os dados do modo sem registo podem ser enviados para a conta nova no primeiro login.

## Próximas ideias

- Notificações quando o saco está a acabar ou o preço baixa (`expo-notifications`).
- Convidar pessoas para a casa.
- Histórico de peso do animal.
- Ligações de afiliado nas lojas (modelo de negócio).
