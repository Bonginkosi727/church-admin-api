# Church Admin API

A TypeScript-based REST API for church administration system built with Express.js and Prisma.

## Features

- **Member Management**: CRUD operations for church members
- **Event Management**: Create and manage church events
- **Ministry Management**: Organize church ministries
- **Contribution Management**: Track financial contributions
- **Announcements**: Manage church announcements
- **Authentication**: Secure API endpoints with JWT

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database ORM**: Prisma
- **Authentication**: JWT
- **Validation**: Custom validation middleware
- **Logging**: Winston logger

## Project Structure

```
src/
├── controllers/        # Route controllers
├── middleware/         # Express middleware
├── routes/            # API route definitions
├── services/          # Business logic
├── repositories/      # Data access layer
├── types/             # TypeScript type definitions
├── utils/             # Utility functions
├── validation/        # Validation schemas
└── index.ts          # Application entry point
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Database (configured in Prisma schema)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Bonginkosi727/church-admin-api.git
cd church-admin-api
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```
Edit the `.env` file with your database connection and other configurations.

4. Generate Prisma client:
```bash
npx prisma generate
```

5. Run database migrations:
```bash
npx prisma migrate dev
```

### Development

Start the development server:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

Start production server:
```bash
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Members
- `GET /api/members` - Get all members
- `POST /api/members` - Create new member
- `GET /api/members/:id` - Get member by ID
- `PUT /api/members/:id` - Update member
- `DELETE /api/members/:id` - Delete member

### Events
- `GET /api/events` - Get all events
- `POST /api/events` - Create new event
- `GET /api/events/:id` - Get event by ID
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event

### Ministries
- `GET /api/ministries` - Get all ministries
- `POST /api/ministries` - Create new ministry
- `GET /api/ministries/:id` - Get ministry by ID
- `PUT /api/ministries/:id` - Update ministry
- `DELETE /api/ministries/:id` - Delete ministry

### Contributions
- `GET /api/contributions` - Get all contributions
- `POST /api/contributions` - Create new contribution
- `GET /api/contributions/:id` - Get contribution by ID
- `PUT /api/contributions/:id` - Update contribution
- `DELETE /api/contributions/:id` - Delete contribution

### Announcements
- `GET /api/announcements` - Get all announcements
- `POST /api/announcements` - Create new announcement
- `GET /api/announcements/:id` - Get announcement by ID
- `PUT /api/announcements/:id` - Update announcement
- `DELETE /api/announcements/:id` - Delete announcement

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
