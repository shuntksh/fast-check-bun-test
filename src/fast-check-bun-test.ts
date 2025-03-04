import { it as itBunTest, test as testBunTest } from "bun:test";
import * as fc from "fast-check";
import { buildTest } from "./internals/TestBuilders";

import type { FastCheckItBuilder } from "./internals/TestBuilders";
import type { It } from "./internals/types";

export const test: FastCheckItBuilder<It> = buildTest(testBunTest, fc);
export const it: FastCheckItBuilder<It> = buildTest(itBunTest, fc);
export { fc };
