import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Image, RefreshControl, StatusBar } from 'react-native';
import { Card, Text, ActivityIndicator, Chip, Button } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { getChallansWithStudentNames } from '../../services/challanService';
import { getProofImageUrl } from '../../services/detectionService';
import { getStatusColor, formatChallanDate } from '../../utils/challanUtils';

const ChallansScreen = () => {
  const [challans, setChallans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadChallans(); }, []);

  const loadChallans = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setLoadError('');
    try {
      const cn = await getChallansWithStudentNames();
      setChallans(cn);
    } catch (e) { setLoadError(e?.message || 'SYNC_ERROR'); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const totalRevenue = challans.filter(c => c.status === 'paid').reduce((a, c) => a + (c.amount || 0), 0);
  const pendingCount = challans.filter(c => c.status === 'pending').length;

  if (loading && !refreshing) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#10b981" />
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#064e3b', '#020617']} style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>FINANCIAL AUDIT</Text>
            <Text style={styles.headerSubtitle}>ENFORCEMENT REVENUE OVERSIGHT</Text>
          </View>
          <View style={styles.auditBadge}>
            <Icon name="finance" size={24} color="#fff" />
          </View>
        </View>

        <View style={styles.dashRow}>
          <DashItem label="REVENUE" value={`₨ ${totalRevenue}`} color="#10b981" />
          <DashItem label="PENDING" value={pendingCount} color="#f59e0b" />
          <DashItem label="VOLUMETRIC" value={challans.length} color="#fff" />
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadChallans(true); }} tintColor="#10b981" />} contentContainerStyle={styles.scrollContent}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>TRANSACTIONAL LOGS</Text>
          <Button icon="tune-variant" mode="text" compact onPress={() => { }} labelStyle={{ fontSize: 9, fontWeight: '900' }}>FILTER_SYST</Button>
        </View>

        {challans.length === 0 ? (
          <View style={styles.emptyBox}>
            <Icon name="text-box-remove-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>NO ASSET RECORDS FOUND</Text>
          </View>
        ) : (
          challans.map((c) => (
            <Card key={c.id} style={styles.card}>
              <Card.Content>
                <View style={styles.cardTop}>
                  <View style={styles.info}>
                    <Text style={styles.name}>{c.studentName?.toUpperCase() || 'UNIDENTIFIED'}</Text>
                    <Text style={styles.ref}>REF: {c.id.substring(0, 12).toUpperCase()}</Text>
                  </View>
                  <Chip style={[styles.statusChip, { backgroundColor: getStatusColor(c.status) }]} textStyle={styles.statusChipText}>
                    {c.status?.toUpperCase()}
                  </Chip>
                </View>

                {getProofImageUrl(c) && (
                  <View style={styles.mediaBox}>
                    <Image source={{ uri: getProofImageUrl(c) }} style={styles.media} />
                    <View style={styles.mediaOverlay}>
                      <Text style={styles.mediaLabel}>VALIDATED_PROOF_ATTACHED</Text>
                    </View>
                  </View>
                )}

                <View style={styles.footer}>
                  <View style={styles.footerMeta}>
                    <View style={styles.metaItem}>
                      <Icon name="calendar" size={12} color="#94a3b8" />
                      <Text style={styles.metaText}>{formatChallanDate(c.createdAt)}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Icon name="map-marker" size={12} color="#94a3b8" />
                      <Text style={styles.metaText}>{c.location || 'SITE_01'}</Text>
                    </View>
                  </View>
                  <Text style={styles.amount}>₨ {c.amount || 0}</Text>
                </View>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const DashItem = ({ label, value, color }) => (
  <View style={styles.dashItem}>
    <Text style={styles.dashLabel}>{label}</Text>
    <Text style={[styles.dashValue, { color }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 24, paddingTop: 60, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  headerSubtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '800', letterSpacing: 1, marginTop: 4 },
  auditBadge: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  dashRow: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)', padding: 18, borderRadius: 24, alignItems: 'center' },
  dashItem: { flex: 1, alignItems: 'center' },
  dashLabel: { fontSize: 8, fontWeight: '900', color: 'rgba(255,255,255,0.4)', letterSpacing: 1 },
  dashValue: { fontSize: 18, fontWeight: '900', marginTop: 4 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 10, fontWeight: '900', color: '#94a3b8', letterSpacing: 1.5 },
  card: { borderRadius: 24, marginBottom: 16, backgroundColor: '#fff', elevation: 0, borderWidth: 1, borderColor: '#f1f5f9' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '900', color: '#0f172a' },
  ref: { fontSize: 9, color: '#94a3b8', fontWeight: '800', marginTop: 4 },
  statusChip: { height: 26, borderRadius: 8 },
  statusChipText: { fontSize: 9, fontWeight: '900', color: '#fff' },
  mediaBox: { height: 160, borderRadius: 20, overflow: 'hidden', marginBottom: 16, backgroundColor: '#f8fafc' },
  media: { width: '100%', height: '100%' },
  mediaOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12, backgroundColor: 'rgba(0,0,0,0.4)' },
  mediaLabel: { color: '#fff', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f8fafc' },
  footerMeta: { flex: 1, flexDirection: 'row', gap: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center' },
  metaText: { fontSize: 10, fontWeight: '800', color: '#94a3b8', marginLeft: 6 },
  amount: { fontSize: 16, fontWeight: '900', color: '#059669' },
  emptyBox: { marginTop: 60, alignItems: 'center' },
  emptyText: { color: '#cbd5e1', fontSize: 10, fontWeight: '900', marginTop: 12, letterSpacing: 1 }
});

export default ChallansScreen;
