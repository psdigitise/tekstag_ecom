# Viking Direct Homepage Clone

A pixel-faithful React.js recreation of the [Viking Direct UK](https://www.viking-direct.co.uk/en/) homepage, built with Vite + Tailwind CSS.

## 🚀 How to Run

```bash
# Install dependencies
npm install

# Start dev server (hot reload)
npm run dev
# → Open http://localhost:5173

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📁 Folder Structure

```
viking-direct-clone/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── src/
│   ├── main.jsx                   # React entry point
│   ├── App.jsx                    # Root component (page assembly)
│   ├── index.css                  # Tailwind + global styles
│   ├── data/
│   │   └── products.json          # All extracted product/category data
│   └── components/
│       ├── TopBar.jsx             # Black top bar (delivery/returns/VAT toggle)
│       ├── Navbar.jsx             # Logo, search, account, cart
│       ├── CategoryNav.jsx        # Main category menu + sub-nav
│       ├── WelcomeBanner.jsx      # Red welcome offer strip
│       ├── TopCategories.jsx      # 8 circular category cards
│       ├── PromoCards.jsx         # 3 promo highlight cards
│       ├── HeroProducts.jsx       # HP Paper + Nescafe hero banners
│       ├── TrustBar.jsx           # Free delivery / returns / Nectar bar
│       ├── DealsSection.jsx       # Deals, Offers & Trending (6 icons)
│       ├── PromoBanners.jsx       # 6 promotional tiles (April Sale, etc.)
│       ├── TopRecommendations.jsx # 8 subcategory recommendation circles
│       ├── TrustBanners.jsx       # #1 Office Supplier image banners
│       ├── Reviews.jsx            # Trustpilot reviews carousel
│       ├── VikingOneSection.jsx   # Viking One + Corporate banners
│       ├── IndustrySolutions.jsx  # 4 industry solution tiles
│       ├── InterestingShops.jsx   # Eco / Food / Furniture shops
│       ├── PopularBrands.jsx      # Brand logos row
│       ├── ProductCard.jsx        # Individual product card (qty + cart)
│       ├── ProductGrid.jsx        # Two product grid sections
│       ├── FreeGiftsBanner.jsx    # Purple free gifts banner
│       ├── Newsletter.jsx         # Email subscription form
│       └── Footer.jsx             # Full 3-column footer + social + legal
```

## 🛒 Product Data (src/data/products.json)

All product data extracted from the homepage screenshots:

### Product Cards — "Customers with similar interests also viewed"
| Product | Price (ex VAT) | Price (inc VAT) | Badge |
|---------|---------------|-----------------|-------|
| Pukka Pad Notebook Metallic Jotta A5 | £4.99 / Pack | £5.99 | Buy More, Save More |
| Viking Punched Pockets A4 Clear 60 microns | £4.49 / Pack | £5.39 | Promo Price |
| Viking Everyday A4 Printer Paper 80gsm | £14.95 / Box | £17.94 | Buy More, Save More |
| BIC Cristal Original Ballpoint Pen Black 0.4mm | £10.19 / Pack | £12.23 | Buy More, Save More |

### Product Cards — "People Who Viewed Items You Browsed Ultimately Bought"
| Product | Price (ex VAT) | Price (inc VAT) | Badge |
|---------|---------------|-----------------|-------|
| Pukka Pad Notebook Metallic Jotta A4+ | £8.29 / Pack | £9.95 | Buy More, Save More |
| Viking Economy A4 Printer Paper 80gsm | £12.95 / Box | £15.54 | Buy More, Save More |
| Pukka Pad Notepad Steno A5 Spiral Bound | £5.69 / Pack | £6.83 | Buy More, Save More |
| Post-it Super Sticky Notes 76×76mm Blue | £8.29 / Pack | £9.95 | Buy More, Save More |

### Image URLs
Product images use the Viking Direct CDN pattern:
```
https://media.viking.co.uk/productimages/{SKU}/{SKU}_1.jpg
```
To use real images, replace these with actual CDN URLs from the Viking Direct website (right-click → Copy Image Address in Chrome DevTools).

## 🎨 Design System

| Token | Value | Usage |
|-------|-------|-------|
| Viking Red | `#D52B1E` | Logo, badges, hover states, CTAs |
| Cart Blue | `#0066CC` | Add to cart buttons, links |
| Top Bar | `#1a1a1a` | Background |
| Section BG | `#F5F5F5` | Alternating sections |
| Body Text | `#1a1a1a` | Primary text |
| Muted Text | `#666` | Secondary/helper text |
| Font | DM Sans | Body text (Google Fonts) |
| Display Font | Barlow Condensed | Logo wordmark |

## ✨ Features

- ✅ Fully responsive (mobile → desktop)
- ✅ Sticky navbar with search bar
- ✅ Interactive VAT toggle in top bar
- ✅ Dismissable welcome offer banner
- ✅ Hoverable category circles with fallback emoji icons
- ✅ Working quantity stepper on product cards
- ✅ Add to cart animation (green flash)
- ✅ Image error handling with fallback images
- ✅ Trustpilot reviews with prev/next navigation
- ✅ Newsletter form with validation + success state
- ✅ Complete footer with all links, social icons, payment/delivery info

## 📦 Tech Stack

- **React 18** with functional components + hooks
- **Vite 5** for fast HMR dev server and bundling
- **Tailwind CSS 3** for utility-first styling
- **Lucide React** for icons
- **DM Sans + Barlow Condensed** (Google Fonts)
