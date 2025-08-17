import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import { repo } from '../db/repo.js';
passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
    try {
        const user = await repo.getUserByEmail(email);
        if (!user)
            return done(null, false, { message: 'No user' });
        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok)
            return done(null, false, { message: 'Wrong password' });
        // Keep user object small in session
        return done(null, { id: user.id, name: user.name, email: user.email, role: user.role });
    }
    catch (e) {
        return done(e);
    }
}));
passport.serializeUser((user, done) => done(null, user.id));
// passport.deserializeUser(async (id: number, done) => {
//   try {
//     const user = await repo.getUserById(id);
//     if (!user) return done(null, false);
//     done(null, { id: user.id, name: user.name, email: user.email, role: user.role });
//   } catch (e) { done(e); }
// });
passport.deserializeUser(async (id, done) => {
    const user = await repo.getUserById(id); // returns {id,name,email,role}
    if (!user)
        return done(null, false);
    done(null, user);
});
export function ensureAuth(req, res, next) {
    if (req.isAuthenticated && req.isAuthenticated())
        return next();
    res.status(401).json({ error: 'Not authenticated' });
}
export function requireRole(...roles) {
    return (req, res, next) => {
        const role = req.user?.role;
        if (!role)
            return res.status(401).json({ error: 'Not authenticated' });
        if (!roles.includes(role))
            return res.status(403).json({ error: 'Forbidden' });
        next();
    };
}
