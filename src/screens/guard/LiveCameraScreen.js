import React, { useState, useEffect, useRef } from 'react';
import {  View, StyleSheet, ScrollView, Dimensions, Image, StatusBar, TouchableOpacity, Platform , useWindowDimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Card, Text, Button, ActivityIndicator, Chip, Snackbar } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { getDetectionStatus, startDetection, stopDetection } from '../../services/cameraService';
import { getDetections, getProofImageUrl } from '../../services/detectionService';
import { connectSocket, sendFrame, onDetection, onDetectionResult, onDetectionError } from '../../services/socketService';
import { useNavigation } from '@react-navigation/native';


const CAMERA_ID = 'guard-cam-1';

const DetectionOverlay = ({ detections, imageWidth, imageHeight, layoutWidth, layoutHeight }) => {
  const { width, height } = useWindowDimensions();

  if (!detections?.length || !imageWidth || !imageHeight || !layoutWidth || !layoutHeight) return null;
  const sx = layoutWidth / imageWidth;
  const sy = layoutHeight / imageHeight;
  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      {detections.map((d, i) => {
        const bbox = d.bbox;
        if (!bbox || bbox.length < 4) return null;
        return (
          <View key={i} style={{ position: 'absolute', left: bbox[0] * sx, top: bbox[1] * sy, width: (bbox[2] - bbox[0]) * sx, height: (bbox[3] - bbox[1]) * sy, borderWidth: 2, borderColor: (d.label || '').toLowerCase().includes('smok') ? '#ef4444' : '#10b981', borderRadius: 4 }}>
            <View style={{ position: 'absolute', top: -20, left: -2, backgroundColor: (d.label || '').toLowerCase().includes('smok') ? '#ef4444' : '#10b981', paddingHorizontal: 6, borderRadius: 4 }}>
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>{d.label?.toUpperCase()} {(d.confidence * 100 || 0).toFixed(0)}%</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const LiveCameraScreen = () => {
  const navigation = useNavigation();
  const [permission, requestPermission] = useCameraPermissions();
  const [detectionActive, setDetectionActive] = useState(false);
  const [detections, setDetections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [systemHealth, setSystemHealth] = useState('Online');
  const [cameraLayout, setCameraLayout] = useState({ width: width - 40, height: 280 });
  const [liveOverlay, setLiveOverlay] = useState({ detections: [], imageWidth: 0, imageHeight: 0 });
  const cameraRef = useRef(null);
  const frameIntervalRef = useRef(null);

  useEffect(() => {
    connectSocket();
    const u1 = onDetection((d) => { if (getProofImageUrl(d)) setDetections(prev => [d, ...prev].slice(0, 20)); });
    const u2 = onDetectionResult((r) => {
      setLiveOverlay({ detections: r.detections || [], imageWidth: r.imageWidth || 0, imageHeight: r.imageHeight || 0 });
      if (getProofImageUrl(r)) setDetections(prev => [r, ...prev].slice(0, 20));
    });
    const u3 = onDetectionError((e) => { setError(e.error || 'DET_ERR'); setSystemHealth('Error'); });
    return () => { u1(); u2(); u3(); if (frameIntervalRef.current) clearInterval(frameIntervalRef.current); };
  }, []);

  useEffect(() => {
    getDetections({ cameraId: CAMERA_ID, limit: 10 }).then(list => setDetections(list || [])).catch(() => { });
  }, []);

  const captureAndSendFrame = async () => {
    if (!cameraRef.current || processing) return;
    try {
      setProcessing(true);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7, base64: true, skipProcessing: Platform.OS === 'web' });
      if (photo?.base64) sendFrame(CAMERA_ID, photo.base64);
    } catch (e) { } finally { setProcessing(false); }
  };

  useEffect(() => {
    if (detectionActive && permission?.granted) frameIntervalRef.current = setInterval(captureAndSendFrame, 2000);
    else if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    return () => { if (frameIntervalRef.current) clearInterval(frameIntervalRef.current); };
  }, [detectionActive, permission?.granted]);

  if (!permission?.granted) return (
    <View style={styles.center}>
      <Icon name="camera-off" size={64} color="#cbd5e1" />
      <Text style={styles.permText}>CAMERA ACCESS REQUIRED</Text>
      <Button mode="contained" onPress={requestPermission} style={styles.grantBtn} buttonColor="#f59e0b">INITIATE PERMISSION</Button>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#78350f', '#020617']} style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>SEC_CAM_01</Text>
            <View style={styles.statusBadge}>
              <View style={[styles.statusDot, { backgroundColor: systemHealth === 'Online' ? '#10b981' : '#ef4444' }]} />
              <Text style={styles.statusText}>SYSTEM {systemHealth.toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.camIdBadge}>
            <Text style={styles.camIdText}>NODE_{CAMERA_ID.split('-')[2]?.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.camFrame} onLayout={e => setCameraLayout(e.nativeEvent.layout)}>
          <CameraView ref={cameraRef} style={styles.camera} facing="back" mode="picture" />
          <DetectionOverlay {...liveOverlay} layoutWidth={cameraLayout.width} layoutHeight={cameraLayout.height} />
          <View style={styles.camOverlay}>
            <View style={[styles.liveTag, { backgroundColor: detectionActive ? '#ef4444' : '#475569' }]}>
              <Text style={styles.liveTagText}>{detectionActive ? '• LIVE' : 'STANDBY'}</Text>
            </View>
            {processing && <ActivityIndicator size="small" color="#fff" style={styles.procIcon} />}
          </View>
        </View>

        <Button mode="contained" onPress={() => setDetectionActive(!detectionActive)} style={styles.toggleBtn} buttonColor={detectionActive ? '#ef4444' : '#f59e0b'} icon={detectionActive ? "stop-circle-outline" : "play-circle-outline"} labelStyle={styles.btnLabel}>
          {detectionActive ? 'TERMINATE SCAN' : 'INITIATE SCAN'}
        </Button>
      </LinearGradient>

      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>RECENT INCIDENT CAPTURES</Text>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.historyList}>
          {detections.length === 0 ? (
            <View style={styles.emptyBox}>
              <Icon name="video-off-outline" size={40} color="#cbd5e1" />
              <Text style={styles.emptyText}>NO POSITIVE MATCHES LOGGED</Text>
            </View>
          ) : (
            detections.map((d, i) => (
              <TouchableOpacity key={i} onPress={() => navigation.navigate('DetectionDetail', { detection: d })} style={styles.detCard}>
                <Image source={{ uri: getProofImageUrl(d) }} style={styles.detThumb} />
                <View style={styles.detInfo}>
                  <Text style={styles.detLabel}>{d.label?.toUpperCase() || 'VIOLATION'}</Text>
                  <Text style={styles.detTime}>{new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                  <View style={styles.detMeta}>
                    <Icon name="shield-search" size={12} color="#94a3b8" />
                    <Text style={styles.detConf}>CONFIDENCE: {(d.confidence * 100 || 0).toFixed(0)}%</Text>
                  </View>
                </View>
                <Icon name="chevron-right" size={20} color="#cbd5e1" />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
      <Snackbar visible={!!error} onDismiss={() => setError('')} style={{ backgroundColor: '#ef4444' }}>{error}</Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, paddingTop: 50, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { color: 'rgba(255,255,255,0.6)', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  camIdBadge: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  camIdText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  camFrame: { height: 280, borderRadius: 24, overflow: 'hidden', backgroundColor: '#000', marginBottom: 20, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)' },
  camera: { flex: 1 },
  camOverlay: { ...StyleSheet.absoluteFillObject, padding: 16, justifyContent: 'space-between' },
  liveTag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  liveTagText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  procIcon: { alignSelf: 'center', marginBottom: 100 },
  toggleBtn: { borderRadius: 16, paddingVertical: 6 },
  btnLabel: { fontWeight: '900', letterSpacing: 1 },
  historySection: { flex: 1, padding: 20 },
  sectionTitle: { fontSize: 10, fontWeight: '900', color: '#94a3b8', letterSpacing: 1.5, marginBottom: 12 },
  historyList: { paddingBottom: 20 },
  detCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  detThumb: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#f8fafc' },
  detInfo: { flex: 1, marginLeft: 16 },
  detLabel: { fontSize: 13, fontWeight: '900', color: '#0f172a' },
  detTime: { fontSize: 9, color: '#94a3b8', fontWeight: '700', marginTop: 2 },
  detMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  detConf: { fontSize: 8, fontWeight: '800', color: '#94a3b8', marginLeft: 4, letterSpacing: 0.5 },
  emptyBox: { marginTop: 40, alignItems: 'center' },
  emptyText: { color: '#cbd5e1', fontSize: 10, fontWeight: '900', marginTop: 12, letterSpacing: 1 },
  permText: { fontSize: 14, fontWeight: '900', color: '#64748b', marginVertical: 20 },
  grantBtn: { borderRadius: 12 }
});

export default LiveCameraScreen;
