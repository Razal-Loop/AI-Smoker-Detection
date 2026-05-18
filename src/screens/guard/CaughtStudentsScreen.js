import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Image, StatusBar } from 'react-native';
import { Card, Text, ActivityIndicator, Chip, Button } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { getChallans } from '../../services/challanService';
import { getUserById } from '../../services/userService';
import { getProofImageUrl } from '../../services/detectionService';

const CaughtStudentsScreen = () => {
  const [caughtStudents, setCaughtStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadCaughtStudents(); }, []);

  const loadCaughtStudents = async () => {
    try {
      const allChallans = await getChallans();
      const pendingChallans = allChallans.filter(c => c.status === 'pending');
      const swc = await Promise.all(
        pendingChallans.map(async (c) => {
          if (c.studentId) {
            try {
              const student = await getUserById(c.studentId);
              return { ...c, studentName: student?.name || 'UNKNOWN' };
            } catch { return { ...c, studentName: 'UNKNOWN' }; }
          }
          return c;
        })
      );
      setCaughtStudents(swc);
    } catch (e) { console.error('Load Error:', e); }
    finally { setLoading(false); }
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#f97316" />
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#9a3412', '#020617']} style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>ACTIVE TARGETS</Text>
            <Text style={styles.headerSubtitle}>PENDING INFRACTION ENFORCEMENT</Text>
          </View>
          <View style={styles.alertCount}>
            <Text style={styles.alertCountText}>{caughtStudents.length}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {caughtStudents.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.iconCircle}>
              <Icon name="shield-check" size={40} color="#10b981" />
            </View>
            <Text style={styles.emptyText}>SECTOR CLEAR</Text>
            <Text style={styles.emptySub}>NO ACTIVE VIOLATIONS FOUND IN DATABASE</Text>
          </View>
        ) : (
          caughtStudents.map((student) => (
            <Card key={student.id} style={styles.card}>
              <Card.Content>
                <View style={styles.cardHeader}>
                  <View style={styles.avatar}>
                    <Icon name="account-alert" size={24} color="#f97316" />
                  </View>
                  <View style={styles.info}>
                    <Text style={styles.name}>{student.studentName?.toUpperCase() || 'UNIDENTIFIED'}</Text>
                    <Text style={styles.id}>UID: {student.studentId?.toUpperCase() || 'EXTERNAL'}</Text>
                  </View>
                  <Chip style={styles.statusChip} textStyle={styles.statusText}>PENDING</Chip>
                </View>

                {getProofImageUrl(student) && (
                  <View style={styles.mediaBox}>
                    <Image source={{ uri: getProofImageUrl(student) }} style={styles.media} />
                    <View style={styles.mediaTag}>
                      <Text style={styles.mediaTagText}>EVIDENCE_01</Text>
                    </View>
                  </View>
                )}

                <View style={styles.grid}>
                  <GridItem icon="clock-outline" label="TS_DETECTED" value={new Date(student.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} />
                  <GridItem icon="map-marker-outline" label="LOC_SECTOR" value={student.location || 'CAMPUS'} />
                  <GridItem icon="currency-inr" label="PENALTY_FEE" value={`₨ ${student.amount || 0}`} color="#ef4444" />
                  <GridItem icon="shield-alert-outline" label="REQ_ACTION" value="IMMEDIATE" color="#f97316" />
                </View>

                <Button mode="contained" onPress={() => { }} style={styles.actionBtn} buttonColor="rgba(249, 115, 22, 0.1)" textColor="#f97316">
                  OPEN SYSTEM RECORD
                </Button>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const GridItem = ({ icon, label, value, color = '#334155' }) => (
  <View style={styles.gridItem}>
    <Icon name={icon} size={14} color="#94a3b8" />
    <View style={{ marginLeft: 8 }}>
      <Text style={styles.gridLabel}>{label}</Text>
      <Text style={[styles.gridValue, { color }]}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 24, paddingTop: 60, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  headerSubtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '800', letterSpacing: 1, marginTop: 4 },
  alertCount: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#f97316', justifyContent: 'center', alignItems: 'center' },
  alertCountText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20 },
  emptyBox: { marginTop: 80, alignItems: 'center' },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(16, 185, 129, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyText: { color: '#0f172a', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  emptySub: { color: '#94a3b8', fontSize: 10, fontWeight: '800', marginTop: 8, letterSpacing: 1 },
  card: { borderRadius: 28, marginBottom: 16, backgroundColor: '#fff', elevation: 0, borderWidth: 1, borderColor: '#f1f5f9' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#fef3c7', justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1, marginLeft: 16 },
  name: { fontSize: 14, fontWeight: '900', color: '#0f172a' },
  id: { fontSize: 9, color: '#94a3b8', fontWeight: '800', marginTop: 2, letterSpacing: 0.5 },
  statusChip: { height: 24, borderRadius: 6, backgroundColor: '#fff7ed' },
  statusText: { fontSize: 8, fontWeight: '900', color: '#c2410c' },
  mediaBox: { height: 180, borderRadius: 20, overflow: 'hidden', marginBottom: 20, backgroundColor: '#f8fafc' },
  media: { width: '100%', height: '100%' },
  mediaTag: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  mediaTagText: { color: '#fff', fontSize: 8, fontWeight: '900' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  gridItem: { width: '50%', flexDirection: 'row', marginBottom: 16 },
  gridLabel: { fontSize: 8, fontWeight: '900', color: '#94a3b8', letterSpacing: 0.5 },
  gridValue: { fontSize: 12, fontWeight: '800', marginTop: 1 },
  actionBtn: { borderRadius: 14, elevation: 0 }
});

export default CaughtStudentsScreen;
