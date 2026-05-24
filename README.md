# ClubHub - Premium Member Directory

This is a premium Next.js web application scaffolded for managing club members.

## Tech Stack
* **Framework:** Next.js (App Router)
* **Styling:** CSS Modules with CSS Variables (Dark/Light mode support)
* **Icons:** Lucide React
* **Database:** Firebase (Firestore + Storage)

## Getting Started

1. Set up your Firebase project at [Firebase.com](https://firebase.google.com/).
2. Create a **Firestore Database** and a **Storage Bucket**.
3. Register a web app in your Firebase project settings to get your configuration keys.
4. Rename `.env.example` to `.env.local` and add your Firebase configuration keys.
5. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Next Steps for Development
* Integrate the `src/lib/firebase.ts` client into the pages to fetch real data from Firestore instead of `MOCK_MEMBERS`.
* Create the `Add Member` form to insert records into Firestore.
* Add Google Maps or Leaflet to visualize the `firmLat` and `firmLong` coordinates on the map view.
