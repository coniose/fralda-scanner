# Como rodar o FraldaScanner no seu celular

## Opção 1 — Expo Go (mais rápido, ideal para filmar)

1. Instale o Node.js: https://nodejs.org
2. Abra o terminal nesta pasta e rode:

```bash
npm install
npx expo start
```

3. No celular, instale o app **Expo Go** (Play Store)
4. Escaneie o QR code que aparece no terminal
5. O app abre direto no seu celular ✓

> O celular e o computador precisam estar na mesma rede Wi-Fi.

---

## Opção 2 — Gerar APK (para instalar direto)

1. Instale a CLI do Expo:

```bash
npm install -g eas-cli
eas login
```

2. Crie uma conta gratuita em https://expo.dev

3. Rode o build:

```bash
eas build -p android --profile preview
```

4. Baixe o `.apk` gerado e instale no celular via "Fontes desconhecidas"

---

## Como usar para filmar

1. Abra o app — a câmera abre automaticamente
2. Aponte para qualquer embalagem de fralda
3. Toque em **ESCANEAR PRODUTO**
4. A animação de scan aparece (~2 segundos)
5. O contorno glowing aparece no produto
6. O card Pokémon desliza de baixo com os stats animados

**Dica de filmagem:** grave em modo portrait, iluminação boa na gôndola, e faça a tomada em terceira pessoa para aparecer a mão + tela + produto ao mesmo tempo.
