# Paws & Co

An online shop for pet supplies — treats, toys, beds, and accessories.

## Products

- **Chicken Dog Treats**: ₦3,500 — crunchy chicken bites that keep tails wagging
- **Squeaky Rope Toy**: ₦2,500 — durable cotton rope with a squeaker inside
- **Cozy Pet Bed**: ₦18,000 — soft orthopedic bed for pets of all sizes
- **Cat Feather Wand**: ₦2,000 — colorful feather toy that brings out the hunt
- **Adjustable Pet Collar**: ₦4,000 — sturdy adjustable collar with a shiny tag
- **Stainless Steel Pet Bowl**: ₦3,000 — premium stainless steel bowl, two sizes

## Features

- Home page and menu for browsing the product catalog. Products are loaded from the `products` table in Supabase via `/api/products`.
- Shopping cart saved in the browser's `localStorage`, with quantity controls and a distinct-item count in the header.
- Google sign-in through Supabase Auth. Checkout requires an authenticated user.
- Checkout supports pickup and delivery, collects customer and fulfilment details, and validates required fields.
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
- **Hosting:** Vercel

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
pawsandco-store/
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
- `GET /api/products` returns active product records from Supabase.
- `POST /api/orders` requires a valid Supabase access token, validates the order, stores the order and its items, and sends the confirmation email when Mailgun is configured.

## Contact

- Phone: 08000000000
- Instagram: [@pawsandco](https://instagram.com/pawsandco)
- Email: [hello@pawsandco.test](mailto:hello@pawsandco.test)

## License

MIT