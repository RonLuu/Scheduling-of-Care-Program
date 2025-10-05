# Scheduling-of-Care-Program

A group project for COMP30022

A MERN stack application (MongoDB, Express, React, Node.js) with a Vite-powered React frontend.  
This project provides scheduling and management features for care tasks.

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- npm (comes with Node.js)
- MongoDB (local installation or [MongoDB Atlas](https://www.mongodb.com/atlas))

---

Environment Variables
Create .env files as follows:

Server (server/.env):

```bash
MONGODB_URI_LOCAL=mongodb://127.0.0.1:27017/care_scheduler
MONGODB_URI=mongodb+srv://<username>:<password>@careschedulercluster.sk0cdgk.mongodb.net/?retryWrites=true&w=majority&appName=CareSchedulerCluster
PORT=3000
JWT_SECRET=dev-secret-change-me
TOKEN_PEPPER=dev-pepper-change-me
NODE_ENV=development
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx
```

---

### Run the App

**In the root folder**

```bash
npm install
npm run dev

UI: http://localhost:3000
API: http://localhost:3000/api/*

_______
```
