import jwt from "jsonwebtoken";

export function signSession(user) {
  // keep payload shape IDENTICAL to what your passport-jwt strategy expects
  // most setups expect { id: user._id }
  const payload = { id: user._id.toString() };
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
}
