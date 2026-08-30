import "dotenv/config"
import { z } from "zod";
import { tr } from "zod/locales";


function optionalSecretSchema(minimumLength: number){
    return z.preprocess(
         (value) => {
            if (typeof value !== "string"){
                return value;
            }

            const trimmedValue = value.trim();

            return trimmedValue.length === 0 ? undefined : trimmedValue;
         },

         z.string().min(minimumLength).optional(),
    );
}

const environmentSchema = z.object({
    NODE_ENV: z
       .enum(["development", "test", "production"])
       .default("development"),
    
    PORT: z.coerce.number().int().positive().max(65_535).default(3000),

    API_KEY: z.string().min(8, "API_KEY must contain at least 8 characters"),

    LOG_LEVEL: z
        .enum(["debug", "info", "warn", "error"])
        .default("info"),

    LINKEDIN_BASE_URL: z
                     .string()
                     .url()
                     .default("https://www.linkedin.com"),

    LINKEDIN_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(60_000).default(15_000),
    
    LINKEDIN_LI_AT: optionalSecretSchema(10),

    LINKEDIN_JSESSIONID: optionalSecretSchema(5),

    LINKEDIN_USER_AGENT : z.string().min(10).default(
       "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/150.0.0.0 Safari/537.36",
    ),

    LINKEDIN_LANGUAGE: z.string().regex(
         /^[a-z]{2}_[A-Z]{2}$/,
    "LINKEDIN_LANGUAGE must use a format such as en_US",
    )
    .default("en_US"),

    LINKEDIN_PROFILE_ENDPOINT_CONFIG_JSON: optionalSecretSchema(2),

    LINKEDIN_SKILLS_ENDPOINT_CONFIG_JSON: optionalSecretSchema(2),

    PROFILE_CACHE_TTL_MS: z.coerce.number().int().min(0).max(3_600_000).default(300_000),

    PROFILE_CACHE_MAX_ENTRIES: z.coerce.number().int().min(1).max(10_000).default(500),

    API_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1_000).max(3_600_000).default(60_000),

    API_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().min(1).max(10_000).default(60),

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
