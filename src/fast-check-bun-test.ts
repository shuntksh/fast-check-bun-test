import { it as itBunTest, test as testBunTest } from "bun:test";
import * as fc from "fast-check";
import { buildTest } from "./internals/TestBuilders";

import type { FastCheckItBuilder } from "./internals/TestBuilders";
import type { Test } from "./internals/types";

export const test = buildTest<Test>(testBunTest, fc);
export const it: FastCheckItBuilder<Test> = buildTest<Test>(itBunTest, fc);
export { fc };
