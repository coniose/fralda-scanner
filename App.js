import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions, StatusBar, Platform, ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

const { width: SW, height: SH } = Dimensions.get('window');

const BOX_W    = SW * 0.75;
const BOX_H    = BOX_W * 0.55;
const BOX_LEFT = (SW - BOX_W) / 2;
const BOX_TOP  = SH * 0.22;

// ─── Labels flutuantes sobre o produto (padrão Cal AI) ───────────────────────
const FLOAT_LABELS = [
  { text: 'HUGGIES',   sub: 'Supreme Care',    rx: 0.03, ry: 0.05, color: '#FFD700', delay: 0   },
  { text: 'R$ 59,90',  sub: 'PREÇO ATUAL',      rx: 0.56, ry: 0.05, color: '#00E5FF', delay: 220 },
  { text: '84%',       sub: 'EFICIÊNCIA',        rx: 0.34, ry: 0.56, color: '#00FF87', delay: 440 },
  { text: 'PREMIUM',   sub: 'FRALDA DESC.',      rx: 0.03, ry: 0.54, color: '#B388FF', delay: 660 },
];

// ─── Dados mockados ───────────────────────────────────────────────────────────
const PRODUCT = {
  brand: 'HUGGIES',
  line: 'Supreme Care',
  type: 'FRALDA DESCARTÁVEL',
  rarity: 'PREMIUM',
  rarityColor: '#FFD700',
  stats: [
    { label: 'Absorção',        value: 94, color: '#00E5FF' },
    { label: 'Maciez',          value: 88, color: '#B388FF' },
    { label: 'Ajuste',          value: 85, color: '#69F0AE' },
    { label: 'Custo-Benefício', value: 76, color: '#FF6E40' },
  ],
  efficiency: 84,
  price: 'R$ 59,90',
};

const NEARBY = [
  {
    name: 'Supermercado Extra',
    initial: 'E',
    distance: '0,3 km',
    product: 'Pampers Premium Care',
    price: 'R$ 54,90',
    efficiency: 91,
    isBest: false,
    px: 0.68, py: 0.28,
    color: '#00E5FF',
  },
  {
    name: 'Carrefour',
    initial: 'C',
    distance: '0,8 km',
    product: 'Pampers Premium Care',
    price: 'R$ 52,90',
    efficiency: 93,
    isBest: true,
    px: 0.22, py: 0.48,
    color: '#00FF87',
  },
  {
    name: 'Assaí Atacadista',
    initial: 'A',
    distance: '1,4 km',
    product: 'Huggies Natural Care',
    price: 'R$ 55,50',
    efficiency: 86,
    isBest: false,
    px: 0.74, py: 0.63,
    color: '#B388FF',
  },
];

const COMPARE_DATA = [
  {
    brand: 'HUGGIES',
    line: 'Supreme Care',
    price: 'R$ 59,90',
    efficiency: 84,
    color: '#FFD700',
    isScanned: true,
    pros: ['Alta absorção', 'Elástico macio', 'Sem vazamentos noturnos'],
    cons: ['Preço elevado', 'Aba adesiva pode soltar'],
    aiRec: 'Bom para pele sensível e uso noturno. Risco baixo de não atender.',
    aiRisk: 'low',
  },
  {
    brand: 'PAMPERS',
    line: 'Premium Care',
    price: 'R$ 52,90',
    efficiency: 93,
    color: '#00FF87',
    isBest: true,
    pros: ['Indicador de umidade', 'Pele mais seca', 'Alta disponibilidade'],
    cons: ['Pode apertar na cintura', 'Preço ainda elevado'],
    aiRec: 'Melhor custo-benefício da região. Economia de R$ 7,00. Risco muito baixo.',
    aiRisk: 'low',
  },
  {
    brand: 'PAMPERS',
    line: 'Confort Sec',
    price: 'R$ 38,90',
    efficiency: 71,
    color: '#00E5FF',
    pros: ['Preço acessível', 'Fácil de encontrar'],
    cons: ['Absorção inferior', 'Pode irritar pele sensível'],
    aiRec: 'Risco moderado. Adequado para uso diurno curto. Evitar uso prolongado.',
    aiRisk: 'medium',
  },
  {
    brand: 'POPOM',
    line: 'Baby',
    price: 'R$ 24,90',
    efficiency: 55,
    color: '#FF6E40',
    pros: ['Muito acessível', 'Opção emergencial'],
    cons: ['Absorção limitada', 'Vazamentos relatados', 'Textura mais rígida'],
    aiRec: 'Alto risco para pele sensível. Apenas para uso emergencial.',
    aiRisk: 'high',
  },
];

// ─── StatBar ──────────────────────────────────────────────────────────────────
function StatBar({ label, value, color, delay }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: value / 100, duration: 800, delay, useNativeDriver: false }).start();
  }, []);
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statTrack}>
        <Animated.View style={[styles.statFill, {
          backgroundColor: color,
          width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }]} />
        <View style={[styles.statGlow, { shadowColor: color }]} />
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

// ─── ProductCard ──────────────────────────────────────────────────────────────
function ProductCard({ onClose, onSearchSimilar }) {
  const slideAnim  = useRef(new Animated.Value(SH)).current;
  const effAnim    = useRef(new Animated.Value(0)).current;
  const pulseAnim  = useRef(new Animated.Value(1)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;
  const btnScale   = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }).start();
    Animated.timing(effAnim, { toValue: PRODUCT.efficiency / 100, duration: 1200, delay: 400, useNativeDriver: false }).start();
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.04, duration: 600, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,    duration: 600, useNativeDriver: true }),
    ])).start();
    // Botão aparece depois que o card está totalmente visível
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(btnOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(btnScale,   { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
      ]).start();
    }, 900);
  }, []);

  const effColor = effAnim.interpolate({
    inputRange: [0, 0.5, 0.75, 1],
    outputRange: ['#FF1744', '#FF6E40', '#FFD740', '#00E676'],
  });

  return (
    <Animated.View style={[styles.cardWrapper, { transform: [{ translateY: slideAnim }] }]}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View>
            <Text style={[styles.cardRarity, { color: PRODUCT.rarityColor }]}>◆ {PRODUCT.rarity}</Text>
            <Text style={styles.cardBrand}>{PRODUCT.brand}</Text>
            <Text style={styles.cardLine}>{PRODUCT.line} · {PRODUCT.type}</Text>
          </View>
          <View style={styles.priceTag}>
            <Text style={styles.priceLabel}>PREÇO</Text>
            <Text style={styles.priceValue}>{PRODUCT.price}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.statsSection}>
          {PRODUCT.stats.map((s, i) => <StatBar key={s.label} {...s} delay={i * 120} />)}
        </View>

        <View style={styles.divider} />

        {/* Eficiência */}
        <View style={styles.effSection}>
          <View style={styles.effHeader}>
            <Text style={styles.effTitle}>⚡ EFICIÊNCIA GERAL</Text>
            <Text style={styles.effPercent}>{PRODUCT.efficiency}%</Text>
          </View>
          <Animated.View style={[styles.effTrack, { transform: [{ scaleX: pulseAnim }] }]}>
            <Animated.View style={[styles.effFill, {
              width: effAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              backgroundColor: effColor,
            }]} />
            {[...Array(10)].map((_, i) => (
              <View key={i} style={[styles.effSegment, { left: `${(i + 1) * 10}%` }]} />
            ))}
          </Animated.View>
        </View>

        {/* Botão buscar similares */}
        <Animated.View style={{ opacity: btnOpacity, transform: [{ scale: btnScale }], marginTop: 16 }}>
          <TouchableOpacity style={styles.searchBtn} onPress={onSearchSimilar} activeOpacity={0.8}>
            <Text style={styles.searchBtnIcon}>◎</Text>
            <Text style={styles.searchBtnText}>BUSCAR SIMILARES MELHORES</Text>
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnText}>✕  FECHAR ANÁLISE</Text>
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  );
}

// ─── Mapa falso (background) ──────────────────────────────────────────────────
function FakeMap({ mapH }) {
  const roads = [
    { x: 0, y: 0.20, w: 1, h: 0.013 },
    { x: 0, y: 0.44, w: 1, h: 0.011 },
    { x: 0, y: 0.70, w: 1, h: 0.013 },
    { x: 0.18, y: 0, w: 0.011, h: 1 },
    { x: 0.50, y: 0, w: 0.011, h: 1 },
    { x: 0.80, y: 0, w: 0.011, h: 1 },
  ];
  const blocks = [
    { x: 0, y: 0, w: 0.17, h: 0.20 },
    { x: 0.20, y: 0, w: 0.29, h: 0.20 },
    { x: 0.51, y: 0, w: 0.28, h: 0.20 },
    { x: 0.81, y: 0, w: 0.19, h: 0.20 },
    { x: 0, y: 0.21, w: 0.17, h: 0.22 },
    { x: 0.20, y: 0.21, w: 0.29, h: 0.22 },
    { x: 0.51, y: 0.21, w: 0.28, h: 0.22 },
    { x: 0.81, y: 0.21, w: 0.19, h: 0.22 },
    { x: 0, y: 0.45, w: 0.17, h: 0.24 },
    { x: 0.20, y: 0.45, w: 0.29, h: 0.24 },
    { x: 0.51, y: 0.45, w: 0.28, h: 0.24 },
    { x: 0.81, y: 0.45, w: 0.19, h: 0.24 },
    { x: 0, y: 0.71, w: 0.17, h: 0.29 },
    { x: 0.20, y: 0.71, w: 0.29, h: 0.29 },
    { x: 0.51, y: 0.71, w: 0.28, h: 0.29 },
    { x: 0.81, y: 0.71, w: 0.19, h: 0.29 },
  ];
  return (
    <View style={{ width: SW, height: mapH, backgroundColor: '#0D1525', overflow: 'hidden' }}>
      {blocks.map((b, i) => (
        <View key={`b${i}`} style={{
          position: 'absolute',
          left: b.x * SW, top: b.y * mapH,
          width: b.w * SW, height: b.h * mapH,
          backgroundColor: '#0A1020',
        }} />
      ))}
      {roads.map((r, i) => (
        <View key={`r${i}`} style={{
          position: 'absolute',
          left: r.x * SW, top: r.y * mapH,
          width: r.w * SW, height: r.h * mapH,
          backgroundColor: '#131F35',
        }} />
      ))}
    </View>
  );
}

// ─── Pin de loja no mapa ──────────────────────────────────────────────────────
function MapPin({ store, mapH, anim }) {
  const x = store.px * SW;
  const y = store.py * mapH;

  return (
    <Animated.View style={{
      position: 'absolute',
      left: x - 22,
      top:  y - 70,
      alignItems: 'center',
      opacity: anim,
      transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }],
    }}>
      {/* Balão de info */}
      <View style={[styles.pinBubble, store.isBest && styles.pinBubbleBest]}>
        <Text style={[styles.pinName, store.isBest && styles.pinNameBest]}>{store.name}</Text>
        <Text style={styles.pinProduct} numberOfLines={1}>{store.product}</Text>
        <View style={styles.pinPriceRow}>
          <Text style={[styles.pinPrice, store.isBest && { color: '#00FF87' }]}>{store.price}</Text>
          <View style={[styles.pinEffTag, { backgroundColor: store.color + '22', borderColor: store.color + '55' }]}>
            <Text style={[styles.pinEffText, { color: store.color }]}>{store.efficiency}%</Text>
          </View>
        </View>
        {store.isBest && (
          <View style={styles.bestBadge}>
            <Text style={styles.bestBadgeText}>★ MELHOR OPÇÃO</Text>
          </View>
        )}
      </View>
      {/* Haste + ponto */}
      <View style={[styles.pinStem, { backgroundColor: store.color }]} />
      <View style={[styles.pinDot, { backgroundColor: store.color, shadowColor: store.color }]} />
    </Animated.View>
  );
}

// ─── Tela de busca no mapa ────────────────────────────────────────────────────
function MapSearchScreen({ onClose }) {
  const [showCompare, setShowCompare] = useState(false);
  const MAP_H      = SH * 0.62;
  const USER_X     = SW * 0.50;
  const USER_Y     = MAP_H * 0.46;

  const slideAnim  = useRef(new Animated.Value(SH)).current;
  const radar1S    = useRef(new Animated.Value(0)).current;
  const radar1O    = useRef(new Animated.Value(0.7)).current;
  const radar2S    = useRef(new Animated.Value(0)).current;
  const radar2O    = useRef(new Animated.Value(0.7)).current;
  const pinAnims   = useRef(NEARBY.map(() => new Animated.Value(0))).current;
  const resultAnim = useRef(new Animated.Value(0)).current;
  const [phase, setPhase] = useState('searching');

  useEffect(() => {
    Animated.spring(slideAnim, { toValue: 0, tension: 55, friction: 11, useNativeDriver: true }).start();

    // Radar duplo
    function pulseRadar(scale, opacity, delay) {
      Animated.loop(Animated.parallel([
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(scale,   { toValue: 1, duration: 1600, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(opacity, { toValue: 0, duration: 1600, useNativeDriver: true }),
        ]),
      ])).start();
    }
    pulseRadar(radar1S, radar1O, 0);
    pulseRadar(radar2S, radar2O, 700);

    // Após 2.2s mostrar pins
    setTimeout(() => {
      setPhase('results');
      NEARBY.forEach((_, i) => {
        setTimeout(() => {
          Animated.spring(pinAnims[i], { toValue: 1, tension: 90, friction: 8, useNativeDriver: true }).start();
        }, i * 450);
      });
      // Painel de resultado
      setTimeout(() => {
        Animated.timing(resultAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
      }, NEARBY.length * 450 + 300);
    }, 2200);
  }, []);

  const best = NEARBY.find(s => s.isBest);
  const RADAR_SIZE = SW * 0.85;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.mapScreen, {
      transform: [{ translateY: slideAnim }],
    }]}>
      <StatusBar barStyle="light-content" />

      {/* Top bar */}
      <View style={styles.mapTopBar}>
        <TouchableOpacity onPress={onClose} style={styles.mapBackBtn}>
          <Text style={styles.mapBackText}>← VOLTAR</Text>
        </TouchableOpacity>
        <Text style={styles.mapTitle}>
          {phase === 'searching' ? '◎  BUSCANDO NA REGIÃO...' : '◎  RESULTADOS ENCONTRADOS'}
        </Text>
        <View style={{ width: 70 }} />
      </View>

      {/* Mapa */}
      <View style={{ width: SW, height: MAP_H, overflow: 'hidden' }}>
        <FakeMap mapH={MAP_H} />

        {/* Radar expandindo */}
        {[{ s: radar1S, o: radar1O }, { s: radar2S, o: radar2O }].map(({ s, o }, i) => (
          <Animated.View key={i} style={{
            position: 'absolute',
            left: USER_X - RADAR_SIZE / 2,
            top:  USER_Y - RADAR_SIZE / 2,
            width: RADAR_SIZE, height: RADAR_SIZE,
            borderRadius: RADAR_SIZE / 2,
            borderWidth: 1.5,
            borderColor: '#00E5FF',
            opacity: o,
            transform: [{ scale: s }],
          }} />
        ))}

        {/* Ponto do usuário */}
        <View style={[styles.userDot, { left: USER_X - 10, top: USER_Y - 10 }]}>
          <View style={styles.userDotInner} />
        </View>
        <View style={[styles.userLabel, { left: USER_X - 25, top: USER_Y + 14 }]}>
          <Text style={styles.userLabelText}>VOCÊ</Text>
        </View>

        {/* Pins das lojas */}
        {phase === 'results' && NEARBY.map((store, i) => (
          <MapPin key={store.name} store={store} mapH={MAP_H} anim={pinAnims[i]} />
        ))}
      </View>

      {/* Painel de resultado */}
      <Animated.View style={[styles.resultPanel, { opacity: resultAnim, transform: [{
        translateY: resultAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }),
      }]}]}>
        <View style={styles.resultHeader}>
          <Text style={styles.resultHeaderText}>★ MELHOR PREÇO NA REGIÃO</Text>
        </View>
        <View style={styles.resultBody}>
          <View style={{ flex: 1 }}>
            <Text style={styles.resultStore}>{best.name}</Text>
            <Text style={styles.resultProduct}>{best.product}</Text>
            <Text style={styles.resultDist}>📍 {best.distance} de distância</Text>
          </View>
          <View style={styles.resultRight}>
            <Text style={styles.resultPrice}>{best.price}</Text>
            <View style={styles.resultEffRow}>
              <Text style={styles.resultEff}>{best.efficiency}%</Text>
              <Text style={styles.resultEffLabel}> eficiência</Text>
            </View>
            <Text style={styles.resultSaving}>
              Economia: R$ {(59.90 - 52.90).toFixed(2)}
            </Text>
          </View>
        </View>
        <View style={styles.resultBtns}>
          <TouchableOpacity style={[styles.navigateBtn, { flex: 1 }]} activeOpacity={0.85}>
            <Text style={styles.navigateBtnText}>COMO CHEGAR →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.compareBtn} onPress={() => setShowCompare(true)} activeOpacity={0.85}>
            <Text style={styles.compareBtnText}>COMPARAR</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {showCompare && <CompareScreen onClose={() => setShowCompare(false)} />}

      {/* Loading spinner enquanto busca */}
      {phase === 'searching' && (
        <View style={styles.searchingBox}>
          <Text style={styles.searchingText}>Analisando preços e eficiência{'\n'}em lojas próximas...</Text>
        </View>
      )}
    </Animated.View>
  );
}

// ─── Tela de comparação 2x2 ──────────────────────────────────────────────────
function CompareScreen({ onClose }) {
  const slideAnim = useRef(new Animated.Value(SW)).current;
  const cardAnims = useRef(COMPARE_DATA.map(() => new Animated.Value(0))).current;

  const RISK_COLOR = { low: '#00FF87', medium: '#FFD700', high: '#FF4444' };
  const RISK_LABEL = { low: 'RISCO BAIXO', medium: 'RISCO MÉDIO', high: 'RISCO ALTO' };

  useEffect(() => {
    Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }).start();
    COMPARE_DATA.forEach((_, i) => {
      setTimeout(() => {
        Animated.spring(cardAnims[i], { toValue: 1, tension: 80, friction: 10, useNativeDriver: true }).start();
      }, i * 120);
    });
  }, []);

  const CARD_W = (SW - 36) / 2;
  const CARD_H = (SH - 140) / 2;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.compareScreen, {
      transform: [{ translateX: slideAnim }],
    }]}>
      <StatusBar barStyle="light-content" />

      {/* Top bar */}
      <View style={styles.compareTopBar}>
        <TouchableOpacity onPress={onClose} style={styles.mapBackBtn}>
          <Text style={styles.mapBackText}>← VOLTAR</Text>
        </TouchableOpacity>
        <Text style={styles.compareTitle}>COMPARATIVO</Text>
        <View style={{ width: 70 }} />
      </View>

      {/* Grid 2x2 */}
      <ScrollView contentContainerStyle={styles.compareGrid} showsVerticalScrollIndicator={false}>
        {COMPARE_DATA.map((p, i) => (
          <Animated.View key={p.brand + p.line} style={[styles.compareCard, {
            width: CARD_W,
            borderColor: p.isScanned ? '#FFD700' : p.isBest ? '#00FF87' : '#1A2744',
            opacity: cardAnims[i],
            transform: [{ scale: cardAnims[i].interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) }],
          }]}>
            {/* Header do card */}
            <View style={[styles.cCardHeader, { borderBottomColor: p.color + '44' }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cBrand, { color: p.color }]}>{p.brand}</Text>
                <Text style={styles.cLine}>{p.line}</Text>
              </View>
              {p.isScanned && <View style={styles.scannedBadge}><Text style={styles.scannedText}>ESCANEADO</Text></View>}
              {p.isBest  && <View style={styles.bestCardBadge}><Text style={styles.bestCardText}>★ MELHOR</Text></View>}
            </View>

            {/* Preço + eficiência */}
            <View style={styles.cMetrics}>
              <Text style={[styles.cPrice, { color: p.isBest ? '#00FF87' : '#fff' }]}>{p.price}</Text>
              <View style={[styles.cEffPill, { backgroundColor: p.color + '22', borderColor: p.color + '55' }]}>
                <Text style={[styles.cEffText, { color: p.color }]}>{p.efficiency}%</Text>
              </View>
            </View>

            {/* Prós */}
            <View style={styles.cSection}>
              <Text style={styles.cSectionLabel}>✓ PONTOS FORTES</Text>
              {p.pros.map(pro => (
                <View key={pro} style={styles.cBulletRow}>
                  <View style={[styles.cBullet, { backgroundColor: '#00FF87' }]} />
                  <Text style={styles.cBulletText} numberOfLines={2}>{pro}</Text>
                </View>
              ))}
            </View>

            {/* Contras */}
            <View style={styles.cSection}>
              <Text style={[styles.cSectionLabel, { color: '#FF4444' }]}>✗ PONTOS FRACOS</Text>
              {p.cons.slice(0, 2).map(con => (
                <View key={con} style={styles.cBulletRow}>
                  <View style={[styles.cBullet, { backgroundColor: '#FF4444' }]} />
                  <Text style={styles.cBulletText} numberOfLines={2}>{con}</Text>
                </View>
              ))}
            </View>

            {/* Recomendação IA */}
            <View style={[styles.cAiBox, { borderColor: RISK_COLOR[p.aiRisk] + '44', backgroundColor: RISK_COLOR[p.aiRisk] + '0D' }]}>
              <View style={styles.cAiHeader}>
                <Text style={styles.cAiIcon}>◎</Text>
                <Text style={[styles.cRiskTag, { color: RISK_COLOR[p.aiRisk] }]}>{RISK_LABEL[p.aiRisk]}</Text>
              </View>
              <Text style={styles.cAiText}>{p.aiRec}</Text>
            </View>
          </Animated.View>
        ))}
      </ScrollView>
    </Animated.View>
  );
}

// ─── Overlay OCR ──────────────────────────────────────────────────────────────
function TextDetectionOverlay({ active }) {
  const chTransX   = useRef(new Animated.Value(0)).current;
  const chTransY   = useRef(new Animated.Value(0)).current;
  const chScale    = useRef(new Animated.Value(1)).current;
  const chOpacity  = useRef(new Animated.Value(1)).current;
  const boxOpacity = useRef(new Animated.Value(0)).current;
  const boxScale   = useRef(new Animated.Value(0.5)).current;
  const lblOpacity = useRef(new Animated.Value(0)).current;
  const cnfOpacity = useRef(new Animated.Value(0)).current;
  const [typedText, setTypedText] = useState('');

  const BRAND  = 'HUGGIES';
  const DBOX_W = BOX_W * 0.62;
  const DBOX_H = 40;
  const centerX = BOX_LEFT + BOX_W / 2;
  const centerY = BOX_TOP  + BOX_H / 2;
  const targetX = BOX_LEFT + BOX_W * 0.07;
  const targetY = BOX_TOP  + BOX_H * 0.13;

  useEffect(() => {
    if (!active) {
      [chTransX, chTransY, chScale, chOpacity, boxOpacity, boxScale, lblOpacity, cnfOpacity]
        .forEach(a => { a.stopAnimation(); });
      chTransX.setValue(0);  chTransY.setValue(0);
      chScale.setValue(1);   chOpacity.setValue(1);
      boxOpacity.setValue(0); boxScale.setValue(0.5);
      lblOpacity.setValue(0); cnfOpacity.setValue(0);
      setTypedText('');
      return;
    }
    let typingTimer;
    Animated.parallel([
      Animated.timing(chTransX, { toValue: targetX - centerX, duration: 420, useNativeDriver: true }),
      Animated.timing(chTransY, { toValue: targetY - centerY, duration: 420, useNativeDriver: true }),
    ]).start();
    setTimeout(() => {
      Animated.sequence([
        Animated.timing(chScale,   { toValue: 0.4, duration: 100, useNativeDriver: true }),
        Animated.timing(chScale,   { toValue: 1.4, duration: 140, useNativeDriver: true }),
        Animated.timing(chOpacity, { toValue: 0,   duration: 120, useNativeDriver: true }),
      ]).start();
    }, 400);
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(boxOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(boxScale,   { toValue: 1, tension: 120, friction: 8, useNativeDriver: true }),
      ]).start();
    }, 560);
    setTimeout(() => {
      Animated.timing(lblOpacity, { toValue: 1, duration: 140, useNativeDriver: true }).start();
      let i = 0;
      typingTimer = setInterval(() => {
        i++;
        setTypedText(BRAND.slice(0, i));
        if (i >= BRAND.length) {
          clearInterval(typingTimer);
          setTimeout(() => {
            Animated.timing(cnfOpacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
          }, 180);
        }
      }, 72);
    }, 720);
    return () => { if (typingTimer) clearInterval(typingTimer); };
  }, [active]);

  if (!active) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[styles.crosshair, {
        left: centerX - 15, top: centerY - 15,
        opacity: chOpacity,
        transform: [{ translateX: chTransX }, { translateY: chTransY }, { scale: chScale }],
      }]}>
        <View style={styles.chLineH} />
        <View style={styles.chLineV} />
        <View style={[styles.chC, styles.chTL]} />
        <View style={[styles.chC, styles.chTR]} />
        <View style={[styles.chC, styles.chBL]} />
        <View style={[styles.chC, styles.chBR]} />
      </Animated.View>

      <Animated.View style={[styles.detectBox, {
        left: targetX, top: targetY,
        width: DBOX_W, height: DBOX_H,
        opacity: boxOpacity,
        transform: [{ scale: boxScale }],
      }]}>
        <View style={[styles.dCorner, styles.dTL]} />
        <View style={[styles.dCorner, styles.dTR]} />
        <View style={[styles.dCorner, styles.dBL]} />
        <View style={[styles.dCorner, styles.dBR]} />
      </Animated.View>

      <Animated.View style={[styles.brandReadout, { left: targetX, top: targetY + DBOX_H + 7, opacity: lblOpacity }]}>
        <View style={styles.marcaTag}><Text style={styles.marcaTagText}>MARCA</Text></View>
        <Text style={styles.typedBrand}>
          {typedText}
          {typedText.length < BRAND.length ? <Text style={{ opacity: 0.6 }}>_</Text> : null}
        </Text>
      </Animated.View>

      <Animated.View style={[styles.confBadge, { left: targetX, top: targetY + DBOX_H + 37, opacity: cnfOpacity }]}>
        <Text style={styles.confText}>⬥ 98% CONFIANÇA</Text>
      </Animated.View>
    </View>
  );
}

// ─── Labels flutuantes sobre câmera ──────────────────────────────────────────
function FloatingLabelsOverlay({ active }) {
  const labelAnims = useRef(FLOAT_LABELS.map(() => new Animated.Value(0))).current;
  const floatAnims = useRef(FLOAT_LABELS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (!active) {
      labelAnims.forEach(a => { a.stopAnimation(); a.setValue(0); });
      floatAnims.forEach(a => { a.stopAnimation(); a.setValue(0); });
      return;
    }
    FLOAT_LABELS.forEach((_, i) => {
      setTimeout(() => {
        Animated.spring(labelAnims[i], {
          toValue: 1, tension: 90, friction: 8, useNativeDriver: true,
        }).start();
        Animated.loop(Animated.sequence([
          Animated.timing(floatAnims[i], { toValue: 1, duration: 1400, useNativeDriver: true }),
          Animated.timing(floatAnims[i], { toValue: 0, duration: 1400, useNativeDriver: true }),
        ])).start();
      }, FLOAT_LABELS[i].delay);
    });
  }, [active]);

  if (!active) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {FLOAT_LABELS.map((label, i) => {
        const x = BOX_LEFT + label.rx * BOX_W;
        const y = BOX_TOP  + label.ry * BOX_H;
        const floatY = floatAnims[i].interpolate({ inputRange: [0, 1], outputRange: [0, -7] });

        return (
          <Animated.View key={label.text + i} style={{
            position: 'absolute', left: x, top: y,
            opacity: labelAnims[i],
            transform: [
              { scale: labelAnims[i].interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) },
              { translateY: floatY },
            ],
          }}>
            {/* Pill */}
            <View style={[styles.floatPill, {
              borderColor: label.color + '70',
              shadowColor: label.color,
            }]}>
              <Text style={[styles.floatMain, { color: label.color }]}>{label.text}</Text>
              <Text style={styles.floatSub}>{label.sub}</Text>
            </View>
            {/* Conector */}
            <View style={{ alignItems: 'flex-start', paddingLeft: 10 }}>
              <View style={{ width: 1.5, height: 10, backgroundColor: label.color, opacity: 0.5 }} />
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: label.color, opacity: 0.8, marginLeft: -2 }} />
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}

// ─── ScanOverlay ──────────────────────────────────────────────────────────────
function ScanOverlay({ scanning, textDetecting, detected }) {
  const scanLine    = useRef(new Animated.Value(0)).current;
  const glowAnim    = useRef(new Animated.Value(0)).current;
  const cornerScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (scanning) {
      Animated.loop(
        Animated.timing(scanLine, { toValue: 1, duration: 1500, useNativeDriver: true })
      ).start();
    }
    if (textDetecting) scanLine.stopAnimation();
    if (detected) {
      Animated.spring(cornerScale, { toValue: 1, tension: 80, useNativeDriver: true }).start();
      Animated.loop(Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1,   duration: 500, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.3, duration: 500, useNativeDriver: true }),
      ])).start();
    }
  }, [scanning, textDetecting, detected]);

  if (!scanning && !textDetecting && !detected) return null;

  const scanY = scanLine.interpolate({ inputRange: [0, 1], outputRange: [BOX_TOP, BOX_TOP + BOX_H] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[styles.shade, { left: 0, width: BOX_LEFT, top: BOX_TOP, height: BOX_H }]} />
      <View style={[styles.shade, { right: 0, width: BOX_LEFT, top: BOX_TOP, height: BOX_H }]} />
      <View style={[styles.shade, { top: 0, height: BOX_TOP, width: SW }]} />
      <View style={[styles.shade, { top: BOX_TOP + BOX_H, bottom: 0, width: SW }]} />
      {detected && (
        <Animated.View style={[styles.detectedBorder, {
          left: BOX_LEFT, top: BOX_TOP, width: BOX_W, height: BOX_H, opacity: glowAnim,
        }]} />
      )}
      {[
        [styles.cornerTL, { left: BOX_LEFT,              top: BOX_TOP }],
        [styles.cornerTR, { left: BOX_LEFT + BOX_W - 20, top: BOX_TOP }],
        [styles.cornerBL, { left: BOX_LEFT,              top: BOX_TOP + BOX_H - 20 }],
        [styles.cornerBR, { left: BOX_LEFT + BOX_W - 20, top: BOX_TOP + BOX_H - 20 }],
      ].map(([cs, pos], i) => (
        <Animated.View key={i} style={[styles.corner, cs, pos, { transform: [{ scale: cornerScale }] }]} />
      ))}
      {scanning && (
        <Animated.View style={[styles.scanLine, { left: BOX_LEFT, width: BOX_W, transform: [{ translateY: scanY }] }]} />
      )}
      <View style={[styles.scanLabel, { top: BOX_TOP + BOX_H + 14, left: BOX_LEFT, width: BOX_W }]}>
        <Text style={styles.scanLabelText}>
          {detected ? '✓  PRODUTO IDENTIFICADO' : textDetecting ? '◈  RECONHECENDO MARCA...' : '◈  ANALISANDO...'}
        </Text>
      </View>
    </View>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning,      setScanning]      = useState(false);
  const [textDetecting, setTextDetecting] = useState(false);
  const [detected,      setDetected]      = useState(false);
  const [showFloating,  setShowFloating]  = useState(false);
  const [showCard,      setShowCard]      = useState(false);
  const [showMap,       setShowMap]       = useState(false);
  const timerRef = useRef(null);

  function handleScan() {
    if (scanning || textDetecting || detected) return;
    setScanning(true);
    timerRef.current = setTimeout(() => {
      setScanning(false);
      setTextDetecting(true);
      setTimeout(() => {
        setTextDetecting(false);
        setDetected(true);
        // Labels flutuantes aparecem 300ms após o glow
        setTimeout(() => {
          setShowFloating(true);
          // Card sobe depois que o usuário viu todos os labels (1.8s)
          setTimeout(() => {
            setShowFloating(false);
            setShowCard(true);
          }, 1800);
        }, 300);
      }, 1900);
    }, 2000);
  }

  function handleClose() {
    clearTimeout(timerRef.current);
    setShowCard(false); setShowFloating(false);
    setDetected(false); setScanning(false);
    setTextDetecting(false);
  }

  function handleSearchSimilar() {
    setShowCard(false);
    setShowMap(true);
  }

  function handleMapClose() {
    setShowMap(false);
    handleClose();
  }

  if (!permission) return <View style={styles.bg} />;
  if (!permission.granted) {
    return (
      <View style={styles.permScreen}>
        <Text style={styles.permText}>Precisamos da câmera para escanear produtos</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>PERMITIR CÂMERA</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const anyActive = scanning || textDetecting || detected;

  return (
    <View style={styles.bg}>
      <StatusBar barStyle="light-content" />
      <CameraView style={StyleSheet.absoluteFill} facing="back" />

      <ScanOverlay scanning={scanning} textDetecting={textDetecting} detected={detected} />
      <TextDetectionOverlay active={textDetecting} />
      <FloatingLabelsOverlay active={showFloating} />

      <View style={styles.hud}>
        <Text style={styles.hudTitle}>◈ FRALDA SCANNER</Text>
        <View style={styles.hudDot} />
      </View>

      {!showCard && !showMap && (
        <TouchableOpacity
          style={[styles.scanBtn, anyActive && styles.scanBtnActive]}
          onPress={handleScan} activeOpacity={0.8}
        >
          <Text style={styles.scanBtnText}>
            {scanning ? 'ANALISANDO...' : textDetecting ? 'RECONHECENDO...' : detected ? 'DETECTADO ✓' : 'ESCANEAR PRODUTO'}
          </Text>
        </TouchableOpacity>
      )}

      {showCard && !showMap && (
        <ProductCard onClose={handleClose} onSearchSimilar={handleSearchSimilar} />
      )}

      {showMap && (
        <MapSearchScreen onClose={handleMapClose} />
      )}
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const NEON   = '#00E5FF';
const GOLD   = '#FFD700';
const GREEN  = '#00FF87';
const DARK   = '#0A0E1A';
const CARD   = '#0D1425';
const BORDER = '#1A2744';

const styles = StyleSheet.create({
  bg:          { flex: 1, backgroundColor: '#000' },
  permScreen:  { flex: 1, backgroundColor: DARK, justifyContent: 'center', alignItems: 'center', padding: 32 },
  permText:    { color: '#fff', fontSize: 16, textAlign: 'center', marginBottom: 24 },
  permBtn:     { backgroundColor: NEON, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 8 },
  permBtnText: { color: DARK, fontWeight: '900', fontSize: 14, letterSpacing: 1.5 },

  hud: {
    position: 'absolute', top: Platform.OS === 'android' ? 44 : 56,
    left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  hudTitle: { color: NEON, fontSize: 13, fontWeight: '900', letterSpacing: 3 },
  hudDot:   { width: 7, height: 7, borderRadius: 4, backgroundColor: GREEN },

  shade: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.55)' },
  detectedBorder: {
    position: 'absolute', borderWidth: 2, borderColor: NEON, borderRadius: 4,
    shadowColor: NEON, shadowRadius: 12, shadowOpacity: 1, shadowOffset: { width: 0, height: 0 },
  },
  corner:   { position: 'absolute', width: 20, height: 20 },
  cornerTL: { borderTopWidth: 3, borderLeftWidth: 3,   borderColor: NEON },
  cornerTR: { borderTopWidth: 3, borderRightWidth: 3,  borderColor: NEON },
  cornerBL: { borderBottomWidth: 3, borderLeftWidth: 3,  borderColor: NEON },
  cornerBR: { borderBottomWidth: 3, borderRightWidth: 3, borderColor: NEON },
  scanLine: {
    position: 'absolute', height: 2, backgroundColor: NEON, opacity: 0.8,
    shadowColor: NEON, shadowRadius: 6, shadowOpacity: 1,
  },
  scanLabel:     { position: 'absolute', alignItems: 'center' },
  scanLabelText: {
    color: NEON, fontSize: 12, fontWeight: '800', letterSpacing: 2,
    backgroundColor: 'rgba(0,229,255,0.12)', paddingHorizontal: 14, paddingVertical: 4, borderRadius: 4,
  },

  // Floating labels
  floatPill: {
    backgroundColor: 'rgba(8, 12, 24, 0.92)',
    borderWidth: 1.5, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6,
    shadowRadius: 10, shadowOpacity: 0.7, shadowOffset: { width: 0, height: 0 },
  },
  floatMain: { fontSize: 15, fontWeight: '900', letterSpacing: 1 },
  floatSub:  { fontSize: 8,  color: '#6B7FA3', fontWeight: '700', letterSpacing: 0.5, marginTop: 1 },

  // OCR overlay
  crosshair: { position: 'absolute', width: 30, height: 30 },
  chLineH:   { position: 'absolute', top: 14, left: 0, right: 0, height: 2, backgroundColor: GOLD, opacity: 0.9 },
  chLineV:   { position: 'absolute', left: 14, top: 0, bottom: 0, width: 2, backgroundColor: GOLD, opacity: 0.9 },
  chC:       { position: 'absolute', width: 9, height: 9 },
  chTL:      { top: 0, left: 0,   borderTopWidth: 2, borderLeftWidth: 2,   borderColor: GOLD },
  chTR:      { top: 0, right: 0,  borderTopWidth: 2, borderRightWidth: 2,  borderColor: GOLD },
  chBL:      { bottom: 0, left: 0,  borderBottomWidth: 2, borderLeftWidth: 2,  borderColor: GOLD },
  chBR:      { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2, borderColor: GOLD },
  detectBox: {
    position: 'absolute', borderWidth: 1.5, borderColor: GOLD, borderRadius: 3,
    backgroundColor: 'rgba(255,215,0,0.07)',
    shadowColor: GOLD, shadowRadius: 10, shadowOpacity: 0.5, shadowOffset: { width: 0, height: 0 },
  },
  dCorner: { position: 'absolute', width: 10, height: 10 },
  dTL:     { top: -1, left: -1,   borderTopWidth: 2, borderLeftWidth: 2,   borderColor: GOLD },
  dTR:     { top: -1, right: -1,  borderTopWidth: 2, borderRightWidth: 2,  borderColor: GOLD },
  dBL:     { bottom: -1, left: -1,  borderBottomWidth: 2, borderLeftWidth: 2,  borderColor: GOLD },
  dBR:     { bottom: -1, right: -1, borderBottomWidth: 2, borderRightWidth: 2, borderColor: GOLD },
  brandReadout: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 8 },
  marcaTag:     { backgroundColor: GOLD, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3 },
  marcaTagText: { color: '#000', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  typedBrand:   { color: GOLD, fontSize: 16, fontWeight: '900', letterSpacing: 3 },
  confBadge: {
    position: 'absolute', backgroundColor: 'rgba(255,215,0,0.10)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4,
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.25)',
  },
  confText: { color: GOLD, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },

  // Scan button
  scanBtn: {
    position: 'absolute', bottom: 52, alignSelf: 'center',
    borderWidth: 2, borderColor: NEON,
    paddingHorizontal: 40, paddingVertical: 16, borderRadius: 50,
    backgroundColor: 'rgba(0,229,255,0.08)',
  },
  scanBtnActive: { borderColor: GREEN, backgroundColor: 'rgba(0,255,135,0.12)' },
  scanBtnText:   { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 2 },

  // Card
  cardWrapper: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    maxHeight: SH * 0.76,
    backgroundColor: CARD, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderTopWidth: 1, borderColor: BORDER,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 36,
    shadowColor: NEON, shadowRadius: 20, shadowOpacity: 0.3, shadowOffset: { width: 0, height: -4 },
  },
  cardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardRarity:  { fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 3 },
  cardBrand:   { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  cardLine:    { fontSize: 11, color: '#6B7FA3', letterSpacing: 0.5, marginTop: 2 },
  priceTag:    { alignItems: 'flex-end' },
  priceLabel:  { fontSize: 9, color: '#6B7FA3', letterSpacing: 1.5 },
  priceValue:  { fontSize: 20, fontWeight: '900', color: '#fff' },
  divider:     { height: 1, backgroundColor: BORDER, marginVertical: 14 },
  statsSection: { gap: 10 },
  statRow:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statLabel:   { width: 110, fontSize: 11, color: '#8899BB', fontWeight: '600', letterSpacing: 0.5 },
  statTrack:   { flex: 1, height: 8, backgroundColor: '#1A2744', borderRadius: 4, overflow: 'hidden' },
  statFill:    { height: '100%', borderRadius: 4 },
  statGlow:    { ...StyleSheet.absoluteFillObject, shadowRadius: 6, shadowOpacity: 0.8, shadowOffset: { width: 0, height: 0 } },
  statValue:   { width: 28, fontSize: 12, fontWeight: '900', textAlign: 'right' },
  effSection:  { marginTop: 4 },
  effHeader:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  effTitle:    { fontSize: 11, color: '#8899BB', fontWeight: '800', letterSpacing: 1.5 },
  effPercent:  { fontSize: 11, color: '#fff', fontWeight: '900' },
  effTrack:    { height: 18, backgroundColor: '#1A2744', borderRadius: 4, overflow: 'hidden' },
  effFill:     { height: '100%', borderRadius: 4 },
  effSegment:  { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(0,0,0,0.4)' },

  // Botão buscar similares
  searchBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: 'rgba(0,255,135,0.10)',
    borderWidth: 1.5, borderColor: GREEN,
    borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20,
    shadowColor: GREEN, shadowRadius: 10, shadowOpacity: 0.25, shadowOffset: { width: 0, height: 0 },
  },
  searchBtnIcon: { color: GREEN, fontSize: 18 },
  searchBtnText: { color: GREEN, fontWeight: '900', fontSize: 13, letterSpacing: 1.5 },

  closeBtn: {
    marginTop: 12, borderWidth: 1, borderColor: BORDER,
    borderRadius: 8, paddingVertical: 12, alignItems: 'center',
  },
  closeBtnText: { color: '#6B7FA3', fontSize: 12, fontWeight: '800', letterSpacing: 2 },

  // Map screen
  mapScreen: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: DARK,
  },
  mapTopBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 44 : 56,
    paddingBottom: 12,
    backgroundColor: CARD,
    borderBottomWidth: 1, borderColor: BORDER,
  },
  mapBackBtn:  { paddingVertical: 4, paddingHorizontal: 8 },
  mapBackText: { color: NEON, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  mapTitle:    { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },

  // User dot
  userDot: {
    position: 'absolute', width: 20, height: 20,
    borderRadius: 10, backgroundColor: 'rgba(0,229,255,0.25)',
    borderWidth: 2, borderColor: NEON,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: NEON, shadowRadius: 8, shadowOpacity: 0.8, shadowOffset: { width: 0, height: 0 },
  },
  userDotInner: { width: 7, height: 7, borderRadius: 4, backgroundColor: NEON },
  userLabel: {
    position: 'absolute',
    backgroundColor: 'rgba(0,229,255,0.15)',
    paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3,
  },
  userLabelText: { color: NEON, fontSize: 8, fontWeight: '900', letterSpacing: 1 },

  // Pins
  pinBubble: {
    backgroundColor: '#0D1A2E',
    borderWidth: 1, borderColor: '#1A3055',
    borderRadius: 8, padding: 8, minWidth: 130,
    shadowColor: '#000', shadowRadius: 8, shadowOpacity: 0.6, shadowOffset: { width: 0, height: 2 },
  },
  pinBubbleBest: {
    borderColor: GREEN,
    shadowColor: GREEN, shadowRadius: 12, shadowOpacity: 0.4,
    backgroundColor: '#0A1F15',
  },
  pinName:     { color: '#fff', fontSize: 11, fontWeight: '800' },
  pinNameBest: { color: GREEN },
  pinProduct:  { color: '#6B7FA3', fontSize: 9, marginTop: 2 },
  pinPriceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  pinPrice:    { color: '#fff', fontSize: 13, fontWeight: '900' },
  pinEffTag:   { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  pinEffText:  { fontSize: 9, fontWeight: '900' },
  bestBadge:   { marginTop: 5, backgroundColor: 'rgba(0,255,135,0.15)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' },
  bestBadgeText: { color: GREEN, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  pinStem:     { width: 2, height: 10 },
  pinDot:      { width: 10, height: 10, borderRadius: 5, shadowRadius: 6, shadowOpacity: 0.8, shadowOffset: { width: 0, height: 0 } },

  // Searching overlay
  searchingBox: {
    position: 'absolute', bottom: 20, left: 20, right: 20,
    backgroundColor: 'rgba(13,20,37,0.92)',
    borderWidth: 1, borderColor: BORDER,
    borderRadius: 12, padding: 16, alignItems: 'center',
  },
  searchingText: { color: '#8899BB', fontSize: 13, textAlign: 'center', lineHeight: 20 },

  // Result panel
  resultPanel: {
    backgroundColor: CARD,
    borderTopWidth: 1, borderColor: BORDER,
    paddingHorizontal: 18, paddingTop: 14, paddingBottom: 20,
  },
  resultHeader: {
    backgroundColor: 'rgba(0,255,135,0.10)',
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5,
    alignSelf: 'flex-start', marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(0,255,135,0.25)',
  },
  resultHeaderText: { color: GREEN, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  resultBody:    { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  resultStore:   { color: '#fff', fontSize: 15, fontWeight: '900' },
  resultProduct: { color: '#6B7FA3', fontSize: 11, marginTop: 2 },
  resultDist:    { color: '#6B7FA3', fontSize: 11, marginTop: 4 },
  resultRight:   { alignItems: 'flex-end' },
  resultPrice:   { color: GREEN, fontSize: 22, fontWeight: '900' },
  resultEffRow:  { flexDirection: 'row', alignItems: 'baseline', marginTop: 2 },
  resultEff:     { color: NEON, fontSize: 13, fontWeight: '900' },
  resultEffLabel: { color: '#6B7FA3', fontSize: 10 },
  resultSaving:  { color: GOLD, fontSize: 10, fontWeight: '800', marginTop: 4 },
  resultBtns: { flexDirection: 'row', gap: 10, marginTop: 14 },
  navigateBtn: {
    backgroundColor: 'rgba(0,229,255,0.10)',
    borderWidth: 1.5, borderColor: NEON,
    borderRadius: 10, paddingVertical: 13, alignItems: 'center',
  },
  navigateBtnText: { color: NEON, fontWeight: '900', fontSize: 12, letterSpacing: 1.5 },
  compareBtn: {
    backgroundColor: 'rgba(255,215,0,0.10)',
    borderWidth: 1.5, borderColor: GOLD,
    borderRadius: 10, paddingVertical: 13, paddingHorizontal: 18, alignItems: 'center',
  },
  compareBtnText: { color: GOLD, fontWeight: '900', fontSize: 12, letterSpacing: 1.5 },

  // Compare screen
  compareScreen: {
    backgroundColor: DARK,
  },
  compareTopBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 44 : 56,
    paddingBottom: 12,
    backgroundColor: CARD,
    borderBottomWidth: 1, borderColor: BORDER,
  },
  compareTitle: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 3 },
  compareGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 12, padding: 12,
    justifyContent: 'space-between',
  },
  compareCard: {
    backgroundColor: '#0D1425',
    borderWidth: 1.5, borderRadius: 12,
    padding: 10, overflow: 'hidden',
  },
  cCardHeader: {
    flexDirection: 'row', alignItems: 'flex-start',
    borderBottomWidth: 1, paddingBottom: 8, marginBottom: 8, gap: 4,
  },
  cBrand:  { fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  cLine:   { fontSize: 9, color: '#6B7FA3', marginTop: 1 },
  scannedBadge: { backgroundColor: 'rgba(255,215,0,0.15)', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(255,215,0,0.4)' },
  scannedText:  { color: '#FFD700', fontSize: 7, fontWeight: '900', letterSpacing: 0.5 },
  bestCardBadge: { backgroundColor: 'rgba(0,255,135,0.15)', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(0,255,135,0.4)' },
  bestCardText:  { color: '#00FF87', fontSize: 7, fontWeight: '900', letterSpacing: 0.5 },
  cMetrics:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cPrice:    { fontSize: 15, fontWeight: '900' },
  cEffPill:  { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  cEffText:  { fontSize: 10, fontWeight: '900' },
  cSection:  { marginBottom: 7 },
  cSectionLabel: { fontSize: 8, fontWeight: '900', color: '#00FF87', letterSpacing: 1, marginBottom: 4 },
  cBulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginBottom: 3 },
  cBullet:    { width: 5, height: 5, borderRadius: 3, marginTop: 3, flexShrink: 0 },
  cBulletText: { fontSize: 9, color: '#A0B0CC', flex: 1, lineHeight: 13 },
  cAiBox: {
    marginTop: 4, borderWidth: 1, borderRadius: 8, padding: 7,
  },
  cAiHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  cAiIcon:   { fontSize: 10 },
  cRiskTag:  { fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  cAiText:   { fontSize: 8, color: '#8899BB', lineHeight: 12 },
});
