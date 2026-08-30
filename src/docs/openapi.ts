export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "LinkedIn Profile API",
    version: "1.0.0",
    description:
      "Direct HTTP API for retrieving normalized LinkedIn profile data from authorized internal endpoint captures.",
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Local development",
    },
  ],
  tags: [
    {
      name: "Health",
    },
    {
      name: "Profiles",
    },
  ],
  paths: {
    "/api/v1/health": {
      get: {
        tags: ["Health"],
        summary: "Read service health",
        security: [],
        responses: {
          "200": {
            description: "Service is healthy",
            content: {
              "application/json": {
                example: {
                  success: true,
                  data: {
                    status: "healthy",
                    service: "linkedin-profile-api",
                    version: "1.0.0",
                    environment: "production",
                    uptimeSeconds: 42,
                    timestamp: "2026-08-30T00:00:00.000Z",
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/profiles/scrape": {
      post: {
        tags: ["Profiles"],
        summary: "Retrieve and normalize a LinkedIn member profile",
        security: [
          {
            ApiKeyAuth: [],
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ScrapeProfileRequest",
              },
              example: {
                linkedinUrl:
                  "https://www.linkedin.com/in/example-profile/",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Profile was retrieved and normalized",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ScrapeProfileResponse",
                },
                example: {
                  success: true,
                  data: {
                    profileUrl:
                      "https://www.linkedin.com/in/example-profile/",
                    publicIdentifier: "example-profile",
                    firstName: "Example",
                    lastName: "Person",
                    fullName: "Example Person",
                    headline: "Synthetic Product Engineering Lead",
                    about:
                      "Synthetic profile summary for documentation.",
                    location: "Example City, Example Region",
                    profilePictureUrl: null,
                    backgroundPictureUrl: null,
                    followerCount: 1234,
                    connectionCount: 500,
                    currentCompany: "Example Systems",
                    experience: [],
                    education: [],
                    skills: [],
                  },
                  meta: {
                    scrapedAt: "2026-08-30T00:00:00.000Z",
                    cached: false,
                  },
                },
              },
            },
          },
          "400": {
            $ref: "#/components/responses/ValidationError",
          },
          "401": {
            $ref: "#/components/responses/UnauthorizedError",
          },
          "404": {
            $ref: "#/components/responses/NotFoundError",
          },
          "429": {
            $ref: "#/components/responses/RateLimitError",
          },
          "502": {
            $ref: "#/components/responses/UpstreamError",
          },
          "503": {
            $ref: "#/components/responses/ServiceUnavailableError",
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "X-API-Key",
      },
    },
    schemas: {
      ScrapeProfileRequest: {
        type: "object",
        additionalProperties: false,
        required: ["linkedinUrl"],
        properties: {
          linkedinUrl: {
            type: "string",
            format: "uri",
            example: "https://www.linkedin.com/in/example-profile/",
          },
        },
      },
      DateRange: {
        type: "object",
        required: [
          "startMonth",
          "startYear",
          "endMonth",
          "endYear",
          "isCurrent",
        ],
        properties: {
          startMonth: {
            type: ["integer", "null"],
            minimum: 1,
            maximum: 12,
          },
          startYear: {
            type: ["integer", "null"],
          },
          endMonth: {
            type: ["integer", "null"],
            minimum: 1,
            maximum: 12,
          },
          endYear: {
            type: ["integer", "null"],
          },
          isCurrent: {
            type: "boolean",
          },
        },
      },
      Experience: {
        type: "object",
        required: [
          "title",
          "companyName",
          "companyLinkedinUrl",
          "companyLogoUrl",
          "employmentType",
          "location",
          "description",
          "dateRange",
        ],
        properties: {
          title: {
            type: ["string", "null"],
          },
          companyName: {
            type: ["string", "null"],
          },
          companyLinkedinUrl: {
            type: ["string", "null"],
            format: "uri",
          },
          companyLogoUrl: {
            type: ["string", "null"],
            format: "uri",
          },
          employmentType: {
            type: ["string", "null"],
          },
          location: {
            type: ["string", "null"],
          },
          description: {
            type: ["string", "null"],
          },
          dateRange: {
            $ref: "#/components/schemas/DateRange",
          },
        },
      },
      Education: {
        type: "object",
        required: [
          "collegeName",
          "collegeLinkedinUrl",
          "collegeLogoUrl",
          "degreeName",
          "fieldOfStudy",
          "grade",
          "description",
          "dateRange",
        ],
        properties: {
          collegeName: {
            type: ["string", "null"],
          },
          collegeLinkedinUrl: {
            type: ["string", "null"],
            format: "uri",
          },
          collegeLogoUrl: {
            type: ["string", "null"],
            format: "uri",
          },
          degreeName: {
            type: ["string", "null"],
          },
          fieldOfStudy: {
            type: ["string", "null"],
          },
          grade: {
            type: ["string", "null"],
          },
          description: {
            type: ["string", "null"],
          },
          dateRange: {
            $ref: "#/components/schemas/DateRange",
          },
        },
      },
      Skill: {
        type: "object",
        required: ["name", "endorsementCount"],
        properties: {
          name: {
            type: "string",
          },
          endorsementCount: {
            type: ["integer", "null"],
            minimum: 0,
          },
        },
      },
      LinkedinProfile: {
        type: "object",
        required: [
          "profileUrl",
          "publicIdentifier",
          "firstName",
          "lastName",
          "fullName",
          "headline",
          "about",
          "location",
          "profilePictureUrl",
          "backgroundPictureUrl",
          "followerCount",
          "connectionCount",
          "currentCompany",
          "experience",
          "education",
          "skills",
        ],
        properties: {
          profileUrl: {
            type: "string",
            format: "uri",
          },
          publicIdentifier: {
            type: "string",
          },
          firstName: {
            type: ["string", "null"],
          },
          lastName: {
            type: ["string", "null"],
          },
          fullName: {
            type: ["string", "null"],
          },
          headline: {
            type: ["string", "null"],
          },
          about: {
            type: ["string", "null"],
          },
          location: {
            type: ["string", "null"],
          },
          profilePictureUrl: {
            type: ["string", "null"],
            format: "uri",
          },
          backgroundPictureUrl: {
            type: ["string", "null"],
            format: "uri",
          },
          followerCount: {
            type: ["integer", "null"],
            minimum: 0,
          },
          connectionCount: {
            type: ["integer", "null"],
            minimum: 0,
          },
          currentCompany: {
            type: ["string", "null"],
          },
          experience: {
            type: "array",
            items: {
              $ref: "#/components/schemas/Experience",
            },
          },
          education: {
            type: "array",
            items: {
              $ref: "#/components/schemas/Education",
            },
          },
          skills: {
            type: "array",
            items: {
              $ref: "#/components/schemas/Skill",
            },
          },
        },
      },
      ScrapeProfileResponse: {
        type: "object",
        required: ["success", "data", "meta"],
        properties: {
          success: {
            type: "boolean",
            const: true,
          },
          data: {
            $ref: "#/components/schemas/LinkedinProfile",
          },
          meta: {
            type: "object",
            required: ["scrapedAt", "cached"],
            properties: {
              scrapedAt: {
                type: "string",
                format: "date-time",
              },
              cached: {
                type: "boolean",
              },
            },
          },
        },
      },
      ErrorResponse: {
        type: "object",
        required: ["success", "error"],
        properties: {
          success: {
            type: "boolean",
            const: false,
          },
          error: {
            type: "object",
            required: ["code", "message"],
            properties: {
              code: {
                type: "string",
              },
              message: {
                type: "string",
              },
              details: {},
            },
          },
        },
      },
    },
    responses: {
      ValidationError: {
        description: "Request validation failed",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse",
            },
            example: {
              success: false,
              error: {
                code: "VALIDATION_ERROR",
                message: "Request validation failed",
              },
            },
          },
        },
      },
      UnauthorizedError: {
        description: "API key is missing or invalid",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse",
            },
            example: {
              success: false,
              error: {
                code: "UNAUTHORIZED",
                message: "A valid API key is required",
              },
            },
          },
        },
      },
      NotFoundError: {
        description: "LinkedIn profile was not found",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse",
            },
            example: {
              success: false,
              error: {
                code: "NOT_FOUND",
                message: "LinkedIn resource was not found",
              },
            },
          },
        },
      },
      RateLimitError: {
        description: "Rate limit was exceeded",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse",
            },
            example: {
              success: false,
              error: {
                code: "RATE_LIMIT_EXCEEDED",
                message: "API rate limit exceeded",
              },
            },
          },
        },
      },
      UpstreamError: {
        description: "LinkedIn upstream request failed",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse",
            },
            example: {
              success: false,
              error: {
                code: "SCRAPING_FAILED",
                message: "LinkedIn request failed",
              },
            },
          },
        },
      },
      ServiceUnavailableError: {
        description:
          "LinkedIn credentials, endpoint configuration, or rate capacity is unavailable",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse",
            },
            example: {
              success: false,
              error: {
                code: "LINKEDIN_AUTH_REQUIRED",
                message:
                  "LinkedIn authentication is required or has expired",
              },
            },
          },
        },
      },
    },
  },
} as const;
