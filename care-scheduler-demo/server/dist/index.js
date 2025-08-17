import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import './security/auth.js';
import { tasks } from './routes/tasks.js';
import { auth } from './routes/auth.js';
const app = express();
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
// Session (dev-safe settings)
app.use(session({
    secret: process.env.SESSION_SECRET || 'devsecret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        sameSite: 'lax',
        secure: false // set true behind HTTPS in prod
    }
}));
app.use(passport.initialize());
app.use(passport.session());
app.use((req, _res, next) => {
    console.log('[REQ]', req.method, req.path);
    next();
});
// Routes
app.use('/auth', auth);
app.use('/api', tasks);
const PORT = 3000;
app.get('/', (req, res) => {
    res.send('Care Scheduler API is running. Try GET /api/my-tasks');
});
app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
