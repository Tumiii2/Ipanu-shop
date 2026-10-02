# The Ìpánu Zone

An online shop for authentic Nigerian snacks and delicacies.

## Products

- **Ipanu Mix** (local snacks): ₦2,000; minimum order 100
- **Tapioca** (with fruit topping): ₦2,000; minimum order 100
- **Garri Platter** (Garri, Eja yoyo & Ede): ₦2,500; minimum order 50

## Features

- Home page and menu for browsing the product catalog. The displayed catalog is defined in `public/js/products.js`.
- Shopping cart with localStorage persistence, quantity controls, minimum-order enforcement, and a distinct-item count in the header.
- Google sign-in through Supabase Auth. Checkout requires an authenticated user.
- Checkout supports pickup and delivery, collects customer and fulfilment details, and validates required fields and minimum quantities.
- Express API reads product records from Supabase and stores orders and order items in the `orders` and `order_items` tables.
- Order confirmation emails are sent through Mailgun in plain-text and HTML formats when Mailgun configuration is available.
- Responsive static pages for the home page, menu, cart, and checkout.

There is no admin dashboard or product/order management interface in the current application.

## Technology Stack

- **Frontend:** HTML, CSS, Tailwind CSS via CDN, and vanilla JavaScript
- **Backend:** Node.js and Express; Express also serves the static files in `public/`
- **Database and authentication:** Supabase Postgres and Supabase Auth, using `@supabase/supabase-js`
- **Email:** Mailgun Messages API
- **Other runtime dependencies:** `dotenv` for environment loading and `ws` for the Supabase Realtime WebSocket transport
- **Hosting:** Vercel. No deployment URL or Vercel configuration file is tracked in this repository.

## Quick Start

### Requirements

- Node.js 18 or later (the server uses the built-in `fetch` API)
- npm
- Supabase project configuration for database and authentication features
- Mailgun configuration to send order confirmation emails

### Run locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a local environment file from the example. On macOS/Linux:

   ```bash
   cp .env.example .env
   ```

   On Windows PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Set the required values in your local environment file. The server reads `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. Mailgun email delivery uses `MAILGUN_API_KEY` and `MAILGUN_DOMAIN`. `PORT` is optional and defaults to `5000`.

   Keep the Supabase service-role key on the server; do not expose it in frontend files or commit environment values.

4. Start the Express server:

   ```bash
   npm start
   ```

   The `npm run dev` script starts the same server. Open <http://localhost:5000> unless you configured a different `PORT`.

## Project Structure

```text
ipanu-shop/
├── public/
│   ├── css/styles.css
│   ├── images/
│   ├── js/
│   │   ├── auth.js
│   │   ├── cart.js
│   │   ├── products.js
│   │   └── ui.js
│   ├── index.html
│   ├── menu.html
│   ├── cart.html
│   └── checkout.html
├── server/index.js
├── app.js
├── package.json
└── .env.example
```

## API

- `GET /api/config` returns the Supabase URL and public anonymous key needed by the browser client.
- `GET /api/products` returns product records from Supabase.
- `POST /api/orders` requires a valid Supabase access token, validates the order, stores the order and its items, and sends the confirmation email when Mailgun is configured.

## Contact

- Phone: 08034314148
- Instagram: [@theipanuzone](https://instagram.com/theipanuzone)
- Email: [ipanuzone@gmail.com](mailto:ipanuzone@gmail.com)

## License

MIT