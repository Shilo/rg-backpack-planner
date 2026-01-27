const fs = require("fs");
const path = require("path");

const distDir = path.join(__dirname, "..", "dist");
const indexPath = path.join(distDir, "index.html");
const notFoundPath = path.join(distDir, "404.html");

async function main() {
  try {
    const html = await fs.promises.readFile(indexPath, "utf8");
    await fs.promises.writeFile(notFoundPath, html);
    console.log('Created "404.html" from "index.html" in dist/');
  } catch (error) {
    console.error(
      'Failed to create "404.html" from "index.html" in dist/:',
      error,
    );
    process.exitCode = 1;
  }
}

main();

