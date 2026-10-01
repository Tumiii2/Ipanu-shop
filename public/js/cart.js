// Cart functionality for The Ìpánu Zone
class Cart {
  constructor() {
    this.items = JSON.parse(localStorage.getItem('cart')) || [];
  }

  // Add item to cart or update quantity if already exists
  add(productId, quantity, minOrder) {
    const existingItem = this.items.find(item => item.id === productId);
    
    // Ensure quantity is at least the minimum order
    const validQuantity = Math.max(quantity, minOrder);
    
    if (existingItem) {
      existingItem.quantity = validQuantity;
    } else {
      this.items.push({ id: productId, quantity: validQuantity, minOrder });
    }
    
    this.save();
  }

  // Remove item from cart
  remove(productId) {
    this.items = this.items.filter(item => item.id !== productId);
    this.save();
  }

  // Update quantity for an item
  updateQuantity(productId, quantity) {
    const item = this.items.find(item => item.id === productId);
    if (item) {
      // Quantity can't go below minimum order
      item.quantity = Math.max(quantity, item.minOrder);
      this.save();
    }
  }

  // Get all cart items
  getAll() {
    return this.items;
  }

  // Calculate total price
  getTotal() {
    const cart = this.getAll();
    return cart.reduce((total, item) => {
      const product = this.getProductById(item.id);
      return total + (product ? product.price * item.quantity : 0);
    }, 0);
  }

  // Get product by ID from the products array
  getProductById(productId) {
    return products.find(product => product.id === productId);
  }

  // Clear cart
  clear() {
    this.items = [];
    this.save();
  }

  // Save cart to localStorage
  save() {
    localStorage.setItem('cart', JSON.stringify(this.items));
  }
}

// Initialize cart
let cart;
try {
  cart = new Cart();
} catch (e) {
  console.error('Error initializing cart:', e);
  cart = { items: [], add: () => {}, remove: () => {}, getAll: () => [], getTotal: () => 0 };
}