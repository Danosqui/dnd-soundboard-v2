# 🎲 Bard's Deck — D&D Soundboard v2

A high-performance, mobile-first soundboard designed for Dungeon Masters and tabletop RPG players. Built with **React**, **TypeScript**, **Tailwind CSS**, **Web Audio API**, and **Supabase** (100% Free Cloud Storage & Database with **NO Credit Card Required**).

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

## ☁️ 100% Free Cloud Setup (Supabase - No Credit Card Needed)

Supabase gives you **1 GB of free cloud audio storage** and a real-time database available 24/7 without asking for any credit card or payment information.

### Step 1: Create Your Free Supabase Account
1. Open your browser and go to [https://supabase.com](https://supabase.com).
2. Click **Start your project**.
3. Sign in using your **GitHub account** or type your **Email**. *(No credit card is ever asked).*
4. Click **New project**.
5. Give your project a name (for example: `dnd-soundboard`) and create a database password.
6. Click **Create new project** and wait about 1-2 minutes for it to finish setting up.

### Step 2: Run the Setup Script
1. On the left sidebar menu of your Supabase dashboard, click the **SQL Editor** icon (looks like `>_` or SQL terminal).
2. Click **New query** (or the green `+` button).
3. Copy and paste the following SQL script into the query box:

```sql
-- 1. Create Sounds Table
create table if not exists public.sounds (
  id text primary key,
  title text not null,
  category_id text not null,
  file_url text not null,
  storage_path text not null,
  duration numeric default 0,
  loop boolean default false,
  stop_category_others boolean default true,
  icon text default 'Volume2',
  volume numeric default 1.0,
  "order" numeric default 0,
  created_at numeric default 0
);

-- 2. Create Categories Table
create table if not exists public.categories (
  id text primary key,
  name text not null,
  icon text default 'FolderPlus',
  color text default 'purple',
  "order" numeric default 0,
  created_at numeric default 0
);

-- 3. Enable Public Access for personal soundboard (Row Level Security disabled)
alter table public.sounds disable row level security;
alter table public.categories disable row level security;

-- 4. Enable Realtime on both tables
alter publication supabase_realtime add table public.sounds;
alter publication supabase_realtime add table public.categories;

-- 5. Create Public Audio Storage Bucket 'sounds'
insert into storage.buckets (id, name, public)
values ('sounds', 'sounds', true)
on conflict (id) do update set public = true;

-- 6. Storage Security Policies for sound uploads
create policy "Allow Public Select" on storage.objects for select using (bucket_id = 'sounds');
create policy "Allow Public Insert" on storage.objects for insert with check (bucket_id = 'sounds');
create policy "Allow Public Update" on storage.objects for update using (bucket_id = 'sounds');
create policy "Allow Public Delete" on storage.objects for delete using (bucket_id = 'sounds');
```

4. Click the green **Run** button at the bottom right. You will see `Success. No rows returned`.

### Step 3: Connect to the Soundboard App
1. On the left sidebar of Supabase, click the **Project Settings** gear icon at the very bottom.
2. Click **API** in the settings menu.
3. You will see:
   - **Project URL** (looks like `https://abcdefghijklm.supabase.co`)
   - **Project API Keys** → find the one that says **`anon` `public`**.
4. Open the Soundboard app in your browser, click the **Settings ⚙️** icon in the top right corner.
5. Paste your **Project URL** and **Project API Key (anon)** into the boxes and click **Save Supabase Config**.

Done! Your soundboard is now connected to the cloud 24/7. Any sounds you upload on your PC will immediately sync to your phone!

---

## 🛠️ Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start dev server (accessible across local Wi-Fi)
npm run dev
```

During development, Vite listens on `0.0.0.0:5173`. Open `http://<your-pc-ip>:5173` on your smartphone browser (connected to the same Wi-Fi) to use it from your phone.
