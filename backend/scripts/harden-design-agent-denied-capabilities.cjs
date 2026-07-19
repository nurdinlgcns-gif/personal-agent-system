const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function safeJsonParse(value, fallback) {
    if (!value) {
        return fallback;
    }

    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : fallback;
    } catch {
        return fallback;
    }
}

function uniqueMerge(existing, additions) {
    return Array.from(
        new Set(
            [...existing, ...additions]
                .map((item) => String(item).trim())
                .filter(Boolean)
        )
    );
}

async function main() {
    console.log("");
    console.log("===============================================");
    console.log(" HARDEN DESIGN AGENT DENIED CAPABILITIES");
    console.log("===============================================");
    console.log("");

    const agentName = "design-agent";

    const contract = await prisma.agentCapabilityContract.findUnique({
        where: {
            agentName,
        },
    });

    if (!contract) {
        console.log(`[ERROR] Contract not found for ${agentName}`);
        process.exitCode = 1;
        return;
    }

    const deniedDomains = safeJsonParse(contract.deniedDomainsJson, []);
    const deniedKeywords = safeJsonParse(contract.deniedKeywordsJson, []);

    const nextDeniedDomains = uniqueMerge(deniedDomains, [
        "image_generation",
        "visual_generation",
        "3d_rendering",
        "asset_generation",
        "image_editing",
    ]);

    const nextDeniedKeywords = uniqueMerge(deniedKeywords, [
        "gambar",
        "buat gambar",
        "bikin gambar",
        "generate gambar",
        "hasilkan gambar",
        "create image",
        "generate image",
        "make image",
        "draw",
        "drawing",
        "illustration",
        "ilustrasi",
        "render",
        "3d",
        "isometric",
        "vehicle",
        "mobil",
        "motor",
        "visual",
        "poster visual",
        "image",
        "foto",
        "photo",
        "asset",
        "mockup",
    ]);

    const nextRefusalMessage =
        "Maaf, @design-agent belum punya capability untuk membuat atau menghasilkan gambar/visual. Saya bisa bantu untuk copywriting, caption, slogan, headline, CTA, atau kata-kata promosi. Untuk gambar/visual, coba arahkan ke @image-agent.";

    const updatedContract = await prisma.agentCapabilityContract.update({
        where: {
            agentName,
        },
        data: {
            deniedDomainsJson: JSON.stringify(nextDeniedDomains),
            deniedKeywordsJson: JSON.stringify(nextDeniedKeywords),
            refusalMessage: nextRefusalMessage,
            updatedAt: new Date(),
        },
    });

    console.log(`[OK] Updated contract: ${updatedContract.agentName}`);
    console.log("");
    console.log("Denied domains:");
    console.log(JSON.stringify(nextDeniedDomains, null, 2));
    console.log("");
    console.log("Denied keywords:");
    console.log(JSON.stringify(nextDeniedKeywords, null, 2));
    console.log("");
    console.log("[DONE] design-agent denied capability hardening completed.");
    console.log("");
}

main()
    .catch((error) => {
        console.error("[ERROR] Failed to harden design-agent contract:");
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
