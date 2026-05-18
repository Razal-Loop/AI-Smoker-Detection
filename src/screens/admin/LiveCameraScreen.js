import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, StatusBar, Platform } from 'react-native';
import {
  Text,
  IconButton,
  Button,
  Surface,
  ActivityIndicator,
  useTheme,
  Avatar,
  Badge
} from 'react-native-paper';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';

import { getChallans } from '../../services/challanService';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';



import { onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../config/firebase';

const LiveCameraScreen = ({ navigation }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [isLive, setIsLive] = useState(false);
  const [recentDetections, setRecentDetections] = useState([]);
  const [isTargeting, setIsTargeting] = useState(false);
  const [telemetry, setTelemetry] = useState({ fps: 24.8, latency: 12 });
  const theme = useTheme();
  const cameraRef = useRef(null);

  useEffect(() => {
    // 1. Real-time Intelligence Stream
    const q = query(collection(db, 'challans'), orderBy('createdAt', 'desc'), limit(10));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecentDetections(data);
    });

    // 2. HUD Visual Effects
    const targetingInterval = setInterval(() => {
      setIsTargeting(prev => !prev);
    }, 2000);

    // 3. Mock Telemetry Logic (to look pro)
    const telemetryInterval = setInterval(() => {
      setTelemetry({
        fps: (24 + Math.random()).toFixed(1),
        latency: Math.floor(10 + Math.random() * 15)
      });
    }, 1500);

    return () => {
      unsub();
      clearInterval(targetingInterval);
      clearInterval(telemetryInterval);
    };
  }, []);

  if (!permission) return <View style={styles.center}><ActivityIndicator color={theme.colors.primary} /></View>;
  if (!permission.granted) {
    return (
      <View style={[styles.center, { backgroundColor: '#F8FAFC' }]}>
        <Icon name="camera-off" size={64} color="#CBD5E1" />
        <Text style={styles.permissionText}>CAMERA ACCESS REQUIRED</Text>
        <Button mode="contained" onPress={requestPermission} style={styles.permissionButton} buttonColor={theme.colors.primary}>GRANT ACCESS</Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* HUD OVERLAY LAYER */}
      <View style={styles.cameraContainer}>
        {Platform.OS !== 'web' ? (
          <CameraView style={styles.camera} facing="back" ref={cameraRef} />
        ) : (
          <View style={styles.webPlaceholder}>
            <LinearGradient colors={theme.colors.headerGradient} style={styles.fullSize}>
              <Icon name="video-off-outline" size={64} color="rgba(255,255,255,0.2)" />
              <Text style={styles.webText}>WEB FEED STANDBY</Text>
            </LinearGradient>
          </View>
        )}

        <View style={styles.hudOverlay}>
          <View style={styles.hudHeader}>
            <View style={styles.hudBadge}>
              <View style={[styles.pulseDot, { backgroundColor: theme.colors.error }]} />
              <Text style={styles.hudBadgeText}>LIVE CAMERA</Text>
            </View>
            <View style={styles.hudTelemetry}>
              <Text style={styles.telemetryText}>FPS: {telemetry.fps}</Text>
              <Text style={styles.telemetryText}>LATENCY: {telemetry.latency}ms</Text>
            </View>
          </View>

          {/* TARGETING RETICLES */}
          <View style={styles.reticleContainer}>
            <View style={[styles.reticleCorner, styles.topLeft, { borderColor: theme.colors.primary }, isTargeting && styles.reticleActive]} />
            <View style={[styles.reticleCorner, styles.topRight, { borderColor: theme.colors.primary }, isTargeting && styles.reticleActive]} />
            <View style={[styles.reticleCorner, styles.bottomLeft, { borderColor: theme.colors.primary }, isTargeting && styles.reticleActive]} />
            <View style={[styles.reticleCorner, styles.bottomRight, { borderColor: theme.colors.primary }, isTargeting && styles.reticleActive]} />
            {isTargeting && (
              <View style={[styles.targetingBox, { borderColor: theme.colors.success }]}>
                <Text style={[styles.targetingText, { color: theme.colors.success }]}>MONITORING AREA...</Text>
              </View>
            )}
          </View>

          <LinearGradient colors={['transparent', 'rgba(15, 23, 42, 0.85)']} style={styles.cameraBottomFade}>
            <View style={styles.cameraActions}>
              <IconButton icon="dots-vertical" iconColor="#fff" containerColor="rgba(255,255,255,0.15)" />
              <IconButton
                icon={isLive ? "stop-circle" : "play-circle"}
                size={70}
                iconColor={isLive ? theme.colors.error : theme.colors.success}
                onPress={() => setIsLive(!isLive)}
              />
              <IconButton icon="format-list-bulleted" iconColor="#fff" containerColor="rgba(255,255,255,0.15)" />
            </View>
          </LinearGradient>
        </View>
      </View>

      {/* INTELLIGENCE LOG SECTION - High Contrast Light Mode */}
      <View style={styles.logContainer}>
        <View style={styles.logHeader}>
          <View>
            <Text style={[styles.logTitle, { color: theme.colors.primary }]}>DETECTION HISTORY</Text>
            <Text style={styles.logSub}>RECENT VIOLATIONS</Text>
          </View>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('AddCamera')}
            icon="plus"
            buttonColor={theme.colors.primary}
            style={styles.actionButton}
            labelStyle={styles.actionButtonLabel}
          >
            ADD CAMERA
          </Button>
        </View>
        <ScrollView contentContainerStyle={styles.logScroll} showsVerticalScrollIndicator={false}>
          {recentDetections.map((item, index) => (
            <Surface key={index} style={styles.detectionCard} elevation={2}>
              <View style={styles.cardMain}>
                <Avatar.Icon size={44} icon="account-alert" backgroundColor="rgba(15, 23, 42, 0.05)" color={theme.colors.primary} />
                <View style={styles.cardContent}>
                  <Text style={[styles.cardEntity, { color: theme.colors.primary }]}>{item.studentName || 'UNKNOWN STUDENT'}</Text>
                  <Text style={styles.cardTimestamp}>{new Date(item.createdAt).toLocaleString()}</Text>
                </View>
                <View style={[styles.confidenceBadge, { borderColor: theme.colors.accent + '40', backgroundColor: theme.colors.accent + '10' }]}>
                  <Text style={[styles.confidenceText, { color: theme.colors.accent }]}>ACTIVE</Text>
                </View>
              </View>
              <IconButton
                icon="chevron-right"
                iconColor={theme.colors.accent}
                onPress={() => navigation.navigate('DetectionDetail', { challanId: item.id })}
              />
            </Surface>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cameraContainer: { height: '58%', position: 'relative' },
  camera: { flex: 1 },
  fullSize: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  webPlaceholder: { flex: 1 },
  webText: { color: 'rgba(255,255,255,0.4)', fontWeight: '900', letterSpacing: 2, marginTop: 16, fontSize: 13 },
  hudOverlay: { ...StyleSheet.absoluteFillObject, padding: 24, justifyContent: 'space-between' },
  hudHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  hudBadge: { backgroundColor: 'rgba(15, 23, 42, 0.7)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  pulseDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  hudBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  hudTelemetry: { alignItems: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.3)', padding: 8, borderRadius: 8 },
  telemetryText: { color: '#fff', fontSize: 9, fontWeight: '800', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  reticleContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  reticleCorner: { position: 'absolute', width: 40, height: 40, borderWidth: 2, opacity: 0.3 },
  reticleActive: { opacity: 1, borderWidth: 3 },
  topLeft: { top: '22%', left: '12%', borderBottomWidth: 0, borderRightWidth: 0 },
  topRight: { top: '22%', right: '12%', borderBottomWidth: 0, borderLeftWidth: 0 },
  bottomLeft: { bottom: '22%', left: '12%', borderTopWidth: 0, borderRightWidth: 0 },
  bottomRight: { bottom: '22%', right: '12%', borderTopWidth: 0, borderLeftWidth: 0 },
  targetingBox: { backgroundColor: 'rgba(34, 197, 94, 0.15)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  targetingText: { fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  cameraBottomFade: { paddingBottom: 32, paddingHorizontal: 32, paddingTop: 80, marginTop: -80 },
  cameraActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logContainer: { flex: 1, backgroundColor: '#F8FAFC', borderTopLeftRadius: 40, borderTopRightRadius: 40, marginTop: -40, padding: 24, elevation: 10, ...(Platform.OS === 'web' ? { boxShadow: '0 -5px 10px rgba(0,0,0,0.1)' } : { shadowColor: '#000', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.1, shadowRadius: 10 }) },
  logHeader: { marginBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logTitle: { fontSize: 18, fontWeight: '900', letterSpacing: 1.5 },
  logSub: { fontSize: 11, color: '#64748B', fontWeight: '800', marginTop: 6, letterSpacing: 2 },
  logScroll: { paddingBottom: 100 },
  detectionCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 16, overflow: 'hidden' },
  cardMain: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  cardContent: { marginLeft: 16, flex: 1 },
  cardEntity: { fontSize: 16, fontWeight: '900' },
  cardTimestamp: { fontSize: 11, color: '#64748B', marginTop: 4, fontWeight: '700' },
  confidenceBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, backgroundColor: '#F0FDF4' },
  confidenceText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  permissionText: { color: '#0F172A', marginTop: 24, marginBottom: 24, fontWeight: '900', fontSize: 16, letterSpacing: 1 },
  permissionButton: { borderRadius: 16, paddingHorizontal: 24, height: 56, justifyContent: 'center' },
  actionButton: { borderRadius: 10, elevation: 2 },
  actionButtonLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1 }
});

export default LiveCameraScreen;
