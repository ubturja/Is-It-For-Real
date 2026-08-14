import { readFileSync } from "node:fs";

const token = process.env.GITHUB_TOKEN;
const repo = process.env.GITHUB_REPOSITORY;
const sha = process.env.GITHUB_SHA;
const name = process.env.CHECK_NAME;
const conclusion = process.env.CHECK_CONCLUSION ?? "neutral";
const file =
  process.env.SUMMARY_FILE ?? "apps/web/test-results/github-step-summary.md";

if (
  token === undefined ||
  token.length === 0 ||
  repo === undefined ||
  sha === undefined ||
  name === undefined
) {
  console.error("GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_SHA, and CHECK_NAME are required");
  process.exit(1);
}

const summary = readFileSync(file, "utf8");
if (!/\d+ (passed|critical\/serious)/.test(summary)) {
  console.error(`Refusing to publish a summary without counts:\n${summary}`);
  process.exit(1);
}

const response = await fetch(`https://api.github.com/repos/${repo}/check-runs`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  },
  body: JSON.stringify({
    name,
    head_sha: sha,
    status: "completed",
    conclusion,
    output: {
      title: name,
      summary,
    },
  }),
});

if (!response.ok) {
  const body = await response.text();
  console.error(`check-runs API ${response.status}: ${body}`);
  process.exit(1);
}

const created = await response.json();
if (typeof created !== "object" || created === null || !("html_url" in created)) {
  console.error("check-runs API returned an unexpected payload");
  process.exit(1);
}
console.log(`Published check run ${String(created.html_url)}`);
