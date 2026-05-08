# Heal Peptides App

Mobile-first PWA for peptide protocol management. Single-file HTML app
deployed on Netlify.

**Live:** https://heal-peptides-app.netlify.app

## Features

- **Auth** — Netlify Identity (signup / login / forgot password / resend verification)
- **Home** — Today's doses, streak counter, daily reminder (browser notifications)
- **Calc** — Vial reconstitution calculator (mcg ↔ syringe units)
- **Protocol** — Quick start (4 goals) + custom protocol builder
- **Tracker** — Vial inventory with reorder alerts
- **History** — Last 30 days of dose adherence
- **Shop** — WhatsApp ordering for all products

## Cloud sync

Data is stored locally (localStorage) and synced to Supabase per-user
when the user is signed in. See `supabase-schema.sql` for the tables.

## Deploy

This repo is connected to Netlify (auto-deploy on push to `main`).

To set up Supabase tables, run `supabase-schema.sql` in the Supabase
SQL editor (wercr-crm project).

## Stack

- HTML / CSS / vanilla JS (no build step)
- Netlify Identity for auth
- Supabase REST API for cloud sync
- Browser Notification API for reminders
