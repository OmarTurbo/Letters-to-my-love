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
