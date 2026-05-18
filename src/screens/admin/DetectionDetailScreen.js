import React, { useState, useEffect } from 'react';
import {  View, StyleSheet, ScrollView, Image, Dimensions, StatusBar, Platform, TouchableOpacity , useWindowDimensions } from 'react-native';
import { Card, Text, Button, Divider, useTheme, Avatar } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { getProofImageUrl } from '../../services/detectionService';



const DetectionDetailScreen = ({ route, navigation }) => {
  const { width: SCREEN_WIDTH, height } = useWindowDimensions();

  const { detection, canGenerateChallan = false } = route.params || {};
  const [imageHeight, setImageHeight] = useState(SCREEN_WIDTH * 0.75);
  const theme = useTheme();

  const imageUrl = getProofImageUrl(detection);

  useEffect(() => {
    if (imageUrl) {
      Image.getSize(
        imageUrl,
        (w, h) => {
          const aspect = h / w;
          setImageHeight(SCREEN_WIDTH * Math.min(aspect, 1.5));
        },
        () => { }
      );
    }
  }, [imageUrl, SCREEN_WIDTH]);

  if (!detection) {
    return (
      <View style={styles.center}>
        <Icon name="alert-decagram-outline" size={64} color={theme.colors.error} />
        <Text style={styles.emptyText}>INCIDENT DATA CORRUPTED</Text>
        <Button mode="contained" onPress={() => navigation.goBack()} style={styles.emptyBtn}>RETURN TO HUB</Button>
      </View>
    );
  }

  const hasMatchedStudent = !!(detection.matchedStudent || (detection.studentId && (detection.studentName || detection.studentEmail || detection.studentStudentId)));
  const displayStudent = detection.matchedStudent || (detection.studentId ? {
    id: detection.studentId,
    name: detection.studentName,
    email: detection.studentEmail,
    studentId: detection.studentStudentId,
    confidence: detection.matchConfidence,
    photoUrl: detection.studentPhotoUrl || null
  } : null);

  const timestampString = detection.timestamp ? new Date(detection.timestamp).toLocaleString() : '—';
  const detectionsList = detection.detections || [];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient colors={theme.colors.headerGradient} style={styles.header}>
          <View style={styles.navRow}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Icon name="chevron-left" size={32} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>INCIDENT DOSSIER</Text>
            <View style={{ width: 32 }} />
          </View>
        </LinearGradient>

        <View style={styles.imageSection}>
          {imageUrl ? (
            <Card style={styles.imageCard} elevation={6}>
              <Image source={{ uri: imageUrl }} style={[styles.fullImage, { height: imageHeight }]} resizeMode="cover" />
              <View style={styles.imageOverlay}>
                <View style={styles.captureBadge}>
                  <Icon name="shield-check" size={14} color="#FFFFFF" />
                  <Text style={styles.captureText}>VERIFIED CORE CAPTURE</Text>
                </View>
              </View>
            </Card>
          ) : (
            <View style={styles.placeholderImage}>
              <Icon name="image-off-outline" size={64} color="#E2E8F0" />
              <Text style={styles.placeholderText}>VISUAL LOGS UNAVAILABLE</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <Text style={styles.sectionLabel}>CHRONOLOGICAL & SPATIAL DATA</Text>
          <Card style={styles.infoCard} elevation={2}>
            <View style={styles.metaRow}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(15, 23, 42, 0.05)' }]}>
                <Icon name="clock-outline" size={24} color="#0F172A" />
              </View>
              <View style={styles.metaText}>
                <Text style={styles.metaLab}>TIMESTAMP</Text>
                <Text style={styles.metaVal}>{timestampString}</Text>
              </View>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.metaRow}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(34, 197, 94, 0.05)' }]}>
                <Icon name="map-marker-outline" size={24} color="#22C55E" />
              </View>
              <View style={styles.metaText}>
                <Text style={styles.metaLab}>SECTOR LOCATION</Text>
                <Text style={styles.metaVal}>{detection.location?.toUpperCase() || 'UNKNOWN NODE'}</Text>
              </View>
            </View>
          </Card>

          <Text style={styles.sectionLabel}>IDENTITY RESOLUTION</Text>
          {hasMatchedStudent ? (
            <Card style={styles.identityCard} elevation={2}>
              <View style={styles.identityHeader}>
                {displayStudent?.photoUrl ? (
                  <Avatar.Image size={64} source={{ uri: displayStudent.photoUrl }} style={styles.studentAvatar} />
                ) : (
                  <Avatar.Text size={64} label={displayStudent?.name?.[0] || 'S'} style={styles.studentAvatarText} />
                )}
                <View style={styles.identityInfo}>
                  <Text style={styles.studentName}>{displayStudent?.name}</Text>
                  <Text style={styles.studentSubId}>ID: {displayStudent?.studentId || 'N/A'}</Text>
                  {displayStudent?.confidence && (
                    <View style={styles.confBadge}>
                      <Icon name="brain" size={10} color="#06B6D4" />
                      <Text style={styles.confText}>AI MATCH: {(displayStudent.confidence * 100).toFixed(1)}%</Text>
                    </View>
                  )}
                </View>
                <View style={styles.verifiedCheck}>
                  <Icon name="check-decagram" size={24} color="#22C55E" />
                </View>
              </View>
            </Card>
          ) : (
            <Card style={[styles.identityCard, styles.unidentifiedCard]} elevation={2}>
              <View style={styles.identityHeader}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                  <Icon name="account-question-outline" size={32} color="#EF4444" />
                </View>
                <View style={styles.identityInfo}>
                  <Text style={[styles.studentName, { color: '#EF4444' }]}>UNKNOWN ENTITY</Text>
                  <Text style={styles.unidentifiedSub}>Face recognition failed to match subjects.</Text>
                </View>
              </View>
            </Card>
          )}

          <Text style={styles.sectionLabel}>DETECTION PAYLOAD</Text>
          <View style={styles.payloadRow}>
            {detectionsList.map((d, i) => {
              const isSmoking = (d.label || '').toLowerCase().includes('smok');
              return (
                <View key={i} style={[styles.chip, isSmoking && styles.alertChip]}>
                  <Text style={[styles.chipText, isSmoking && styles.alertChipText]}>
                    {(d.label || 'OBJ').toUpperCase()} {d.confidence != null ? `${(d.confidence * 100).toFixed(0)}%` : ''}
                  </Text>
                </View>
              );
            })}
          </View>

          {canGenerateChallan && (
            <Button
              mode="contained"
              icon="file-document-edit"
              onPress={() => navigation.navigate('CreateChallan', { detection })}
              style={styles.actionBtn}
              contentStyle={styles.actionBtnContent}
              labelStyle={styles.actionBtnLabel}
            >
              INITIALIZE CHALLAN
            </Button>
          )}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 50, paddingBottom: 60, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  headerTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 2.5 },
  imageSection: { marginTop: -40, paddingHorizontal: 24 },
  imageCard: { borderRadius: 32, overflow: 'hidden', backgroundColor: '#000' },
  fullImage: { width: '100%' },
  imageOverlay: { position: 'absolute', bottom: 16, left: 16 },
  captureBadge: { backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  captureText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900', marginLeft: 6, letterSpacing: 1 },
  placeholderImage: { height: 260, backgroundColor: '#FFFFFF', borderRadius: 32, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  placeholderText: { color: '#94A3B8', fontSize: 11, fontWeight: '900', marginTop: 12, letterSpacing: 1 },
  content: { padding: 24 },
  sectionLabel: { fontSize: 11, fontWeight: '900', color: '#64748B', letterSpacing: 2, marginBottom: 16, marginTop: 32 },
  infoCard: { borderRadius: 28, backgroundColor: '#FFFFFF', overflow: 'hidden' },
  metaRow: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  iconBox: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  metaText: { marginLeft: 16 },
  metaLab: { fontSize: 9, color: '#94A3B8', fontWeight: '900', letterSpacing: 1 },
  metaVal: { fontSize: 15, color: '#1E293B', fontWeight: '800', marginTop: 4 },
  divider: { backgroundColor: '#F1F5F9', height: 1, marginHorizontal: 20 },
  identityCard: { borderRadius: 28, backgroundColor: '#FFFFFF', padding: 20 },
  identityHeader: { flexDirection: 'row', alignItems: 'center' },
  studentAvatar: { backgroundColor: '#F8FAFC' },
  studentAvatarText: { backgroundColor: '#0F172A' },
  identityInfo: { marginLeft: 16, flex: 1 },
  studentName: { fontSize: 20, fontWeight: '900', color: '#1E293B' },
  studentSubId: { fontSize: 12, color: '#64748B', fontWeight: '700', marginTop: 2 },
  confBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(6, 182, 212, 0.08)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 8 },
  confText: { fontSize: 9, fontWeight: '900', color: '#06B6D4', marginLeft: 4 },
  verifiedCheck: { marginLeft: 10 },
  unidentifiedCard: { backgroundColor: '#FFF5F5', borderColor: '#FECACA', borderWidth: 1 },
  unidentifiedSub: { fontSize: 12, color: '#991B1B', fontWeight: '600', marginTop: 2 },
  payloadRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  chipText: { fontSize: 10, fontWeight: '900', color: '#64748B' },
  alertChip: { backgroundColor: '#FFF1F2', borderColor: '#FECDD3' },
  alertChipText: { color: '#E11D48' },
  actionBtn: { marginTop: 40, borderRadius: 20, backgroundColor: '#0F172A' },
  actionBtnContent: { height: 60 },
  actionBtnLabel: { fontWeight: '900', letterSpacing: 1.5, fontSize: 13 },
  emptyText: { color: '#64748B', fontSize: 12, fontWeight: '900', letterSpacing: 2, marginTop: 16 },
  emptyBtn: { marginTop: 24, borderRadius: 16, backgroundColor: '#0F172A' }
});

export default DetectionDetailScreen;
