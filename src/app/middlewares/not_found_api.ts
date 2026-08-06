import { Request, Response, NextFunction } from "express";

const notFound = (req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({
    message: "Sorry Route is not found!! 😴😴😴",
    success: false,
    error: "",
  });
};
export default notFound;
