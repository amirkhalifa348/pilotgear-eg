# PilotGear EG — Storefront + Admin

A complete, Shopify-style e-commerce experience for **PilotGear EG** — Egypt's aviation
keychains & pilot-gear brand. Built with **React + TypeScript + Vite + Tailwind CSS**.

Everything runs **self-contained in the browser** (data persists in `localStorage`),
so it deploys as a static site with **no server or database** required.

---

## ✨ What's inside

### Storefront (customer-facing)
- **Homepage** — fully built, conversion-optimised, controlled by the visual Page Builder
- **Shop / catalog** — all products, filter by collection, sort
- **Collections** — Aircraft Models · Pilot Life · Home & Desk (each its own page)
- **Product pages** — gallery, specs, highlights, related products, add-to-cart / buy-now
- **Cart** — live totals, free-shipping progress bar
- **Checkout** — Cash on Delivery, Egyptian governorate picker, validation
- **Order confirmation**
- **About · Contact · Terms of Use · Privacy Policy · Refund Policy · Shipping Policy**
- Fully responsive (mobile + desktop), brand colours & logo throughout

### Admin dashboard (`/admin`, default password `pilotgear`)
- **Dashboard** — revenue, conversion rate, page views, AOV, revenue/traffic chart,
  conversion funnel, top products, recent orders, low-stock alerts
- **Orders** — status workflow, customer details, order drawer
- **Products** — full CRUD, search, duplicate, image upload, specs/highlights editor
  (just like Shopify's product editor)
- **Collections** — create / edit / delete
- **Inventory** — stock levels, quick adjust, inventory value, low-stock filter
- **Page Builder** — visual block editor for the homepage with **live preview**
  (reorder, show/hide, add/remove sections, edit every section's content)
- **Settings** — store info, shipping fees, announcement bar, admin password,
  data export/import/reset

---

## 🚀 Run locally

```bash
npm install
npm run dev      # http://localhost:5173
```

Build for production:

```bash
npm run build    # outputs to /dist
npm run preview  # preview the production build
```

---

## ☁️ Deploy to Cloudflare Pages

1. Push this folder to a GitHub repo.
2. In Cloudflare Pages → **Create project** → connect the repo.
3. Build settings:
   - **Framework preset:** Vite (or None)
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Deploy. The included `public/_redirects` file handles SPA routing
   (all routes fall back to `index.html`).

> Tip: you can also drag-and-drop the `dist/` folder into Cloudflare Pages
> for a quick manual deploy.

---

## 🛟 Data & backups

All store data (products, orders, analytics, homepage layout, settings) lives in the
browser's `localStorage`. Because of this:

- Data is **per-device / per-browser**. Orders placed by customers are stored in their
  own browser, so to see them centrally you'd later connect a real backend.
- Use **Admin → Settings → Export backup** regularly to download a JSON snapshot,
  and **Import backup** to restore it.
- **Factory reset** restores the original seeded products and layout.

This architecture is intentionally swappable: the data layer lives in
`src/data/store.ts`, so it can later be pointed at a real API/database with minimal
changes to the UI.

---

## 🎨 Brand tokens

| Token | Value |
|-------|-------|
| Navy (primary) | `#0E3A5C` |
| Navy deep | `#0A2C46` |
| Gold (accent) | `#EBB63F` |
| Fonts | Poppins (headings) · Inter (body) |

Logos live in `public/brand/` (`logo.png`, `logo-white.png`, `favicon.png`).
Product images live in `public/products/<slug>/`.
