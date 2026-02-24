import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Order } from '@/lib/supabase';
import { Package, Clock, CheckCircle, XCircle, ChevronRight, DollarSign } from 'lucide-react-native';

export default function OrdersScreen() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user, filter]);

  const loadOrders = async () => {
    if (!user) return;

    setLoading(true);

    let query = supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (filter === 'pending') {
      query = query.in('status', ['Pending', 'Assigned']);
    } else if (filter === 'completed') {
      query = query.eq('status', 'Completed');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading orders:', error);
    } else {
      setOrders(data || []);
    }

    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const checkPaymentStatus = async (orderId: string) => {
    const { data } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .eq('status', 'Completed')
      .maybeSingle();

    return !!data;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle color="#28A745" size={20} />;
      case 'Pending':
        return <Clock color="#FFA500" size={20} />;
      case 'Assigned':
        return <Package color="#007BFF" size={20} />;
      case 'Failed':
        return <XCircle color="#DC3545" size={20} />;
      default:
        return <Clock color="#999" size={20} />;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Completed':
        return { backgroundColor: '#E8F5E9', color: '#28A745' };
      case 'Assigned':
        return { backgroundColor: '#E3F2FD', color: '#007BFF' };
      case 'Pending':
        return { backgroundColor: '#FFF3E0', color: '#FFA500' };
      case 'Failed':
        return { backgroundColor: '#FFEBEE', color: '#DC3545' };
      default:
        return { backgroundColor: '#F5F5F5', color: '#999' };
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Orders</Text>
        <Text style={styles.subtitle}>Track your waste collection</Text>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'pending' && styles.filterButtonActive]}
          onPress={() => setFilter('pending')}
        >
          <Text style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>
            Pending
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
            <Package color="#ccc" size={64} />
            <Text style={styles.emptyTitle}>No orders found</Text>
            <Text style={styles.emptyText}>
              {filter === 'all'
                ? "You haven't made any bookings yet"
                : `No ${filter} orders`}
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/(tabs)/book')}
            >
              <Text style={styles.emptyButtonText}>Book a Pickup</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.ordersContainer}>
            {orders.map((order) => (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <View style={styles.orderHeaderLeft}>
                    {getStatusIcon(order.status)}
                    <View style={styles.orderHeaderText}>
                      <Text style={styles.orderType}>{order.waste_type}</Text>
                      <Text style={styles.orderDate}>
                        {new Date(order.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusStyle(order.status).backgroundColor },
                    ]}
                  >
                    <Text
                      style={[styles.statusText, { color: getStatusStyle(order.status).color }]}
                    >
                      {order.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.orderDetails}>
                  <View style={styles.orderDetailRow}>
                    <Text style={styles.orderDetailLabel}>Location:</Text>
                    <Text style={styles.orderDetailValue} numberOfLines={1}>
                      {order.pickup_location}
                    </Text>
                  </View>
                  <View style={styles.orderDetailRow}>
                    <Text style={styles.orderDetailLabel}>Scheduled:</Text>
                    <Text style={styles.orderDetailValue}>
                      {new Date(order.pickup_time).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  {order.cost && (
                    <View style={styles.orderDetailRow}>
                      <Text style={styles.orderDetailLabel}>Cost:</Text>
                      <Text style={[styles.orderDetailValue, styles.costText]}>
                        {new Intl.NumberFormat('en-US').format(order.cost * 3700)} UGX
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.actionButtons}>
                  {order.status === 'Assigned' && (
                    <TouchableOpacity
                      style={styles.trackButton}
                      onPress={() => router.push(`/track/${order.id}`)}
                    >
                      <Text style={styles.trackButtonText}>Track Pickup</Text>
                      <ChevronRight color="#007BFF" size={20} />
                    </TouchableOpacity>
                  )}

                  {order.status === 'Completed' && (
                    <TouchableOpacity
                      style={styles.payButton}
                      onPress={() => router.push(`/payment/${order.id}`)}
                    >
                      <DollarSign color="#fff" size={20} />
                      <Text style={styles.payButtonText}>Pay Now</Text>
                    </TouchableOpacity>
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
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#007BFF',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#E3F2FD',
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
    marginBottom: 12,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 12,
    color: '#999',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderDetails: {
    gap: 8,
  },
  orderDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  orderDetailLabel: {
    fontSize: 14,
    color: '#666',
  },
  orderDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  costText: {
    color: '#28A745',
    fontSize: 16,
  },
  actionButtons: {
    marginTop: 12,
    gap: 8,
  },
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  trackButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007BFF',
    marginRight: 4,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#28A745',
    borderRadius: 8,
    gap: 8,
  },
  payButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
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
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#007BFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
