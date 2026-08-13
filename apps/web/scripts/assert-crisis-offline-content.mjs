#!/usr/bin/env node
import { assertCrisisOfflineFromBuildArtifacts } from "./crisis-offline-content.mjs";

assertCrisisOfflineFromBuildArtifacts();
console.log(
  "Crisis offline guard: explicit content precache URLs present; unique flow string found.",
);
