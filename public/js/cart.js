// Cart functionality for The Ìpánu Zone
class Cart {
  constructor() {
    this.items = JSON.parse(localStorage.getItem('cart')) || [];
  }

  // Add item to cart or update quantity if already exists
  add(productId, quantity, minOrder) {
    var existingItem = this.items.find(function(item) {
      return item.id === productId;
    });
    
    // Ensure quantity is at least the minimum order
    var validQuantity = Math.max(quantity, minOrder);
    
    if (existingItem) {
      existingItem.quantity = validQuantity;
    } else {
      this.items.push({ id: productId, quantity: validQuantity, minOrder: minOrder });
    }
    
    this.save();
  }

  // Remove item from cart
  remove(productId) {
    this.items = this.items.filter(function(item) {
      return item.id !== productId;
    });
    this.save();
  }

  // Update quantity for an item
  updateQuantity(productId, quantity) {
    var item = this.items.find(function(i) {
      return i.id === productId;
    });
    if (item) {
      // Quantity can't go below minimum order
      item.quantity = Math.max(quantity, item.minOrder);
      this.save();
      return { updated: true, clamped: quantity < item.minOrder };
    }
    return { updated: false, clamped: false };
  }

  // Get all cart items
  getAll() {
    return this.items;
  }

  // Calculate total price
  getTotal() {
    var self = this;
    return this.items.reduce(function(total, item) {
      var product = self.getProductById(item.id);
      return total + (product ? product.price * item.quantity : 0);
    }, 0);
  }

  // Get product by ID from the products array
  getProductById(productId) {
    if (typeof products !== 'undefined') {
      return products.find(function(product) {
        return product.id === productId;
      });
    }
    return null;
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
var cart;
try {
  cart = new Cart();
} catch (e) {
  console.error('Error initializing cart:', e);
  cart = {
    items: [],
    add: function() {},
    remove: function() {},
    getAll: function() { return []; },
    getTotal: function() { return 0; },
    getProductById: function() { return null; }
  };
}

// Toast notification function
function showToast(message) {
  var toast = document.getElementById('toast');
  if (toast) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(function() {
      toast.classList.remove('show');
    }, 2500);
  }
}

// Confirm modal function
var pendingRemoveProductId = null;
var pendingRemoveProductName = '';

function showConfirmModal(productName, productId) {
  pendingRemoveProductId = productId;
  pendingRemoveProductName = productName;
  var modal = document.getElementById('confirm-modal');
  if (modal) {
    modal.classList.add('show');
  }
}

function hideConfirmModal() {
  pendingRemoveProductId = null;
  pendingRemoveProductName = '';
  var modal = document.getElementById('confirm-modal');
  if (modal) {
    modal.classList.remove('show');
  }
}

// Update cart count in header (number of different items)
function updateCartCount() {
  var cartItems = cart.getAll();
  var count = cartItems.length; // Number of different items, not total quantity
  var countElements = document.querySelectorAll('#cart-count');
  countElements.forEach(function(el) {
    el.textContent = count;
  });
}