import cors from "cors";
import express, {
    type NextFunction,
    type Request,
    type Response,
} from "express"
import helmet from "helmet";

export function createApp() {
      const app = express()

      app.disable("x-powered-by")

      app.use(helmet())
      app.use(cors())
      app.use(express.json({ limit: "100kb"}))

      app.get("/", (_request: Request , response:Response) => {
          response.status(200).json(
            {
                success: true,
                message: "linkedin profile extraction api is runninb"
            }
          )
      });

      app.use(
        (
           error: unknown,
           _request: Request,
           response: Response,
           _next: NextFunction
        ) => {
            console.error(error);

            response.status(500).json({
                success: false,
                error: {
                    code: "INTERNAL_SERVER_ERROR",
                    message: "An unexpected error occurred",
                },
            });
        },
      );

      return app;
}