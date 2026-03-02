import { appendFileSync, writeFileSync } from "node:fs";

const GLOBAL_LOG_FILE_URL = new URL("./index.output.log", import.meta.url);

// Reset the log file
writeFileSync(GLOBAL_LOG_FILE_URL, "", "utf8");

function appendLog(text: string | Uint8Array) {
    appendFileSync(GLOBAL_LOG_FILE_URL, text, "utf8");
}

const originalStdoutWrite = process.stdout.write;
process.stdout.write = function (
    chunk: string | Uint8Array,
    encodingOrCb?: BufferEncoding | ((err?: Error | null) => void),
    cb?: (err?: Error | null) => void,
): boolean {
    appendLog(chunk);
    if (typeof encodingOrCb === "string") {
        return originalStdoutWrite.call(process.stdout, chunk, encodingOrCb, cb);
    }
    return originalStdoutWrite.call(process.stdout, chunk, encodingOrCb as any);
} as typeof process.stdout.write;

const originalStderrWrite = process.stderr.write;
process.stderr.write = function (
    chunk: string | Uint8Array,
    encodingOrCb?: BufferEncoding | ((err?: Error | null) => void),
    cb?: (err?: Error | null) => void,
): boolean {
    appendLog(chunk);
    if (typeof encodingOrCb === "string") {
        return originalStderrWrite.call(process.stderr, chunk, encodingOrCb, cb);
    }
    return originalStderrWrite.call(process.stderr, chunk, encodingOrCb as any);
} as typeof process.stderr.write;

process.on("uncaughtException", (err) => {
    appendFileSync(
        GLOBAL_LOG_FILE_URL,
        `Uncaught Exception: ${err.message}\n${err.stack}\n`,
        "utf8",
    );
    process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
    appendFileSync(
        GLOBAL_LOG_FILE_URL,
        `Unhandled Rejection at: ${promise}\nReason: ${reason}\n`,
        "utf8",
    );
    process.exit(1);
});
