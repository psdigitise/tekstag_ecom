/**
 * Utility to manage recently viewed products in localStorage
 */

const RECENTLY_VIEWED_KEY = 'tekstag_recently_viewed';
const MAX_RECENT_ITEMS = 6;

export const addToRecentlyViewed = (product) => {
  if (!product || !product.id) return;

  try {
    const existingRaw = localStorage.getItem(RECENTLY_VIEWED_KEY);
    let items = existingRaw ? JSON.parse(existingRaw) : [];

    // Remove if already exists to move it to the top
    items = items.filter(item => item.id !== product.id);

    // Simplify the product object to save space
    const simplified = {
       id: product.id,
       name: product.name,
       price: parseFloat(product.price || product.priceExVat || 0),
       priceExVat: parseFloat(product.priceExVat || 0),
       image: product.imageUrl || product.image_file || product.image,
       category: product.categoryName || (product.category?.name)
    };

    // Add to top
    items.unshift(simplified);

    // Limit count
    if (items.length > MAX_RECENT_ITEMS) {
      items = items.slice(0, MAX_RECENT_ITEMS);
    }

    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Error saving to recently viewed:', err);
  }
};

export const getRecentlyViewed = () => {
  try {
    const items = localStorage.getItem(RECENTLY_VIEWED_KEY);
    return items ? JSON.parse(items) : [];
  } catch (err) {
    console.error('Error loading recently viewed:', err);
    return [];
  }
};
