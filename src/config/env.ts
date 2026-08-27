import "dotenv/config"
import { z } from "zod";

const environmentSchema = z.object({
    NODE_ENV: z
       .enum(["development", "test", "production"])
       .default("development"),
    
    PORT: z.coerce.number().int().positive().max(65_535).default(3000),

    API_KEY: z.string().min(8, "API_KEY must contain at least 8 characters"),

    LOG_LEVEL: z
        .enum(["debug", "info", "warn", "error"])
        .default("info"),
});


const validationResult = environmentSchema.safeParse(process.env);

if(!validationResult.success) {
    console.error("Invalid environment configuration:");

    for (const issue of validationResult.error.issues) {
         const variableName = issue.path.join(".") || "unknown";

         console.error(`- ${variableName}: ${issue.message}`);
    }

    throw new Error("Environment validation failed");
}

export const env = validationResult.data;

export type Environment = z.infer<typeof environmentSchema>;