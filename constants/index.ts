// Tech name mappings for devicons
export const mappings = {
  javascript: "javascript",
  typescript: "typescript",
  react: "react",
  "next.js": "nextjs",
  nodejs: "nodejs",
  python: "python",
  java: "java",
  cpp: "cplusplus",
  csharp: "csharp",
  html: "html5",
  css: "css3",
  mongodb: "mongodb",
  mysql: "mysql",
  postgresql: "postgresql",
  docker: "docker",
  git: "git",
  aws: "amazonwebservices",
  azure: "azure",
  gcp: "googlecloud",
  linux: "linux",
  ubuntu: "ubuntu",
  windows: "windows",
  macos: "apple",
  android: "android",
  ios: "apple",
};

// Interview cover images
export const interviewCovers = [
  "/cover-1.png",
  "/cover-2.png", 
  "/cover-3.png",
  "/cover-4.png",
  "/cover-5.png",
];

// Interviewer configuration
export const interviewer = {
  id: "interviewer-001",
  name: "AI Interviewer",
  avatar: "/ai-avatar.png",
  role: "Senior Technical Interviewer",
  company: "Tech Corp",
  experience: "10+ years",
};

// Feedback schema for AI evaluation
export const feedbackSchema = {
  overallScore: {
    type: "number",
    min: 0,
    max: 100,
    description: "Overall performance score"
  },
  categories: {
    technical: { type: "number", min: 0, max: 100 },
    communication: { type: "number", min: 0, max: 100 },
    problemSolving: { type: "number", min: 0, max: 100 },
    confidence: { type: "number", min: 0, max: 100 }
  },
  strengths: {
    type: "array",
    items: { type: "string" }
  },
  improvements: {
    type: "array", 
    items: { type: "string" }
  }
};
