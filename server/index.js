const path = require('path');
const express = require('express');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { realtime: { transport: ws } }
);

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Public config for the browser (the anon key is safe to expose)
app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  });
});

app.get('/api/products', async (req, res) => {
  const { data, error } = await supabase.from('products').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

async function sendConfirmationEmail(to, order, items) {
  if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN || !to) return;
  const lines = items
    .map((i) => `${i.name} x ${i.quantity} = ₦${(i.unit_price * i.quantity).toLocaleString()}`)
    .join('\n');
  const body = new URLSearchParams({
    from: `The Ìpánu Zone <postmaster@${process.env.MAILGUN_DOMAIN}>`,
    to,
    subject: 'Your order is confirmed - The Ìpánu Zone',
    text:
      `Hi ${order.customer_name},\n\nThank you for your order!\n\n` +
      `Order ID: ${order.id}\n\n${lines}\n\n` +
      `Total: ₦${order.total.toLocaleString()}\n` +
      `${order.delivery_method === 'delivery' ? 'Delivery to: ' + order.address : 'Pickup'}\n\n` +
      `We will contact you on ${order.phone} to confirm.\n\n` +
      `The Ìpánu Zone | 08034314148 | @theipanuzone`,
  });
  const auth = Buffer.from(`api:${process.env.MAILGUN_API_KEY}`).toString('base64');
  try {
    const r = await fetch(`https://api.mailgun.net/v3/${process.env.MAILGUN_DOMAIN}/messages`, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!r.ok) console.error('Mailgun error:', r.status, await r.text());
  } catch (e) {
    console.error('Mailgun request failed:', e.message);
  }
}

app.post('/api/orders', async (req, res) => {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData || !userData.user) {
      return res.status(401).json({ error: 'Please sign in to place an order.' });
    }
    const user = userData.user;

    const { name, phone, deliveryMethod, address, notes, items } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'Name is required.' });
    if (!/^[0-9+\s-]{7,15}$/.test(String(phone || ''))) return res.status(400).json({ error: 'Enter a valid phone number.' });
    if (!['delivery', 'pickup'].includes(deliveryMethod)) return res.status(400).json({ error: 'Choose delivery or pickup.' });
    if (deliveryMethod === 'delivery' && !String(address || '').trim()) return res.status(400).json({ error: 'Delivery address is required.' });
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Your cart is empty.' });

    const { data: products, error: pErr } = await supabase
      .from('products').select('*').in('id', items.map((i) => i.id));
    if (pErr) return res.status(500).json({ error: 'Could not load products.' });

    let total = 0;
    const orderItems = [];
    for (const item of items) {
      const p = products.find((x) => x.id === item.id);
      const qty = parseInt(item.quantity, 10);
      if (!p || !Number.isInteger(qty) || qty < p.min_order) {
        return res.status(400).json({ error: `Minimum order for ${p ? p.name : 'an item'} is ${p ? p.min_order : '?'}.` });
      }
      total += p.price * qty;
      orderItems.push({ product_id: p.id, name: p.name, quantity: qty, unit_price: p.price });
    }

    const { data: order, error: oErr } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        customer_name: String(name).trim().slice(0, 100),
        email: user.email,
        phone: String(phone).trim(),
        delivery_method: deliveryMethod,
        address: deliveryMethod === 'delivery' ? String(address).trim().slice(0, 300) : null,
        notes: notes ? String(notes).slice(0, 500) : null,
        total,
      })
      .select()
      .single();
    if (oErr) return res.status(500).json({ error: 'Could not save your order.' });

    const { error: iErr } = await supabase.from('order_items').insert(
      orderItems.map(({ product_id, quantity, unit_price }) => ({
        order_id: order.id, product_id, quantity, unit_price,
      }))
    );
    if (iErr) return res.status(500).json({ error: 'Could not save order items.' });

    await sendConfirmationEmail(user.email, order, orderItems);
    res.json({ orderId: order.id, total });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});