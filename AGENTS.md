# AGENTS.md

## Project
The Ìpánu Zone: an online shop for a small Nigerian food business.
Products: Ipanu Mix (local snacks) ₦2,000, Tapioca (with fruit topping)
₦2,000, Garri Platter (Garri, Eja yoyo & Ede) ₦2,500.
Minimum order quantities: Ipanu Mix 100, Tapioca 100, Garri Platter 50.
Contact: 08034314148, Instagram @theipanuzone, ipanuzone@gmail.com.
Customers browse products, add to cart, sign in with Google, check out,
and get a confirmation email. Prices are in Naira (₦).

## Stack
- Frontend: HTML, Tailwind CSS (CDN), vanilla JavaScript (no React)
- Backend: Node.js + Express
- Database and auth: Supabase (Postgres + Google sign-in)
- Email: Mailgun (sandbox domain)
- Deploy: Render

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