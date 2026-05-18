import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { Card, Text, ActivityIndicator, Chip } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { getUsers } from '../../services/userService';

const GuardsActivityScreen = () => {
  const [guards, setGuards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activityData, setActivityData] = useState({});

  useEffect(() => {
    loadGuardsActivity();
    const interval = setInterval(loadGuardsActivity, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadGuardsActivity = async () => {
    try {
      const guardsList = await getUsers('guard');
      const { getGuardsActivityAPI } = require('../../services/apiService');
      let activity = {};

      try {
        const activityResponse = await getGuardsActivityAPI();
        if (Array.isArray(activityResponse)) {
          activityResponse.forEach(ga => {
            activity[ga.guardId] = { isActive: ga.isActive || false, lastActive: ga.lastActive, watchingCameras: 1 };
          });
        }
      } catch (apiError) {
        guardsList.forEach(g => { activity[g.id] = { isActive: false, lastActive: null, watchingCameras: 0 }; });
      }

      setActivityData(activity);
      setGuards(guardsList);
    } catch (error) {
      console.error('Error loading guards activity:', error);
    } finally { setLoading(false); }
  };

  const getActiveCount = () => Object.values(activityData).filter(a => a.isActive).length;

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#10b981" />
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#064e3b', '#020617']} style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>OPERATIVE ROSTER</Text>
          <View style={styles.activeBadge}>
            <View style={styles.pulseDot} />
            <Text style={styles.activeLabel}>LIVE INFRASTRUCTURE</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{getActiveCount()}</Text>
            <Text style={styles.statLabel}>ON DUTY</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{guards.length}</Text>
            <Text style={styles.statLabel}>TOTAL ENTITIES</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionLabel}>PERSONNEL STATUS LOG</Text>

        {guards.length === 0 ? (
          <View style={styles.emptyBox}>
            <Icon name="account-off-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>NO OPERATIVES REGISTERED</Text>
          </View>
        ) : (
          guards.map((guard) => {
            const activity = activityData[guard.id] || {};
            return (
              <Card key={guard.id} style={styles.guardCard}>
                <Card.Content>
                  <View style={styles.guardHeader}>
                    <View style={[styles.avatarBox, { borderColor: activity.isActive ? '#10b981' : '#e2e8f0' }]}>
                      <Icon name="shield-account" size={32} color={activity.isActive ? '#10b981' : '#94a3b8'} />
                    </View>
                    <View style={styles.guardInfo}>
                      <Text style={styles.guardName}>{guard.name?.toUpperCase() || 'UNKNOWN_OP'}</Text>
                      <Text style={styles.guardMeta}>{guard.email}</Text>
                    </View>
                    <Chip style={[styles.statusChip, { backgroundColor: activity.isActive ? '#10b981' : '#f1f5f9' }]} textStyle={[styles.statusChipText, { color: activity.isActive ? '#fff' : '#64748b' }]}>
                      {activity.isActive ? 'ACTIVE' : 'OFFLINE'}
                    </Chip>
                  </View>

                  {activity.isActive && (
                    <View style={styles.activityFeed}>
                      <View style={styles.feedItem}>
                        <Icon name="camera-iris" size={14} color="#10b981" />
                        <Text style={styles.feedText}>MONITORING SECTOR ALPHA-01</Text>
                      </View>
                      {activity.lastActive && (
                        <View style={styles.feedItem}>
                          <Icon name="clock-outline" size={14} color="#94a3b8" />
                          <Text style={styles.feedText}>LAST HEARTBEAT: {new Date(activity.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </Card.Content>
              </Card>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 24, paddingTop: 60, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  activeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)' },
  pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981', marginRight: 6 },
  activeLabel: { color: '#10b981', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  statsRow: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)', padding: 20, borderRadius: 24, alignItems: 'center' },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { color: '#fff', fontSize: 24, fontWeight: '900' },
  statLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '800', marginTop: 4, letterSpacing: 1 },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.1)' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '900', color: '#94a3b8', letterSpacing: 2, marginBottom: 16 },
  emptyBox: { marginTop: 60, alignItems: 'center' },
  emptyText: { color: '#cbd5e1', fontSize: 12, fontWeight: '800', marginTop: 12, letterSpacing: 1 },
  guardCard: { borderRadius: 24, marginBottom: 12, backgroundColor: '#fff', elevation: 0, borderWidth: 1, borderColor: '#f1f5f9' },
  guardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatarBox: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#f8fafc', borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  guardInfo: { flex: 1, marginLeft: 16 },
  guardName: { fontSize: 14, fontWeight: '900', color: '#0f172a', letterSpacing: 0.5 },
  guardMeta: { fontSize: 11, color: '#94a3b8', marginTop: 2, fontWeight: '600' },
  statusChip: { height: 26, borderRadius: 8 },
  statusChipText: { fontSize: 9, fontWeight: '900' },
  activityFeed: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f8fafc' },
  feedItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  feedText: { fontSize: 10, fontWeight: '700', color: '#475569', marginLeft: 8, letterSpacing: 0.5 }
});

export default GuardsActivityScreen;
