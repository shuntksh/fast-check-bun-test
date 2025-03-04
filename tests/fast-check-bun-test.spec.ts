import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { execFile as _execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as url from "node:url";
import { promisify } from "node:util";

const execFile = promisify(_execFile);
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

import type _fc from "fast-check";
import type { it as _it, test as _test } from "fast-check-bun-test";
declare const fc: typeof _fc;
declare const runner: typeof _test | typeof _it;

const generatedTestsDirectoryName = ".test-artifacts";
const generatedTestsDirectory = path.join(
	__dirname,
	"..",
	generatedTestsDirectoryName,
);
const specFileName = "generated.spec.mjs";

type RunnerType = "test" | "it";

beforeAll(async () => {
	await fs.mkdir(generatedTestsDirectory, { recursive: true });
});
afterAll(async () => {
	await fs.rm(generatedTestsDirectory, { recursive: true });
});

type DescribeOptions = {
	specName: string;
	runnerName: RunnerType;
};

describe.each<DescribeOptions>([
	{ specName: "test", runnerName: "test" },
	{ specName: "it", runnerName: "it" },
])("$specName", ({ runnerName }) => {
	it(`should support ${runnerName}.prop`, async () => {
		// Arrange
		const specDirectory = await writeToFile(runnerName, () => {
			runner.prop([fc.string(), fc.string(), fc.string()])(
				"property",
				(a, b, c) => {
					return `${a}${b}${c}`.includes(b);
				},
			);
		});

		// Act
		const out = await runSpec(specDirectory);

		// Assert
		expectPass(out);
	});

	describe("at depth 1", () => {
		it(`should support ${runnerName}.prop`, async () => {
			// Arrange
			const specDirectory = await writeToFile(runnerName, () => {
				runner.prop([fc.string(), fc.string(), fc.string()])(
					"property",
					(a, b, c) => {
						return `${a}${b}${c}`.includes(b);
					},
				);
			});

			// Act
			const out = await runSpec(specDirectory);

			// Assert
			expectPass(out);
		});

		it(`should support ${runnerName}.only.prop`, async () => {
			// Arrange
			const specDirectory = await writeToFile(runnerName, () => {
				runner.only.prop([fc.string(), fc.string(), fc.string()])(
					"property",
					(a, b, c) => {
						return `${a}${b}${c}`.includes(b);
					},
				);
			});

			// Act
			const out = await runSpec(specDirectory);

			// Assert
			expectPass(out);
		});

		it(`should support ${runnerName}.skip.prop`, async () => {
			// Arrange
			const specDirectory = await writeToFile(runnerName, () => {
				runner.skip.prop([fc.string(), fc.string(), fc.string()])(
					"property",
					(a, b, c) => {
						return `${a}${b}${c}`.includes(b);
					},
				);
			});

			// Act
			const out = await runSpec(specDirectory);

			// Assert
			expectSkip(out);
		});
	});
});

// Helper

let num = -1;
async function writeToFile(
	runner: "test" | "it",
	fileContent: () => void,
): Promise<string> {
	// Prepare directory for spec
	const specDirectorySeed = `${Math.random().toString(16).substring(2)}-${++num}`;
	const specDirectory = path.join(
		generatedTestsDirectory,
		`test-${specDirectorySeed}`,
	);
	await fs.mkdir(specDirectory, { recursive: true });

	// Prepare test file itself
	const specFilePath = path.join(specDirectory, specFileName);
	const fileContentString = String(fileContent);
	const wrapInDescribeIfNeeded =
		runner === "it"
			? (testCode: string) => `describe('test suite', () => {\n${testCode}\n});`
			: (testCode: string) => testCode;
	const importFromFastCheckBunTest = `import {${runner} as runner} from 'fast-check-bun-test';\n`;
	const specContent = `import {describe} from 'bun:test';
		 import * as fc from 'fast-check'; 
		 ${importFromFastCheckBunTest}
		 ${wrapInDescribeIfNeeded(
				fileContentString.substring(
					fileContentString.indexOf("{") + 1,
					fileContentString.lastIndexOf("}"),
				),
			)}`;

	await Promise.all([fs.writeFile(specFilePath, specContent)]);

	return specDirectory;
}

async function runSpec(specDirectory: string): Promise<string> {
	try {
		const { stdout: specOutput, stderr: specError } = await execFile(
			"bun",
			["test", path.join(specDirectory, specFileName)],
			{
				// Ensure we capture all output
				maxBuffer: 1024 * 1024, // 1MB buffer
			},
		);
		return specOutput + (specError || "");
	} catch (err) {
		return (err as any).stderr || (err as any).stdout || "";
	}
}

function expectPass(out: string): void {
	expect(out).toContain(`${specFileName}`);
	expect(out).toContain("1 pass");
	expect(out).toContain("0 fail");
}

function expectSkip(out: string): void {
	expect(out).toContain(`↓ ${specFileName}`);
}
