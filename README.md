# Evidence Guardian Vault

Evidence Guardian Vault is a secure evidence management system built for law enforcement agencies to manage digital evidence files. The system provides chain of custody tracking, user management, and evidence encryption features.

## Project Structure

- **Frontend**: React application with TypeScript, Tailwind CSS, and ShadCN UI components
- **Backend**: Node.js API with Express and MySQL database

## Setup Instructions

### Prerequisites

- Node.js (v14+)
- MySQL Server
- npm or yarn package manager

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the backend directory with the following variables:
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

5. Start the backend development server:
   ```bash
   npm run dev
   ```
   The server will run on http://localhost:5000

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd evidence-guardian-vault
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the frontend development server:
   ```bash
   npm run dev
   ```
   The application will run on http://localhost:5173

## Default Users

Two default users are created during database initialization:

1. **Admin User**
   - Email: `admin@mbunda.com`
   - Password: `Mbunda1!`

2. **Officer User**
   - Email: `mbundaphilimon@gmail.com`
   - Password: `Mbunda1!`
   - Badge Number: B12345

## Features

- **Single Login Page**: Works for both admin and officer roles
- **User Management**: Admin dashboard for managing users
- **Evidence Upload**: Officers can upload evidence files
- **Case Management**: Evidence is organized by case numbers
- **Encryption**: Files can be encrypted for security
- **Chain of Custody**: System logs evidence access and operations
- **Role-based Access**: Different permissions for admins and officers

## API Endpoints

The backend provides RESTful API endpoints for:

- Authentication
- User management
- Evidence upload and management
- Access logs

Detailed API documentation can be found in the backend README. # FYP1
