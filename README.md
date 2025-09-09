# NCISM Textbook Review System - Frontend

This is the frontend application for the NCISM Textbook Review System, built with React, TypeScript, and Tailwind CSS.

## Features

- User authentication and role-based access control
- Dashboard with role-specific statistics and recent activity
- Book management (upload, view, search, filter)
- Review assignment and submission
- Committee decision workflow
- Audit logging for system activities
- PDF preview and report generation

## Tech Stack

- **React**: UI library
- **TypeScript**: Type safety
- **React Router**: Navigation and routing
- **React Query**: Data fetching and caching
- **Zustand**: State management
- **Tailwind CSS**: Styling
- **Headless UI**: Accessible UI components
- **React PDF**: PDF viewing
- **Axios**: API requests
- **React Hook Form**: Form handling
- **React Toastify**: Notifications

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   # or
   yarn
   ```

### Development

Start the development server:

```bash
npm run dev
# or
yarn dev
```

The application will be available at http://localhost:3000.

### Building for Production

```bash
npm run build
# or
yarn build
```

## Project Structure

- `src/components`: Reusable UI components
- `src/pages`: Page components
- `src/stores`: Zustand stores
- `src/types`: TypeScript interfaces and types
- `src/utils`: Utility functions

## API Integration

The frontend communicates with the backend API through Axios. The base URL is configured in `src/utils/axios.ts`.

## Authentication

Authentication is handled using JWT tokens stored in localStorage. The auth state is managed by Zustand in `src/stores/authStore.ts`.
