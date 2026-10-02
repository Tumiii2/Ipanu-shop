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
  var old = document.getElementById('toast-live');
  if (old) old.remove();
  var t = document.createElement('div');
  t.id = 'toast-live';
  t.textContent = message;
  t.style.cssText = 'position:fixed;bottom:24px;right:24px;max-width:320px;background:#2B2118;color:#FDCB07;padding:12px 20px;border-radius:12px;font-weight:600;font-family:Poppins,sans-serif;z-index:99999;box-shadow:0 4px 12px rgba(0,0,0,.3)';
  document.body.appendChild(t);
  setTimeout(function () { t.remove(); }, 2500);
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
  updateCartBadge(count);
}

function updateCartBadge(count) {
  var countElements = document.querySelectorAll('#cart-count');
  countElements.forEach(function(el) {
    var nextCount = String(count);
    if (el.textContent !== nextCount) {
      el.textContent = nextCount;
      el.classList.remove('cart-count-pop');
      void el.offsetWidth;
      el.classList.add('cart-count-pop');
      setTimeout(function() { el.classList.remove('cart-count-pop'); }, 350);
    }
  });
}

(function() {
  var revealSelector = 'section, .product-card, .contact-card, #product-grid > div, #cart-items > div';

  function initializePageEffects() {
    updateCartCount();

    document.querySelectorAll('#copyright-year').forEach(function(year) {
      year.textContent = new Date().getFullYear();
    });

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      return;
    }

    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    function observeElement(element) {
      if (element.matches(revealSelector) && !element.classList.contains('fade-up')) {
        element.classList.add('fade-up');
        observer.observe(element);
      }
      element.querySelectorAll(revealSelector).forEach(function(child) {
        if (!child.classList.contains('fade-up')) {
          child.classList.add('fade-up');
          observer.observe(child);
        }
      });
    }

    document.querySelectorAll(revealSelector).forEach(function(element) {
      element.classList.add('fade-up');
      observer.observe(element);
    });

    new MutationObserver(function(records) {
      records.forEach(function(record) {
        record.addedNodes.forEach(function(node) {
          if (node.nodeType === 1) observeElement(node);
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePageEffects);
  } else {
    initializePageEffects();
  }
})();