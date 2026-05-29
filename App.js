import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

const { width: SW, height: SH } = Dimensions.get('window');

// ─── Dados do produto (mockados) ─────────────────────────────────────────────
const PRODUCTS = {
  huggies: {
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
    alternative: { brand: 'Pampers Premium Care', efficiency: 91 },
  },
};

// ─── Componente de barra de stat ──────────────────────────────────────────────
function StatBar({ label, value, color, delay }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value / 100,
      duration: 800,
      delay,
      useNativeDriver: false,
    }).start();
  }, []);

  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statTrack}>
        <Animated.View
          style={[
            styles.statFill,
            { backgroundColor: color, width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
          ]}
        />
        <View style={[styles.statGlow, { shadowColor: color }]} />
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

// ─── Card do produto ──────────────────────────────────────────────────────────
function ProductCard({ product, onClose }) {
  const slideAnim = useRef(new Animated.Value(SH)).current;
  const effAnim   = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }).start();
    Animated.timing(effAnim, { toValue: product.efficiency / 100, duration: 1200, delay: 400, useNativeDriver: false }).start();

    // Pulsa a barra de eficiência
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const effColor = effAnim.interpolate({
    inputRange: [0, 0.5, 0.75, 1],
    outputRange: ['#FF1744', '#FF6E40', '#FFD740', '#00E676'],
  });

  return (
    <Animated.View style={[styles.cardWrapper, { transform: [{ translateY: slideAnim }] }]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View>
          <Text style={[styles.cardRarity, { color: product.rarityColor }]}>◆ {product.rarity}</Text>
          <Text style={styles.cardBrand}>{product.brand}</Text>
          <Text style={styles.cardLine}>{product.line} · {product.type}</Text>
        </View>
        <View style={styles.priceTag}>
          <Text style={styles.priceLabel}>PREÇO</Text>
          <Text style={styles.priceValue}>{product.price}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Stats */}
      <View style={styles.statsSection}>
        {product.stats.map((s, i) => (
          <StatBar key={s.label} {...s} delay={i * 120} />
        ))}
      </View>

      <View style={styles.divider} />

      {/* Eficiência Geral */}
      <View style={styles.effSection}>
        <View style={styles.effHeader}>
          <Text style={styles.effTitle}>⚡ EFICIÊNCIA GERAL</Text>
          <Text style={styles.effPercent}>{product.efficiency}%</Text>
        </View>
        <Animated.View style={[styles.effTrack, { transform: [{ scaleX: pulseAnim }] }]}>
          <Animated.View
            style={[
              styles.effFill,
              {
                width: effAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                backgroundColor: effColor,
              },
            ]}
          />
          {/* Segmentos estilo HP bar */}
          {[...Array(10)].map((_, i) => (
            <View key={i} style={[styles.effSegment, { left: `${(i + 1) * 10}%` }]} />
          ))}
        </Animated.View>
      </View>

      {/* Alternativa */}
      <View style={styles.altBox}>
        <Text style={styles.altLabel}>↑ MAIOR EFICIÊNCIA NESTA LOJA</Text>
        <Text style={styles.altBrand}>{product.alternative.brand}</Text>
        <Text style={styles.altEff}>{product.alternative.efficiency}% eficiência</Text>
      </View>

      <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
        <Text style={styles.closeBtnText}>✕  FECHAR ANÁLISE</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Overlay de reconhecimento ────────────────────────────────────────────────
function ScanOverlay({ scanning, detected }) {
  const scanLine  = useRef(new Animated.Value(0)).current;
  const glowAnim  = useRef(new Animated.Value(0)).current;
  const cornerScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (scanning) {
      Animated.loop(
        Animated.timing(scanLine, { toValue: 1, duration: 1500, useNativeDriver: true })
      ).start();
    }
    if (detected) {
      Animated.spring(cornerScale, { toValue: 1, tension: 80, useNativeDriver: true }).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.3, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [scanning, detected]);

  if (!scanning && !detected) return null;

  const BOX_W = SW * 0.75;
  const BOX_H = BOX_W * 0.55;
  const boxLeft = (SW - BOX_W) / 2;
  const boxTop  = SH * 0.22;

  const scanY = scanLine.interpolate({
    inputRange: [0, 1],
    outputRange: [boxTop, boxTop + BOX_H],
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Sombra lateral */}
      <View style={[styles.shade, { left: 0, width: boxLeft, top: boxTop, height: BOX_H }]} />
      <View style={[styles.shade, { right: 0, width: boxLeft, top: boxTop, height: BOX_H }]} />
      <View style={[styles.shade, { top: 0, height: boxTop, width: SW }]} />
      <View style={[styles.shade, { top: boxTop + BOX_H, bottom: 0, width: SW }]} />

      {/* Borda glowing */}
      {detected && (
        <Animated.View
          style={[
            styles.detectedBorder,
            {
              left: boxLeft, top: boxTop, width: BOX_W, height: BOX_H,
              opacity: glowAnim,
            },
          ]}
        />
      )}

      {/* Cantos tech */}
      <Animated.View style={[styles.corner, styles.cornerTL, { left: boxLeft, top: boxTop, transform: [{ scale: cornerScale }] }]} />
      <Animated.View style={[styles.corner, styles.cornerTR, { left: boxLeft + BOX_W - 20, top: boxTop, transform: [{ scale: cornerScale }] }]} />
      <Animated.View style={[styles.corner, styles.cornerBL, { left: boxLeft, top: boxTop + BOX_H - 20, transform: [{ scale: cornerScale }] }]} />
      <Animated.View style={[styles.corner, styles.cornerBR, { left: boxLeft + BOX_W - 20, top: boxTop + BOX_H - 20, transform: [{ scale: cornerScale }] }]} />

      {/* Linha de scan */}
      {scanning && !detected && (
        <Animated.View
          style={[
            styles.scanLine,
            { left: boxLeft, width: BOX_W, transform: [{ translateY: scanY }] },
          ]}
        />
      )}

      {/* Label */}
      <View style={[styles.scanLabel, { top: boxTop + BOX_H + 14, left: boxLeft, width: BOX_W }]}>
        <Text style={styles.scanLabelText}>
          {detected ? '✓  PRODUTO IDENTIFICADO' : '◈  ANALISANDO...'}
        </Text>
      </View>
    </View>
  );
}

// ─── App principal ─────────────────────────────────────────────────────────────
export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning,  setScanning]  = useState(false);
  const [detected,  setDetected]  = useState(false);
  const [showCard,  setShowCard]  = useState(false);
  const timerRef = useRef(null);

  function handleScan() {
    if (scanning || detected) return;
    setScanning(true);
    timerRef.current = setTimeout(() => {
      setScanning(false);
      setDetected(true);
      setTimeout(() => setShowCard(true), 600);
    }, 2000);
  }

  function handleClose() {
    setShowCard(false);
    setDetected(false);
    setScanning(false);
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

  return (
    <View style={styles.bg}>
      <StatusBar barStyle="light-content" />
      <CameraView style={StyleSheet.absoluteFill} facing="back" />

      <ScanOverlay scanning={scanning} detected={detected} />

      {/* HUD topo */}
      <View style={styles.hud}>
        <Text style={styles.hudTitle}>◈ FRALDA SCANNER</Text>
        <View style={styles.hudDot} />
      </View>

      {/* Botão de scan */}
      {!showCard && (
        <TouchableOpacity
          style={[styles.scanBtn, (scanning || detected) && styles.scanBtnActive]}
          onPress={handleScan}
          activeOpacity={0.8}
        >
          <Text style={styles.scanBtnText}>
            {scanning ? 'ANALISANDO...' : detected ? 'DETECTADO ✓' : 'ESCANEAR PRODUTO'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Card do produto */}
      {showCard && (
        <ProductCard product={PRODUCTS.huggies} onClose={handleClose} />
      )}
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const NEON   = '#00E5FF';
const DARK   = '#0A0E1A';
const CARD   = '#0D1425';
const BORDER = '#1A2744';

const styles = StyleSheet.create({
  bg:           { flex: 1, backgroundColor: '#000' },
  permScreen:   { flex: 1, backgroundColor: DARK, justifyContent: 'center', alignItems: 'center', padding: 32 },
  permText:     { color: '#fff', fontSize: 16, textAlign: 'center', marginBottom: 24 },
  permBtn:      { backgroundColor: NEON, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 8 },
  permBtnText:  { color: DARK, fontWeight: '900', fontSize: 14, letterSpacing: 1.5 },

  // HUD
  hud: {
    position: 'absolute', top: Platform.OS === 'android' ? 44 : 56,
    left: 0, right: 0, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  hudTitle:   { color: NEON, fontSize: 13, fontWeight: '900', letterSpacing: 3 },
  hudDot:     { width: 7, height: 7, borderRadius: 4, backgroundColor: '#00FF87' },

  // Scan overlay
  shade:        { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.55)' },
  detectedBorder: {
    position: 'absolute', borderWidth: 2, borderColor: NEON,
    borderRadius: 4, shadowColor: NEON, shadowRadius: 12, shadowOpacity: 1, shadowOffset: { width: 0, height: 0 },
  },
  corner:       { position: 'absolute', width: 20, height: 20 },
  cornerTL:     { borderTopWidth: 3, borderLeftWidth: 3,  borderColor: NEON },
  cornerTR:     { borderTopWidth: 3, borderRightWidth: 3, borderColor: NEON },
  cornerBL:     { borderBottomWidth: 3, borderLeftWidth: 3,  borderColor: NEON },
  cornerBR:     { borderBottomWidth: 3, borderRightWidth: 3, borderColor: NEON },
  scanLine: {
    position: 'absolute', height: 2,
    backgroundColor: NEON, opacity: 0.8,
    shadowColor: NEON, shadowRadius: 6, shadowOpacity: 1,
  },
  scanLabel: {
    position: 'absolute', alignItems: 'center',
  },
  scanLabelText: {
    color: NEON, fontSize: 12, fontWeight: '800', letterSpacing: 2,
    backgroundColor: 'rgba(0,229,255,0.12)', paddingHorizontal: 14, paddingVertical: 4, borderRadius: 4,
  },

  // Scan button
  scanBtn: {
    position: 'absolute', bottom: 52, alignSelf: 'center',
    borderWidth: 2, borderColor: NEON,
    paddingHorizontal: 40, paddingVertical: 16, borderRadius: 50,
    backgroundColor: 'rgba(0,229,255,0.08)',
  },
  scanBtnActive: { borderColor: '#00FF87', backgroundColor: 'rgba(0,255,135,0.12)' },
  scanBtnText:   { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 2 },

  // Card
  cardWrapper: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
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

  divider: { height: 1, backgroundColor: BORDER, marginVertical: 14 },

  // Stats
  statsSection: { gap: 10 },
  statRow:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statLabel:    { width: 110, fontSize: 11, color: '#8899BB', fontWeight: '600', letterSpacing: 0.5 },
  statTrack:    { flex: 1, height: 8, backgroundColor: '#1A2744', borderRadius: 4, overflow: 'hidden' },
  statFill:     { height: '100%', borderRadius: 4 },
  statGlow:     { ...StyleSheet.absoluteFillObject, shadowRadius: 6, shadowOpacity: 0.8, shadowOffset: { width: 0, height: 0 } },
  statValue:    { width: 28, fontSize: 12, fontWeight: '900', textAlign: 'right' },

  // Eficiência
  effSection:  { marginTop: 4 },
  effHeader:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  effTitle:    { fontSize: 11, color: '#8899BB', fontWeight: '800', letterSpacing: 1.5 },
  effPercent:  { fontSize: 11, color: '#fff', fontWeight: '900' },
  effTrack:    { height: 18, backgroundColor: '#1A2744', borderRadius: 4, overflow: 'hidden', transformOrigin: 'left' },
  effFill:     { height: '100%', borderRadius: 4 },
  effSegment:  { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(0,0,0,0.4)' },

  // Alternativa
  altBox: {
    marginTop: 14, backgroundColor: 'rgba(0,255,135,0.06)',
    borderWidth: 1, borderColor: 'rgba(0,255,135,0.2)',
    borderRadius: 10, padding: 12, flexDirection: 'row',
    alignItems: 'center', gap: 10,
  },
  altLabel:  { fontSize: 9, color: '#00FF87', fontWeight: '900', letterSpacing: 1.5, flex: 1 },
  altBrand:  { fontSize: 13, color: '#fff', fontWeight: '800' },
  altEff:    { fontSize: 11, color: '#00FF87', fontWeight: '700' },

  // Fechar
  closeBtn: {
    marginTop: 16, borderWidth: 1, borderColor: BORDER,
    borderRadius: 8, paddingVertical: 12, alignItems: 'center',
  },
  closeBtnText: { color: '#6B7FA3', fontSize: 12, fontWeight: '800', letterSpacing: 2 },
});
