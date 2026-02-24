import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { BarChart3, Users, Package, DollarSign, ArrowLeft } from 'lucide-react-native';

interface Stats {
  totalUsers: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalRevenue: number;
  activeProviders: number;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
    activeProviders: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.user_type === 'admin') {
      loadStats();
    } else {
      router.replace('/(tabs)');
    }
  }, [user]);

  const loadStats = async () => {
    setLoading(true);

    const [usersResult, ordersResult, providersResult, paymentsResult] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact' }),
      supabase.from('orders').select('status', { count: 'exact' }),
      supabase.from('service_providers').select('id', { count: 'exact' }).eq('status', 'active'),
      supabase.from('payments').select('amount').eq('status', 'Completed'),
    ]);

    const totalRevenue = paymentsResult.data?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
    const orders = ordersResult.data || [];

    setStats({
      totalUsers: usersResult.count || 0,
      totalOrders: orders.length,
      pendingOrders: orders.filter((o) => o.status === 'Pending' || o.status === 'Assigned').length,
      completedOrders: orders.filter((o) => o.status === 'Completed').length,
      totalRevenue,
      activeProviders: providersResult.count || 0,
    });

    setLoading(false);
  };

  if (user?.user_type !== 'admin') {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Admin Dashboard</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Welcome, {user.name}</Text>
          <Text style={styles.welcomeSubtext}>Here's an overview of iTRUSH operations</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Users color="#007BFF" size={28} />
            </View>
            <Text style={styles.statValue}>{stats.totalUsers}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Package color="#28A745" size={28} />
            </View>
            <Text style={styles.statValue}>{stats.totalOrders}</Text>
            <Text style={styles.statLabel}>Total Orders</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Package color="#FFA500" size={28} />
            </View>
            <Text style={styles.statValue}>{stats.pendingOrders}</Text>
            <Text style={styles.statLabel}>Pending Orders</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Package color="#28A745" size={28} />
            </View>
            <Text style={styles.statValue}>{stats.completedOrders}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <DollarSign color="#28A745" size={28} />
            </View>
            <Text style={styles.statValue}>{new Intl.NumberFormat('en-US').format(stats.totalRevenue)} UGX</Text>
            <Text style={styles.statLabel}>Total Revenue</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <BarChart3 color="#007BFF" size={28} />
            </View>
            <Text style={styles.statValue}>{stats.activeProviders}</Text>
            <Text style={styles.statLabel}>Active Providers</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <TouchableOpacity style={styles.actionCard}>
            <View style={styles.actionCardContent}>
              <Text style={styles.actionCardTitle}>Manage Service Providers</Text>
              <Text style={styles.actionCardSubtitle}>Add or remove providers</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <View style={styles.actionCardContent}>
              <Text style={styles.actionCardTitle}>View All Orders</Text>
              <Text style={styles.actionCardSubtitle}>Monitor collection activities</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <View style={styles.actionCardContent}>
              <Text style={styles.actionCardTitle}>Generate Reports</Text>
              <Text style={styles.actionCardSubtitle}>Analytics and insights</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <View style={styles.actionCardContent}>
              <Text style={styles.actionCardTitle}>User Management</Text>
              <Text style={styles.actionCardSubtitle}>View and manage users</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>System Status</Text>
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>All systems operational</Text>
          </View>
          <Text style={styles.infoText}>
            Last updated: {new Date().toLocaleString()}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#007BFF',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  welcomeSection: {
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  welcomeSubtext: {
    fontSize: 16,
    color: '#666',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 12,
  },
  statCard: {
    width: '47%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statIcon: {
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  actionCard: {
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
  actionCardContent: {
    flexDirection: 'column',
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  actionCardSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  infoSection: {
    margin: 16,
    padding: 16,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28A745',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#28A745',
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  infoText: {
    fontSize: 12,
    color: '#666',
  },
});
