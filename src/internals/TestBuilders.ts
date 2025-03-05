import { record } from "fast-check";
import { buildTestWithPropRunner } from "./TestWithPropRunnerBuilder.js";

import type {
	ExecutionTree,
	Parameters as FcParameters,
	RunDetails,
	RunDetailsCommon,
} from "fast-check";
import type {
	ArbitraryRecord,
	ArbitraryTuple,
	FcExtra,
	Prop,
	PropRecord,
	Test,
} from "./types.js";

/**
 * Type used for any `{it,test}.*.prop` taking tuples
 */
type TestPropTuple<Ts extends [any] | any[], TsParameters extends Ts = Ts> = (
	arbitraries: ArbitraryTuple<Ts>,
	params?: FcParameters<TsParameters>,
) => (testName: string, prop: Prop<Ts>, timeout?: number) => void;

/**
 * Type used for any `{it,test}.*.prop` taking records
 */
type TestPropRecord<Ts, TsParameters extends Ts = Ts> = (
	arbitraries: ArbitraryRecord<Ts>,
	params?: FcParameters<TsParameters>,
) => (testName: string, prop: PropRecord<Ts>, timeout?: number) => void;

function adaptParametersForRecord<Ts>(
	parameters: FcParameters<[Ts]>,
	originalParamaters: FcParameters<Ts>,
): FcParameters<Ts> {
	return {
		...(parameters as Required<FcParameters<[Ts]>>),
		examples:
			parameters.examples !== undefined
				? parameters.examples.map((example) => example[0])
				: undefined,
		reporter: originalParamaters.reporter,
		asyncReporter: originalParamaters.asyncReporter,
	};
}

function adaptExecutionTreeForRecord<Ts>(
	executionSummary: ExecutionTree<[Ts]>[],
): ExecutionTree<Ts>[] {
	return executionSummary.map((summary) => ({
		...summary,
		value: summary.value[0],
		children: adaptExecutionTreeForRecord(summary.children),
	}));
}

function adaptRunDetailsForRecord<Ts>(
	runDetails: RunDetails<[Ts]>,
	originalParamaters: FcParameters<Ts>,
): RunDetails<Ts> {
	const adaptedRunDetailsCommon: RunDetailsCommon<Ts> = {
		...(runDetails as Required<RunDetailsCommon<[Ts]>>),
		counterexample:
			runDetails.counterexample !== null ? runDetails.counterexample[0] : null,
		failures: runDetails.failures.map((failure) => failure[0]),
		executionSummary: adaptExecutionTreeForRecord(runDetails.executionSummary),
		runConfiguration: adaptParametersForRecord(
			runDetails.runConfiguration,
			originalParamaters,
		),
	};
	return adaptedRunDetailsCommon as RunDetails<Ts>;
}

/**
 * Build `{it,test}.*.prop` out of `{it,test}.*`
 * @param testFn - The source `{it,test}.*`
 */
function buildTestProp<Ts extends [any] | any[], TsParameters extends Ts = Ts>(
	testFn: Test | Test["only" | "skip"],
	fc: FcExtra,
): TestPropTuple<Ts, TsParameters>;
function buildTestProp<Ts, TsParameters extends Ts = Ts>(
	testFn: Test | Test["only" | "skip"],
	fc: FcExtra,
): TestPropRecord<Ts, TsParameters>;
function buildTestProp<Ts extends [any] | any[], TsParameters extends Ts = Ts>(
	testFn: Test | Test["only" | "skip"],
	fc: FcExtra,
): TestPropTuple<Ts, TsParameters> | TestPropRecord<Ts, TsParameters> {
	return (arbitraries, params?: FcParameters<TsParameters>) => {
		if (Array.isArray(arbitraries)) {
			return (testName: string, prop: Prop<Ts>, timeout?: number) =>
				buildTestWithPropRunner(
					testFn,
					testName,
					arbitraries,
					prop,
					params,
					timeout,
					fc,
				);
		}
		return (testName: string, prop: Prop<Ts>, timeout?: number) => {
			const recordArb = record<Ts>(arbitraries);
			const recordParams: FcParameters<[TsParameters]> | undefined =
				params !== undefined
					? {
							// Spreading a "Required" makes us sure that we don't miss any parameters
							...(params as Required<FcParameters<TsParameters>>),
							// Following options needs to be converted to fit with the requirements
							examples:
								params.examples !== undefined
									? params.examples.map((example): [TsParameters] => [example])
									: undefined,
							reporter:
								params.reporter !== undefined
									? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
										(runDetails) =>
											params.reporter!(
												adaptRunDetailsForRecord(runDetails, params),
											)
									: undefined,
							asyncReporter:
								params.asyncReporter !== undefined
									? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
										(runDetails) =>
											params.asyncReporter!(
												adaptRunDetailsForRecord(runDetails, params),
											)
									: undefined,
						}
					: undefined;
			buildTestWithPropRunner(
				testFn,
				testName,
				[recordArb],
				(value) => (prop as PropRecord<Ts>)(value),
				recordParams,
				timeout,
				fc,
			);
		};
	};
}

/**
 * Revamped {it,test} with added `.prop`
 */
type PropType = <Ts, TsParameters extends Ts = Ts>(
	arbitraries: Ts extends [any] | any[]
		? ArbitraryTuple<Ts>
		: ArbitraryRecord<Ts>,
	params?: FcParameters<TsParameters>,
) => (
	testName: string,
	prop: Ts extends [any] | any[] ? Prop<Ts> : PropRecord<Ts>,
	timeout?: number,
) => void;

// Each variant should maintain the Test structure
type TestWithProp = Test & { prop: PropType };

export type FastCheckItBuilder<T> = T & {
	prop: PropType;
	only: TestWithProp;
	skip: TestWithProp;
	todo: TestWithProp;
	if: (condition: boolean) => TestWithProp;
	skipIf: (condition: boolean) => TestWithProp;
	todoIf: (condition: boolean) => TestWithProp;
	each?: T[keyof T];
};

/**
 * Build the enriched version of {it,test}, the one with added `.prop`
 * This function takes a regular test function and enhances it with property-based testing capabilities.
 * It recursively processes all function properties of the test function to add property testing support.
 *
 */
export function buildTest<T extends (...args: any[]) => any>(
	testFn: T,
	fc: FcExtra,
	ancestors: Set<string> = new Set(),
): FastCheckItBuilder<T> {
	let atLeastOneExtra = false;
	const extraKeys: Partial<FastCheckItBuilder<T>> = {};

	// Create a new function that preserves the original behavior
	const enrichedTestFn = (...args: Parameters<T>): ReturnType<T> =>
		testFn(...args);

	// List of test function variants that need direct prop decoration
	const testVariants = new Set([
		"only",
		"skip",
		"todo",
		"if",
		"skipIf",
		"todoIf",
	]);

	// Iterate through all properties of the test function
	for (const unsafeKey of Object.getOwnPropertyNames(testFn)) {
		const key = unsafeKey as keyof typeof testFn & string;
		// Skip non-function properties like 'length' and 'name'
		if (!ancestors.has(key) && typeof testFn[key] === "function") {
			atLeastOneExtra = true;
			const fnWithKey = testFn[key] as any;

			if (testVariants.has(key)) {
				// For test variants, preserve the original function and its properties
				const enhancedFn =
					key === "if" || key === "skipIf" || key === "todoIf"
						? (condition: boolean) => {
								const conditionFn = fnWithKey(condition);
								// Preserve all properties of the returned function
								const enhancedConditionFn = Object.assign(
									(...args: any[]) => conditionFn(...args),
									conditionFn,
								);
								enhancedConditionFn.prop = buildTestProp(conditionFn, fc);
								return enhancedConditionFn;
							}
						: Object.assign((...args: any[]) => fnWithKey(...args), fnWithKey);

				if (key !== "if" && key !== "skipIf" && key !== "todoIf") {
					enhancedFn.prop = buildTestProp(fnWithKey, fc);
				}

				extraKeys[key] = enhancedFn;
			} else if (key !== "each") {
				// For other functions (except 'each'), recursively enhance
				extraKeys[key] = buildTest(fnWithKey, fc, new Set([...ancestors, key]));
			} else {
				// Preserve 'each' as is
				extraKeys[key] = fnWithKey;
			}
		}
	}

	// If no function properties found, return the original function
	if (!atLeastOneExtra) {
		return testFn as FastCheckItBuilder<T>;
	}

	// Add prop to the main function if it has 'each'
	if ("each" in testFn) {
		extraKeys["prop" as keyof typeof extraKeys] = buildTestProp(
			testFn as any,
			fc,
		) as any;
	}

	// Combine the original function with the enhanced properties
	return Object.assign(enrichedTestFn, extraKeys) as FastCheckItBuilder<T>;
}
