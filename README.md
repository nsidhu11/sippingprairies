# Sipping Prairies — Website

A premium site for **Sipping Prairies** liquor store (Edmonton, AB) — now open.
Concept: **"The Long Light"** — the whole page is one golden-hour evening on the prairie. As
you scroll, the light changes (blue hour → amber → burgundy dusk → night), and Mr. Sippy
hosts you through it.

Built as a fast, self-contained static site — no build step, no server, hosts anywhere.

---

## What's in here

```
index.html        ← the whole page
css/main.css      ← all styling + the design system (brand colours, fonts, materials)
js/main.js        ← all motion + interactivity (Lenis smooth-scroll + GSAP)
js/vendor/        ← GSAP + Lenis libraries (bundled, so the site works offline)
assets/img/       ← logos, Mr. Sippy poses (WebP), favicons
```

Everything else (`node_modules/`, `tools/`, `package.json`) is **development only** and is
**not** part of what you publish.

---

## Preview it on your computer

The site needs to be served over `http://` (not opened as a file) for everything to work.
Easiest way, from this folder:

```bash
npm run serve
```

Then open **http://localhost:5173** in your browser.
(That command just runs Python's built-in web server. Any static server works.)

---

## Publish it (so the world can see it at sippingprairies.ca)

You only need to upload these four things: **`index.html`, `css/`, `js/`, `assets/`**.

**Easiest — Netlify (free):**
1. Go to https://app.netlify.com/drop
2. Drag the project folder onto the page.
3. It goes live instantly on a temporary address.
4. In Netlify → *Domain settings*, connect **sippingprairies.ca** (point your domain's DNS to Netlify).

Vercel, Cloudflare Pages, or any web host work the same way — just upload the files.

---

## Collecting email sign-ups (the mailing-list / "Join the List" form)

Right now the form shows a friendly confirmation but **does not store the email** anywhere.
To actually collect addresses (takes ~2 minutes, free):

1. Sign up at **https://formspree.io** and create a new form. You'll get a URL like
   `https://formspree.io/f/abcdwxyz`.
2. Open `js/main.js`, find this line near the top:
   ```js
   const FORM_ENDPOINT = '';
   ```
   and paste your URL inside the quotes:
   ```js
   const FORM_ENDPOINT = 'https://formspree.io/f/abcdwxyz';
   ```
3. Re-publish. Sign-ups now arrive in your Formspree inbox (and forward to your email).

> Tip: if you host on **Netlify**, you can instead add `netlify` to the `<form>` tag and use
> Netlify Forms — ask whoever deploys it.

---

## Editing the content

All wording lives in **`index.html`** as plain text — search for the words you want to change.
Common edits:

| Want to change… | Look for… |
|---|---|
| Address / hours | the **Visit** section (`id="visit"`) |
| The 8% whisky offer / dates | the **Offers** section (`id="offers"`) |
| Heroes discount wording | the **Heroes** section (`id="heroes"`) |
| Product categories | the **Shelf** section (`id="the-shelf"`) — these are placeholders until opening |
| Email / contact | the **Footer** and **Visit** sections |

Brand colours and fonts are defined once at the top of `css/main.css` (the `:root` block).

### Adding real product / store photos later
The atmospheric scenes are currently drawn with CSS (no photos needed). When you have real
golden-hour or storefront photography, they can be dropped into the hero, "The Place," and
the map area for an even richer look. Keep them warm-lit to match the brand.

---

## Good to know

- **Age gate:** visitors confirm they're 18+ before entering (legal for an Alberta liquor
  retailer). Their choice is remembered for the browsing session.
- **Accessibility:** the site respects "reduce motion" system settings, and there's a
  **Reduce motion** toggle in the footer. All text meets contrast guidelines.
- **The map** is a stylized graphic that links out to Google Maps directions — this avoids a
  heavy embed and loads instantly. A live Google Maps embed can be added later if you prefer.

---

*Brand: Sipping Prairies · Mr. Sippy mascot · "Find Your Perfect Pour."*
