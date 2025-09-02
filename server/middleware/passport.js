import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

// Local login (email + password)
passport.use(
  new LocalStrategy(
    { usernameField: "email", passwordField: "password", session: false },
    async (email, password, done) => {
      try {
        const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
        if (!user) return done(null, false, { message: "INVALID_CREDENTIALS" });
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return done(null, false, { message: "INVALID_CREDENTIALS" });
        return done(null, user);
      } catch (e) {
        done(e);
      }
    }
  )
);

// JWT guard
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET
    },
    async (payload, done) => {
      try {
        const user = await User.findOne({ _id: payload.sub, isActive: true });
        if (!user) return done(null, false);
        return done(null, { id: user._id, role: user.role, organizationId: user.organizationId, email: user.email, name: user.name });
      } catch (e) {
        done(e, false);
      }
    }
  )
);

export const requireJwt = passport.authenticate("jwt", { session: false });
export const requireLocal = passport.authenticate("local", { session: false });

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: "FORBIDDEN" });
    next();
  };
}