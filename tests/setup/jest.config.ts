import type { Config } from "jest";
import nextJest from "next/jest.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../../");

const createJestConfig = nextJest({
  dir: projectRoot,
});

const config: Config = {
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  rootDir: projectRoot,
  setupFilesAfterEnv: [path.join(projectRoot, "tests/setup/jest.setup.ts")],
  moduleNameMapper: {
    "^@/(.*)$": path.join(projectRoot, "src/$1"),
  },
  testMatch: [
    "**/__tests__/**/*.test.[jt]s?(x)",
    "**/?(*.)+(spec|test).[jt]s?(x)",
  ],
  collectCoverageFrom: [
    "src/**/*.{js,jsx,ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/__tests__/**",
    "!src/**/test/**",
    "!src/test/**",
  ],
  coverageReporters: ["text", "json", "html", "lcov"],
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/.next/",
    "/out/",
    "/build/",
  ],
  testPathIgnorePatterns: ["/node_modules/", "/.next/"],
  transformIgnorePatterns: [
    "/node_modules/",
    "^.+\\.module\\.(css|sass|scss)$",
  ],
};

export default createJestConfig(config);
