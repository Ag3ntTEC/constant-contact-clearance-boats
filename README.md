# Clearance Campaign Studio

Redesigned internal Next.js tool for building polished Constant Contact clearance boat campaigns from live boat inventory.

## What changed in this remake

- Professional dashboard with current draft status, readiness cards, and clear continue actions
- Persistent campaign workflow navigation with step status badges
- Consistent sticky bottom actions for moving through the campaign flow
- More scannable boat selection with stronger row hierarchy, clearance badges, active preview, filter reset, empty states, and compact selected-order controls
- Editor reorganized into focused tabs for Images, Header, Email Text, and Links
- Preview page with a draft-readiness checklist before Constant Contact draft creation
- Refined visual system across login, dashboard, forms, cards, buttons, and status states

The backend behavior from the original app is preserved: boat feed loading, local draft persistence, email HTML generation, staff login, Constant Contact OAuth status, and Constant Contact custom-code draft creation.

## Getting started

Use Node.js 20.9 or newer.

Install dependencies:

```bash
npm install
```

Run the local development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

Copy `.env.local.example` to `.env.local`, then fill in the values.

```bash
APP_LOGIN_PASSWORD=change-me
AUTH_COOKIE_SECRET=generate-a-long-random-secret
CONSTANT_CONTACT_CLIENT_ID=
CONSTANT_CONTACT_CLIENT_SECRET=
CONSTANT_CONTACT_REDIRECT_URI=http://localhost:3000/api/constant-contact/callback
CONSTANT_CONTACT_AUTH_BASE_URL=https://authz.constantcontact.com/oauth2/default/v1/authorize
CONSTANT_CONTACT_TOKEN_URL=https://authz.constantcontact.com/oauth2/default/v1/token
CONSTANT_CONTACT_API_BASE_URL=https://api.cc.email/v3
CONSTANT_CONTACT_REFRESH_TOKEN=
BOAT_FEED_URL=https://motomarinedigital.com/feeds/winnisquammarine-feed/WinboatsWebXMLAllRevA.xml
BOAT_IMAGE_BASE_URL=https://winnisquammarine.com/wp-content/uploads
```

Keep these values server-side only. Do not expose Constant Contact credentials, login passwords, or cookie secrets to frontend code.

## Current limits

- The app creates Constant Contact custom-code draft campaigns.
- It does not send, schedule, or select contact lists.
- Imported preview images still need public URLs before draft creation.
