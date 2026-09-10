# SNL AI DCA Future Trade & Gold Pro Formula v4.0

A high-performance, cross-browser financial scaling simulator, real trading log journal with Cent/USD converter, and multi-account portfolio management suite.

---

## 🚀 How to Upload This Project to Your GitHub

Follow these steps in your terminal inside the project directory:

### Step 1: Initialize Git and Stage Files
```bash
git init
git add .
git commit -m "Initial commit: SNL AI DCA Future Trade suite with cross-browser support"
```

### Step 2: Create a New Repository on GitHub
1. Go to [https://github.com/new](https://github.com/new).
2. Choose a repository name (e.g. `snl-future-trade`).
3. Set visibility to **Public** or **Private**.
4. Leave "Add a README file" **unchecked** (since this repo already has one).
5. Click **Create repository**.

### Step 3: Link and Push to GitHub
Copy the commands shown on GitHub or run:
```bash
# Rename the default branch to main
git branch -M main

# Link your local repository to your new GitHub repository
# (Replace USERNAME and REPO_NAME with your actual GitHub username and repository name)
git remote add origin https://github.com/USERNAME/REPO_NAME.git

# Push your code to GitHub
git push -u origin main
```

---

## 🌐 Free Online Hosting Options

Because this is a modern React Single Page Application (SPA) built with Vite, you can host it for **100% free** with automatic SSL (HTTPS).

### Option 1: GitHub Pages (Recommended & Automated)

This repository includes a ready-to-run GitHub Actions workflow (`.github/workflows/deploy.yml`).

1. Go to your repository on GitHub.
2. Click **Settings** (tab on the top right) → **Pages** (in the left sidebar).
3. Under **Build and deployment** → **Source**, select:
   **`GitHub Actions`** (instead of "Deploy from a branch").
4. That's it! Every time you push a commit to `main`, GitHub Actions will automatically compile the project and deploy it.
5. Your live app URL will appear at:
   `https://<YOUR-GITHUB-USERNAME>.github.io/<YOUR-REPO-NAME>/`

*Note: `vite.config.ts` has already been configured with `base: './'` so that subpath routing works out of the box without blank 404 screen errors.*

---

### Option 2: Vercel (Fastest 1-Click Setup)

1. Go to [https://vercel.com](https://vercel.com) and sign in with your GitHub account.
2. Click **Add New...** → **Project**.
3. Select your `snl-future-trade` repository from the list.
4. Keep the default build settings:
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Click **Deploy**. In ~30 seconds, your site will be live at `https://your-project.vercel.app`.

---

### Option 3: Netlify

1. Go to [https://www.netlify.com](https://www.netlify.com) and log in with GitHub.
2. Click **Add new site** → **Import an existing project**.
3. Select GitHub and choose your repository.
4. Set:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Click **Deploy Site**.

---

### Option 4: Cloudflare Pages

1. Go to [https://dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages**.
2. Click **Create Application** → **Pages** → **Connect to Git**.
3. Select your repository, choose the **Vite** framework preset, and click **Save and Deploy**.

---

## 📱 Cross-Browser Data Reliability & Portability

- **Zero-Crash Safe Storage (`safeStorage`)**: All preferences, investor profiles, trades, simulation runs, and custom branding use an intelligent, defensive storage wrapper. Even if users browse in **Safari Private Browsing Mode**, **Chrome Incognito**, or inside in-app webviews (Telegram, WeChat, Facebook), the app will never crash.
- **Cross-Device Sync (Backup & Restore)**:
  - Open **Admin** (top right) → **System Backup & Restore**.
  - Click **Download Complete Backup (.json)** to save your entire database to a file.
  - On another device or browser, click **Restore Backup** and select your JSON file to import all investors and trade history instantly.

---

## 💻 Local Development Commands

```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```
