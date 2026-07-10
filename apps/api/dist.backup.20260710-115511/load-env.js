"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
const resolve_env_files_1 = require("./config/resolve-env-files");
for (const p of (0, resolve_env_files_1.resolveEnvFilePaths)(__dirname)) {
    (0, dotenv_1.config)({ path: p, override: true });
}
//# sourceMappingURL=load-env.js.map