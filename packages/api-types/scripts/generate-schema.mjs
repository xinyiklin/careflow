import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const backendDirectory = fileURLToPath(
  new URL("../../../backend/", import.meta.url),
);
const schemaPath = fileURLToPath(
  new URL("../src/schema.yaml", import.meta.url),
);
const configuredPython = process.env.CAREFLOW_PYTHON || process.env.PYTHON;
const candidates = [
  configuredPython,
  path.join(backendDirectory, "venv", "bin", "python"),
  path.join(backendDirectory, "venv", "Scripts", "python.exe"),
  "python3",
  "python",
].filter(Boolean);

for (const python of candidates) {
  const isPath = path.isAbsolute(python) || python.includes(path.sep);
  const executable =
    isPath && !path.isAbsolute(python)
      ? path.resolve(backendDirectory, python)
      : python;
  if (isPath && !existsSync(executable)) continue;

  const result = spawnSync(
    executable,
    ["manage.py", "spectacular", "--file", schemaPath],
    {
      cwd: backendDirectory,
      stdio: "inherit",
    },
  );

  if (result.error?.code === "ENOENT") continue;
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}

throw new Error(
  "No usable Python interpreter was found. Set CAREFLOW_PYTHON to the project interpreter.",
);
