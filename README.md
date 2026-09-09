# Flowspace

Aplikasi project management dan kolaborasi tim realtime. Satu workspace bisa menampung beberapa project, tiap project punya board kanban (drag & drop), tampilan list, dan kalender. Task bisa dikomentari, di-mention, diberi label dan prioritas. Perubahan sekecil apa pun, pindah kartu, komentar baru, atau notifikasi, langsung muncul di layar semua anggota tanpa refresh.

## Isinya

- Workspace dengan role owner, admin, member, dan guest
- Project: board, list, calendar, member project, activity log
- Task: status backlog sampai done, prioritas, assignee, label, due date, attachment, komentar + mention + reaction
- Realtime: task, komentar, typing indicator, presence online, notifikasi (pakai websocket)
- Inbox notifikasi, global search, undangan member via email/token
- Login email/password dan Google OAuth
- Dark/light mode, shortcut keyboard, layout responsif

## Teknologi

Backend: Laravel 13, Sanctum (token), Reverb (websocket), MySQL, Redis (queue + cache).

Frontend: React 19 + TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, Zustand.

## Cara menjalankan

Butuh: PHP 8.3, Composer, Node 20+, MySQL, Redis.

```bash
# backend
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
cd ..

# frontend
cd frontend
npm install
cd ..
```

Paling gampang jalanin semuanya dari root:

```bash
npm run dev
```

Ini menyalakan API (`:8000`), websocket (`:8080`), dan Vite (`:5173`). Buka `http://localhost:5173`, daftar akun baru, bikin workspace, selesai.

Kalau mau jalanin satuan: `npm run api` untuk backend saja, `npm run web` untuk frontend saja. Matikan semuanya dengan `npm run stop`.

Google login sifatnya opsional, isi `GOOGLE_CLIENT_ID` dan kawan-kawannya di `backend/.env` kalau mau dipakai.

## Struktur folder

```
backend/      API Laravel (routes di backend/routes/api.php)
frontend/     SPA React (entry di frontend/src, routing di App.tsx)
screenshots/  Tangkapan layar tiap halaman
dev.mjs       Orkestrator dev, jalanin semua service dari root
```

## Tampilan

Landing page:

![Landing page](screenshots/01-landing.png)

Dashboard:

![Dashboard](screenshots/05-dashboard.png)

Board project:

![Board project](screenshots/07-project-board.png)

Screenshot halaman lain (login, register, list, my tasks, inbox, workspaces, settings, dsb.) ada di folder `screenshots/`.

## Lisensi

MIT. Lihat `LICENSE`.
