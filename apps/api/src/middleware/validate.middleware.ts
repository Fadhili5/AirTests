import { AnyZodObject } from "zod";
import { NextFunction, Request, Response } from "express";

export const validateBody =
  (schema: AnyZodObject) => (req: Request, _res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body);
    next();
  };

