import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { auditCatalog } from "./catalog-schema.js";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
export class PartsCatalog {
  constructor(file = path.join(ROOT, "data", "parts_catalog.json")) {
    this.file = file;
    this.data = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!Array.isArray(this.data.parts))
      throw new Error("Catálogo inválido: parts deve ser uma lista.");
    this.audit = auditCatalog(this.data);
    if (this.audit.error_count)
      throw new Error(
        `Catálogo inválido: ${this.audit.error_count} falhas obrigatórias.`,
      );
  }
  get parts() {
    return this.data.parts;
  }
  byCategory(category) {
    return this.parts.filter((part) => part.category === category);
  }
  get(id) {
    return this.parts.find((part) => part.id === id) ?? null;
  }
}
