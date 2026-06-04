# Constant Contact Clearance Boats

Internal Next.js tool for building clearance boat marketing emails and preparing Constant Contact custom-code campaign drafts.

## Current scope

This first setup includes:

- Next.js App Router with TypeScript
- Tailwind CSS
- Server-side `/api/boats` route for loading the Winnisquam XML boat feed
- Boat browser with search, preview cards, image handling, and 7 to 10 boat selection limits
- Table-based clearance boat email HTML generator and in-app iframe preview
- Multi-step campaign flow for settings, boat selection, copy editing, and final preview
- Reference-style campaign asset controls for top banner, hero image, inventory buttons, and footer/contact area
- Constant Contact OAuth routes and draft custom-code campaign creation
- Password-based staff login with signed HTTP-only cookie protection
- Placeholder homepage sections for campaign settings, selected boats, email preview, and draft creation
- Preliminary shared types in `lib/types.ts`
- Placeholder environment variable documentation

Not implemented yet:

- Constant Contact sending
- Constant Contact scheduling
- Contact list or segment selection

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

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment variables

Copy `.env.local.example` to `.env.local`, then fill in the Constant Contact values.

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
BOAT_IMAGE_BASE_URL=https://winnisquammarine.com/wp-content/uploads/2026/06
```

Keep these values server-side only. Do not expose Constant Contact credentials, login passwords, or cookie secrets to frontend code.

`APP_LOGIN_PASSWORD` is the staff password for the `/login` page. `AUTH_COOKIE_SECRET` should be a long random string used to sign the login cookie. For production, set both values in your host's environment variable settings, such as Vercel Project Settings.

## Constant Contact setup

Create an app in the Constant Contact Developer Portal and set the redirect URI to:

```bash
http://localhost:3000/api/constant-contact/callback
```

Use OAuth scopes:

```bash
campaign_data offline_access
```

Start the app, open the preview page, and click **Connect Constant Contact**. In development, the callback logs the refresh token to the server console with a warning. Copy that token into `.env.local` as `CONSTANT_CONTACT_REFRESH_TOKEN`, then restart the app.

After selecting 7 to 10 boats and using public image URLs, click **Create Constant Contact Draft** on the preview page. The app creates a draft custom-code email campaign only. It does not send, schedule, or select lists.

The `/emails` payload shape is:

```json
{
  "name": "Campaign name",
  "email_campaign_activities": [
    {
      "format_type": 5,
      "from_email": "confirmed-sender@example.com",
      "from_name": "Sender Name",
      "reply_to_email": "confirmed-reply@example.com",
      "subject": "Subject line",
      "preheader": "Preheader text",
      "html_content": "<!doctype html>...[[trackingImage]]...</html>"
    }
  ]
}
```
