# Scheduling of Care Program

A cloud-based care management system designed to support people with special needs, their families, and care service providers. This application enables structured scheduling of care activities, budget tracking, shift management, and secure access control across multiple stakeholders.

## 📋 Overview

The Scheduling of Care Program addresses a critical need in care management by providing:

- **Structured Care Scheduling**: Manage recurring and one-off care activities with flexible scheduling patterns
- **Hierarchical Budget Management**: Track expenses at multiple levels (annual plans → categories → individual care items)
- **Role-Based Access Control**: Secure permissions for family members, care managers, and staff
- **Comprehensive Documentation**: Upload receipts, reports, and photographs linked to care activities
- **Shift Management**: Schedule and track staff assignments across different time periods
- **Budget Alerts**: Automatic notifications and email sending when particular budget thresholds are reached

**Developed by:** The **4V1C Team** (Team 81) as part of the **COMP30022 IT PROJECT** capstone subject for the **Computing and Software Systems Major**

## 1. Technology Stack

**Frontend:**

- React 19 with Vite for fast development and optimized builds
- React Router for navigation
- FullCalendar for interactive scheduling views
- Axios for API communication

**Backend:**

- Node.js 22.x runtime
- Express.js 5.x web framework
- Passport.js for authentication (JWT + Local strategies)
- Mongoose for MongoDB object modeling

**Database & Storage:**

- MongoDB 6.3+ with Mongoose ODM
- MongoDB Atlas for cloud database hosting
- Cloudinary for cloud file storage

**Development & Deployment:**

- Vitest for frontend testing
- Jest for backend testing
- GitHub Actions for CI/CD
- Heroku for application hosting

## 2. Key Features

### For Family Members & Power of Attorney:

- Full control over care plans and budget allocation
- Approve/revoke organization and carers access
- View all care activities and spending
- Create and modify budget plans

### For Care Managers:

- Manage care need items and categories
- Assign staff to shifts
- Monitor budget utilization
- Grant/revoke staff access

### For Care Staff:

- View assigned care tasks
- Complete tasks and record actual costs
- Upload receipts and documentation
- Add observations and comments
- Track daily shift assignments

## 2. Getting Started

### Prerequisites

Before running the application, ensure you have:

- **Node.js** (v22.x) - [Download](https://nodejs.org/)
- **npm** (v10.x or higher) - comes with Node.js
- **MongoDB** (v6.3+) - [Download](https://www.mongodb.com/try/download/community) or use MongoDB Atlas
- **Git** - [Download](https://git-scm.com/)

### Installation

1. **Clone the repository**

```bash
   git clone https://github.com/RonLuu/Scheduling-of-Care-Program.git
   cd Scheduling-of-Care-Program
```

2. **Install root dependencies**

```bash
   npm install
```

3. **Install server dependencies**

```bash
   cd server
   npm install
   cd ..
```

4. **Install client dependencies**

```bash
   cd client
   npm install
   cd ..
```

### Environment Configuration

1. **Copy the environment template**

```bash
   cp server/.env.example server/.env
```

2. **Edit `server/.env` with your configuration**

   **Required Variables:**

```bash
   # Database Connection
   MONGODB_URI_LOCAL=mongodb://127.0.0.1:27017/care_scheduler
   MONGODB_URI=mongodb+srv://:@cluster.mongodb.net/

   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # Authentication
   JWT_SECRET=your-secure-secret-change-in-production
   TOKEN_PEPPER=your-token-pepper-change-in-production

   # File Storage (Cloudinary)
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   CLOUDINARY_FOLDER_PREFIX=dev

   # Email Configuration (Optional)
   EMAIL_SERVICE=gmail
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   EMAIL_FROM="Schedule of Care "

   # Application URL
   APP_URL=http://localhost:3000
```

**Important Security Notes:**

- Use strong, randomly generated secrets for production
- Restrict database access to specific IP addresses
- Use Gmail App Passwords (not regular passwords) for email

### Running the Application

**Development Mode (Recommended for local development):**

```bash
# From the root directory
npm run dev
```

This command starts:

- Backend server on `http://localhost:3000`
- Frontend dev server on `http://localhost:5173` (with hot-reload)
- Backend proxies frontend requests during development

**Access the application:**

- Open browser to `http://localhost:3000`
- API endpoints available at `http://localhost:3000/api/*`

**Production Mode:**

```bash
# Build the frontend
cd client
npm run build
cd ..

# Start the production server
npm start
```

## 3. Project Structure

```
scheduling-of-care/
├── .github/workflows/       # CI/CD pipelines (GitHub Actions)
├── client/                  # Frontend React application
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── dashboard/   # Main application UI
│   │   │   │   ├── pages/   # Page components
│   │   │   │   ├── hooks/   # Custom React hooks
│   │   │   ├── login/       # Login interface
│   │   │   └── register/    # Registration interface
│   │   ├── App.jsx          # Main app component with routing
│   │   └── main.jsx         # React entry point
│   ├── public/              # Static assets
│   └── package.json         # Frontend dependencies
├── server/                  # Backend Express API
│   ├── middleware/          # Authentication & validation
│   ├── models/              # Mongoose schemas
│   ├── routes/              # API endpoint handlers
│   ├── utils/               # Helper functions
│   ├── index.js             # Server entry point
│   └── package.json         # Backend dependencies
├── package.json             # Root project configuration
├── Procfile                 # Heroku deployment config
└── README.md                # This file
```

## 4. API Endpoints

**Authentication:**

- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/refresh` - Refresh authentication token

**Users & Organizations:**

- `GET /api/users` - List users
- `POST /api/users` - Create user
- `GET /api/organizations` - List organizations
- `POST /api/organizations` - Create organization

**Care Management:**

- `GET /api/care-tasks` - List care tasks
- `POST /api/care-tasks` - Create care task
- `PUT /api/care-tasks/:id` - Update care task (including completion)
- `DELETE /api/care-tasks/:id` - Delete care task

**Budget Management:**

- `GET /api/budget-plans` - List budget plans
- `POST /api/budget-plans` - Create budget plan
- `GET /api/budget-plans/:id/report` - Generate budget report

**File Management:**

- `POST /api/file-upload/upload` - Upload file (receipt, photo, document)
- `GET /api/file-upload/:id` - Retrieve file metadata
- `DELETE /api/file-upload/:id` - Delete file

See `server/routes/` directory for complete API documentation.

## 5. Testing

**Frontend Tests:**

```bash
cd client
npm test
```

**Backend Tests:**

```bash
cd server
npm test
```

**Run All Tests with Coverage:**

```bash
# Frontend
cd client
npm test -- --coverage

# Backend
cd server
npm test -- --coverage
```

## 6. Deployment

### Heroku Deployment

1. **Create Heroku app**

```bash
   heroku create your-app-name
```

2. **Add MongoDB Atlas add-on or configure external database**

```bash
   heroku addons:create mongolab
```

3. **Set environment variables**

```bash
   heroku config:set NODE_ENV=production
   heroku config:set MONGODB_URI=your-atlas-connection-string
   heroku config:set JWT_SECRET=your-production-secret
   heroku config:set CLOUDINARY_CLOUD_NAME=your-cloud-name
   # ... set all other required variables
```

4. **Deploy**

```bash
   git push heroku main
```

5. **Open application**

```bash
   heroku open
```

**Automated Deployment:**

The project includes GitHub Actions workflows for automated deployment:

- Pull request review apps
- Staging environment deployment
- Production deployment (manual approval required)

See `.github/workflows/` for configuration details.

## 7. Security Considerations

- All passwords are hashed using bcrypt before storage
- JWT tokens expire after 24 hours
- Role-based access control restricts data access
- Input validation on all API endpoints
- CORS configured for specific origins in production
- File uploads restricted by type and size
- Environment variables keep secrets out of code

**For Production:**

- Use strong, randomly generated secrets (minimum 32 characters)
- Enable MongoDB Atlas IP whitelist
- Configure HTTPS/TLS certificates
- Set up regular database backups
- Monitor application logs for suspicious activity

## 👥 User Roles & Permissions

| Role                        | Permissions                                                                  |
| --------------------------- | ---------------------------------------------------------------------------- |
| **Family**                  | Full control: add clients, manage budgets, grant access, view all data       |
| **Power of Attorney (PoA)** | Identical to 'Family'                                                        |
| **Manager**                 | Manage care plans, grant staff, access, allocate staff shifts, track budgets |
| **Carer (Staff)**           | Complete tasks, record costs, upload receipts, add comments                  |

## 8. Troubleshooting

**Database connection errors:**

- Verify MongoDB is running: `mongod --version`
- Check connection string in `.env` file
- Ensure MongoDB Atlas IP whitelist includes your IP

**Port already in use:**

- Change `PORT` in `server/.env` to a different number
- Kill process using port 3000: `lsof -ti:3000 | xargs kill`

**File upload errors:**

- Verify Cloudinary credentials in `.env`
- Check file size limits in `server/routes/fileUpload.js`
- Ensure `server/public/uploads/` directory exists

**Authentication issues:**

- Clear browser localStorage and cookies
- Verify `JWT_SECRET` is set in `.env`
- Check token expiration time

## 9. Documentation

**Additional documentation available:**

- **Handover Document**: Comprehensive guide for client and new developers
- **Database Schema**: Entity relationships and structure (`server/models/`)
- **API Documentation**: Endpoint specifications (see `server/routes/`)
- **Testing Guide**: Test coverage and writing new tests

## 10. Contributing

This project was developed as a university capstone project. For future development:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/an-amazing-feature`)
3. Commit your changes (`git commit -m 'Added an amazing feature'`)
4. Push to the branch (`git push origin feature/an-amazing-feature`)
5. Open a Pull Request

**Code Style:**

- Follow existing code patterns
- Use meaningful variable and function names
- Add comments for complex logic
- Write tests for new features
- Run linting before committing: `npm run lint`

## 11. License

This project was developed as part of COMP30022 IT Project Semester 2 2025 at the University of Melbourne.

**Copyright © 2025 4V1C Development Team (Team 81)**

The codebase and all associated intellectual property rights are transferred to the client upon project completion. Future use, modification, and distribution are at the client's discretion.

## 12. Development Team

**Team Members:**

- Ha Linh Nguyen (Product Owner, UI Designer)
- Trieu Khai Luu (Scum Master, Back-end Developer)
- Jingwen Yang (Full-stack developer, Requirement analysis)
- Phuong Trang Tran (Lead front-end developer, UI designer)
- Quy Trong Duc Tran (Lead back-end developer)

## 13. Support

For questions or issues with the application:

1. Check the Troubleshooting section above
2. Review the Handover Documentation
3. Contact the development team (contact details in handover document)

## 14. Acknowledgments

- **Peter Mansourian** - Our client, providing the project vision and domain expertise
- **Harry Wang** - Our tutor, academic supervision and guidance
- **University of Melbourne** - For the opportunity through COMP30022 IT Project

---

**Built with 💞 by the 4V1C Team**
