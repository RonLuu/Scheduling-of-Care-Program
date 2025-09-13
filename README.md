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
PORT=3000
MONGO_URI=your-mongodb-connection-string
JWT_SECRET=your-secret-key
TOKEN_PEPPER=your-secret-token-pepper

Client (client/.env.local):
VITE_API_URL=http://localhost:3000

---

### Run the App

**In the root folder**

```bash
npm install
npm run start

UI: http://localhost:3000
API: http://localhost:3000/api/*

_______
```
