// Products data for Paws & Co
let products = [];

async function loadProducts() {
  try {
    const response = await fetch('/api/products');
    if (!response.ok) throw new Error(`Failed to load products: ${response.status}`);
    products = await response.json();
  } catch (error) {
    console.error('Failed to load products:', error);
    products = [];
  }
  return products;
}

window.productsReady = loadProducts();