import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const WEB_ROOT = join(__dirname, "..");
export const CONTENT_CONFIG_SRC = join(
  WEB_ROOT,
  "../../packages/content-config/src",
);
export const PUBLIC_DIR = join(WEB_ROOT, "public");

/**
 * Unique to crisis-deepfake-classmate STOP prompt — must appear in the built
 * JS bundle and/or files listed in the Serwist precache (not only as a URL).
 */
export const CRISIS_CONTENT_NEEDLE =
  "Pause before you react, reply, or share anything.";

/** Source-of-truth JSON used by /help, served + precached at these URLs. */
export const CRISIS_CONTENT = [
  {
    source: "flows/crisis-deepfake-classmate.v1.json",
    url: "/content/flows/crisis-deepfake-classmate.v1.json",
  },
  {
    source: "resources/crisis-deepfake-classmate.json",
    url: "/content/resources/crisis-deepfake-classmate.json",
  },
  {
    source: "templates/crisis-deepfake-classmate-trusted-adult.en.json",
    url: "/content/templates/crisis-deepfake-classmate-trusted-adult.en.json",
  },
  {
    source: "templates/crisis-deepfake-classmate-school-contact.en.json",
    url: "/content/templates/crisis-deepfake-classmate-school-contact.en.json",
  },
  {
    source: "templates/crisis-deepfake-classmate-platform-report.en.json",
    url: "/content/templates/crisis-deepfake-classmate-platform-report.en.json",
  },
];

export function fileRevision(absPath) {
  return createHash("sha256")
    .update(readFileSync(absPath))
    .digest("hex")
    .slice(0, 16);
}

export function copyCrisisContentToPublic() {
  for (const entry of CRISIS_CONTENT) {
    const from = join(CONTENT_CONFIG_SRC, entry.source);
    const to = join(PUBLIC_DIR, entry.url.replace(/^\//, ""));
    mkdirSync(dirname(to), { recursive: true });
    copyFileSync(from, to);
  }
}

export function crisisShellRevision() {
  const hash = createHash("sha256");
  for (const entry of CRISIS_CONTENT) {
    hash.update(readFileSync(join(CONTENT_CONFIG_SRC, entry.source)));
  }
  return hash.digest("hex").slice(0, 16);
}

export function crisisPrecacheEntries() {
  return CRISIS_CONTENT.map((entry) => ({
    url: entry.url,
    revision: fileRevision(join(CONTENT_CONFIG_SRC, entry.source)),
  }));
}

/**
 * Collect `url` values from a Serwist-injected precache array
 * (`{'revision':'…','url':'/path'}` or JSON double quotes).
 */
export function collectPrecacheUrls(swSource) {
  const urls = new Set();
  const re = /['"]url['"]\s*:\s*['"]([^'"]+)['"]/g;
  for (const match of swSource.matchAll(re)) {
    urls.add(match[1]);
  }
  return urls;
}

function missingCrisisContentUrls(precacheUrls) {
  return CRISIS_CONTENT.filter((entry) => !precacheUrls.has(entry.url)).map(
    (entry) => entry.url,
  );
}

function readTextTree(dir, extensions) {
  if (!existsSync(dir)) {
    return "";
  }
  let out = "";
  const walk = (current) => {
    for (const ent of readdirSync(current, { withFileTypes: true })) {
      const next = join(current, ent.name);
      if (ent.isDirectory()) {
        walk(next);
        continue;
      }
      if (extensions.some((ext) => ent.name.endsWith(ext))) {
        out += readFileSync(next, "utf8");
      }
    }
  };
  walk(dir);
  return out;
}

/**
 * Concatenate contents of precached /content JSON files that actually appear
 * in the manifest (so a URL-only listing without the payload does not count).
 */
export function precacheContentHaystack(swSource, publicDir = PUBLIC_DIR) {
  const urls = collectPrecacheUrls(swSource);
  let haystack = swSource;
  for (const entry of CRISIS_CONTENT) {
    if (!urls.has(entry.url)) {
      continue;
    }
    const abs = join(publicDir, entry.url.replace(/^\//, ""));
    if (existsSync(abs)) {
      haystack += readFileSync(abs, "utf8");
    }
  }
  return haystack;
}

/**
 * @param {{ swSource: string, bundleHaystack: string, precacheHaystack: string }} input
 */
export function assertCrisisOfflineContent({
  swSource,
  bundleHaystack,
  precacheHaystack,
}) {
  const precacheUrls = collectPrecacheUrls(swSource);
  const missingUrls = missingCrisisContentUrls(precacheUrls);

  if (missingUrls.length > 0) {
    throw new Error(
      `Serwist precache is missing explicit crisis content URLs (not incidental JS chunks): ${missingUrls.join(", ")}. ` +
        `Only listing /manifest.json is not enough.`,
    );
  }

  const extraContent = [...precacheUrls].filter((url) =>
    url.startsWith("/content/"),
  );
  if (extraContent.length === 0) {
    throw new Error(
      "Serwist precache lists no /content/ entries — crisis JSON must be precached explicitly.",
    );
  }

  const inBundle = bundleHaystack.includes(CRISIS_CONTENT_NEEDLE);
  const inPrecache = precacheHaystack.includes(CRISIS_CONTENT_NEEDLE);
  if (!inBundle && !inPrecache) {
    throw new Error(
      `Crisis content needle ${JSON.stringify(CRISIS_CONTENT_NEEDLE)} is absent from both the built bundle and the precache manifest/payload.`,
    );
  }
}

export function readBundleHaystack(nextStaticDir = join(WEB_ROOT, ".next/static")) {
  return readTextTree(nextStaticDir, [".js", ".json", ".css"]);
}

export function assertCrisisOfflineFromBuildArtifacts(webRoot = WEB_ROOT) {
  const swPath = join(webRoot, "public/sw.js");
  if (!existsSync(swPath)) {
    throw new Error(
      `Missing ${swPath} — run a production Next.js build so Serwist can emit the precache manifest.`,
    );
  }
  const swSource = readFileSync(swPath, "utf8");
  const bundleHaystack = readBundleHaystack(join(webRoot, ".next/static"));
  const precacheHaystack = precacheContentHaystack(
    swSource,
    join(webRoot, "public"),
  );
  assertCrisisOfflineContent({ swSource, bundleHaystack, precacheHaystack });
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  assertCrisisOfflineFromBuildArtifacts();
  console.log(
    "Crisis offline guard: explicit content precache URLs present; unique flow string found.",
  );
}
