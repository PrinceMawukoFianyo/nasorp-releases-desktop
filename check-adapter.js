const { execSync } = require("child_process");

const versions = JSON.parse(
  execSync("npm view pglite-prisma-adapter versions --json", { encoding: "utf8" })
);

for (const v of versions) {
  const deps = execSync(`npm view pglite-prisma-adapter@${v} dependencies --json`, {
    encoding: "utf8",
  }).replace(/\s+/g, " ");
  console.log(v, "=>", deps);
}