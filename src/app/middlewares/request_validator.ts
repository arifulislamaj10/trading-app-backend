import { NextFunction, Request, Response } from "express";

const RequestValidator = (schema: any) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Swagger and some clients POST with no body — express leaves req.body undefined
      const parsed = await schema.parseAsync(req.body ?? {});
      req.body = parsed;
      next();
    } catch (err) {
      next(err);
    }
  };
};

export default RequestValidator;
