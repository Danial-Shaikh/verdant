# 🌿 Verdant — Bill Tracker

A calm, green bill tracker that helps you **tend your bills before they grow wild**. Track rent, electricity, gas, water, internet and more — see what's due, get reminders, and watch where your money goes. Everything stays **private in your own browser**; there's no account, no server, and no data ever leaves your device.

![React](https://img.shields.io/badge/React-19-3ddc84?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-0a3d2e?logo=vite&logoColor=c8f169)
![License: MIT](https://img.shields.io/badge/License-MIT-3ddc84)

---

## ✨ Features

- **Visual dashboard** — monthly average, outstanding balance, due-soon and overdue counts at a glance.
- **Charts** — a category breakdown donut (where your money goes) and a 6-month projected-outflow bar chart.
- **Due-date awareness** — every bill is colour-coded: overdue, due soon (within 5 days), or upcoming.
- **Browser reminders** — opt in to native notifications that nudge you when bills are due within two days.
- **Recurring bills** — set a bill to repeat weekly, biweekly, monthly, quarterly or yearly; paying it rolls the due date forward automatically.
- **Export / import** — back up all your data to a JSON file and restore it on any device.
- **100% local & private** — data is saved in your browser via `localStorage`. Nothing is uploaded anywhere.
- **Custom favicon** — a little leaf-and-coin mark that shows in your browser tab.

## 🛠️ Tech stack

React 19 · Vite · Recharts · Lucide icons. No backend.

## 🚀 Run it locally

You'll need [Node.js](https://nodejs.org) 18 or newer.

```bash
npm install      # install dependencies
npm run dev      # start the dev server (http://localhost:5173)
```

To create a production build:

```bash
npm run build    # output goes to dist/
npm run preview  # preview the production build locally
```

## 🌍 Publish to GitHub Pages

This repo ships with a GitHub Actions workflow that **builds and deploys automatically**. To turn it on:

1. Push this project to a GitHub repository (see below).
2. In your repo, go to **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **GitHub Actions**.
4. That's it. Every push to the `main` branch rebuilds and publishes the site.

Your site will be live at:

```
https://<your-username>.github.io/<your-repo-name>/
```

The workflow automatically sets the correct base path from your repo name, so assets and the favicon load properly.

> **Prefer a one-off manual deploy?** Run `VITE_BASE="/<your-repo-name>/" npm run build`, then `npm run deploy` (uses the `gh-pages` branch). The GitHub Actions route above is recommended and needs no extra steps.

### First push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: Verdant bill tracker"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git push -u origin main
```

## 📁 Project structure

```
billtracker/
├── public/
│   ├── favicon.svg         # main vector favicon (leaf + coin)
│   ├── favicon-32.png      # PNG fallback for older browsers
│   └── favicon-180.png     # apple-touch-icon
├── src/
│   ├── App.jsx             # the whole app (dashboard, list, charts, modal)
│   ├── index.css           # botanical-green design system
│   └── main.jsx
├── .github/workflows/
│   └── deploy.yml          # auto-deploy to GitHub Pages
├── index.html              # favicon + meta tag setup
└── vite.config.js          # base-path config for Pages
```

## 🔒 A note on your data

Verdant stores everything in your browser's `localStorage`. That means:

- Your bills are visible only on the device and browser where you entered them.
- Clearing your browser data, or using a different browser/device, starts you fresh.
- **Use the Export button regularly** to keep a backup JSON file you can re-import anytime.

## 📄 License

MIT — see [LICENSE](LICENSE). Free to use, modify, and share.
