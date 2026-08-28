import {
  linkedinProfileSchema,
  scrapeProfileRequestSchema,
} from "../schemas/index.js";

const requestResult = scrapeProfileRequestSchema.safeParse({
  linkedinUrl: "https://www.linkedin.com/in/example-profile/",
});

if (!requestResult.success) {
  console.error("Request schema verification failed:");
  console.error(requestResult.error.flatten());
  process.exit(1);
}

const profileResult = linkedinProfileSchema.safeParse({
  profileUrl: "https://www.linkedin.com/in/example-profile/",
  publicIdentifier: "example-profile",

  firstName: "Example",
  lastName: "Person",
  fullName: "Example Person",

  headline: "Software Engineer",
  about: null,
  location: "Bengaluru, Karnataka, India",

  profilePictureUrl: null,
  backgroundPictureUrl: null,

  followerCount: null,
  connectionCount: 500,

  currentCompany: "Example Company",

  experience: [],
  education: [],
  skills: [],
});

if (!profileResult.success) {
  console.error("Profile schema verification failed:");
  console.error(profileResult.error.flatten());
  process.exit(1);
}

console.log("Profile schemas are valid.");