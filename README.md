# budget-app-22

Local web app that imports Swiss bank and card statements (UBS CSV, Swisscard CSV/XLSX, Liberty XLS, Viseca PDF) into MariaDB, skips overlapping duplicates, lets you categorize bookings, and shows a first analysis view.

## Setup

1. Create a MariaDB database and a user that uses a password plugin Prisma can speak (`mysql_native_password`). MariaDB 12 on Windows often defaults to `auth_gssapi_client`, which Node/Prisma cannot use:

```sql
CREATE DATABASE budget CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'budget'@'localhost' IDENTIFIED VIA mysql_native_password USING PASSWORD('choose-a-password');
GRANT ALL PRIVILEGES ON budget.* TO 'budget'@'localhost';
FLUSH PRIVILEGES;
```

2. Copy [`.env.example`](.env.example) to `.env` and set your connection:

```
DATABASE_URL="mysql://budget:choose-a-password@localhost:3306/budget"
```

3. Install and migrate:

```bash
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Open http://localhost:3000 — import files from the Import page (the samples under `res/` work as a first load).

Personal statement files in `res/` are gitignored.
