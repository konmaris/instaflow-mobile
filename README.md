# Instaflow — Mobile (Rider & Waiter)

Native app for delivery riders and waiters. Built with Expo so it runs on iOS and
Android from one codebase.

- **Stack:** Expo (React Native) + TypeScript, Supabase JS, expo-location
- **Backend:** Supabase — see the `instaflow-database` repo

## Features

- Email/password auth (Supabase Auth), scoped to the staff member's restaurant
- **Orders tab** — active vs completed orders assigned to you (rider or waiter), live via Realtime; advance status (start delivery → delivered, mark served)
- **Shift tab** — open/close a shift with opening/closing cash; see cash collected, card total, **card tips**, and order count
- **GPS tracking** — when a rider opens a shift, `expo-location` streams position to `rider_locations` (a DB trigger maintains `rider_current_location`), powering the customer's live tracking map. Breadcrumbs are tied to the in-progress delivery.

## Setup

```bash
npm install
cp .env.example .env   # EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY
npx expo start
```

Open in Expo Go (scan the QR) or a simulator. Location only works on a device/
simulator with location enabled.

## Notes

- Tracking here is **foreground** (active while the app is open on shift). For
  true background tracking, add a `expo-task-manager` background location task and
  the `UIBackgroundModes`/`ACCESS_BACKGROUND_LOCATION` entitlements.
- The `location` column is PostGIS geography; inserts use EWKT
  (`SRID=4326;POINT(lng lat)`), which PostgREST accepts.

## Project layout

```
src/
  lib/        supabase client (AsyncStorage session), generated types, tracking (GPS)
  store/      auth, shift (open/close + GPS), orders (my orders + realtime)
  screens/    LoginScreen, OrdersScreen, ShiftScreen
App.tsx       auth gate + bottom tab switch
```
