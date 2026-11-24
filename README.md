# Moracarta

**Create your own personalized love-letter website and deploy it completely for free. Available as an npm package**

[![npm version](https://img.shields.io/npm/v/moracarta)](https://www.npmjs.com/package/moracarta)
[![npm downloads](https://img.shields.io/npm/dt/moracarta)](https://www.npmjs.com/package/moracarta)

🌐 **[Live Demo - Latest Stable Branch](https://moracarta.pages.dev/)** | 🛠️ **[Live Demo - Development Branch](https://development.moracarta.pages.dev/)**

## Features

💌 Multiple letters  
📝 Google Docs as your writing interface  
🎨 Customizable texts  
🌐 Free web deployment  
🔒 No database required  

## **You can have your own working URL in less than 5 minutes**

**And it's as simple as:**

```bash
npm i moracarta
npx moracarta setup
npx moracarta build
npx moracarta deploy
```
### What each command does

- `npm i moracarta` installs Moracarta as a dependency in your project.
- `npx moracarta setup` sets up Moracarta and lets you configure the website.
- `npx moracarta build` builds your website using your configured letters and settings.
- `npx moracarta deploy` deploys the finished website for free.

### App Demo
<p align="center">
    <img src="public/assets/images/demo-main-page.png" height="400">
    <img src="public/assets/images/demo-animation.gif" height="400">
</p>

### Setup Demo

<img src="public/assets/images/setup-demo.png" width="100%">
<br>

## That's it.

All that's left is to write your letters in the dashboard and, if you want,
customize the two texts displayed on the main page.

## Dashboard and MongoDB

The live version of this project can store letters in MongoDB Atlas and manage
them from a browser dashboard.

1. Create a MongoDB Atlas cluster and allow your machine's IP in **Network Access**.
2. Copy `.env.example` to `.env`.
3. Put your Atlas connection string in `MONGODB_URI` and choose an
   `ADMIN_PASSWORD`.

If the Atlas username or password contains characters such as `@`, `:`, `/`,
or `#`, URL-encode those characters in the connection string (`@` becomes
`%40`).
4. Seed the example letters if desired:

```bash
npm.cmd run seed
```

Use `npm.cmd run seed -- --force` only when you want to replace all stored
letters with the examples.

To enable notifications through Gmail API, create a Google Cloud project,
enable the Gmail API, configure an OAuth consent screen, create a Desktop OAuth
client, and add these Render environment variables:

```env
GMAIL_USER=your-gmail@gmail.com
GMAIL_CLIENT_ID=your-google-oauth-client-id
GMAIL_CLIENT_SECRET=your-google-oauth-client-secret
GMAIL_REFRESH_TOKEN=your-google-refresh-token
NOTIFICATION_TO_EMAIL=your-partner@example.com
PUBLIC_SITE_URL=https://your-app.onrender.com
```

For local authorization, put `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET` in
`.env`, add `http://localhost:3000/oauth2callback` as an authorized redirect
URI in Google Cloud, then run:

```bash
npm.cmd run gmail:authorize
```

Open the printed Google URL, approve Gmail send access, and copy the printed
refresh token into Render as `GMAIL_REFRESH_TOKEN`. The refresh token is a
secret and must never be committed.

Notifications are sent after a letter or public reply is saved. If Gmail API
is not configured or temporarily fails, the letter/reply is still saved and
the failure is logged by the server.

Start development with both the API and Vite site:

```bash
npm.cmd run dev:all
```

- Public site: `http://localhost:5173`
- Dashboard: `http://localhost:5173/dashboard.html`
- API health check: `http://localhost:4000/api/health`

For a single Node process, build and start the production server:

```bash
npm.cmd run build
npm.cmd start
```

On Windows PowerShell, use `npm.cmd` if the `npm` command is blocked by the
PowerShell execution policy. The old `moracarta add` and `moracarta remove`
commands are deprecated and no longer affect the live MongoDB site; use the
dashboard instead. A static-only deployment will not show database letters.

### Deploying to Vercel

This project includes a Vercel serverless function at `api/index.js`. To
deploy:

1. Push the project to GitHub.
2. Import the repository at [vercel.com](https://vercel.com).
3. Keep the default build settings, or use:
   - Build command: `npm run build`
   - Output directory: `dist`
4. Add these Vercel environment variables for the Production environment:

```env
MONGODB_URI=mongodb+srv://...
MONGODB_DB=letters
ADMIN_PASSWORD=your-long-password
```

5. Deploy the project.

Vercel will serve the public site and dashboard, while `/api/*` is routed to
the serverless Express function. MongoDB Atlas must allow Vercel connections;
for the simplest setup, allow `0.0.0.0/0` and use a strong database password.

Seed the production database from a local terminal using the same production
environment values:

```bash
npx vercel env pull .env
npm.cmd run seed
```

Run this in a clean clone or back up your local `.env` first. Never commit
`.env`.

## Requirements

- Node.js 22+
- MongoDB Atlas for the dashboard-backed live site

### Legacy CLI commands

`moracarta add` and `moracarta remove` are deprecated. They now stop with a
message directing you to the dashboard and do not change the live MongoDB
collection. They are retained only for compatibility with older Moracarta
projects.

### Customizing the website

During `moracarta setup`, you can choose from preset messages or enter your own custom text for the main page.

<p align="center">
    <img src="public/assets/images/custom-text-demo2.png" width="700"><br>
    <img src="public/assets/images/custom-text-demo1.png" width="700">
</p>

## License

Moracarta is open-source software licensed under the **MIT License**.

See the [LICENSE](LICENSE) file for the full license text.
