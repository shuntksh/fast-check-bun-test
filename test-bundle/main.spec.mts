import { expect } from 'bun:test';
import { fc, test } from 'fast-check-bun-test';

test.prop([fc.constant(null)])('should pass', (value) => {
  expect(value).toBe(null);
});