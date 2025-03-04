import { it as itBunTest, test as testBunTest } from "bun:test";
import * as fc from "fast-check";
import { buildTest } from "./internals/TestBuilders";

import type { FastCheckItBuilder } from "./internals/TestBuilders";
import type { It } from "./internals/types";

export const test = buildTest<It>(testBunTest, fc);
export const it: FastCheckItBuilder<It> = buildTest<It>(itBunTest, fc);
export { fc };
