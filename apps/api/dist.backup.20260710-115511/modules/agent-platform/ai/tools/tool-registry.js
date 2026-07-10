"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ToolRegistry_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolRegistry = void 0;
const common_1 = require("@nestjs/common");
let ToolRegistry = ToolRegistry_1 = class ToolRegistry {
    logger = new common_1.Logger(ToolRegistry_1.name);
    tools = new Map();
    byId = new Map();
    register(tool) {
        if (this.tools.has(tool.name)) {
            throw new Error(`Agent tool "${tool.name}" is already registered`);
        }
        const id = tool.id ?? tool.name;
        if (this.byId.has(id)) {
            throw new Error(`Agent tool id "${id}" is already registered`);
        }
        this.tools.set(tool.name, tool);
        this.byId.set(id, tool);
        this.logger.log(`Registered agent tool ${tool.name}${tool.id ? ` (${tool.id})` : ''}`);
    }
    get(nameOrId) {
        return this.tools.get(nameOrId) ?? this.byId.get(nameOrId);
    }
    listFor(user, featureFlags) {
        return [...this.tools.values()].filter((tool) => {
            if (featureFlags[tool.featureFlag] === false)
                return false;
            if (tool.requiredPermission && !user.permissions.includes(tool.requiredPermission)) {
                return false;
            }
            return true;
        });
    }
    toDefs(tools) {
        return tools.map(({ name, description, inputSchema }) => ({
            name,
            description,
            inputSchema,
        }));
    }
};
exports.ToolRegistry = ToolRegistry;
exports.ToolRegistry = ToolRegistry = ToolRegistry_1 = __decorate([
    (0, common_1.Injectable)()
], ToolRegistry);
//# sourceMappingURL=tool-registry.js.map