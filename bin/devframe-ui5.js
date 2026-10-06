#!/usr/bin/env node
import { createCac } from "devframe/adapters/cac";
import { ui5Devframe } from "../src/devframe.js";

createCac(ui5Devframe).parse();
