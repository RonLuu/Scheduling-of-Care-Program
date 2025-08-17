import { Router } from 'express';
import passport from 'passport';
import bcrypt from 'bcrypt';
import { repo } from '../db/repo.js';
export const auth = Router();
auth.post('/signup', async (req, res) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password)
        return res.status(400).json({ error: 'Missing fields' });
    const roleOk = ['ADMIN', 'STAFF', 'READONLY'].includes(role);
    if (!roleOk)
        return res.status(400).json({ error: 'Invalid role' });
    const existing = await repo.getUserByEmail(email);
    if (existing)
        return res.status(409).json({ error: 'Email already in use' });
    const hash = await bcrypt.hash(password, 10);
    const id = await repo.createUser({ name, email, role, password_hash: hash });
    res.json({ id });
});
auth.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err)
            return next(err);
        if (!user)
            return res.status(401).json({ error: info?.message || 'Login failed' });
        req.logIn(user, (err2) => {
            if (err2)
                return next(err2);
            res.json({ ok: true, user });
        });
    })(req, res, next);
});
auth.post('/logout', (req, res) => {
    req.logout(() => res.json({ ok: true }));
});
auth.get('/me', (req, res) => {
    res.json({ user: req.user ?? null });
});
