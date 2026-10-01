// Products data for The Ìpánu Zone
const products = [
  {
    id: 1,
    name: "Ipanu Mix",
    description: "Local Nigerian snacks mix",
    price: 2000,
    minOrder: 100,
    image: "/images/ipanu-mix.jpeg",
    category: "snacks"
  },
  {
    id: 2,
    name: "Tapioca",
    description: "Tapioca with fruit topping",
    price: 2000,
    minOrder: 100,
    image: "/images/tapioca.jpeg",
    category: "dessert"
  },
  {
    id: 3,
    name: "Garri Platter",
    description: "Garri, Eja yoyo & Ede",
    price: 2500,
    minOrder: 50,
    image: "/images/garri-platter.jpeg",
    category: "main"
  }
];

// Export products if using modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = products;
}