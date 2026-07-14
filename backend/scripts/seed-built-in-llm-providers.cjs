const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey() {
  const secret =
    process.env.LLM_PROVIDER_SECRET ||
    process.env.DATABASE_URL ||
    "local-development-provider-secret";

  return crypto.createHash("sha256").update(secret).digest();
}

function encryptProviderSecret(secret) {
  if (!secret) {
    return "";
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

function maskProviderSecret(secret) {
  if (!secret) {
    return "";
  }

  if (secret.length <= 8) {
    return "********";
  }

  return `${secret.slice(0, 4)}...${secret.slice(-4)}`;
}

function buildProviderPayload(provider) {
  const apiKey = provider.apiKey || "";

  const payload = {
    name: provider.name,
    type: provider.type,
    baseUrl: provider.baseUrl,
    defaultModel: provider.defaultModel,
    enabled: provider.enabled,
    capabilitiesJson: JSON.stringify(provider.capabilities),
    modelAliasesJson: JSON.stringify(provider.modelAliases),
  };

  if (apiKey) {
    payload.apiKeyEncrypted = encryptProviderSecret(apiKey);
    payload.apiKeyPreview = maskProviderSecret(apiKey);
  }

  return payload;
}

const builtInProviders = [
  {
    name: "Claude Built-in ENV",
    type: "anthropic",
    baseUrl: "https://api.anthropic.com",
    apiKey: process.env.ANTHROPIC_API_KEY || "",
    defaultModel: process.env.ANTHROPIC_DEFAULT_MODEL || "claude-default",
    enabled: true,
    capabilities: ["chat", "reasoning", "coding", "writing", "bootstrap"],
    modelAliases: [
      {
        id: "claude-default",
        label: "Claude Default",
        mode: "auto",
      },
      {
        id: "claude-fast",
        label: "Claude Fast",
        mode: "fast",
      },
      {
        id: "claude-deep",
        label: "Claude Deep",
        mode: "deep",
      },
      {
        id: "claude-creative",
        label: "Claude Creative",
        mode: "creative",
      },
    ],
  },
  {
    name: "Gemini Built-in ENV",
    type: "google",
    baseUrl: "https://generativelanguage.googleapis.com",
    apiKey: process.env.GOOGLE_AI_API_KEY || "",
    defaultModel: process.env.GOOGLE_DEFAULT_MODEL || "gemini-default",
    enabled: true,
    capabilities: ["chat", "multimodal", "fast", "creative", "bootstrap"],
    modelAliases: [
      {
        id: "gemini-default",
        label: "Gemini Default",
        mode: "auto",
      },
      {
        id: "gemini-fast",
        label: "Gemini Fast",
        mode: "fast",
      },
      {
        id: "gemini-deep",
        label: "Gemini Deep",
        mode: "deep",
      },
      {
        id: "gemini-creative",
        label: "Gemini Creative",
        mode: "creative",
      },
    ],
  },
];

async function upsertBuiltInProvider(provider) {
  const existingProvider = await prisma.llmProvider.findUnique({
    where: {
      name: provider.name,
    },
  });

  const payload = buildProviderPayload(provider);

  if (existingProvider) {
    const updatePayload = {
      type: payload.type,
      baseUrl: payload.baseUrl,
      defaultModel: payload.defaultModel,
      enabled: payload.enabled,
      capabilitiesJson: payload.capabilitiesJson,
      modelAliasesJson: payload.modelAliasesJson,
    };

    if (payload.apiKeyEncrypted && payload.apiKeyPreview) {
      updatePayload.apiKeyEncrypted = payload.apiKeyEncrypted;
      updatePayload.apiKeyPreview = payload.apiKeyPreview;
    }

    const updatedProvider = await prisma.llmProvider.update({
      where: {
        id: existingProvider.id,
      },
      data: updatePayload,
    });

    console.log(
      `[UPDATED] ${updatedProvider.name} -> ${updatedProvider.type} (${updatedProvider.enabled ? "enabled" : "disabled"})`
    );

    return;
  }

  const createdProvider = await prisma.llmProvider.create({
    data: {
      ...payload,
      apiKeyEncrypted: payload.apiKeyEncrypted || null,
      apiKeyPreview: payload.apiKeyPreview || null,
    },
  });

  console.log(
    `[CREATED] ${createdProvider.name} -> ${createdProvider.type} (${createdProvider.enabled ? "enabled" : "disabled"})`
  );
}

async function main() {
  console.log("");
  console.log("===============================================");
  console.log(" SEED BUILT-IN LLM PROVIDERS INTO REGISTRY");
  console.log("===============================================");
  console.log("");

  for (const provider of builtInProviders) {
    await upsertBuiltInProvider(provider);
  }

  const providers = await prisma.llmProvider.findMany({
    orderBy: [
      {
        enabled: "desc",
      },
      {
        name: "asc",
      },
    ],
  });

  console.log("");
  console.log("Current dynamic provider registry:");

  for (const provider of providers) {
    console.log(
      `- ${provider.name} | ${provider.type} | ${provider.enabled ? "enabled" : "disabled"} | ${provider.apiKeyPreview || "no-key"}`
    );
  }

  console.log("");
  console.log("[OK] Built-in LLM providers seeded into registry.");
  console.log("");
}

main()
  .catch((error) => {
    console.error("[ERROR] Failed to seed built-in LLM providers:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });