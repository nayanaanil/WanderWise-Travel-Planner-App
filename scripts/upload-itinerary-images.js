import "dotenv/config";
import { put } from "@vercel/blob";
import fs from "fs";
import path from "path";

const ROOT = path.resolve(
  process.env.ITINERARY_IMAGE_ROOT || "../Travel-Planner/public/itinerary-images-backup"
);

async function uploadFolder(folderPath, prefix) {
  const files = fs.readdirSync(folderPath);

  for (const file of files) {
    if (!file.endsWith(".jpg")) continue;

    const filePath = path.join(folderPath, file);
    const blobPath = `${prefix}/${file}`;
    const buffer = fs.readFileSync(filePath);

    const blob = await put(blobPath, buffer, {
      access: "public",
      contentType: "image/jpeg",
      allowOverwrite: true,
    });

    console.log(`${blobPath} → ${blob.url}`);
  }
}

async function run() {
  const MODE = process.env.UPLOAD_MODE || "all";
  // "all" | "themes" | "countries"

  const topLevelEntries = fs.readdirSync(ROOT);

  for (const entry of topLevelEntries) {
    const entryPath = path.join(ROOT, entry);
    if (!fs.statSync(entryPath).isDirectory()) continue;

    // THEMES ONLY MODE
    if (MODE === "themes" && entry !== "_themes") continue;

    // COUNTRIES ONLY MODE
    if (MODE === "countries" && entry === "_themes") continue;

    if (entry === "_themes") {
      const themeFolders = fs.readdirSync(entryPath);

      for (const themeFolder of themeFolders) {
        const themePath = path.join(entryPath, themeFolder);
        if (!fs.statSync(themePath).isDirectory()) continue;

        await uploadFolder(themePath, `_themes/${themeFolder}`);
      }
    } else {
      await uploadFolder(entryPath, entry);
    }
  }
}

run().catch(console.error);
