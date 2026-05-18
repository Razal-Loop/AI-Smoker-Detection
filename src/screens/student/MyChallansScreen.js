import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Image, Dimensions, RefreshControl, StatusBar, Platform } from 'react-native';
import { Card, Text, ActivityIndicator, Chip, useTheme, Button, TouchableRipple } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { getChallans } from '../../services/challanService';
import { getProofImageUrl } from '../../services/detectionService';
import { getStatusColor, formatChallanDate } from '../../utils/challanUtils';
import { useAuth } from '../../context/AuthContext';

const MyChallansScreen = () => {
  const { currentUser } = useAuth();
  const theme = useTheme();
  const [challans, setChallans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadChallans(); }, []);

  const loadChallans = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const studentChallans = await getChallans({ studentId: currentUser?.uid });
      setChallans(studentChallans);
    } catch (error) { console.error('Error loading challans:', error); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const stats = {
    total: challans.length,
    pending: challans.filter(c => c.status === 'pending').length,
    unpaidAmount: challans.filter(c => c.status === 'pending').reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0),
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0F172A" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadChallans(true); }} tintColor="#06B6D4" />}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerGreeting}>SECURITY OVERVIEW</Text>
              <Text style={styles.headerTitle}>INCIDENT HISTORY</Text>
            </View>
            <View style={styles.iconBadge}>
              <Icon name="shield-alert-outline" size={24} color="#fff" />
            </View>
          </View>

          <View style={styles.statsSummary}>
            <StatItem label="TOTAL LOGS" value={stats.total} icon="text-box-search-outline" />
            <View style={styles.verticalDivider} />
            <StatItem label="TOTAL FINES" value={`₨ ${stats.unpaidAmount}`} icon="cash-multiple" color="#06B6D4" />
          </View>
        </LinearGradient>

        <View style={styles.listContainer}>
          {challans.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Icon name="shield-check" size={60} color="#10B981" />
              </View>
              <Text style={styles.emptyTitle}>ALL CLEAR</Text>
              <Text style={styles.emptySubtitle}>NO SMOKING VIOLATIONS DETECTED BY THE AI SURVEILLANCE NETWORK.</Text>
            </View>
          ) : (
            challans.map((challan) => (
              <ChallanCard key={challan.id} challan={challan} theme={theme} />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const StatItem = ({ label, value, icon, color = "#fff" }) => (
  <View style={styles.statItem}>
    <Icon name={icon} size={20} color={color} style={{ marginBottom: 4 }} />
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const ChallanCard = ({ challan, theme }) => {
  const statusColor = getStatusColor(challan.status, theme.colors);
  const proofUrl = getProofImageUrl(challan);

  return (
    <Card style={styles.card} elevation={0}>
      <Card.Content style={styles.cardContentStyle}>
        <View style={styles.cardHeader}>
          <View style={[styles.statusIndicator, { backgroundColor: statusColor + '20', borderColor: statusColor, borderWidth: 1 }]}>
            <Text style={[styles.statusLabel, { color: statusColor }]}>{challan.status?.toUpperCase()}</Text>
          </View>
          <Text style={styles.cardDate}>{formatChallanDate(challan.createdAt)}</Text>
        </View>

        {proofUrl ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: proofUrl }} style={styles.proofImage} resizeMode="cover" />
            <LinearGradient colors={['transparent', 'rgba(15,23,42,0.85)']} style={styles.imageOverlay}>
              <Text style={styles.overlayText}>VISUAL EVIDENCE [AUTHENTICATED]</Text>
            </LinearGradient>
          </View>
        ) : (
          <View style={styles.noProofBox}>
            <Icon name="image-off-outline" size={32} color="#94A3B8" />
            <Text style={styles.noProofText}>NO VISUAL DATA AVAILABLE</Text>
          </View>
        )}

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.footerLabel}>PENALTY FEE</Text>
            <Text style={styles.footerAmount}>₨ {challan.amount || 0}</Text>
          </View>
          <TouchableRipple style={styles.detailsBtn} onPress={() => { }}>
            <View style={styles.detailsBtnInside}>
              <Text style={styles.detailsBtnText}>VIEW DOSSIER</Text>
              <Icon name="chevron-right" size={18} color="#06B6D4" />
            </View>
          </TouchableRipple>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { flexGrow: 1 },
  header: { padding: 24, paddingTop: Platform.OS === 'ios' ? 70 : 60, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  headerGreeting: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: 1 },
  iconBadge: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  statsSummary: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 24, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: '900', marginTop: 2, letterSpacing: 1 },
  verticalDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.1)' },
  listContainer: { padding: 24 },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyIconCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A', letterSpacing: 1 },
  emptySubtitle: { fontSize: 11, color: '#64748B', textAlign: 'center', marginTop: 12, paddingHorizontal: 40, fontWeight: '700', lineHeight: 18 },
  card: { borderRadius: 32, marginBottom: 24, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden' },
  cardContentStyle: { padding: 20 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  statusIndicator: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  cardDate: { fontSize: 11, color: '#94A3B8', fontWeight: '800' },
  imageContainer: { borderRadius: 24, overflow: 'hidden', height: 180, marginBottom: 20, backgroundColor: '#E2E8F0' },
  proofImage: { width: '100%', height: '100%' },
  imageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, justifyContent: 'flex-end', padding: 20 },
  overlayText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  noProofBox: { height: 160, backgroundColor: '#F8FAFC', borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderStyle: 'dashed', borderWidth: 2, borderColor: '#E2E8F0' },
  noProofText: { color: '#94A3B8', fontSize: 11, marginTop: 12, fontWeight: '900', letterSpacing: 1 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F8FAFC', paddingTop: 20 },
  footerLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '900', letterSpacing: 1 },
  footerAmount: { fontSize: 26, fontWeight: '900', color: '#0F172A' },
  detailsBtn: { borderRadius: 12, overflow: 'hidden' },
  detailsBtnInside: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4 },
  detailsBtnText: { color: '#06B6D4', fontSize: 12, fontWeight: '900', marginRight: 4, letterSpacing: 1 },
});

export default MyChallansScreen;

