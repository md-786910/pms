# Project Management System (PMS)

A full-stack project management application built with React, Node.js, Express, and MongoDB. This system provides comprehensive project and task management capabilities with user authentication, role-based access control, and real-time notifications.

## Features

### 🔐 Authentication & User Management
- JWT-based authentication
- User registration and login
- Password reset via email
- Role-based access control (Admin/Member)
- User profile management

### 📋 Project Management
- Create, update, and delete projects
- Add/remove project members
- Project invitation system
- Project status tracking

### 📝 Task Management
- Kanban-style board with customizable columns
- Create, update, and delete cards/tasks
- Task assignment to team members
- Priority levels and due dates
- Comments and activity tracking

### 🔔 Notifications
- Real-time notifications
- Email notifications for important events
- Project invitations
- Task assignments and updates

### 📧 Email Integration
- Welcome emails for new users
- Password reset emails
- Project invitation emails
- Task assignment notifications

## Tech Stack

### Frontend
- React 18
- React Router
- Axios for API calls
- Lucide React for icons
- Tailwind CSS for styling

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT for authentication
- Bcrypt for password hashing
- Nodemailer for email functionality

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud)
- npm or yarn

## Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd PMS
```

### 2. Backend Setup

```bash
cd server
npm install
```

Create a `.env` file in the server directory:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/pms
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d
EMAIL_USER=example@gmail.com
EMAIL_PASS=your password
CLIENT_URL=http://localhost:3000
```

### 3. Frontend Setup

```bash
cd client
npm install
```

Create a `.env` file in the client directory:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

### 4. Database Setup

Run the database seeder to create default admin user and sample data:

```bash
cd server
npm run seed
```

This will create:
- Admin user: `admin@pms.com` / `admin123`
- Member user: `john@pms.com` / `member123`
- Sample project with cards and notifications

### 5. Start the Application

#### Start the Backend Server
```bash
cd server
npm run dev:env
```

#### Start the Frontend (in a new terminal)
```bash
cd client
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `POST /api/auth/refresh-token` - Refresh JWT token
- `POST /api/auth/logout` - User logout

### Users
- `GET /api/users` - Get all users (Admin only)
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create user (Admin only)
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (Admin only)
- `POST /api/users/:id/reset-password` - Reset user password (Admin only)

### Projects
- `GET /api/projects` - Get user's projects
- `GET /api/projects/:id` - Get project details
- `POST /api/projects` - Create new project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `POST /api/projects/:id/members` - Add project member
- `DELETE /api/projects/:id/members/:memberId` - Remove project member

### Cards
- `GET /api/projects/:projectId/cards` - Get project cards
- `GET /api/cards/:id` - Get card details
- `POST /api/cards` - Create new card
- `PUT /api/cards/:id` - Update card
- `DELETE /api/cards/:id` - Delete card
- `PUT /api/cards/:id/status` - Update card status
- `POST /api/cards/:id/assign` - Assign user to card
- `DELETE /api/cards/:id/assign/:userId` - Unassign user from card
- `POST /api/cards/:id/comments` - Add comment to card
- `DELETE /api/cards/:id/comments/:commentId` - Delete comment

### Notifications
- `GET /api/notifications` - Get user notifications
- `GET /api/notifications/unread-count` - Get unread count
- `PUT /api/notifications/:id/read` - Mark notification as read
- `PUT /api/notifications/mark-all-read` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification

## Default Credentials

After running the seeder, you can login with:

**Admin Account:**
- Email: `admin@pms.com`
- Password: `admin123`

**Member Account:**
- Email: `john@pms.com`
- Password: `member123`

## Project Structure

```
PMS/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── contexts/       # React contexts
│   │   ├── utils/          # Utility functions
│   │   └── App.js
│   └── package.json
├── server/                 # Node.js backend
│   ├── config/            # Configuration files
│   ├── controllers/       # Route controllers
│   ├── middleware/        # Custom middleware
│   ├── models/           # MongoDB models
│   ├── routes/           # API routes
│   ├── seeders/          # Database seeders
│   └── index.js
└── README.md
```

## Key Features Implementation

### Authentication Flow
1. User registers/logs in
2. JWT token is generated and stored in localStorage
3. Token is automatically attached to API requests
4. Token refresh mechanism for seamless experience

### Project Management
1. Users can create projects
2. Project owners can invite members via email
3. Members can view and work on assigned projects
4. Admin users can manage all projects

### Task Management
1. Kanban board with customizable columns
2. Drag-and-drop functionality for task status updates
3. Task assignment to team members
4. Comments and activity tracking
5. Due date management

### Notifications
1. Real-time notifications for project updates
2. Email notifications for important events
3. Notification management (mark as read, delete)

## Development

### Running Tests
```bash
# Backend tests
cd server
npm test

# Frontend tests
cd client
npm test
```

### Code Quality
The project follows standard coding practices:
- ESLint for code linting
- Prettier for code formatting
- Consistent naming conventions
- Proper error handling
- Input validation

## Deployment

### Backend Deployment
1. Set up MongoDB Atlas or local MongoDB
2. Configure environment variables
3. Deploy to platforms like Heroku, Railway, or AWS

### Frontend Deployment
1. Build the React app: `npm run build`
2. Deploy to platforms like Vercel, Netlify, or AWS S3

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support or questions, please contact the development team or create an issue in the repository.
