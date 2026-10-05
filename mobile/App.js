import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { supabase } from './lib/supabase';

const API_URL = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/+$/, '');

export default function App() {
  const [session, setSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Products');

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

  if (sessionLoading) {
    return <CenteredMessage message="Loading your account..." />;
  }

  if (!session) {
    return <LoginScreen />;
  }

  async function logOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert('Could not log out', error.message);
  }

  return (
    <SafeAreaView style={styles.app}>
      <StatusBar style="dark" />
      <View style={styles.screenContent}>
        {activeTab === 'Products'
          ? <ProductsScreen />
          : <CartScreen />}
      </View>
      <View style={styles.tabBar}>
        <TabButton label="Products" active={activeTab === 'Products'} onPress={() => setActiveTab('Products')} />
        <TabButton label="Cart" active={activeTab === 'Cart'} onPress={() => setActiveTab('Cart')} />
        <Pressable onPress={logOut} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </View>
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
        <View style={styles.loginCard}>
          <Text style={styles.logo}>🐾 Paws &amp; Co</Text>
          <Text style={styles.loginHeading}>Welcome back</Text>
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

function ProductsScreen() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function loadProducts(isRefresh) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setErrorMessage('');

    try {
      if (!API_URL) throw new Error('Set EXPO_PUBLIC_API_URL in mobile/.env to load products.');
      const response = await fetch(`${API_URL}/api/products`);
      if (!response.ok) throw new Error('We could not load products. Please try again.');
      const data = await response.json();
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
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productDescription}>{item.description}</Text>
          <Text style={styles.productPrice}>₦{Number(item.price || 0).toLocaleString('en-NG')}</Text>
          <ActionButton label="Add to cart" onPress={() => Alert.alert('Added to cart', `${item.name} was added to your cart.`)} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <Text style={styles.pageTitle}>Products</Text>
      {loading
        ? <CenteredMessage message="Loading products..." />
        : errorMessage
          ? <View style={styles.emptyState}>
              <Text style={styles.errorText}>{errorMessage}</Text>
              <Pressable onPress={() => loadProducts(false)}><Text style={styles.inlineAction}>Try again</Text></Pressable>
            </View>
          : <FlatList
              data={products}
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

function CartScreen() {
  return (
    <View style={styles.page}>
      <Text style={styles.pageTitle}>Cart</Text>
      <View style={styles.placeholderCard}>
        <Text style={styles.placeholderHeading}>Your cart</Text>
        <Text style={styles.productDescription}>Your cart will be available here soon.</Text>
      </View>
    </View>
  );
}

function CenteredMessage({ message }) {
  return <View style={styles.centered}><ActivityIndicator color={colors.orange} /><Text style={styles.mutedText}>{message}</Text></View>;
}

function ActionButton({ label, onPress, disabled }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.primaryButton, disabled && styles.disabledButton]}>
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function TabButton({ label, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.tabButton, active && styles.activeTabButton]}>
      <Text style={[styles.tabText, active && styles.activeTabText]}>{label}</Text>
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
  loginWrap: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  loginCard: { backgroundColor: colors.white, borderRadius: 20, padding: 24, gap: 14, elevation: 3 },
  logo: { color: colors.charcoal, fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  loginHeading: { color: colors.charcoal, fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  input: { minHeight: 50, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, color: colors.charcoal, backgroundColor: colors.white, fontSize: 16 },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  passwordInput: { flex: 1 },
  toggleText: { color: colors.orange, fontWeight: '700', padding: 4 },
  primaryButton: { minHeight: 48, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.orange, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12 },
  primaryButtonText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  disabledButton: { opacity: 0.6 },
  secondaryButton: { minHeight: 46, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.orange, borderRadius: 14, padding: 10 },
  secondaryButtonText: { color: colors.orange, fontWeight: '700', fontSize: 16 },
  errorText: { color: colors.error, fontSize: 14, lineHeight: 20 },
  page: { flex: 1, paddingHorizontal: 16, paddingTop: 20 },
  pageTitle: { color: colors.charcoal, fontSize: 26, fontWeight: '800', marginBottom: 16 },
  productList: { paddingBottom: 18, gap: 14 },
  productCard: { backgroundColor: colors.white, borderRadius: 16, overflow: 'hidden', elevation: 2 },
  productImage: { width: '100%', height: 180, backgroundColor: '#F5F5F4' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  placeholderText: { color: colors.muted, fontWeight: '700' },
  productInfo: { padding: 16, gap: 8 },
  productName: { color: colors.charcoal, fontSize: 18, fontWeight: '700' },
  productDescription: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  productPrice: { color: colors.charcoal, fontSize: 17, fontWeight: '800', marginVertical: 2 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20 },
  emptyText: { color: colors.muted, textAlign: 'center', padding: 24 },
  inlineAction: { color: colors.orange, fontWeight: '700', padding: 8 },
  placeholderCard: { backgroundColor: colors.white, borderRadius: 16, padding: 20, gap: 8, elevation: 2 },
  placeholderHeading: { color: colors.charcoal, fontSize: 18, fontWeight: '700' },
  tabBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border },
  tabButton: { flex: 1, minHeight: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 12, paddingHorizontal: 8 },
  activeTabButton: { backgroundColor: colors.orange },
  tabText: { color: colors.charcoal, fontWeight: '700' },
  activeTabText: { color: colors.white },
  logoutButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 10 },
  logoutText: { color: colors.orange, fontWeight: '700' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  mutedText: { color: colors.muted, textAlign: 'center' },
});
