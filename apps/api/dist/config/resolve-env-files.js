"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveEnvFilePaths = resolveEnvFilePaths;
const fs_1 = require("fs");
const path_1 = require("path");
function resolveEnvFilePaths(compiledDirname) {
    const raw = [
        (0, path_1.resolve)(process.cwd(), '.env'),
        (0, path_1.resolve)(process.cwd(), 'apps', 'api', '.env'),
        (0, path_1.resolve)((0, path_1.join)(compiledDirname, '..', '.env')),
    ];
    const out = [];
    const seen = new Set();
    for (const p of raw) {
        const abs = (0, path_1.resolve)(p);
        if (!(0, fs_1.existsSync)(abs) || seen.has(abs))
            continue;
        seen.add(abs);
        out.push(abs);
    }
    return out;
}
//# sourceMappingURL=resolve-env-files.js.map