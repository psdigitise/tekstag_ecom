# Product Listing Page Implementation Plan

The goal is to create a pixel-perfect replica of the Viking Direct product listing page matching your provided screenshots, with dynamic side pricing and other product-specific details.

## Proposed Changes

### `src/data/products.json`
- Add a new array `listingProducts` populated with the data from your screenshots (e.g., Tate & Lyle Sugar varieties).
- Each product will include fields for dynamic styling: `rating`, `ecoBadge`, `priceTiers` (for the pricing table), and `stockStatus`.

### `src/components/ListingProductCard.jsx`
- Create a new component specifically for the listing grid.
- Implement the "Sustainable" badge on images.
- Add Title and Clickable Stars rating.
- Recreate the price block: large main price, gray "excl. VAT" sub-price.
- Implement the **Tiered Pricing Table**: automatically highlight the correct tier row with a blue border depending on the inputted quantity.
- Add the green stock status text and Add to Basket / Quantity / Add to list / Compare controls.

### `src/components/ListingSidebar.jsx`
- Recreate the left-hand faceted navigation (filters) precisely as shown in your screenshots (Categories, Product Type, Price, Packaged Quantity, etc.).

### `src/pages/ListingPage.jsx`
- Build the layout combining the Sidebar and the Product Grid.
- Include the top banner block ("Sugar & Sweetener (12)" title, grid view icons, newsletter banner).

### Application Routing Configuration
- Since `react-router-dom` was recently installed, I will set up standard React routing in `App.jsx` (or `main.jsx`), moving the current Homepage into `src/pages/HomePage.jsx` and adding `/listing` or `/category` for the new page.

## Open Questions
- Do you want me to automatically route the UI to the Listing page initially so you can see it right away, or set up normal navigation (click from homepage to navigate)?

## Verification Plan
- Start the Vite development server.
- Verify visually against the provided screenshots, focusing heavily on the tier pricing table styles, font sizes, margins, and component alignments.
