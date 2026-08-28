import { z } from "zod";

export const dateRangeSchema = z.object({
   startMonth: z.number().int().min(1).max(12).nullable(),
   startYear: z.number().int().min(1900).max(2200).nullable(),
   endMonth: z.number().int().min(1).max(12).nullable(),
   endYear: z.number().int().min(1900).max(2200).nullable(),
   isCurrent: z.boolean(),
});

export const experienceSchema = z.object({
    title:         z.string().nullable(),
    companyName:   z.string().nullable(),
    companyLinkedinUrl: z.string().url().nullable(),
    companyLogoUrl: z.string().url().nullable(),
    empolymentType: z.string().nullable(),
    location: z.string().nullable(),
    description: z.string().nullable(),
    dataRange: dateRangeSchema,
})

export const educationSchema = z.object({
    collegeName: z.string().nullable(),
    collegeLinkedinUrl: z.string().url().nullable(),
    collegeLogoUrl: z.string().url().nullable(),
    degreeName: z.string().nullable(),
    fieldOfStudy: z.string().nullable(),
    grade: z.string().nullable(),
    description: z.string().nullable(),
    dateRange: dateRangeSchema
})

export const skillSchema = z.object({
    name: z.string().min(1),
    endorsementCount: z.number().int().nonnegative().nullable(),
})

export const linkedinProfileSchema = z.object({
    profileUrl: z.string().url(),
    publicIdentifier: z.string().min(1),

    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    fullName: z.string().nullable(),


    headline: z.string().nullable(),
    about: z.string().nullable(),
    location: z.string().nullable(),

    profilePictureUrl: z.string().url().nullable(),
    backgroundPictureUrl: z.string().url().nullable(),

    followerCount: z.number().int().nonnegative().nullable(),
    connectionCount: z.number().int().nonnegative().nullable(),

    currentCompany: z.string().nullable(),

    experience: z.array(experienceSchema),
    education: z.array(educationSchema),
    skills: z.array(skillSchema)
});


export const scrapeProfileRequestSchema = z
  .object({
    linkedinUrl: z
      .string({
        error: "linkedinUrl must be a string",
      })
      .trim()
      .min(1, "linkedinUrl is required")
      .max(500, "linkedinUrl must not exceed 500 characters"),
  })
  .strict();


export const scrapeProfileResponseSchema = z.object({
    success: z.literal(true),

    data: linkedinProfileSchema,

    meta: z.object({
        scrapedAt: z.string().datetime(),
        cached: z.boolean(),
    })
})


export type DateRange = z.infer<typeof dateRangeSchema>;
export type Experience = z.infer<typeof experienceSchema>;
export type Education = z.infer<typeof educationSchema>;
export type Skill = z.infer<typeof skillSchema>;
export type LinkedinProfile = z.infer<typeof linkedinProfileSchema>;
export type ScrapeProfileRequest = z.infer<
  typeof scrapeProfileRequestSchema
>;
export type ScrapeProfileResponse = z.infer<
  typeof scrapeProfileResponseSchema
>;