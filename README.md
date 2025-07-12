# Tomas - Purrfect Budgets

Personal and Home finance projection and expense tracking application.

## Features

- 📅 Calendar view for transaction planning
- 📊 Monthly reports and summaries
- 💰 Multiple account management
- 🏷️ Category organization

## Tech Stack

- Frontend:
  - Vue 3 (Composition API)
  - Pinia for state management
  - Bootstrap 5 for UI
  - FullCalendar for calendar view
- Backend:
  - Express.js
  - MySQL database
  - JWT for authentication

## Testing

We use automated testing to ensure code quality. See [TESTING.md](TESTING.md) for details on running tests and our CI/CD pipeline.

## Installation

### 1.- Clone the repository:
```bash
git clone https://github.com/yourusername/tomas.git
cd yamo
```

### 2.- Install Dependencies
Install frontend dependencies
```bash
cd frontend
npm install
```
Install backend dependencies
```bash
cd ../api
npm install
```
### 3.- Configure Environment

Copy example env file

```bash
cp .env.example .env
```

Edit with your database credentials
```bash
nano .env
```

### 4.- Initialize Database
```bash
mysql -u root -p < schema.sql
```

## Development

We try to abide to GitFlow

The development branch is `develop`, all PRs must point there.
`main` is used for production releases and hotfixes.

Start Backend server
```bash
cd api
npm run dev
```

Start frontend development server
```bash
cd frontend
npm run dev
```

Visit http://localhost:5173 in your browser

## Production

Build frontend:
```bash
cd frontend
npm run build
```

Start production server:
```bash
cd api
npm start
```

## Deploy to DigitalOcean

[![Deploy to DO](https://www.deploytodo.com/do-btn-blue.svg)](https://cloud.digitalocean.com/apps/new?repo=https://github.com/levhita/yamo/tree/develop)

This will deploy:
- A single App Platform instance running both frontend and backend
- Requires external MySQL database credentials (not included)
- Automatically deploys from the `develop` branch

### Environment Variables Required
- `YAMO_MYSQL_HOST`: MySQL server hostname
- `YAMO_MYSQL_USER`: Database username
- `YAMO_MYSQL_PASSWORD`: Database password
- `YAMO_MYSQL_DATABASE`: Database name
- `YAMO_MYSQL_PORT`: Database port (default: 3306)

# License
General Public License v3, check LICENSE.md for details
