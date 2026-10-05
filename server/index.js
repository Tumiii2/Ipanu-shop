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
  const { data, error } = await supabase.from('products').select('*').eq('active', true);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

async function sendConfirmationEmail(to, order, items) {
  if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN || !to) return;
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
  const lines = items
    .map((i) => `${i.name} x ${i.quantity} = ₦${(i.unit_price * i.quantity).toLocaleString()}`)
    .join('\n');
  const htmlRows = items.map((item) =>
    `<tr>` +
      `<td style="padding:10px 8px;border-bottom:1px solid #e7dfd4;">${escapeHtml(item.name)}</td>` +
      `<td style="padding:10px 8px;border-bottom:1px solid #e7dfd4;text-align:center;">${escapeHtml(item.quantity)}</td>` +
      `<td style="padding:10px 8px;border-bottom:1px solid #e7dfd4;text-align:right;white-space:nowrap;">₦${(item.unit_price * item.quantity).toLocaleString()}</td>` +
    `</tr>`
  ).join('');
  const fulfilment = order.delivery_method === 'delivery'
    ? `Delivery to: ${escapeHtml(order.address || '')}`
    : 'Pickup';
  const html =
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0;padding:24px 12px;background-color:#ffffff;font-family:Arial,sans-serif;color:#0f766e;">` +
      `<tr><td align="center">` +
        `<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;margin:0 auto;background-color:#ffffff;">` +
          `<tr><td style="padding:20px 24px;background-color:#0f766e;color:#f97316;font-size:22px;font-weight:bold;">Paws & Co</td></tr>` +
          `<tr><td style="padding:24px;">` +
            `<p style="margin:0 0 8px;font-size:16px;">Hi ${escapeHtml(order.customer_name)}, thank you for your order!</p>` +
            `<p style="margin:0 0 20px;color:#81796f;font-size:12px;">Order ID: ${escapeHtml(order.id)}</p>` +
            `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-size:14px;">` +
              `<tr>` +
                `<th align="left" style="padding:10px 8px;background-color:#eee7dc;font-size:13px;">Item</th>` +
                `<th align="center" style="padding:10px 8px;background-color:#eee7dc;font-size:13px;">Qty</th>` +
                `<th align="right" style="padding:10px 8px;background-color:#eee7dc;font-size:13px;">Price</th>` +
              `</tr>` +
              htmlRows +
              `<tr>` +
                `<td colspan="2" style="padding:12px 8px;font-weight:bold;border-top:2px solid #0f766e;">Total</td>` +
                `<td align="right" style="padding:12px 8px;font-weight:bold;white-space:nowrap;border-top:2px solid #0f766e;">₦${order.total.toLocaleString()}</td>` +
              `</tr>` +
            `</table>` +
            `<p style="margin:20px 0 8px;font-size:14px;">${fulfilment}</p>` +
            `<p style="margin:0;font-size:14px;">We will contact you on ${escapeHtml(order.phone)} to confirm.</p>` +
          `</td></tr>` +
          `<tr><td style="padding:16px 24px;background-color:#f3eee5;color:#62594f;font-size:12px;text-align:center;">pawsandco@gmail.com &nbsp;|&nbsp; 08034314148 &nbsp;|&nbsp; @pawsandco</td></tr>` +
        `</table>` +
      `</td></tr>` +
    `</table>`;
  const body = new URLSearchParams({
    from: `Paws & Co <postmaster@${process.env.MAILGUN_DOMAIN}>`,
    to,
    subject: 'Your order is confirmed - Paws & Co',
    text:
      `Hi ${order.customer_name},\n\nThank you for your order!\n\n` +
      `Order ID: ${order.id}\n\n${lines}\n\n` +
      `Total: ₦${order.total.toLocaleString()}\n` +
      `${order.delivery_method === 'delivery' ? 'Delivery to: ' + order.address : 'Pickup'}\n\n` +
      `We will contact you on ${order.phone} to confirm.\n\n` +
      `Paws & Co | 08000000000 | @pawsandco`,
    html,
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

app.get('/api/cart', async (req, res) => {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData || !userData.user) {
      return res.status(401).json({ error: 'Please sign in.' });
    }

    const { data, error } = await supabase
      .from('cart_items')
      .select('product_id, quantity')
      .eq('user_id', userData.user.id);
    if (error) return res.status(500).json({ error: error.message });

    res.json(data.map(({ product_id, quantity }) => ({ id: product_id, quantity })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

app.post('/api/cart', async (req, res) => {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData || !userData.user) {
      return res.status(401).json({ error: 'Please sign in.' });
    }

    const { productId, quantity } = req.body || {};
    if (typeof productId !== 'string' || !productId.trim() || !Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ error: 'A product and positive integer quantity are required.' });
    }

    const { data: existingItem, error: existingError } = await supabase
      .from('cart_items')
      .select('quantity')
      .eq('user_id', userData.user.id)
      .eq('product_id', productId)
      .maybeSingle();
    if (existingError) return res.status(500).json({ error: existingError.message });

    const newQuantity = (existingItem ? existingItem.quantity : 0) + quantity;
    const { data, error } = await supabase
      .from('cart_items')
      .upsert({ user_id: userData.user.id, product_id: productId, quantity: newQuantity }, {
        onConflict: 'user_id,product_id',
      })
      .select('product_id, quantity')
      .single();
    if (error) return res.status(500).json({ error: error.message });

    res.json({ id: data.product_id, quantity: data.quantity });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

app.patch('/api/cart/:productId', async (req, res) => {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData || !userData.user) {
      return res.status(401).json({ error: 'Please sign in.' });
    }

    const { quantity } = req.body || {};
    if (!Number.isInteger(quantity)) {
      return res.status(400).json({ error: 'Quantity must be an integer.' });
    }

    if (quantity < 1) {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', userData.user.id)
        .eq('product_id', req.params.productId);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ id: req.params.productId, quantity: 0 });
    }

    const { data, error } = await supabase
      .from('cart_items')
      .update({ quantity })
      .eq('user_id', userData.user.id)
      .eq('product_id', req.params.productId)
      .select('product_id, quantity')
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Cart item not found.' });

    res.json({ id: data.product_id, quantity: data.quantity });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

app.delete('/api/cart/:productId', async (req, res) => {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData || !userData.user) {
      return res.status(401).json({ error: 'Please sign in.' });
    }

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', userData.user.id)
      .eq('product_id', req.params.productId);
    if (error) return res.status(500).json({ error: error.message });

    res.json({ id: req.params.productId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

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
      .from('products').select('*').in('id', items.map((i) => i.id)).eq('active', true);
    if (pErr) return res.status(500).json({ error: 'Could not load products.' });

    let total = 0;
    const orderItems = [];
    for (const item of items) {
      const p = products.find((x) => x.id === item.id);
      const qty = parseInt(item.quantity, 10);
     if (!p || !Number.isInteger(qty) || qty < 1) {
return res.status(400).json({ error: `Invalid quantity for ${p ? p.name : 'an item'}.` });
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

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

module.exports = app;