# 🏨 Hotel Booking System - Backend API

A modern and comprehensive hotel booking system backend API. Built with TypeScript, Express.js, MongoDB, and Redis technologies.

## 🌟 Features

### 🔐 Authentication & Authorization

- JWT-based authentication system
- Refresh token support
- Role-based authorization (Customer, Admin)
- Secure password hashing (bcrypt)

### 🏠 Room Management

- Comprehensive room information (category, bed type, amenities)
- Dynamic pricing system
- Room status tracking (Available, Occupied, Maintenance)
- Room filtering and search

### 📅 Booking System

- Booking creation and management
- Conflict prevention (with distributed locking)
- Booking status tracking
- Special requests management

### ⚡ Performance & Security

- Redis caching system
- Rate limiting
- CORS protection
- Helmet security middleware
- Input validation (Zod)

### 📊 Analytics & Reporting

- Booking statistics
- Room occupancy rates
- User activity tracking

## 🛠️ Technology Stack

| Technology     | Version | Description             |
| -------------- | ------- | ----------------------- |
| **Node.js**    | ≥18.0.0 | Runtime environment     |
| **TypeScript** | ^5.3.3  | Type-safe JavaScript    |
| **Express.js** | ^4.18.2 | Web framework           |
| **MongoDB**    | ^6.3.0  | NoSQL database          |
| **Redis**      | ^4.6.12 | Caching & session store |
| **JWT**        | ^9.0.2  | Authentication          |
| **Zod**        | ^3.22.4 | Schema validation       |
| **bcrypt**     | ^5.1.1  | Password hashing        |

## 🚀 Installation

### Prerequisites

- Node.js (v18.0.0 or higher)
- MongoDB (v5.0 or higher)
- Redis (v6.0 or higher)
- npm or yarn

### 1. Clone the Repository

```bash
git clone https://github.com/ismetcanbyk/Hotel-Booking-System-BE.git
cd Hotel-Booking-System-BE
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment File

```bash
cp example.env .env
```

Edit the `.env` file:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/hotel-booking-system
MONGODB_DB_NAME=hotel-booking-system

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_REFRESH_EXPIRES_IN=30d

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
REDIS_DB=0

# Security
BCRYPT_SALT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=http://localhost:3001,http://localhost:3000
CORS_CREDENTIALS=true
```

### 4. Run the Application

#### Development Mode

```bash
npm run dev
```

#### Production Mode

```bash
npm run build
npm start
```

## 📡 API Endpoints

### Base URL

```
http://localhost:3000/api
```

### 🔐 Authentication Endpoints

| Method | Endpoint         | Description         | Auth Required |
| ------ | ---------------- | ------------------- | ------------- |
| `POST` | `/auth/register` | User registration   | ❌            |
| `POST` | `/auth/login`    | User login          | ❌            |
| `GET`  | `/auth/me`       | Profile information | ✅            |

### 🏠 Room Endpoints

| Method   | Endpoint                     | Description            | Auth Required |
| -------- | ---------------------------- | ---------------------- | ------------- |
| `GET`    | `/rooms`                     | List all rooms         | ❌            |
| `GET`    | `/rooms/:id`                 | Room details           | ❌            |
| `GET`    | `/rooms/availability/search` | Search available rooms | ❌            |
| `POST`   | `/rooms`                     | Create new room        | ✅ (Admin)    |
| `PUT`    | `/rooms/:id`                 | Update room            | ✅ (Admin)    |
| `DELETE` | `/rooms/:id`                 | Delete room            | ✅ (Admin)    |

### 📅 Booking Endpoints

| Method | Endpoint                 | Description        | Auth Required |
| ------ | ------------------------ | ------------------ | ------------- |
| `GET`  | `/bookings`              | List bookings      | ✅            |
| `GET`  | `/bookings/:id`          | Booking details    | ✅            |
| `GET`  | `/bookings/user/:userId` | User bookings      | ✅            |
| `POST` | `/bookings`              | Create new booking | ✅            |
| `PUT`  | `/bookings/:id`          | Update booking     | ✅            |
| `PUT`  | `/bookings/:id/confirm`  | Confirm booking    | ✅ (Admin)    |
| `PUT`  | `/bookings/:id/cancel`   | Cancel booking     | ✅            |

## 📋 API Examples

### User Registration

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "password": "securePassword123",
    "phone": "+1234567890"
  }'
```

### Room Search

```bash
curl -X GET "http://localhost:3000/api/rooms/availability/search?checkInDate=2024-02-01&checkOutDate=2024-02-05&maxOccupancy=2"
```

### Create Booking

```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "roomId": "65abc123def456789012345",
    "checkInDate": "2024-02-01T14:00:00.000Z",
    "checkOutDate": "2024-02-05T11:00:00.000Z",
    "numberOfGuests": 2,
    "specialRequests": "Late check-in requested"
  }'
```

## 🏗️ Project Structure

```
src/
├── config/                 # Configuration files
│   ├── database.ts         # MongoDB connection
│   ├── environment.ts      # Environment variables
│   └── redis.ts           # Redis connection
├── controllers/           # Route controllers
│   ├── authController.ts  # Authentication logic
│   ├── bookingController.ts # Booking logic
│   └── roomController.ts  # Room logic
├── middleware/            # Express middlewares
│   ├── auth.ts           # Authentication middleware
│   └── errorHandler.ts   # Error handling
├── models/               # TypeScript interfaces
│   ├── Booking.ts       # Booking model & types
│   ├── Room.ts          # Room model & types
│   └── User.ts          # User model & types
├── routes/              # API route definitions
│   ├── auth.ts         # Authentication routes
│   ├── bookings.ts     # Booking routes
│   └── rooms.ts        # Room routes
├── services/           # Business logic
│   ├── bookingService.ts # Booking operations
│   ├── roomService.ts   # Room operations
│   └── userService.ts   # User operations
├── types/              # Global TypeScript types
│   └── index.ts
├── utils/              # Utility functions
│   ├── jwt.ts         # JWT utilities
│   ├── pagination.ts  # Pagination helpers
│   ├── password.ts    # Password utilities
│   ├── redisLock.ts   # Distributed locking
│   ├── response.ts    # Response helpers
│   └── validation.ts  # Validation utilities
├── validators/         # Input validation schemas
│   ├── auth.ts        # Auth validation
│   ├── booking.ts     # Booking validation
│   └── room.ts        # Room validation
└── index.ts           # Application entry point
```

## 🔧 Development Scripts

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Run in production mode
npm start

# Clean dist folder
npm run clean
```

## 🔒 Security Features

- **Rate Limiting**: API calls are limited
- **CORS**: Cross-origin requests are controlled
- **Helmet**: HTTP security headers
- **Input Validation**: Strong input validation with Zod
- **JWT Security**: Secure token-based authentication
- **Password Hashing**: Password security with bcrypt

## 🧪 Testing

```bash
# Test commands not yet configured
npm test
```

## 📈 Performance & Monitoring

### Cache Strategy

- Room availability status is cached with Redis
- Cache is automatically updated on booking changes

### Distributed Locking

- Prevents concurrent bookings for the same room
- Redis-based distributed lock system

## 📄 License

This project is licensed under the MIT License.

## 👨‍💻 Author

**İsmet Can Bıyık**

- GitHub: [@ismetcanbyk](https://github.com/ismetcanbyk)

⭐ If you like this project, please give it a star to support us!
