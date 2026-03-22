// @ts-ignore
import assert from 'assert';
import { calculatePOSTotals } from './pos.js'; // Use .js extension for ts-node esm

function runTests() {
  console.log('Running POS Calculation Tests...');
  
  // Test 1: Standard calculation with tip and discount
  const cart1 = [{ price: 25 }, { price: 18 }]; // $43
  const res1 = calculatePOSTotals(cart1, 5, 3);
  assert.strictEqual(res1.subtotal, 43, 'Subtotal should be 43');
  assert.strictEqual(res1.total, 45, 'Total should be 45 (43 + 5 - 3)');

  // Test 2: Discount greater than subtotal (should floor at 0 if no tip, or calculate correctly)
  // Wait, if total goes below 0, calculatePOSTotals uses Math.max(0, ...)
  const cart2 = [{ price: 20 }];
  const res2 = calculatePOSTotals(cart2, 0, 25);
  assert.strictEqual(res2.subtotal, 20, 'Subtotal should be 20');
  assert.strictEqual(res2.total, 0, 'Total should be clamped to 0');

  // Test 3: Empty cart
  const res3 = calculatePOSTotals([], 0, 0);
  assert.strictEqual(res3.subtotal, 0, 'Subtotal should be 0');
  assert.strictEqual(res3.total, 0, 'Total should be 0');

  console.log('All tests passed successfully! ✅');
}

runTests();
