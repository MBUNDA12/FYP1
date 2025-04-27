# Evidence Guardian Vault API

This is the backend API for the Evidence Guardian Vault application. It provides endpoints for user management, evidence upload, and evidence chain of custody tracking.

## Setup Instructions

### Prerequisites
- Node.js (v14+)
- MySQL Server
- npm or yarn package manager

### Installation

1. Clone the repository (if not already done)

2. Install dependencies:
```bash
cd backend
npm install
```

3. Create environment variables:
Create a `.env` file in the root of the backend directory with the following variables:
```
PORT=5000
JWT_SECRET=evidence_guardian_vault_secret_key
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=password
DB_NAME=evidence_guardian_db
```
Note: Update the DB_USER and DB_PASSWORD with your actual MySQL credentials.

4. Initialize the database:
```bash
npm run init-db
```
This will create the database and tables, and add default admin and officer users.

5. Start the development server:
```bash
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/refresh-token` - Refresh auth token

### User Management (Admin only)
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `POST /api/users/:id/reset-password` - Reset user password
- `POST /api/users/change-password` - Change own password (for any authenticated user)

### Evidence
- `GET /api/evidence` - Get all evidence (filtered by permissions)
- `GET /api/evidence/:id` - Get evidence by ID
- `POST /api/evidence/upload` - Upload new evidence (officer/admin)
- `GET /api/evidence/:id/download` - Download evidence file (officer/admin)
- `POST /api/evidence/:id/encrypt` - Encrypt evidence (officer/admin)
- `POST /api/evidence/:id/decrypt` - Decrypt evidence (admin only)
- `DELETE /api/evidence/:id` - Delete evidence (admin only)

## Default Users

Two default users are created during database initialization:

1. Admin User:
   - Email: admin@mbunda.com
   - Password: Mbunda1!

2. Officer User:
   - Email: mbundaphilimon@gmail.com
   - Password: Mbunda1!
   - Badge Number: B12345 