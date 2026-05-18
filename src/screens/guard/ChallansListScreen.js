import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Image, RefreshControl, StatusBar } from 'react-native';
import { Card, Text, ActivityIndicator, Chip } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { getChallansWithStudentNames } from '../../services/challanService';
import { getProofImageUrl } from '../../services/detectionService';
import { getStatusColor, formatChallanDate } from '../../utils/challanUtils';

const ChallansListScreen = () => {
  const [challans, setChallans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadChallans(); }, []);

  const loadChallans = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setLoadError('');
    try {
      const challansWithNames = await getChallansWithStudentNames();
      setChallans(challansWithNames);
    } catch (error) {
      setLoadError(error?.message || 'LINK_ERR: RETRY_INIT_SYNC');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading && !refreshing) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#f59e0b" />
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#78350f', '#020617']} style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>CHALLAN ARCHIVE</Text>
            <Text style={styles.headerSubtitle}>ENFORCEMENT RECORD DATABASE</Text>
          </View>
          <View style={styles.iconBadge}>
            <Icon name="file-document-outline" size={24} color="#fff" />
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{challans.length}</Text>
            <Text style={styles.statLabel}>TOTAL LOGS</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#f59e0b' }]}>{challans.filter(c => c.status === 'pending').length}</Text>
            <Text style={styles.statLabel}>UNRESOLVED</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadChallans(true); }} tintColor="#f59e0b" />}
        contentContainerStyle={styles.scrollContent}
      >
        {challans.length === 0 && !loadError ? (
          <View style={styles.emptyBox}>
            <Icon name="database-off-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>NO PENALTY RECORDS DETECTED</Text>
          </View>
        ) : (
          challans.map((challan) => (
            <Card key={challan.id} style={styles.card}>
              <Card.Content>
                <View style={styles.cardHeader}>
                  <View style={styles.entityInfo}>
                    <Text style={styles.entityName}>{challan.studentName?.toUpperCase() || 'UNIDENTIFIED_ENTITY'}</Text>
                    <Text style={styles.entityMeta}>REF_ID: {challan.id.substring(0, 10).toUpperCase()}</Text>
                  </View>
                  <Chip style={[styles.statusChip, { backgroundColor: getStatusColor(challan.status) }]} textStyle={styles.statusChipText}>
                    {challan.status?.toUpperCase()}
                  </Chip>
                </View>

                {getProofImageUrl(challan) && (
                  <View style={styles.imageBox}>
                    <Image source={{ uri: getProofImageUrl(challan) }} style={styles.proofImage} />
                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.imageOverlay}>
                      <Text style={styles.overlayText}>INCIDENT FOOTAGE LOGGED</Text>
                    </LinearGradient>
                  </View>
                )}

                <View style={styles.metadataRow}>
                  <View style={styles.metaItem}>
                    <Icon name="currency-inr" size={14} color="#f59e0b" />
                    <Text style={styles.metaValue}>₨ {challan.amount || 0}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Icon name="calendar-range" size={14} color="#94a3b8" />
                    <Text style={styles.metaValue}>{formatChallanDate(challan.createdAt)}</Text>
                  </View>
                </View>

                {challan.location && (
                  <View style={styles.locationRow}>
                    <Icon name="map-marker-radius-outline" size={14} color="#94a3b8" />
                    <Text style={styles.locationText}>{challan.location.toUpperCase()}</Text>
                  </View>
                )}
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 24, paddingTop: 60, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  headerSubtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '800', letterSpacing: 1, marginTop: 4 },
  iconBadge: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  statsRow: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)', padding: 18, borderRadius: 24, alignItems: 'center' },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { color: '#fff', fontSize: 24, fontWeight: '900' },
  statLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '800', marginTop: 4, letterSpacing: 1 },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.1)' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20 },
  emptyBox: { marginTop: 60, alignItems: 'center' },
  emptyText: { color: '#cbd5e1', fontSize: 11, fontWeight: '900', marginTop: 12, letterSpacing: 1 },
  card: { borderRadius: 24, marginBottom: 16, backgroundColor: '#fff', elevation: 0, borderWidth: 1, borderColor: '#f1f5f9', overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  entityName: { fontSize: 14, fontWeight: '900', color: '#0f172a', letterSpacing: 0.5 },
  entityMeta: { fontSize: 10, color: '#94a3b8', fontWeight: '700', marginTop: 4 },
  statusChip: { height: 26, borderRadius: 8 },
  statusChipText: { fontSize: 9, fontWeight: '900', color: '#fff' },
  imageBox: { height: 160, borderRadius: 20, overflow: 'hidden', marginBottom: 16 },
  proofImage: { width: '100%', height: '100%' },
  imageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, justifyContent: 'flex-end', padding: 12 },
  overlayText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  metadataRow: { flexDirection: 'row', gap: 20, marginTop: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center' },
  metaValue: { fontSize: 12, fontWeight: '800', color: '#334155', marginLeft: 8 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f8fafc' },
  locationText: { fontSize: 10, fontWeight: '800', color: '#94a3b8', marginLeft: 8, letterSpacing: 0.5 }
});

export default ChallansListScreen;
