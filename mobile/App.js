import { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  AppState,
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from './lib/supabase';

const API_URL = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/+$/, '');

async function apiRequest(path, options = {}) {
  if (!API_URL) throw new Error('Set EXPO_PUBLIC_API_URL in mobile/.env to continue.');
  if (!supabase) throw new Error('Add your Supabase settings to mobile/.env to continue.');

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session?.access_token) throw new Error('Please sign in to continue.');

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${data.session.access_token}`,
    },
  });

  if (!response.ok) {
    let message = 'The request could not be completed. Please try again.';
    try {
      const body = await response.json();
      if (body.error) message = body.error;
    } catch (e) {
      // Keep the generic message when the server response is not JSON.
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const [session, setSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Products');
  const [cartItems, setCartItems] = useState([]);
  const [toastMessage, setToastMessage] = useState('');

  const reloadCart = useCallback(async () => {
    const items = await apiRequest('/api/cart');
    const nextItems = Array.isArray(items) ? items : [];
    setCartItems(nextItems);
    return nextItems;
  }, []);

  useEffect(() => {
    if (!supabase) {
      setSessionLoading(false);
      return;
    }

    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) setSession(nextSession);
    });

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) console.warn('Could not restore session:', error.message);
      setSession(data.session);
      setSessionLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) {
      setCartItems([]);
      return;
    }
    reloadCart().catch((error) => console.warn('Could not load cart:', error.message));
  }, [session, reloadCart]);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!supabase || !userId) return undefined;

    const reload = () => reloadCart().catch((error) => console.warn('Could not sync cart:', error.message));
    const channel = supabase
      .channel(`cart-${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'cart_items',
        filter: `user_id=eq.${userId}`,
      }, reload)
      .subscribe();
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') reload();
    });

    return () => {
      appStateSubscription.remove();
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, reloadCart]);

  useEffect(() => {
    if (!toastMessage) return undefined;
    const timer = setTimeout(() => setToastMessage(''), 1600);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  if (sessionLoading) {
    return (
      <SafeAreaView style={styles.app}>
        <StatusBar style="dark" />
        <View style={styles.page}>
          <ScreenHeader title="Account" />
          <CenteredMessage message="Loading your account..." />
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  async function logOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert('Could not log out', error.message);
  }

  async function addProductToCart(product) {
    try {
      await apiRequest('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, quantity: 1 }),
      });
      await reloadCart();
      setToastMessage('Added to cart');
    } catch (error) {
      Alert.alert('Could not add item', error.message);
    }
  }

  const cartQuantity = cartItems.reduce((total, item) => total + (Number(item.quantity) || 0), 0);

  return (
    <SafeAreaView style={styles.app}>
      <StatusBar style="dark" />
      <View style={styles.screenContent}>
        {activeTab === 'Products'
          ? <ProductsScreen onAddToCart={addProductToCart} />
          : activeTab === 'Cart'
            ? <CartScreen
                cartItems={cartItems}
                onCartReload={reloadCart}
                onProceedToCheckout={() => setActiveTab('Checkout')}
              />
            : <CheckoutScreen
                cartItems={cartItems}
                user={session.user}
                onOrderSuccess={() => {
                  setCartItems([]);
                  setActiveTab('Products');
                }}
              />}
      </View>
      <View style={styles.tabBar}>
        <TabButton icon="▦" label="Products" active={activeTab === 'Products'} onPress={() => setActiveTab('Products')} />
        <TabButton icon="🛒" label="Cart" badge={cartQuantity} active={activeTab === 'Cart' || activeTab === 'Checkout'} onPress={() => setActiveTab('Cart')} />
        <TabButton icon="↪" label="Log out" onPress={logOut} />
      </View>
      {toastMessage ? <View pointerEvents="none" style={styles.toast}><Text style={styles.toastText}>{toastMessage}</Text></View> : null}
    </SafeAreaView>
  );
}

function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  function friendlyError(error, isSignup) {
    const message = error && error.message ? error.message.toLowerCase() : '';
    if (message.includes('invalid login credentials') || message.includes('invalid password')) return 'Wrong email or password.';
    if (message.includes('email not confirmed') || message.includes('confirm your email')) return 'Please check your email to confirm your account.';
    if (message.includes('already registered') || message.includes('already exists')) return 'That email already has an account. Try logging in.';
    if (isSignup && message.includes('password')) return 'Use a password with at least 6 characters.';
    return 'We could not sign you in. Please check your details and try again.';
  }

  async function handleAuth(mode) {
    setErrorMessage('');
    if (!supabase) {
      setErrorMessage('Add your Supabase URL and anon key to mobile/.env to continue.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Your password must be at least 6 characters.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          setErrorMessage('That email already has an account. Try logging in.');
          return;
        }
      }

      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
    } catch (error) {
      setErrorMessage(friendlyError(error, mode === 'signup'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.app}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.loginWrap} keyboardShouldPersistTaps="handled">
        <ScreenHeader title="Welcome back" />
        <View style={styles.loginCard}>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={colors.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            style={styles.input}
          />
          <View style={styles.passwordRow}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={colors.muted}
              secureTextEntry={!showPassword}
              autoComplete="password"
              style={[styles.input, styles.passwordInput]}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={10}>
              <Text style={styles.toggleText}>{showPassword ? 'Hide' : 'Show'}</Text>
            </Pressable>
          </View>
          {errorMessage ? <Text accessibilityRole="alert" style={styles.errorText}>{errorMessage}</Text> : null}
          <ActionButton label={busy ? 'Please wait...' : 'Log in'} onPress={() => handleAuth('login')} disabled={busy} />
          <Pressable onPress={() => handleAuth('signup')} disabled={busy} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Create account</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProductsScreen({ onAddToCart }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function loadProducts(isRefresh) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setErrorMessage('');

    try {
      const data = await apiRequest('/api/products');
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      setErrorMessage(error.message || 'We could not load products. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadProducts(false);
  }, []);

  function productImage(image) {
    if (!API_URL || !image) return null;
    return { uri: `${API_URL}/${String(image).replace(/^\/+/, '')}` };
  }

  function renderProduct({ item }) {
    const image = productImage(item.image);
    return (
      <View style={styles.productCard}>
        {image
          ? <Image source={image} style={styles.productImage} resizeMode="cover" />
          : <View style={[styles.productImage, styles.imagePlaceholder]}><Text style={styles.placeholderText}>Paws &amp; Co</Text></View>}
        <View style={styles.productInfo}>
          <View style={styles.catalogProductHeading}>
            <Text numberOfLines={2} style={styles.catalogProductName}>{item.name}</Text>
            <Text numberOfLines={1} style={styles.catalogProductPrice}>₦{Number(item.price || 0).toLocaleString('en-NG')}</Text>
          </View>
          <Text numberOfLines={2} style={styles.productDescription}>{item.description}</Text>
          <ActionButton compact label="Add" onPress={() => onAddToCart(item)} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <ScreenHeader title="Products" />
      {loading
        ? <CenteredMessage message="Loading products..." />
        : errorMessage
          ? <View style={styles.emptyState}>
              <Text style={styles.errorText}>{errorMessage}</Text>
              <Pressable onPress={() => loadProducts(false)}><Text style={styles.inlineAction}>Try again</Text></Pressable>
            </View>
          : <FlatList
              data={products}
              numColumns={2}
              columnWrapperStyle={styles.productRow}
              keyExtractor={(item, index) => String(item.id || item.name || index)}
              renderItem={renderProduct}
              contentContainerStyle={styles.productList}
              refreshing={refreshing}
              onRefresh={() => loadProducts(true)}
              ListEmptyComponent={<Text style={styles.emptyText}>No products are available right now.</Text>}
            />}
    </View>
  );
}

function CartScreen({ cartItems, onCartReload, onProceedToCheckout }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [busyId, setBusyId] = useState(null);

  const reload = useCallback(async () => {
    try {
      await onCartReload();
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error.message || 'We could not load your cart.');
    }
  }, [onCartReload]);

  const refresh = useCallback(async (pullToRefresh = false) => {
    if (pullToRefresh) setRefreshing(true);
    else setLoading(true);
    setErrorMessage('');
    try {
      const [items, productData] = await Promise.all([
        onCartReload(),
        apiRequest('/api/products'),
      ]);
      setProducts(Array.isArray(productData) ? productData : []);
      return items;
    } catch (error) {
      setErrorMessage(error.message || 'We could not load your cart.');
      return null;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onCartReload]);

  useEffect(() => {
    refresh(false);
  }, [refresh]);

  useEffect(() => {
    const poll = setInterval(reload, 3000);
    return () => clearInterval(poll);
  }, [reload]);

  async function changeQuantity(item, quantity) {
    const id = String(item.id);
    setBusyId(id);
    try {
      await apiRequest(`/api/cart/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      });
      await onCartReload();
    } catch (error) {
      Alert.alert('Could not update cart', error.message);
    } finally {
      setBusyId(null);
    }
  }

  async function removeItem(item) {
    const id = String(item.id);
    setBusyId(id);
    try {
      await apiRequest(`/api/cart/${encodeURIComponent(id)}`, { method: 'DELETE' });
      await onCartReload();
    } catch (error) {
      Alert.alert('Could not remove item', error.message);
    } finally {
      setBusyId(null);
    }
  }

  const visibleItems = cartItems.map((cartItem) => ({
    cartItem,
    product: products.find((product) => String(product.id) === String(cartItem.id)),
  })).filter((entry) => entry.product);
  const total = visibleItems.reduce((sum, entry) => {
    return sum + (Number(entry.product.price) || 0) * (Number(entry.cartItem.quantity) || 0);
  }, 0);

  function productImage(image) {
    if (!API_URL || !image) return null;
    return { uri: `${API_URL}/${String(image).replace(/^\/+/, '')}` };
  }

  function renderCartItem({ item: entry }) {
    const { cartItem, product } = entry;
    const id = String(cartItem.id);
    const image = productImage(product.image);
    const quantity = Number(cartItem.quantity) || 0;
    const busy = busyId === id;
    return (
      <View style={styles.cartCard}>
        {image
          ? <Image source={image} style={styles.cartImage} resizeMode="cover" />
          : <View style={[styles.cartImage, styles.imagePlaceholder]}><Text style={styles.placeholderText}>Paws &amp; Co</Text></View>}
        <View style={styles.cartInfo}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.cartPrice}>₦{Number(product.price || 0).toLocaleString('en-NG')}</Text>
          <View style={styles.cartControls}>
            <Pressable accessibilityLabel={`Decrease ${product.name} quantity`} disabled={busy} onPress={() => changeQuantity(cartItem, quantity - 1)} style={styles.quantityButton}>
              <Text style={styles.quantityButtonText}>−</Text>
            </Pressable>
            <Text style={styles.quantityText}>{quantity}</Text>
            <Pressable accessibilityLabel={`Increase ${product.name} quantity`} disabled={busy} onPress={() => changeQuantity(cartItem, quantity + 1)} style={styles.quantityButton}>
              <Text style={styles.quantityButtonText}>+</Text>
            </Pressable>
            <Pressable disabled={busy} onPress={() => removeItem(cartItem)} style={styles.removeButton}>
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <ScreenHeader title="Cart" />
      {loading
        ? <CenteredMessage message="Loading your cart..." />
        : <>
            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
            <FlatList
              data={visibleItems}
              keyExtractor={(entry) => String(entry.cartItem.id)}
              renderItem={renderCartItem}
              contentContainerStyle={styles.cartList}
              refreshing={refreshing}
              onRefresh={() => refresh(true)}
              ListEmptyComponent={errorMessage
                ? <Pressable onPress={() => refresh(false)}><Text style={styles.inlineAction}>Try again</Text></Pressable>
                : <Text style={styles.emptyText}>Your cart is empty</Text>}
              ListFooterComponent={
                <View style={styles.cartFooter}>
                  <View style={styles.totalRow}><Text style={styles.totalLabel}>Total</Text><Text style={styles.totalValue}>₦{total.toLocaleString('en-NG')}</Text></View>
                  <ActionButton
                    label="Proceed to checkout"
                    onPress={onProceedToCheckout}
                    disabled={!visibleItems.length}
                  />
                </View>
              }
            />
          </>}
    </View>
  );
}

function CheckoutScreen({ cartItems, user, onOrderSuccess }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('delivery');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    apiRequest('/api/products')
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch((error) => setErrorMessage(error.message || 'We could not load your order summary.'))
      .finally(() => setLoading(false));
  }, []);

  const orderLines = cartItems.map((cartItem) => ({
    cartItem,
    product: products.find((product) => String(product.id) === String(cartItem.id)),
  })).filter((line) => line.product);
  const total = orderLines.reduce((sum, line) => {
    return sum + (Number(line.product.price) || 0) * (Number(line.cartItem.quantity) || 0);
  }, 0);

  async function placeOrder() {
    setErrorMessage('');
    if (!name.trim()) {
      setErrorMessage('Full name is required.');
      return;
    }
    if (!phone.trim()) {
      setErrorMessage('Phone number is required.');
      return;
    }
    if (deliveryMethod === 'delivery' && !address.trim()) {
      setErrorMessage('Delivery address is required.');
      return;
    }
    if (!orderLines.length) {
      setErrorMessage('Your cart is empty.');
      return;
    }

    setSubmitting(true);
    try {
      const order = await apiRequest('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          deliveryMethod,
          address,
          notes,
          items: orderLines.map(({ cartItem, product }) => ({
            id: product.id,
            quantity: Number(cartItem.quantity),
          })),
        }),
      });

      const deletions = await Promise.allSettled(cartItems.map((item) => (
        apiRequest(`/api/cart/${encodeURIComponent(String(item.id))}`, { method: 'DELETE' })
      )));
      const cartClearFailed = deletions.some((result) => result.status === 'rejected');
      onOrderSuccess();
      Alert.alert(
        'Order placed!',
        `Order ID: ${order.orderId}\nA confirmation email is on its way.${cartClearFailed ? '\nSome cart items could not be cleared from the server.' : ''}`,
      );
    } catch (error) {
      setErrorMessage(error.message || 'We could not place your order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.page}>
      <ScreenHeader title="Checkout" />
      {loading
        ? <CenteredMessage message="Loading checkout..." />
        : <ScrollView contentContainerStyle={styles.checkoutContent} keyboardShouldPersistTaps="handled">
            <View style={styles.checkoutCard}>
              <Text style={styles.checkoutAccount}>Signed in as {user.email}</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Full name"
                placeholderTextColor={colors.muted}
                autoComplete="name"
                style={styles.input}
              />
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="Phone number"
                placeholderTextColor={colors.muted}
                keyboardType="phone-pad"
                autoComplete="tel"
                style={styles.input}
              />
              <Text style={styles.fieldLabel}>Delivery method</Text>
              <View style={styles.methodRow}>
                {[
                  { value: 'delivery', label: 'Delivery' },
                  { value: 'pickup', label: 'Pickup' },
                ].map((method) => (
                  <Pressable
                    key={method.value}
                    onPress={() => setDeliveryMethod(method.value)}
                    style={[styles.methodButton, deliveryMethod === method.value && styles.selectedMethodButton]}
                  >
                    <Text style={[styles.methodText, deliveryMethod === method.value && styles.selectedMethodText]}>{method.label}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={address}
                onChangeText={setAddress}
                placeholder="Delivery address"
                placeholderTextColor={colors.muted}
                multiline
                textAlignVertical="top"
                style={[styles.input, styles.multilineInput]}
              />
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Notes (optional)"
                placeholderTextColor={colors.muted}
                multiline
                textAlignVertical="top"
                style={[styles.input, styles.multilineInput]}
              />
            </View>

            <View style={styles.checkoutCard}>
              <Text style={styles.summaryTitle}>Order summary</Text>
              {orderLines.map(({ cartItem, product }) => {
                const quantity = Number(cartItem.quantity) || 0;
                return (
                  <View key={String(cartItem.id)} style={styles.summaryLine}>
                    <Text style={styles.summaryName}>{product.name} x {quantity}</Text>
                    <Text style={styles.summaryPrice}>₦{(Number(product.price || 0) * quantity).toLocaleString('en-NG')}</Text>
                  </View>
                );
              })}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>₦{total.toLocaleString('en-NG')}</Text>
              </View>
            </View>

            {errorMessage ? <Text accessibilityRole="alert" style={styles.errorText}>{errorMessage}</Text> : null}
            <ActionButton
              label={submitting ? 'Placing order...' : 'Place order'}
              onPress={placeOrder}
              disabled={submitting || !orderLines.length}
            />
          </ScrollView>}
    </View>
  );
}

function ScreenHeader({ title }) {
  return (
    <View style={styles.screenHeader}>
      <Text style={styles.brandText}>🐾 Paws &amp; Co</Text>
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );
}

function CenteredMessage({ message }) {
  return <View style={styles.centered}><ActivityIndicator color={colors.orange} /><Text style={styles.mutedText}>{message}</Text></View>;
}

function ActionButton({ label, onPress, disabled, compact = false }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.primaryButton, compact && styles.compactButton, disabled && styles.disabledButton]}>
      <Text style={[styles.primaryButtonText, compact && styles.compactButtonText]}>{label}</Text>
    </Pressable>
  );
}

function TabButton({ icon, label, badge, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.tabButton} accessibilityRole="button" accessibilityState={{ selected: Boolean(active) }}>
      <Text style={[styles.tabIcon, active && styles.activeTabIcon]}>{icon}</Text>
      <View style={styles.tabLabelRow}>
        <Text style={[styles.tabText, active && styles.activeTabText]}>{label}</Text>
        {badge !== undefined
          ? <View style={[styles.badge, active && styles.activeBadge]}><Text style={[styles.badgeText, active && styles.activeBadgeText]}>{badge}</Text></View>
          : null}
      </View>
    </Pressable>
  );
}

const colors = {
  orange: '#EA580C',
  cream: '#FFF7ED',
  charcoal: '#292524',
  white: '#FFFFFF',
  muted: '#78716C',
  border: '#E7E5E4',
  error: '#B91C1C',
};

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.cream },
  screenContent: { flex: 1 },
  loginWrap: { flexGrow: 1, justifyContent: 'center', padding: 16, gap: 16 },
  loginCard: { backgroundColor: colors.white, borderRadius: 20, padding: 24, gap: 14, elevation: 3 },
  screenHeader: { gap: 4, marginBottom: 16 },
  brandText: { color: colors.charcoal, fontSize: 20, fontWeight: '800' },
  headerTitle: { color: colors.charcoal, fontSize: 26, fontWeight: '800' },
  input: { minHeight: 50, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, color: colors.charcoal, backgroundColor: colors.white, fontSize: 16 },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  passwordInput: { flex: 1 },
  toggleText: { color: colors.orange, fontWeight: '700', padding: 4 },
  primaryButton: { minHeight: 48, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.orange, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12 },
  primaryButtonText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  compactButton: { minHeight: 34, alignSelf: 'flex-end', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  compactButtonText: { fontSize: 14 },
  disabledButton: { opacity: 0.6 },
  secondaryButton: { minHeight: 46, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.orange, borderRadius: 14, padding: 10 },
  secondaryButtonText: { color: colors.orange, fontWeight: '700', fontSize: 16 },
  errorText: { color: colors.error, fontSize: 14, lineHeight: 20 },
  page: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  productList: { paddingBottom: 18, gap: 12 },
  productRow: { gap: 12 },
  productCard: { flex: 1, backgroundColor: colors.white, borderRadius: 16, overflow: 'hidden', elevation: 2 },
  productImage: { width: '100%', height: 160, backgroundColor: '#F5F5F4' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  placeholderText: { color: colors.muted, fontWeight: '700' },
  productInfo: { padding: 10, gap: 7 },
  productName: { color: colors.charcoal, fontSize: 18, fontWeight: '700' },
  catalogProductHeading: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 5 },
  catalogProductName: { flex: 1, color: colors.charcoal, fontSize: 14, lineHeight: 18, fontWeight: '700' },
  productDescription: { color: colors.muted, fontSize: 12, lineHeight: 16 },
  catalogProductPrice: { color: colors.charcoal, fontSize: 13, fontWeight: '800' },
  cartList: { paddingBottom: 18, gap: 12, flexGrow: 1 },
  cartFooter: { gap: 16, paddingTop: 4 },
  cartCard: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: 16, padding: 12, gap: 12, elevation: 2 },
  cartImage: { width: 88, height: 88, borderRadius: 12, backgroundColor: '#F5F5F4' },
  cartInfo: { flex: 1, justifyContent: 'center', gap: 6 },
  cartPrice: { color: colors.charcoal, fontSize: 15, fontWeight: '700' },
  cartControls: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  quantityButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: colors.cream },
  quantityButtonText: { color: colors.orange, fontSize: 20, fontWeight: '700', lineHeight: 24 },
  quantityText: { minWidth: 20, color: colors.charcoal, textAlign: 'center', fontWeight: '700' },
  removeButton: { marginLeft: 'auto', paddingVertical: 8, paddingHorizontal: 4 },
  removeText: { color: colors.error, fontSize: 13, fontWeight: '700' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16, marginTop: 4 },
  totalLabel: { color: colors.charcoal, fontSize: 17, fontWeight: '700' },
  totalValue: { color: colors.orange, fontSize: 18, fontWeight: '800' },
  checkoutContent: { paddingBottom: 24, gap: 14 },
  checkoutCard: { backgroundColor: colors.white, borderRadius: 16, padding: 16, gap: 12, elevation: 2 },
  checkoutAccount: { color: colors.muted, fontSize: 13 },
  fieldLabel: { color: colors.charcoal, fontSize: 14, fontWeight: '700' },
  methodRow: { flexDirection: 'row', gap: 10 },
  methodButton: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.white },
  selectedMethodButton: { backgroundColor: colors.orange, borderColor: colors.orange },
  methodText: { color: colors.charcoal, fontWeight: '700' },
  selectedMethodText: { color: colors.white },
  multilineInput: { minHeight: 84, paddingTop: 12 },
  summaryTitle: { color: colors.charcoal, fontSize: 18, fontWeight: '800' },
  summaryLine: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  summaryName: { flex: 1, color: colors.charcoal },
  summaryPrice: { color: colors.charcoal, fontWeight: '700' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20 },
  emptyText: { color: colors.muted, textAlign: 'center', padding: 24 },
  inlineAction: { color: colors.orange, fontWeight: '700', padding: 8 },
  placeholderCard: { backgroundColor: colors.white, borderRadius: 16, padding: 20, gap: 8, elevation: 2 },
  placeholderHeading: { color: colors.charcoal, fontSize: 18, fontWeight: '700' },
  tabBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border },
  tabButton: { flex: 1, minHeight: 56, justifyContent: 'center', alignItems: 'center', gap: 3, borderRadius: 12, paddingHorizontal: 6, paddingVertical: 4 },
  tabIcon: { color: colors.muted, fontSize: 20, lineHeight: 24 },
  activeTabIcon: { color: colors.orange },
  tabText: { color: colors.charcoal, fontSize: 12, fontWeight: '700' },
  activeTabText: { color: colors.orange },
  tabLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: { minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, borderRadius: 10, backgroundColor: colors.cream },
  badgeText: { color: colors.orange, fontSize: 11, fontWeight: '800' },
  activeBadge: { backgroundColor: colors.cream },
  activeBadgeText: { color: colors.orange },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  mutedText: { color: colors.muted, textAlign: 'center' },
  toast: { position: 'absolute', bottom: 72, left: 20, right: 20, alignItems: 'center', backgroundColor: colors.charcoal, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 20, elevation: 5 },
  toastText: { color: colors.white, fontWeight: '700' },
});
