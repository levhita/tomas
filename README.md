# YAMO - Yet Another Money Organizer and planification software for couples that love eachother

Personal and Home finance projection and expense tracking application.

## Features

- 📅 Calendar view for transaction planning
- 📊 Monthly reports and summaries
- 💰 Multiple account management
- 🏷️ Category organization
- 📱 Responsive design

## Tech Stack

- Frontend:
  - Vue 3 (Composition API)
  - Pinia for state management
  - Bootstrap 5 for UI
  - FullCalendar for calendar view
- Backend:
  - Express.js
  - MySQL database
  - Node.js

## Installation

### 1.- Clone the repository:
```bash
git clone https://github.com/yourusername/yamo.git
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
# License
General Public License v3, check LICENSE.md for details