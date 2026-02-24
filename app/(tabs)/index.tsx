import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Order } from '@/lib/supabase';
import { Trash2, Calendar, TrendingUp, MapPin, ClipboardList } from 'lucide-react-native';

export default function HomeScreen() {
  const { user, loading } = useAuth();
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (user) {
      loadStats();
      loadRecentOrders();
    }
  }, [user]);

  const loadStats = async () => {
    if (!user) return;

    const { data: orders } = await supabase
      .from('orders')
      .select('status')
      .eq('user_id', user.id);

    if (orders) {
      setStats({
        totalOrders: orders.length,
        pendingOrders: orders.filter((o) => o.status === 'Pending' || o.status === 'Assigned').length,
        completedOrders: orders.filter((o) => o.status === 'Completed').length,
      });
    }
  };

  const loadRecentOrders = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(3);

    if (data) {
      setRecentOrders(data);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={{ marginBottom: 16, fontSize: 18, fontWeight: '600' }}>
            Profile Not Found
          </Text>
          <Text style={{ color: '#666', textAlign: 'center', marginBottom: 24 }}>
            Your account exists but your profile could not be loaded.
          </Text>
          <Text style={{ color: '#666', textAlign: 'center', fontSize: 12 }}>
            Please try signing out and signing in again, or contact support.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {user.name}!</Text>
        <Text style={styles.subGreeting}>Welcome to iTRUSH</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Trash2 color="#007BFF" size={24} />
          </View>
          <Text style={styles.statValue}>{stats.totalOrders}</Text>
          <Text style={styles.statLabel}>Total Orders</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Calendar color="#FFA500" size={24} />
          </View>
          <Text style={styles.statValue}>{stats.pendingOrders}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <TrendingUp color="#28A745" size={24} />
          </View>
          <Text style={styles.statValue}>{stats.completedOrders}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/(tabs)/book')}
        >
          <MapPin color="#007BFF" size={24} />
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>Book a Pickup</Text>
            <Text style={styles.actionSubtitle}>Schedule waste collection</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/(tabs)/orders')}
        >
          <ClipboardList color="#007BFF" size={24} />
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>View Orders</Text>
            <Text style={styles.actionSubtitle}>Check your order history</Text>
          </View>
        </TouchableOpacity>
      </View>

      {recentOrders.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Orders</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/orders')}>
              <Text style={styles.sectionLink}>View All</Text>
            </TouchableOpacity>
          </View>

          {recentOrders.map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <Text style={styles.orderType}>{order.waste_type}</Text>
                <View style={[styles.statusBadge, getStatusStyle(order.status)]}>
                  <Text style={styles.statusText}>{order.status}</Text>
                </View>
              </View>
              <Text style={styles.orderLocation}>{order.pickup_location}</Text>
              <Text style={styles.orderDate}>
                {new Date(order.pickup_time).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>About iTRUSH</Text>
        <Text style={styles.infoText}>
          iTRUSH helps automate waste collection in the Greater Kampala Metropolitan Area.
          Schedule pickups, track collections, and contribute to a cleaner environment.
        </Text>
      </View>
    </ScrollView>
  );
}

function getStatusStyle(status: string) {
  switch (status) {
    case 'Completed':
      return { backgroundColor: '#E8F5E9' };
    case 'Assigned':
      return { backgroundColor: '#E3F2FD' };
    case 'Pending':
      return { backgroundColor: '#FFF3E0' };
    case 'Failed':
      return { backgroundColor: '#FFEBEE' };
    default:
      return { backgroundColor: '#F5F5F5' };
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#007BFF',
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subGreeting: {
    fontSize: 16,
    color: '#E3F2FD',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statIconContainer: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionLink: {
    fontSize: 14,
    color: '#007BFF',
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionTextContainer: {
    marginLeft: 16,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  orderCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  orderLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    color: '#999',
  },
  infoSection: {
    padding: 16,
    margin: 16,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007BFF',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
