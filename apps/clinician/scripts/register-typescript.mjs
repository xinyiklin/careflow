import { registerHooks } from "node:module";

// Node's type stripper does not resolve Vite's extensionless TypeScript imports.
registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (error.code !== "ERR_MODULE_NOT_FOUND" || !specifier.startsWith("."))
        throw error;
      return nextResolve(`${specifier}.ts`, context);
    }
  },
});
