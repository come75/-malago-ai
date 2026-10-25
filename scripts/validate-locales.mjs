#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const localesDir = path.join(root, "locales");
const requiredLocales = ["en", "fr", "es", "de", "it", "nl", "ru", "pt", "ar", "zh"];
const strict = process.argv.includes("--strict-all-languages");

function flattenStrings(value, prefix = "", out = new Map()) {
  if (typeof value === "string") {
    if (!prefix) throw new Error("A translation string cannot be the root value.");
    out.set(prefix, value);
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => flattenStrings(item, `${prefix}[${index}]`, out));
    return out;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (key === "_meta") continue;
      flattenStrings(child, prefix ? `${prefix}.${key}` : key, out);
    }
  }
  return out;
}

function assertNoEmptyStrings(strings, locale) {
  const empty = [...strings.entries()].filter(([, value]) => !value.trim()).map(([key]) => key);
  if (empty.length) {
    throw new Error(`${locale}: empty values for: ${empty.join(", ")}`);
  }
}

const files = (await readdir(localesDir)).filter((name) => name.endsWith(".json")).sort();
if (!files.includes("en.json")) {
  console.error("FAIL: locales/en.json is required as the editorial source.");
  process.exit(1);
}

const resources = new Map();
for (const file of files) {
  const locale = path.basename(file, ".json");
  if (!requiredLocales.includes(locale)) {
    console.error(`FAIL: unsupported locale file name: ${file}`);
    process.exitCode = 1;
    continue;
  }
  let resource;
  try {
    resource = JSON.parse(await readFile(path.join(localesDir, file), "utf8"));
  } catch (error) {
    console.error(`FAIL: ${file} is not valid JSON: ${error.message}`);
    process.exitCode = 1;
    continue;
  }
  if (resource?._meta?.locale !== locale) {
    console.error(`FAIL: ${file} must declare _meta.locale = "${locale}".`);
    process.exitCode = 1;
    continue;
  }
  const strings = flattenStrings(resource);
  assertNoEmptyStrings(strings, locale);
  resources.set(locale, { resource, strings });
}

const source = resources.get("en");
if (!source) process.exit(1);

for (const [locale, { strings }] of resources) {
  if (locale === "en") continue;
  const missing = [...source.strings.keys()].filter((key) => !strings.has(key));
  const extra = [...strings.keys()].filter((key) => !source.strings.has(key));
  if (missing.length || extra.length) {
    console.error(`FAIL: ${locale} key parity mismatch; missing=${missing.length}, extra=${extra.length}`);
    if (missing.length) console.error(`  Missing: ${missing.slice(0, 20).join(", ")}`);
    if (extra.length) console.error(`  Extra: ${extra.slice(0, 20).join(", ")}`);
    process.exitCode = 1;
  }
}

const missingLocales = requiredLocales.filter((locale) => !resources.has(locale));
console.log(`Source resource: ${source.strings.size} strings in locales/en.json`);
console.log(`Locale files present: ${[...resources.keys()].join(", ")}`);
if (missingLocales.length) {
  const message = `Locale resources not created yet: ${missingLocales.join(", ")}`;
  if (strict) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`INCOMPLETE (expected during migration): ${message}`);
  }
}
if (!process.exitCode) console.log("PASS: JSON, locale metadata, non-empty strings, and key parity for existing locales.");
