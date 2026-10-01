# The Ìpánu Zone 🍽️

An online shop for authentic Nigerian local snacks and delicacies.

## Products

- **Ipanu Mix** (local snacks): ₦2,000 (minimum order: 100)
- **Tapioca** (with fruit topping): ₦2,000 (minimum order: 100)
- **Garri Platter** (Garri, Eja yoyo & Ede): ₦2,500 (minimum order: 50)

## Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) (comes with Node.js)

### Installation & Running

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd ipanu-shop
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```

4. Start the development server:
   ```bash
   npm start
   ```

5. Open your browser and visit:
   ```
   http://localhost:5000
   ```

## Project Structure

```
ipanu-shop/
├── public/
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   ├── products.js
│   │   └── cart.js
│   ├── images/
│   │   └── logo.png
│   ├── index.html
│   ├── menu.html
│   └── cart.html
├── server/
│   └── index.js
├── .env.example
├── package.json
└── AGENTS.md
```

## Features

### Phase 1 (Current)
- ✅ Home page with hero section
- ✅ Menu page with product grid
- ✅ Cart page with localStorage persistence
- ✅ Mobile-first responsive design
- ✅ Product data stored locally in JavaScript

### Coming Soon
- User authentication (Google sign-in)
- Database integration with Supabase
- Checkout process
- Email confirmation via Mailgun

## Technology Stack

- **Frontend**: HTML, Tailwind CSS (CDN), vanilla JavaScript
- **Backend**: Node.js + Express
- **Database/Auth**: Supabase (planned)
- **Email**: Mailgun (planned)
- **Deployment**: Render (planned)

## Contact

- 📞 Phone: 08034314148
- 📸 Instagram: @theipanuzone
- 📧 Email: ipanuzone@gmail.com

## License

MIT License - See LICENSE file for details.