import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const standaloneRoot = path.join(projectRoot, ".next", "standalone");

const copies = [
  {
    source: path.join(projectRoot, ".next", "static"),
    destination: path.join(standaloneRoot, ".next", "static"),
  },
  {
    source: path.join(projectRoot, "public"),
    destination: path.join(standaloneRoot, "public"),
  },
];

for (const { source, destination } of copies) {
  if (!existsSync(source)) {
    throw new Error(`Standalone source is missing: ${path.relative(projectRoot, source)}`);
  }

  rmSync(destination, { recursive: true, force: true });
  mkdirSync(path.dirname(destination), { recursive: true });
  cpSync(source, destination, { recursive: true });
}

const requiredOutputs = [standaloneRoot, ...copies.map(({ destination }) => destination)];

for (const output of requiredOutputs) {
  if (!existsSync(output)) {
    throw new Error(`Standalone output is missing: ${path.relative(projectRoot, output)}`);
  }
}

console.log("Standalone assets prepared successfully.");
