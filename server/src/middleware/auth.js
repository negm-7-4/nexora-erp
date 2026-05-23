import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "change-me-to-a-long-random-secret";

export function signToken(user) {
  return jwt.sign(
    {
      sub: String(user._id),
      email: user.email,
      tenantId: user.tenantId,
      isSuperAdmin: !!user.isSuperAdmin,
    },
    JWT_SECRET,
    { expiresIn: "30d" }
  );
}

// Requires a valid Bearer token. Attaches the decoded payload to req.user.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ success: false, error: "Missing auth token" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
}

// Requires the authenticated user to be the platform super admin.
export function requireSuperAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (!req.user.isSuperAdmin) {
      return res.status(403).json({ success: false, error: "Super admin access required" });
    }
    next();
  });
}
