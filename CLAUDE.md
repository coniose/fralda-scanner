# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Contexto do projeto

**FraldaScanner** é um protótipo MVP de app mobile que simula o escaneamento de fraldas na gôndola do supermercado, exibindo um card gamificado com custo-benefício comparativo. O objetivo é gravar um vídeo demonstrativo viral (TikTok/Instagram/YouTube). Todos os dados de comparação, lojas e avaliações são mockados — só a câmera e o GPS são reais.

O diretório raiz (`image_to_cost/`) é um virtualenv Python que pode ser ignorado. O app fica em `fralda-scanner/`.

## Comandos

Todos os comandos devem ser rodados dentro de `fralda-scanner/`:

```bash
cd fralda-scanner

npm install

# Rodar no Expo Go (celular na mesma rede Wi-Fi)
npx expo start

# Rodar diretamente no Android
npx expo start --android

# Build APK para instalar no celular
eas build -p android --profile preview   # requer: npm install -g eas-cli && eas login
```

## Variável de ambiente

Para o escaneamento real via Claude Vision funcionar, crie `fralda-scanner/.env`:

```
EXPO_PUBLIC_ANTHROPIC_KEY=sk-ant-...
```

Sem a chave, o app cai automaticamente no fluxo mock — a demo funciona normalmente.

## Arquitetura

O app é **single-file** (`App.js`) — todos os componentes, estilos e dados vivem nesse arquivo.

### Fluxo de estados (máquina de estados em `App`)

```
idle
  → [ESCANEAR PRODUTO]
      → analyzing (foto tirada, chamada Claude Vision em andamento)
          → detected: sim → textDetecting (bounding box real) → showCard (InStorePanel)
          → detected: não → scanning (mock) → textDetecting → showCard (InStorePanel)
          → erro de rede → scanning (mock) → ...
  → [BUSCAR SIMILARES MELHORES] → showMap (MapSearchScreen)
      → [COMPARAR] → CompareScreen (slide da direita sobre MapSearchScreen)
  → [FECHAR] → idle
```

- `analyzing`: foto sendo enviada à API; badge "Claude Vision analisando..." aparece no HUD
- `scanning`: linha de scan percorre a caixa de foco (fluxo mock)
- `textDetecting`: crosshair anima até o texto + efeito de digitação da marca; se `brandBox` existe, usa `BrandBoundingBox` (resultado real); se não, `TextDetectionOverlay` (mock)
- `detected`: borda glowing pulsa ao redor da caixa de foco
- `showCard`: `InStorePanel` desliza de baixo com alternativas na loja atual + GPS real

### Claude Vision (`analyzeWithClaude`)

Chama `claude-opus-4-5` via fetch direto à API Anthropic. Envia a foto em base64 e espera JSON no formato:

```json
{"detected": true, "brand": "HUGGIES", "line": "Supreme Care", "type": "FRALDA DESCARTÁVEL",
 "textBox": {"top": 22, "left": 8, "width": 72, "height": 19}, "confidence": 94}
```

O `textBox` usa porcentagens da tela (0–100) e alimenta `BrandBoundingBox` para desenhar o retângulo sobre o texto real detectado.

### Componentes principais

| Componente | Responsabilidade |
|---|---|
| `ScanOverlay` | Overlay da câmera: sombras laterais, cantos tech, linha de scan, borda glowing |
| `TextDetectionOverlay` | Crosshair animado + efeito de digitação da marca (fluxo mock sem Claude Vision) |
| `BrandBoundingBox` | Retângulo sobre o texto real detectado pelo Claude, com label pulsante |
| `FloatingLabelsOverlay` | Labels flutuantes sobre a câmera estilo Cal AI (preço, eficiência, marca) |
| `StatBar` | Barra animada de atributo individual (Absorção, Maciez, etc.) |
| `InStorePanel` | Bottom sheet principal: GPS real, produto escaneado resumido, alternativas na loja |
| `MapSearchScreen` | Tela full-screen com mapa fake + radar pulsante + pins das lojas próximas |
| `FakeMap` | Background de mapa vetorial desenhado com `View`s (sem biblioteca de mapas) |
| `MapPin` | Pin de loja com balão de info, preço, eficiência e badge "MELHOR OPÇÃO" |
| `CompareScreen` | Grade 2×2 com 4 produtos, prós/contras e recomendação de risco por IA |
| `App` | Orquestra todos os estados, permissão de câmera, GPS e ref da câmera |

### Dados mockados

Todos os dados ficam no topo de `App.js` como constantes:

- `PRODUCT` — produto escaneado (Huggies Supreme Care), com `stats[]`, `efficiency`, `price`
- `IN_STORE` — alternativas na loja atual com `brand`, `costPerUnit`, `savings`, `rating`, `reviews`, `stock`, `sources`
- `NEARBY` — lojas próximas para o mapa, com coordenadas relativas `px`/`py` (0–1) sobre `MAP_H`
- `COMPARE_DATA` — 4 produtos para a grade comparativa, com `pros[]`, `cons[]`, `aiRec` e `aiRisk` (`low`/`medium`/`high`)
- `FLOAT_LABELS` — labels flutuantes da câmera com posição relativa `rx`/`ry` dentro da `BOX`

### Design system

Paleta espacial/minimalista definida como constantes logo acima de `StyleSheet.create`:

```js
BLUE    = '#3B6EEA'                  // único accent color — bordas ativas, badges, botões
W100    = '#FFFFFF'                  // texto primário
W65     = 'rgba(255,255,255,0.65)'   // texto secundário
W35     = 'rgba(255,255,255,0.35)'   // texto terciário / labels
W12     = 'rgba(255,255,255,0.12)'   // bordas / divisores
W06     = 'rgba(255,255,255,0.06)'   // superfícies elevadas / tracks
GLASS   = 'rgba(8,8,8,0.88)'        // frosted glass — fundo dos painéis
BG      = '#000000'                  // fundo absoluto
SCAN_L  = 'rgba(255,255,255,0.22)'  // scan line / cantos do overlay
```

Os aliases (`ORANGE`, `AMBER`, `CREAM`, `NEON`, etc.) existem por compatibilidade com código antigo — todos apontam para as constantes acima e não representam cores distintas.

### Animações

Usa `Animated` da React Native. O plugin `react-native-reanimated/plugin` em `babel.config.js` é obrigatório — sem ele animações de `react-native-reanimated` quebram silenciosamente. A câmera usa `CameraView` do `expo-camera` com ref para `takePictureAsync`.
