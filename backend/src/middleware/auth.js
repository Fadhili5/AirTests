import { createRemoteJWKSet, jwtVerify } from "jose";

let jwks;

export function authMiddleware(config) {
  if (config.auth.disabled) {
    return (_req, _res, next) => next();
  }

  jwks ||= createRemoteJWKSet(new URL(config.auth.jwksUri));

  return async (req, res, next) => {
    try {
      const header = req.headers.authorization || "";
      const token = header.startsWith("Bearer ") ? header.slice(7) : "";
      if (!token) {
        return res.status(401).json({ error: "Missing bearer token" });
      }

      await jwtVerify(token, jwks, {
        issuer: config.auth.issuer,
        audience: config.auth.audience,
      });
      next();
    } catch (error) {
      res.status(401).json({ error: "Invalid token", detail: error.message });
    }
  };
}
