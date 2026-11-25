import sharp from "sharp";
import path from "path";

const slozka = path.join(process.cwd(), "public", "badges");

for (let i = 1; i <= 7; i++) {
    const vstup = path.join(slozka, `vedouci-${i}.png`);
    const vystup = path.join(slozka, `vedouci-${i}-silueta.png`);

    await sharp(vstup)
        .ensureAlpha()
        .recomb([
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
        ])
        .png()
        .toFile(vystup);

    console.log(`Vytvořeno: vedouci-${i}-silueta.png`);
}
