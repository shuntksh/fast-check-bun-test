# fast-check-bun-test

![NPM Version](https://img.shields.io/npm/v/fast-check-bun-test)
![NPM License](https://img.shields.io/npm/l/fast-check-bun-test)
![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/shuntksh/fast-check-bun-test/ci.yaml)


`fast-check-bun-test` is a fork of [`@fast-check/vitest`](https://github.com/dubzzz/fast-check/tree/main/packages/vitest), adapted to integrate property-based testing with [`bun:test`](https://bun.sh/docs/cli/test). It leverages the power of [fast-check](https://fast-check.dev/) to generate random inputs and verify your code’s behavior under a wide range of scenarios, all within Bun’s lightweight and fast testing framework.

## Installation

Install `fast-check-bun-test` as a development dependency:

```bash
bun add --dev fast-check-bun-test
```

## Usage

Here’s an example of how to use fast-check-bun-test to test a simple property:

```typescript
import { test, fc } from 'fast-check-bun-test';

// Example: Verify that b is a substring of a + b + c for all strings a, b, c
test.prop([fc.string(), fc.string(), fc.string()])(
  'should detect the substring',
  (a, b, c) => {
    return (a + b + c).includes(b);
  }
);

// Same property using named values for clarity
test.prop({ a: fc.string(), b: fc.string(), c: fc.string() })(
  'should detect the substring',
  ({ a, b, c }) => {
    return (a + b + c).includes(b);
  }
);
```

This example demonstrates how fast-check-bun-test generates random strings to confirm that concatenation preserves substring inclusion. For more advanced usage, visit the fast-check documentation.
