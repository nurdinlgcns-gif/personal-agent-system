import dotenv from "dotenv";

dotenv.config();

function requiredEnv(key: string): string {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required env: ${key}`);
  }

  return value;
}

function optionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

export const env = {
  PORT: optionalEnv("PORT", "3000"),

  DATABASE_URL: requiredEnv("DATABASE_URL"),

  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "",

  ALLOWED_WA_NUMBERS: optionalEnv("ALLOWED_WA_NUMBERS", "")
    .split(",")
    .map((number) => number.trim())
    .filter(Boolean),

  PROCESS_FROM_ME: optionalEnv("PROCESS_FROM_ME", "false") === "true",

  WA_MAX_REQUEST_PER_MINUTE: Number(
    optionalEnv("WA_MAX_REQUEST_PER_MINUTE", "5")
  ),
};

export function validateEnv() {
  console.log("[ENV] Environment loaded");

  if (env.ALLOWED_WA_NUMBERS.length === 0) {
    console.log("[ENV] Warning: ALLOWED_WA_NUMBERS kosong");
  }

  if (!env.ANTHROPIC_API_KEY) {
    console.log("[ENV] Warning: ANTHROPIC_API_KEY kosong, agent masih dummy mode");
  }
}