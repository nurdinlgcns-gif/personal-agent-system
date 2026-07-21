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

function optionalBooleanEnv(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];

  if (!value) {
    return defaultValue;
  }

  return value === "true";
}

function optionalNumberEnv(key: string, defaultValue: number): number {
  const value = Number(process.env[key] || defaultValue);

  if (Number.isNaN(value)) {
    return defaultValue;
  }

  return value;
}

export const env = {
  PORT: optionalEnv("PORT", "3000"),

  DATABASE_URL: requiredEnv("DATABASE_URL"),

  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "",

  ALLOWED_WA_NUMBERS: optionalEnv("ALLOWED_WA_NUMBERS", "")
    .split(",")
    .map((number) => number.trim())
    .filter(Boolean),

  PROCESS_FROM_ME: optionalBooleanEnv("PROCESS_FROM_ME", false),

  WA_MAX_REQUEST_PER_MINUTE: optionalNumberEnv(
    "WA_MAX_REQUEST_PER_MINUTE",
    5
  ),

  WHATSAPP_ENABLED: optionalEnv("WHATSAPP_ENABLED", "true") !== "false",

  WHATSAPP_AUTH_DIR: optionalEnv("WHATSAPP_AUTH_DIR", "auth_info_baileys"),

  WHATSAPP_RECONNECT_DELAY_MS: optionalNumberEnv(
    "WHATSAPP_RECONNECT_DELAY_MS",
    3000
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

  if (!env.WHATSAPP_ENABLED) {
    console.log("[ENV] WhatsApp disabled by WHATSAPP_ENABLED=false");
  }
}