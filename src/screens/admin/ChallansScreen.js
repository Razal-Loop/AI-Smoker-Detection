import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Dimensions, StatusBar, Platform, useWindowDimensions } from 'react-native';
import {
  Card,
  Text,
  Searchbar,
  ActivityIndicator,
  useTheme,
  Avatar,
  IconButton,
  TouchableRipple
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { getChallans } from '../../services/challanService';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';



const ChallansScreen = ({ navigation }) => {
  const { width, height } = useWindowDimensions();

  const [challans, setChallans] = useState([]);
  const [filteredChallans, setFilteredChallans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const theme = useTheme();

  useEffect(() => {
    loadChallans();
    const unsubscribe = navigation.addListener('focus', loadChallans);
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    let filtered = [...challans];
    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === statusFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.studentId?.toLowerCase().includes(q) ||
        c.studentName?.toLowerCase().includes(q) ||
        c.location?.toLowerCase().includes(q) ||
        c.id?.toLowerCase().includes(q)
      );
    }
    setFilteredChallans(filtered);
  }, [challans, searchQuery, statusFilter]);

  const loadChallans = async () => {
    try {
      const data = await getChallans();
      setChallans(data);
    } catch (error) {
      console.error('Audit Load Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'paid': return { color: theme.colors.success, icon: 'check-decagram', label: 'PAID' };
      case 'pending': return { color: theme.colors.warning, icon: 'alert-decagram', label: 'DUE' };
      case 'cancelled': return { color: theme.colors.error, icon: 'close-octagram', label: 'VOID' };
      default: return { color: theme.colors.onSurfaceVariant, icon: 'help-circle', label: 'DATA' };
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerSection}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={theme.colors.headerGradient} style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>ENFORCEMENT AUDIT</Text>
            <View style={[styles.activeBadge, { alignSelf: 'flex-start', marginTop: 8 }]}>
              <Text style={styles.activeBadgeText}>{filteredChallans.length} RECORDS</Text>
            </View>
          </View>
          <IconButton
            icon="plus"
            size={24}
            iconColor="#FFFFFF"
            containerColor="rgba(255,255,255,0.2)"
            onPress={() => navigation.navigate('CreateChallan')}
          />
        </View>

        <Searchbar
          placeholder="Trace by ID, Entity, or Sector..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchConsole}
          placeholderTextColor="rgba(255,255,255,0.4)"
          iconColor="#FFFFFF"
          inputStyle={styles.searchInput}
        />
      </LinearGradient>

      <View style={styles.filterStripContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterStrip}>
          <FilterTab label="ALL LOGS" active={statusFilter === 'all'} onPress={() => setStatusFilter('all')} />
          <FilterTab label="UNID DUE" active={statusFilter === 'pending'} onPress={() => setStatusFilter('pending')} color={theme.colors.warning} />
          <FilterTab label="CLEARED" active={statusFilter === 'paid'} onPress={() => setStatusFilter('paid')} color={theme.colors.success} />
          <FilterTab label="VOIDED" active={statusFilter === 'cancelled'} onPress={() => setStatusFilter('cancelled')} color={theme.colors.error} />
        </ScrollView>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadChallans(); }}
            tintColor={theme.colors.primary}
          />
        }
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredChallans.map((item) => (
          <AuditCard
            key={item.id}
            item={item}
            info={getStatusInfo(item.status)}
            onPress={() => navigation.navigate('DetectionDetail', { detection: item, challanId: item.id })}
          />
        ))}
        {filteredChallans.length === 0 && (
          <View style={styles.emptyState}>
            <Icon name="database-off-outline" size={56} color="#CBD5E1" />
            <Text style={styles.emptyText}>No matching audit records found</Text>
          </View>
        )}
        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
};

const FilterTab = ({ label, active, onPress, color }) => {
  const theme = useTheme();
  const activeColor = color || theme.colors.primary;
  return (
    <TouchableRipple
      onPress={onPress}
      style={[styles.filterTab, active && { backgroundColor: activeColor, borderColor: activeColor }]}
      borderless
    >
      <Text style={[styles.filterTabText, active && { color: '#FFFFFF' }]}>{label}</Text>
    </TouchableRipple>
  );
};

const AuditCard = ({ item, info, onPress }) => {
  const theme = useTheme();
  const photoUrl = item.photoUrl || item.studentPhotoUrl;

  return (
    <Card style={styles.auditCard} elevation={2} onPress={onPress}>
      <View style={styles.cardHeader}>
        <View style={[styles.statusIndicator, { backgroundColor: info.color }]} />
        <Text style={styles.auditId}>ID: {item.id?.slice(-12).toUpperCase()}</Text>
        <Text style={styles.cardTimestamp}>
          {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'NOW'}
        </Text>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.entityInfo}>
          {photoUrl ? (
            <Avatar.Image size={48} source={{ uri: photoUrl }} style={styles.avatar} />
          ) : (
            <Avatar.Text
              size={48}
              label={(item.studentName?.[0] || item.studentId?.[0] || 'S').toUpperCase()}
              style={styles.avatar}
              labelStyle={{ color: theme.colors.primary, fontWeight: '900' }}
            />
          )}
          <View style={styles.nameSection}>
            <Text style={styles.entityName} numberOfLines={1}>{item.studentName || item.studentId || 'UNREGISTERED'}</Text>
            <Text style={styles.locationText}>{item.location?.toUpperCase() || 'UNKNOWN SECTOR'}</Text>
          </View>
        </View>
        <View style={styles.amountSection}>
          <Text style={styles.amountValue}>Rs {item.amount}</Text>
          <View style={[styles.statusBadge, { borderColor: info.color + '40', backgroundColor: info.color + '10' }]}>
            <Icon name={info.icon} size={12} color={info.color} />
            <Text style={[styles.statusBadgeText, { color: info.color }]}>{info.label}</Text>
          </View>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centerSection: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: Platform.OS === 'ios' ? 70 : 60, paddingBottom: 50, paddingHorizontal: 24, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  activeBadge: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  activeBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  searchConsole: { backgroundColor: 'rgba(255,255,255,0.1)', elevation: 0, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  searchInput: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  filterStripContainer: { marginTop: -26 },
  filterStrip: { paddingBottom: 20, paddingHorizontal: 24 },
  filterTab: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 18, backgroundColor: '#FFFFFF', marginRight: 12, borderWidth: 1, borderColor: '#E2E8F0', elevation: 2 },
  filterTabText: { fontSize: 10, fontWeight: '900', color: '#64748B', letterSpacing: 1 },
  scrollContent: { padding: 20, paddingTop: 30 },
  auditCard: { marginBottom: 16, borderRadius: 32, backgroundColor: '#FFFFFF', padding: 20 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  statusIndicator: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  auditId: { fontSize: 11, fontWeight: '900', color: '#94A3B8', flex: 1, letterSpacing: 1 },
  cardTimestamp: { fontSize: 10, color: '#94A3B8', fontWeight: '800' },
  cardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  entityInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { backgroundColor: 'rgba(15, 23, 42, 0.05)', borderWidth: 1, borderColor: '#F1F5F9' },
  nameSection: { marginLeft: 16, flex: 1 },
  entityName: { fontSize: 17, fontWeight: '900', color: '#0F172A' },
  locationText: { fontSize: 10, color: '#64748B', fontWeight: '800', marginTop: 4, letterSpacing: 1.5 },
  amountSection: { alignItems: 'flex-end', marginLeft: 10 },
  amountValue: { fontSize: 19, fontWeight: '900', color: '#0F172A' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, marginTop: 10 },
  statusBadgeText: { fontSize: 9, fontWeight: '900', marginLeft: 6 },
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyText: { marginTop: 16, fontSize: 14, fontWeight: '700', color: '#94A3B8' }
});

export default ChallansScreen;
