# 🎲 Bard's Deck — D&D Soundboard v2

A high-performance, mobile-first soundboard designed for Dungeon Masters and tabletop RPG players. Built with **React**, **TypeScript**, **Tailwind CSS**, **Web Audio API**, and **Firebase** (with local IndexedDB fallback).

Upload ambient tracks, music, and one-shot sound effects on your PC, then run sessions smoothly from your smartphone.

---

## 🚀 Key Features

### 🎧 Audio & Playback
- **Universal Modern Format Support**: Supports `MP3`, `WAV`, `FLAC`, `OGG`, `AAC`, `M4A`, `MP4`, `WEBM`, and more.
- **Bulk Upload**: Upload multiple audio files simultaneously with batch category, icon, loop, and exclusivity presets.
- **Simultaneous Multi-Track Playback**: Play 3+ sounds at the same time (e.g., Background Music + Storm Ambience + Sword Slashes).
- **Audio Normalization**: Built-in Web Audio API `DynamicsCompressorNode` normalizes varying audio volumes transparently and prevents digital clipping without degrading original audio quality.
- **Configurable Loops**: Toggle any sound to loop infinitely until tapped again.
- **Category Exclusivity ("Solo")**: Configurable per sound to automatically stop all other sounds in the same category when triggered (e.g., swapping background music or combat tunes without killing active rain/weather ambience or spell SFX).
- **Panic Button ("STOP ALL")**: Always-visible emergency stop button in the bottom controller to silence all channels instantly.
- **Tap to Play / Tap to Stop**: Instant responsive audio feedback with live progress indicator and sound wave animations.

### 📱 Interface & Experience
- **Mobile-First Touch Architecture**: High-density grid that fits as many sound buttons on a phone screen as possible while preserving comfortable touch targets.
- **Desktop Friendly**: Responsive grid expanding to multi-column layouts for desktop monitors.
- **Curated Fantasy & RPG Vector Icons**: Over 100 public SVG icons from Lucide across categories (Combat & Weapons, Magic & Spells, Ambience & Nature, Tavern & Social, Creatures, Music & Audio). *No emojis.*
- **User-Created Categories**: Create, rename, delete, and customize category icons.
- **Table Security PIN**: Optional master PIN to lock controls at the gaming table.
- **PWA Ready**: Web app manifest included for "Add to Home Screen" on iOS & Android (runs full-screen without browser address bar clutter).

---

## ☁️ Cloud & 24/7 Availability (Firebase Free Tier)

All audio files and soundboard metadata can be stored in **Firebase Cloud** (5 GB free storage, Firestore database, 24/7 availability with zero project sleep/pausing).

### Step 1: Create a Free Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/) and click **Add project**.
2. Name your project (e.g., `dnd-soundboard`) and create it (Google Analytics is optional).

### Step 2: Enable Cloud Firestore
1. In the sidebar, go to **Build** → **Firestore Database** → **Create database**.
2. Select your closest location and choose **Test mode** (or paste the rules below).

### Step 3: Enable Firebase Storage
1. In the sidebar, go to **Build** → **Storage** → **Get started**.
2. Select **Test mode** and finish.

### Step 4: Set Security Rules
In **Firestore Database** → **Rules**, paste:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

In **Storage** → **Rules**, paste:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

### Step 5: Connect to the App
1. Go to **Project Settings** (gear icon) → **General** → **Your apps** → Click the Web `</>` icon.
2. Register the app (no need to check Firebase Hosting unless desired).
3. Copy the `firebaseConfig` object and either:
   - **Option A (In-App)**: Open the soundboard, tap the **Settings** gear, and paste the config snippet into the **Quick Paste** box.
   - **Option B (.env)**: Create a `.env` file in the project root based on `.env.example`.

> **Note**: If Firebase is not configured yet, the soundboard runs in **Local / Offline Mode** using browser IndexedDB storage and includes a **"Generate Demo Sounds"** button so you can test audio playback, loops, and normalization immediately.

---

## 🛠️ Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start dev server (accessible across local Wi-Fi)
npm run dev
```

During development, Vite listens on `0.0.0.0:5173`. You can open `http://<your-pc-ip>:5173` on your smartphone's browser (while connected to the same Wi-Fi) to test the mobile experience live!

---

## 🌐 24/7 Free Cloud Deployment

To access the soundboard anytime, anywhere without keeping your PC running:

### Option 1: Vercel (Recommended)
1. Push this repository to GitHub.
2. Go to [Vercel](https://vercel.com/) and click **Add New Project**.
3. Select this repository and click **Deploy**.
4. (Optional) Add your Firebase environment variables under **Project Settings → Environment Variables**.

### Option 2: Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
# Select dist as public directory, configure as single-page app
npm run build
firebase deploy --only hosting
```
