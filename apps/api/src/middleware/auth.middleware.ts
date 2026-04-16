import { NextFunction, Request, Response } from "express";
import { verifyJwt } from "../services/auth.service";
import { HttpError } from "../utils/http-error";

export const requireAuth = async (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    next(new HttpError(401, "Missing bearer token"));
    return;
  }

  try {
    req.auth = await verifyJwt(authHeader.slice(7));
    next();
  } catch (error) {
    next(error);
  }
};

export const requireAdmin = (req: Request, _res: Response, next: NextFunction) => {
  if (req.auth?.role !== "ADMIN") {
    next(new HttpError(403, "Admin access required"));
    return;
  }
  next();
};

