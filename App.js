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

const BOX_W   = SW * 0.75;
const BOX_H   = BOX_W * 0.55;
const BOX_LEFT = (SW - BOX_W) / 2;
const BOX_TOP  = SH * 0.22;

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

// ─── Barra de stat ────────────────────────────────────────────────────────────
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

// ─── Card do produto ──────────────────────────────────────────────────────────
function ProductCard({ product, onClose }) {
  const slideAnim = useRef(new Animated.Value(SH)).current;
  const effAnim   = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }).start();
    Animated.timing(effAnim, { toValue: product.efficiency / 100, duration: 1200, delay: 400, useNativeDriver: false }).start();
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.04, duration: 600, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,    duration: 600, useNativeDriver: true }),
    ])).start();
  }, []);

  const effColor = effAnim.interpolate({
    inputRange: [0, 0.5, 0.75, 1],
    outputRange: ['#FF1744', '#FF6E40', '#FFD740', '#00E676'],
  });

  return (
    <Animated.View style={[styles.cardWrapper, { transform: [{ translateY: slideAnim }] }]}>
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

      <View style={styles.statsSection}>
        {product.stats.map((s, i) => <StatBar key={s.label} {...s} delay={i * 120} />)}
      </View>

      <View style={styles.divider} />

      <View style={styles.effSection}>
        <View style={styles.effHeader}>
          <Text style={styles.effTitle}>⚡ EFICIÊNCIA GERAL</Text>
          <Text style={styles.effPercent}>{product.efficiency}%</Text>
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

// ─── Overlay OCR: reconhecimento visual da marca ──────────────────────────────
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

  // Crosshair parte do centro do scan box e vai para onde a marca fica
  const centerX = BOX_LEFT + BOX_W / 2;
  const centerY = BOX_TOP  + BOX_H / 2;
  const targetX = BOX_LEFT + BOX_W * 0.07;
  const targetY = BOX_TOP  + BOX_H * 0.13;
  const dxMove  = targetX - centerX;
  const dyMove  = targetY - centerY;

  useEffect(() => {
    if (!active) {
      chTransX.setValue(0);  chTransY.setValue(0);
      chScale.setValue(1);   chOpacity.setValue(1);
      boxOpacity.setValue(0); boxScale.setValue(0.5);
      lblOpacity.setValue(0); cnfOpacity.setValue(0);
      setTypedText('');
      return;
    }

    let typingTimer;

    // 1. Crosshair desloca até a marca (0–420ms)
    Animated.parallel([
      Animated.timing(chTransX, { toValue: dxMove, duration: 420, useNativeDriver: true }),
      Animated.timing(chTransY, { toValue: dyMove, duration: 420, useNativeDriver: true }),
    ]).start();

    // 2. Lock-on: pulsa e some (420–620ms)
    setTimeout(() => {
      Animated.sequence([
        Animated.timing(chScale,   { toValue: 0.4, duration: 100, useNativeDriver: true }),
        Animated.timing(chScale,   { toValue: 1.4, duration: 140, useNativeDriver: true }),
        Animated.timing(chOpacity, { toValue: 0,   duration: 120, useNativeDriver: true }),
      ]).start();
    }, 400);

    // 3. Caixa de detecção aparece (560ms)
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(boxOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(boxScale,   { toValue: 1, tension: 120, friction: 8, useNativeDriver: true }),
      ]).start();
    }, 560);

    // 4. Label + digitação (720ms)
    setTimeout(() => {
      Animated.timing(lblOpacity, { toValue: 1, duration: 140, useNativeDriver: true }).start();
      let i = 0;
      typingTimer = setInterval(() => {
        i++;
        setTypedText(BRAND.slice(0, i));
        if (i >= BRAND.length) {
          clearInterval(typingTimer);
          // 5. Badge de confiança
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
      {/* Crosshair móvel */}
      <Animated.View style={[styles.crosshair, {
        left: centerX - 15,
        top:  centerY - 15,
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

      {/* Bounding box dourada da marca */}
      <Animated.View style={[styles.detectBox, {
        left:   targetX,
        top:    targetY,
        width:  DBOX_W,
        height: DBOX_H,
        opacity: boxOpacity,
        transform: [{ scale: boxScale }],
      }]}>
        {/* Cantos da detection box */}
        <View style={[styles.dCorner, styles.dTL]} />
        <View style={[styles.dCorner, styles.dTR]} />
        <View style={[styles.dCorner, styles.dBL]} />
        <View style={[styles.dCorner, styles.dBR]} />
      </Animated.View>

      {/* Readout: MARCA + texto digitado */}
      <Animated.View style={[styles.brandReadout, {
        left: targetX,
        top:  targetY + DBOX_H + 7,
        opacity: lblOpacity,
      }]}>
        <View style={styles.marcaTag}>
          <Text style={styles.marcaTagText}>MARCA</Text>
        </View>
        <Text style={styles.typedBrand}>
          {typedText}
          {typedText.length < BRAND.length
            ? <Text style={{ opacity: 0.6 }}>_</Text>
            : null}
        </Text>
      </Animated.View>

      {/* Badge de confiança */}
      <Animated.View style={[styles.confBadge, {
        left: targetX,
        top:  targetY + DBOX_H + 37,
        opacity: cnfOpacity,
      }]}>
        <Text style={styles.confText}>⬥ 98% CONFIANÇA</Text>
      </Animated.View>
    </View>
  );
}

// ─── Overlay de scan (caixa + linha + glow) ───────────────────────────────────
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
    if (textDetecting) {
      scanLine.stopAnimation();
    }
    if (detected) {
      Animated.spring(cornerScale, { toValue: 1, tension: 80, useNativeDriver: true }).start();
      Animated.loop(Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1,   duration: 500, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.3, duration: 500, useNativeDriver: true }),
      ])).start();
    }
  }, [scanning, textDetecting, detected]);

  if (!scanning && !textDetecting && !detected) return null;

  const scanY = scanLine.interpolate({
    inputRange: [0, 1],
    outputRange: [BOX_TOP, BOX_TOP + BOX_H],
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Sombras */}
      <View style={[styles.shade, { left: 0, width: BOX_LEFT, top: BOX_TOP, height: BOX_H }]} />
      <View style={[styles.shade, { right: 0, width: BOX_LEFT, top: BOX_TOP, height: BOX_H }]} />
      <View style={[styles.shade, { top: 0, height: BOX_TOP, width: SW }]} />
      <View style={[styles.shade, { top: BOX_TOP + BOX_H, bottom: 0, width: SW }]} />

      {/* Glow de detecção */}
      {detected && (
        <Animated.View style={[styles.detectedBorder, {
          left: BOX_LEFT, top: BOX_TOP, width: BOX_W, height: BOX_H,
          opacity: glowAnim,
        }]} />
      )}

      {/* Cantos tech */}
      {[
        [styles.cornerTL, { left: BOX_LEFT,            top: BOX_TOP }],
        [styles.cornerTR, { left: BOX_LEFT + BOX_W - 20, top: BOX_TOP }],
        [styles.cornerBL, { left: BOX_LEFT,            top: BOX_TOP + BOX_H - 20 }],
        [styles.cornerBR, { left: BOX_LEFT + BOX_W - 20, top: BOX_TOP + BOX_H - 20 }],
      ].map(([cStyle, pos], i) => (
        <Animated.View key={i} style={[styles.corner, cStyle, pos, { transform: [{ scale: cornerScale }] }]} />
      ))}

      {/* Linha de scan (só durante scanning) */}
      {scanning && (
        <Animated.View style={[styles.scanLine, {
          left: BOX_LEFT, width: BOX_W, transform: [{ translateY: scanY }],
        }]} />
      )}

      {/* Label de status */}
      <View style={[styles.scanLabel, { top: BOX_TOP + BOX_H + 14, left: BOX_LEFT, width: BOX_W }]}>
        <Text style={styles.scanLabelText}>
          {detected      ? '✓  PRODUTO IDENTIFICADO'
           : textDetecting ? '◈  RECONHECENDO MARCA...'
           : '◈  ANALISANDO...'}
        </Text>
      </View>
    </View>
  );
}

// ─── App principal ─────────────────────────────────────────────────────────────
export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning,      setScanning]      = useState(false);
  const [textDetecting, setTextDetecting] = useState(false);
  const [detected,      setDetected]      = useState(false);
  const [showCard,      setShowCard]      = useState(false);
  const timerRef = useRef(null);

  function handleScan() {
    if (scanning || textDetecting || detected) return;
    setScanning(true);
    // Fase 1: scan line (2s)
    timerRef.current = setTimeout(() => {
      setScanning(false);
      // Fase 2: OCR visual (1900ms)
      setTextDetecting(true);
      setTimeout(() => {
        setTextDetecting(false);
        // Fase 3: detectado (700ms antes do card)
        setDetected(true);
        setTimeout(() => setShowCard(true), 700);
      }, 1900);
    }, 2000);
  }

  function handleClose() {
    clearTimeout(timerRef.current);
    setShowCard(false);
    setDetected(false);
    setScanning(false);
    setTextDetecting(false);
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

      {/* HUD */}
      <View style={styles.hud}>
        <Text style={styles.hudTitle}>◈ FRALDA SCANNER</Text>
        <View style={styles.hudDot} />
      </View>

      {/* Botão */}
      {!showCard && (
        <TouchableOpacity
          style={[styles.scanBtn, anyActive && styles.scanBtnActive]}
          onPress={handleScan}
          activeOpacity={0.8}
        >
          <Text style={styles.scanBtnText}>
            {scanning      ? 'ANALISANDO...'
             : textDetecting ? 'RECONHECENDO...'
             : detected      ? 'DETECTADO ✓'
             : 'ESCANEAR PRODUTO'}
          </Text>
        </TouchableOpacity>
      )}

      {showCard && <ProductCard product={PRODUCTS.huggies} onClose={handleClose} />}
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const NEON   = '#00E5FF';
const GOLD   = '#FFD700';
const DARK   = '#0A0E1A';
const CARD   = '#0D1425';
const BORDER = '#1A2744';

const styles = StyleSheet.create({
  bg:          { flex: 1, backgroundColor: '#000' },
  permScreen:  { flex: 1, backgroundColor: DARK, justifyContent: 'center', alignItems: 'center', padding: 32 },
  permText:    { color: '#fff', fontSize: 16, textAlign: 'center', marginBottom: 24 },
  permBtn:     { backgroundColor: NEON, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 8 },
  permBtnText: { color: DARK, fontWeight: '900', fontSize: 14, letterSpacing: 1.5 },

  // HUD
  hud: {
    position: 'absolute', top: Platform.OS === 'android' ? 44 : 56,
    left: 0, right: 0, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  hudTitle: { color: NEON, fontSize: 13, fontWeight: '900', letterSpacing: 3 },
  hudDot:   { width: 7, height: 7, borderRadius: 4, backgroundColor: '#00FF87' },

  // Scan overlay
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
    position: 'absolute', height: 2,
    backgroundColor: NEON, opacity: 0.8,
    shadowColor: NEON, shadowRadius: 6, shadowOpacity: 1,
  },
  scanLabel:     { position: 'absolute', alignItems: 'center' },
  scanLabelText: {
    color: NEON, fontSize: 12, fontWeight: '800', letterSpacing: 2,
    backgroundColor: 'rgba(0,229,255,0.12)', paddingHorizontal: 14, paddingVertical: 4, borderRadius: 4,
  },

  // Crosshair OCR
  crosshair: { position: 'absolute', width: 30, height: 30 },
  chLineH:   { position: 'absolute', top: 14, left: 0, right: 0, height: 2, backgroundColor: GOLD, opacity: 0.9 },
  chLineV:   { position: 'absolute', left: 14, top: 0, bottom: 0, width: 2, backgroundColor: GOLD, opacity: 0.9 },
  chC:       { position: 'absolute', width: 9, height: 9 },
  chTL:      { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2,   borderColor: GOLD },
  chTR:      { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2,  borderColor: GOLD },
  chBL:      { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2,  borderColor: GOLD },
  chBR:      { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2, borderColor: GOLD },

  // Detection bounding box
  detectBox: {
    position: 'absolute',
    borderWidth: 1.5, borderColor: GOLD, borderRadius: 3,
    backgroundColor: 'rgba(255,215,0,0.07)',
    shadowColor: GOLD, shadowRadius: 10, shadowOpacity: 0.5, shadowOffset: { width: 0, height: 0 },
  },
  dCorner: { position: 'absolute', width: 10, height: 10 },
  dTL:     { top: -1, left: -1, borderTopWidth: 2, borderLeftWidth: 2,   borderColor: GOLD },
  dTR:     { top: -1, right: -1, borderTopWidth: 2, borderRightWidth: 2,  borderColor: GOLD },
  dBL:     { bottom: -1, left: -1, borderBottomWidth: 2, borderLeftWidth: 2,  borderColor: GOLD },
  dBR:     { bottom: -1, right: -1, borderBottomWidth: 2, borderRightWidth: 2, borderColor: GOLD },

  // Brand readout
  brandReadout: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 8 },
  marcaTag:     { backgroundColor: GOLD, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3 },
  marcaTagText: { color: '#000', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  typedBrand:   { color: GOLD, fontSize: 16, fontWeight: '900', letterSpacing: 3 },

  // Confidence badge
  confBadge: {
    position: 'absolute',
    backgroundColor: 'rgba(255,215,0,0.10)',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 4, borderWidth: 1, borderColor: 'rgba(255,215,0,0.25)',
  },
  confText: { color: GOLD, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },

  // Botão de scan
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
  altBox: {
    marginTop: 14, backgroundColor: 'rgba(0,255,135,0.06)',
    borderWidth: 1, borderColor: 'rgba(0,255,135,0.2)',
    borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  altLabel:  { fontSize: 9, color: '#00FF87', fontWeight: '900', letterSpacing: 1.5, flex: 1 },
  altBrand:  { fontSize: 13, color: '#fff', fontWeight: '800' },
  altEff:    { fontSize: 11, color: '#00FF87', fontWeight: '700' },
  closeBtn: {
    marginTop: 16, borderWidth: 1, borderColor: BORDER,
    borderRadius: 8, paddingVertical: 12, alignItems: 'center',
  },
  closeBtnText: { color: '#6B7FA3', fontSize: 12, fontWeight: '800', letterSpacing: 2 },
});
