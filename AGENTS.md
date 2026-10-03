# AGENTS.md

## Project
Paws & Co: an online shop for pet supplies.
Products: Chicken Dog Treats ₦3,500, Squeaky Rope Toy ₦2,500,
Cozy Pet Bed ₦18,000, Cat Feather Wand ₦2,000, Adjustable Pet Collar ₦4,000,
Stainless Steel Pet Bowl ₦3,000.
Contact: 08000000000, Instagram @pawsandco, hello@pawsandco.test.
Customers browse products, add to cart, sign in with Google, check out,
and get a confirmation email. Prices are in Naira (₦).

## Stack
- Frontend: HTML, Tailwind CSS (CDN), vanilla JavaScript (no React)
- Backend: Node.js + Express
- Database and auth: Supabase (Postgres + Google sign-in)
- Email: Mailgun (sandbox domain)
- Deploy: Vercel

## Structure
- /public: frontend pages, css, js, images
- /server: Express app, routes, services
- .env for all secrets, plus a committed .env.example

## Rules
- Never hardcode keys or secrets. Read them from environment variables.
- Never commit .env. The service role key is backend only, never in /public.
- Validate and sanitize all input on the backend.
- Mobile-first, simple and clean code. Explain each step briefly.
- Work in small steps. Finish one step, then stop and tell me what to test.
- Ask me before installing extra packages.
- Tell me clearly anything I must do by hand (keys, dashboards, settings).