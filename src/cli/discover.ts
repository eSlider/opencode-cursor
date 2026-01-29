#!/usr/bin/env bun
import { ModelDiscoveryService } from "../models/discovery.js";
import { ConfigUpdater } from "../models/config.js";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

async function main() {
  console.log("Discovering Cursor models...");

  const service = new ModelDiscoveryService();
  const models = await service.discover();

  console.log(`Found ${models.length} models:`);
  for (const model of models) {
    console.log(`  - ${model.id}: ${model.name}`);
  }

  // Update config
  const updater = new ConfigUpdater();
  const configPath = join(homedir(), ".config/opencode/opencode.json");

  if (!existsSync(configPath)) {
    console.error(`Config not found: ${configPath}`);
    process.exit(1);
  }

  const existingConfig = JSON.parse(readFileSync(configPath, "utf-8"));

  // Update cursor-acp provider models
  if (existingConfig.provider?.["cursor-acp"]) {
    const formatted = updater.formatModels(models);
    existingConfig.provider["cursor-acp"].models = {
      ...existingConfig.provider["cursor-acp"].models,
      ...formatted
    };

    writeFileSync(configPath, JSON.stringify(existingConfig, null, 2));
    console.log(`Updated ${configPath}`);
  } else {
    console.error("cursor-acp provider not found in config");
    process.exit(1);
  }

  console.log("Done!");
}

main().catch(console.error);