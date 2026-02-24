import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Order } from '@/lib/supabase';
import { Truck, Clock, CheckCircle, XCircle, ArrowLeft, MapPin } from 'lucide-react-native';

interface OrderWithUser extends Order {
  users: {
    name: string;
    phone: string;
    email: string;
  };
}

export default function ProviderDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'assigned' | 'completed'>('pending');

  useEffect(() => {
    if (user?.user_type === 'provider') {
      loadOrders();
    } else {
      router.replace('/(tabs)');
    }
  }, [user, filter]);

  const loadOrders = async () => {
    if (!user) return;

    setLoading(true);

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        users:user_id (
          name,
          phone,
          email
        )
      `)
      .eq('status', filter === 'pending' ? 'Pending' : filter === 'assigned' ? 'Assigned' : 'Completed')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading orders:', error);
    } else {
      setOrders(data as OrderWithUser[] || []);
    }

    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const assignOrder = async (orderId: string) => {
    const { data: provider } = await supabase
      .from('service_providers')
      .select('id')
      .eq('contact', user?.email)
      .maybeSingle();

    if (!provider) {
      Alert.alert('Error', 'Provider profile not found');
      return;
    }

    const { error } = await supabase
      .from('orders')
      .update({
        provider_id: provider.id,
        status: 'Assigned',
      })
      .eq('id', orderId);

    if (error) {
      Alert.alert('Error', 'Failed to assign order');
    } else {
      Alert.alert('Success', 'Order assigned successfully');
      loadOrders();
    }
  };

  const completeOrder = async (orderId: string) => {
    Alert.alert(
      'Complete Order',
      'Mark this order as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            const { error } = await supabase
              .from('orders')
              .update({
                status: 'Completed',
                completed_at: new Date().toISOString(),
              })
              .eq('id', orderId);

            if (error) {
              Alert.alert('Error', 'Failed to complete order');
            } else {
              Alert.alert('Success', 'Order completed successfully');
              loadOrders();
            }
          },
        },
      ]
    );
  };

  const failOrder = async (orderId: string) => {
    Alert.alert(
      'Fail Order',
      'Mark this order as failed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Fail',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('orders')
              .update({ status: 'Failed' })
              .eq('id', orderId);

            if (error) {
              Alert.alert('Error', 'Failed to update order');
            } else {
              Alert.alert('Success', 'Order marked as failed');
              loadOrders();
            }
          },
        },
      ]
    );
  };

  if (user?.user_type !== 'provider') {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Provider Dashboard</Text>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'pending' && styles.filterButtonActive]}
          onPress={() => setFilter('pending')}
        >
          <Text style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>
            Pending
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'assigned' && styles.filterButtonActive]}
          onPress={() => setFilter('assigned')}
        >
          <Text style={[styles.filterText, filter === 'assigned' && styles.filterTextActive]}>
            Assigned
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'completed' && styles.filterButtonActive]}
          onPress={() => setFilter('completed')}
        >
          <Text style={[styles.filterText, filter === 'completed' && styles.filterTextActive]}>
            Completed
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading && !refreshing ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Loading orders...</Text>
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Truck color="#ccc" size={64} />
            <Text style={styles.emptyTitle}>No {filter} orders</Text>
            <Text style={styles.emptyText}>
              {filter === 'pending' ? 'No new orders available' : `No ${filter} orders to show`}
            </Text>
          </View>
        ) : (
          <View style={styles.ordersContainer}>
            {orders.map((order) => (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <View style={styles.orderHeaderLeft}>
                    <Truck color="#007BFF" size={24} />
                    <View style={styles.orderHeaderText}>
                      <Text style={styles.orderType}>{order.waste_type}</Text>
                      <Text style={styles.orderDate}>
                        {new Date(order.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.customerInfo}>
                  <Text style={styles.sectionTitle}>Customer Details</Text>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Name:</Text>
                    <Text style={styles.infoValue}>{order.users.name}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Phone:</Text>
                    <Text style={styles.infoValue}>{order.users.phone}</Text>
                  </View>
                </View>

                <View style={styles.locationInfo}>
                  <MapPin color="#007BFF" size={16} />
                  <Text style={styles.locationText}>{order.pickup_location}</Text>
                </View>

                <View style={styles.timeInfo}>
                  <Clock color="#FFA500" size={16} />
                  <Text style={styles.timeText}>
                    Scheduled: {new Date(order.pickup_time).toLocaleString()}
                  </Text>
                </View>

                {order.cost && (
                  <View style={styles.costInfo}>
                    <Text style={styles.costLabel}>Service Fee:</Text>
                    <Text style={styles.costValue}>{new Intl.NumberFormat('en-US').format(order.cost * 3700)} UGX</Text>
                  </View>
                )}

                <View style={styles.actionButtons}>
                  {filter === 'pending' && (
                    <TouchableOpacity
                      style={styles.assignButton}
                      onPress={() => assignOrder(order.id)}
                    >
                      <Text style={styles.assignButtonText}>Assign to Me</Text>
                    </TouchableOpacity>
                  )}

                  {filter === 'assigned' && (
                    <>
                      <TouchableOpacity
                        style={styles.completeButton}
                        onPress={() => completeOrder(order.id)}
                      >
                        <CheckCircle color="#fff" size={20} />
                        <Text style={styles.completeButtonText}>Complete</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.failButton}
                        onPress={() => failOrder(order.id)}
                      >
                        <XCircle color="#fff" size={20} />
                        <Text style={styles.failButtonText}>Mark as Failed</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
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
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  filterButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterButtonActive: {
    backgroundColor: '#007BFF',
    borderColor: '#007BFF',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filterTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  ordersContainer: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  orderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderHeaderText: {
    marginLeft: 12,
  },
  orderType: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 12,
    color: '#999',
  },
  customerInfo: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  costInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    marginBottom: 12,
  },
  costLabel: {
    fontSize: 14,
    color: '#666',
  },
  costValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28A745',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  assignButton: {
    flex: 1,
    backgroundColor: '#007BFF',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  assignButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  completeButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#28A745',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  failButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#DC3545',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  failButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    minHeight: 400,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
