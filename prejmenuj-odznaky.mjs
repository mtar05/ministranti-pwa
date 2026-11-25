import fs from "fs";
import path from "path";
import crypto from "crypto";

const slozka = path.join(process.cwd(), "public", "badges");

console.log("\n=== Zkopíruj tyto cesty do src/config/appConfig.ts ===\n");

for (let i = 1; i <= 7; i++) {
    const puvodni = path.join(slozka, `vedouci-${i}.png`);
    const puvodniSilueta = path.join(slozka, `vedouci-${i}-silueta.png`);
    const novaSiluetaNazev = `silueta-${i}.png`;
    const novaSilueta = path.join(slozka, novaSiluetaNazev);

    if (fs.existsSync(puvodniSilueta)) {
        fs.renameSync(puvodniSilueta, novaSilueta);
    }

    if (fs.existsSync(puvodni)) {
        const nahodnyHash = crypto.randomBytes(12).toString("hex");
        const novyNazev = `odznak-${i}-${nahodnyHash}.png`;
        fs.renameSync(puvodni, path.join(slozka, novyNazev));

        console.log(
            `Odznak ${i}:\n  obrazek: "/badges/${novyNazev}",\n  silueta: "/badges/${novaSiluetaNazev}",\n`,
        );
    }
}
