import { loadSkillForAgent } from "../skills/skillLoader";

export async function runDesignAgent(userMessage: string): Promise<string> {
  const skillInstruction = await loadSkillForAgent(
    "design-agent",
    "generate_ad_copy"
  );

  return `Ini jawaban sementara dari design-agent.

Skill yang dipakai:
${skillInstruction}

Request kamu:
"${userMessage}"

Contoh output:
1. Sepatu ringan, langkah makin kencang. Rasakan lari yang lebih nyaman setiap hari. Beli sekarang.
2. Temani setiap kilometer dengan sepatu yang responsif dan nyaman. Mulai perjalanan larimu hari ini.
3. Lari lebih jauh tanpa rasa berat. Pilih sepatu yang mendukung performamu sekarang.`;
}