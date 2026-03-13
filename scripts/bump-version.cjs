#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();
const PACKAGE_JSON_PATH = path.join(ROOT, 'package.json');
const PACKAGE_LOCK_PATH = path.join(ROOT, 'package-lock.json');

const MAX_REVISION = Number.parseInt(process.env.MAX_REVISION ?? '9', 10);
const MAX_MINOR = Number.parseInt(process.env.MAX_MINOR ?? '9', 10);

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function writeJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4) + '\n');
}

function bumpVersion(version) {
    const [majorRaw, minorRaw, revisionRaw] = version.split('.');
    let major = Number.parseInt(majorRaw, 10);
    let minor = Number.parseInt(minorRaw, 10);
    let revision = Number.parseInt(revisionRaw, 10);

    if ([major, minor, revision].some((value) => Number.isNaN(value))) {
        throw new Error(`Unsupported version format: "${version}". Expected major.minor.revision.`);
    }

    revision += 1;

    if (revision > MAX_REVISION) {
        revision = 0;
        minor += 1;

        if (minor > MAX_MINOR) {
            minor = 0;
            major += 1;
        }
    }

    return `${major}.${minor}.${revision}`;
}

function main() {
    const packageJson = readJson(PACKAGE_JSON_PATH);
    const currentVersion = packageJson.version;
    const nextVersion = bumpVersion(currentVersion);

    packageJson.version = nextVersion;
    writeJson(PACKAGE_JSON_PATH, packageJson);

    if (fs.existsSync(PACKAGE_LOCK_PATH)) {
        const packageLock = readJson(PACKAGE_LOCK_PATH);
        packageLock.version = nextVersion;
        if (packageLock.packages && packageLock.packages['']) {
            packageLock.packages[''].version = nextVersion;
        }
        writeJson(PACKAGE_LOCK_PATH, packageLock);
    }

    const tag = `v${nextVersion}`;
    execSync(`git add package.json package-lock.json`, { cwd: ROOT, stdio: 'inherit' });
    execSync(`git commit -m "chore(release): ${tag}"`, { cwd: ROOT, stdio: 'inherit' });
    execSync(`git tag ${tag}`, { cwd: ROOT, stdio: 'inherit' });

    console.log(`Bumped version: ${currentVersion} -> ${nextVersion} (tagged ${tag})`);
}

main();
