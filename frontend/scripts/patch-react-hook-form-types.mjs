/* global console, process */

import { copyFile, mkdir, readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(scriptDir, "../node_modules/react-hook-form");
const packageJsonPath = path.join(packageRoot, "package.json");
const distDir = path.join(packageRoot, "dist");
const srcDir = path.join(packageRoot, "src");

async function copyDeclarations(fromDir, toDir) {
  const entries = await readdir(fromDir, { withFileTypes: true });
  await mkdir(toDir, { recursive: true });

  await Promise.all(
    entries.map(async (entry) => {
      const sourcePath = path.join(fromDir, entry.name);
      const targetPath = path.join(toDir, entry.name);

      if (entry.isDirectory()) {
        await copyDeclarations(sourcePath, targetPath);
        return;
      }

      if (entry.isFile() && entry.name.endsWith(".d.ts")) {
        await copyFile(sourcePath, targetPath);
      }
    })
  );
}

async function patchReactHookFormTypes() {
  if (!existsSync(packageJsonPath) || !existsSync(distDir)) {
    return;
  }

  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  if (packageJson.name !== "react-hook-form") {
    return;
  }

  if (existsSync(path.join(srcDir, "index.d.ts"))) {
    return;
  }

  await copyDeclarations(distDir, srcDir);
  console.log(
    "Patched react-hook-form declarations: copied missing src/*.d.ts files from dist."
  );
}

patchReactHookFormTypes().catch((error) => {
  console.error("Failed to patch react-hook-form declarations.");
  console.error(error);
  process.exitCode = 1;
});
