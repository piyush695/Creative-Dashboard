# Creative Analysis Dashboard

A premium Next.js dashboard for visualizing and analyzing ad creative performance data stored in MongoDB.

## Features

- **Account Selection**: Filter ads and metrics by specific account prefixes (e.g., HolaPrime, Top Performer).
- **Real-time Data**: Polls MongoDB every 30 seconds for the latest creative insights.
- **Performance Metrics**: Detailed breakdown of Spend, ROAS, CTR, CPC, and more.
- **AI-Powered Insights**: Visual design scores, psychology analysis, and automated recommendations.
- **Search & History**: Easily find ads by name or ID and quickly jump back to recently viewed creatives.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: MongoDB
- **UI Components**: Radix UI, Lucide Icons, Tailwind CSS
- **Visualization**: Recharts

## Setup Instructions

### 1. Database Configuration
The project uses a central database configuration. To customize your connection:

1. Create a `.env` file in the root directory.
2. Add your MongoDB credentials:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   MONGODB_DB=reddit_data
   ```

Note: If no `.env` file is present, the project will default to the primary development database.

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```

## Utility Scripts

The project includes several helper scripts for database management and inspection. All scripts use the central `db_config.js`.

- `node list_all_creative.js`: Lists all creatives in the database.
- `node insert_target_ad.js`: Upserts a sample high-performer ad for testing.
- `node check_account_data.js`: Inspects fields of a sample document.
- `node scan_mongo.js`: Scans all databases and collections in the cluster.

## Architecture

- `app/`: Main Next.js application logic and pages.
- `actions/`: Server actions for database fetching.
- `components/`: Reusable UI components for metrics, scores, and insights.
- `lib/`: Utility functions, MongoDB client, and shared TypeScript types.
- `db_config.js`: Central source of truth for database connection settings.
