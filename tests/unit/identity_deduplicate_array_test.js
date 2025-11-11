"use strict";
/* global it, describe */

var assert = require("chai").assert;
var identity_deduplicate_array = require('../../lib/identity_deduplicate_array');

describe('identity_deduplicate_array', function() {
  describe('Module Structure', function() {
    it('should export a function', function() {
      assert.isFunction(identity_deduplicate_array);
    });

    it('should accept two parameters', function() {
      assert.equal(identity_deduplicate_array.length, 2);
    });
  });

  describe('Basic Deduplication', function() {
    it('should return empty array for empty input', function() {
      var result = identity_deduplicate_array([], function() { return false; });
      assert.deepEqual(result, []);
    });

    it('should return same array when no duplicates exist', function() {
      var items = [1, 2, 3, 4, 5];
      var identityFn = function(a, b) { return a === b; };
      var result = identity_deduplicate_array(items, identityFn);

      assert.deepEqual(result, [1, 2, 3, 4, 5]);
    });

    it('should remove duplicates based on strict equality', function() {
      var items = [1, 2, 3, 2, 4, 1, 5];
      var identityFn = function(a, b) { return a === b; };
      var result = identity_deduplicate_array(items, identityFn);

      assert.deepEqual(result, [1, 2, 3, 4, 5]);
    });

    it('should preserve order of first occurrences', function() {
      var items = [5, 3, 5, 1, 3, 2];
      var identityFn = function(a, b) { return a === b; };
      var result = identity_deduplicate_array(items, identityFn);

      assert.deepEqual(result, [5, 3, 1, 2]);
    });

    it('should handle single element array', function() {
      var items = [42];
      var identityFn = function(a, b) { return a === b; };
      var result = identity_deduplicate_array(items, identityFn);

      assert.deepEqual(result, [42]);
    });

    it('should handle array with all duplicates', function() {
      var items = [7, 7, 7, 7, 7];
      var identityFn = function(a, b) { return a === b; };
      var result = identity_deduplicate_array(items, identityFn);

      assert.deepEqual(result, [7]);
    });
  });

  describe('Custom Identity Functions', function() {
    it('should deduplicate objects by id property', function() {
      var items = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 1, name: 'Alice Again' },
        { id: 3, name: 'Charlie' }
      ];
      var identityFn = function(a, b) { return a.id === b.id; };
      var result = identity_deduplicate_array(items, identityFn);

      assert.equal(result.length, 3);
      assert.deepEqual(result[0], { id: 1, name: 'Alice' });
      assert.deepEqual(result[1], { id: 2, name: 'Bob' });
      assert.deepEqual(result[2], { id: 3, name: 'Charlie' });
    });

    it('should deduplicate using case-insensitive string comparison', function() {
      var items = ['apple', 'APPLE', 'banana', 'Apple', 'BANANA'];
      var identityFn = function(a, b) {
        return a.toLowerCase() === b.toLowerCase();
      };
      var result = identity_deduplicate_array(items, identityFn);

      assert.deepEqual(result, ['apple', 'banana']);
    });

    it('should deduplicate by object reference', function() {
      var obj1 = { value: 1 };
      var obj2 = { value: 2 };
      var obj3 = { value: 1 }; // Different object, same value

      var items = [obj1, obj2, obj1, obj3, obj2];
      var identityFn = function(a, b) { return a === b; };
      var result = identity_deduplicate_array(items, identityFn);

      assert.equal(result.length, 3);
      assert.strictEqual(result[0], obj1);
      assert.strictEqual(result[1], obj2);
      assert.strictEqual(result[2], obj3);
    });

    it('should deduplicate using custom property comparison', function() {
      var items = [
        { type: 'fruit', name: 'apple' },
        { type: 'vegetable', name: 'carrot' },
        { type: 'fruit', name: 'banana' },
        { type: 'vegetable', name: 'lettuce' }
      ];
      var identityFn = function(a, b) { return a.type === b.type; };
      var result = identity_deduplicate_array(items, identityFn);

      assert.equal(result.length, 2);
      assert.equal(result[0].type, 'fruit');
      assert.equal(result[1].type, 'vegetable');
    });

    it('should work with always-true identity function', function() {
      var items = [1, 2, 3, 4, 5];
      var identityFn = function() { return true; };
      var result = identity_deduplicate_array(items, identityFn);

      // Only first element should remain
      assert.deepEqual(result, [1]);
    });

    it('should work with always-false identity function', function() {
      var items = [1, 1, 1, 1];
      var identityFn = function() { return false; };
      var result = identity_deduplicate_array(items, identityFn);

      // All elements should remain
      assert.deepEqual(result, [1, 1, 1, 1]);
    });
  });

  describe('Null and Undefined Handling', function() {
    it('should preserve null values without deduplication', function() {
      var items = [1, null, 2, null, 3];
      var identityFn = function(a, b) { return a === b; };
      var result = identity_deduplicate_array(items, identityFn);

      // Both null values should be preserved
      assert.equal(result.length, 5);
      assert.deepEqual(result, [1, null, 2, null, 3]);
    });

    it('should preserve undefined values without deduplication', function() {
      var items = [1, undefined, 2, undefined, 3];
      var identityFn = function(a, b) { return a === b; };
      var result = identity_deduplicate_array(items, identityFn);

      // Both undefined values should be preserved
      assert.equal(result.length, 5);
      assert.deepEqual(result, [1, undefined, 2, undefined, 3]);
    });

    it('should preserve multiple null values', function() {
      var items = [null, null, null];
      var identityFn = function(a, b) { return a === b; };
      var result = identity_deduplicate_array(items, identityFn);

      assert.equal(result.length, 3);
      assert.deepEqual(result, [null, null, null]);
    });

    it('should handle mix of null, undefined, and values', function() {
      var items = [1, null, 2, undefined, 1, null, undefined, 2];
      var identityFn = function(a, b) { return a === b; };
      var result = identity_deduplicate_array(items, identityFn);

      // Numbers should be deduplicated, but null/undefined should not
      assert.deepEqual(result, [1, null, 2, undefined, null, undefined]);
    });

    it('should handle array starting with null', function() {
      var items = [null, 1, 2, 1];
      var identityFn = function(a, b) { return a === b; };
      var result = identity_deduplicate_array(items, identityFn);

      assert.deepEqual(result, [null, 1, 2]);
    });

    it('should handle array ending with null', function() {
      var items = [1, 2, 1, null];
      var identityFn = function(a, b) { return a === b; };
      var result = identity_deduplicate_array(items, identityFn);

      assert.deepEqual(result, [1, 2, null]);
    });
  });

  describe('String Handling', function() {
    it('should deduplicate string values', function() {
      var items = ['a', 'b', 'c', 'a', 'b'];
      var identityFn = function(a, b) { return a === b; };
      var result = identity_deduplicate_array(items, identityFn);

      assert.deepEqual(result, ['a', 'b', 'c']);
    });

    it('should handle empty strings', function() {
      var items = ['', 'a', '', 'b', ''];
      var identityFn = function(a, b) { return a === b; };
      var result = identity_deduplicate_array(items, identityFn);

      assert.deepEqual(result, ['', 'a', 'b']);
    });

    it('should distinguish between string types', function() {
      var items = ['1', 1, '2', 2, '1', 1];
      var identityFn = function(a, b) { return a === b; };
      var result = identity_deduplicate_array(items, identityFn);

      assert.deepEqual(result, ['1', 1, '2', 2]);
    });
  });

  describe('Boolean Handling', function() {
    it('should deduplicate boolean values', function() {
      var items = [true, false, true, false, true];
      var identityFn = function(a, b) { return a === b; };
      var result = identity_deduplicate_array(items, identityFn);

      assert.deepEqual(result, [true, false]);
    });

    it('should handle all true values', function() {
      var items = [true, true, true];
      var identityFn = function(a, b) { return a === b; };
      var result = identity_deduplicate_array(items, identityFn);

      assert.deepEqual(result, [true]);
    });

    it('should handle all false values', function() {
      var items = [false, false, false];
      var identityFn = function(a, b) { return a === b; };
      var result = identity_deduplicate_array(items, identityFn);

      assert.deepEqual(result, [false]);
    });
  });

  describe('Array Handling', function() {
    it('should deduplicate arrays by reference', function() {
      var arr1 = [1, 2];
      var arr2 = [3, 4];
      var arr3 = [1, 2]; // Same content, different reference

      var items = [arr1, arr2, arr1, arr3];
      var identityFn = function(a, b) { return a === b; };
      var result = identity_deduplicate_array(items, identityFn);

      assert.equal(result.length, 3);
      assert.strictEqual(result[0], arr1);
      assert.strictEqual(result[1], arr2);
      assert.strictEqual(result[2], arr3);
    });

    it('should deduplicate arrays by content', function() {
      var items = [
        [1, 2],
        [3, 4],
        [1, 2],
        [3, 4]
      ];
      var identityFn = function(a, b) {
        return JSON.stringify(a) === JSON.stringify(b);
      };
      var result = identity_deduplicate_array(items, identityFn);

      assert.equal(result.length, 2);
      assert.deepEqual(result[0], [1, 2]);
      assert.deepEqual(result[1], [3, 4]);
    });
  });

  describe('Complex Objects', function() {
    it('should deduplicate nested objects', function() {
      var items = [
        { user: { id: 1, name: 'Alice' } },
        { user: { id: 2, name: 'Bob' } },
        { user: { id: 1, name: 'Alice' } }
      ];
      var identityFn = function(a, b) {
        return a.user.id === b.user.id;
      };
      var result = identity_deduplicate_array(items, identityFn);

      assert.equal(result.length, 2);
      assert.equal(result[0].user.id, 1);
      assert.equal(result[1].user.id, 2);
    });

    it('should handle objects with multiple properties', function() {
      var items = [
        { x: 1, y: 2, z: 3 },
        { x: 1, y: 3, z: 3 },
        { x: 1, y: 2, z: 4 }
      ];
      var identityFn = function(a, b) {
        return a.x === b.x && a.y === b.y;
      };
      var result = identity_deduplicate_array(items, identityFn);

      assert.equal(result.length, 2);
      assert.deepEqual(result[0], { x: 1, y: 2, z: 3 });
      assert.deepEqual(result[1], { x: 1, y: 3, z: 3 });
    });
  });

  describe('Number Edge Cases', function() {
    it('should handle zero', function() {
      var items = [0, 1, 0, 2, 0];
      var identityFn = function(a, b) { return a === b; };
      var result = identity_deduplicate_array(items, identityFn);

      assert.deepEqual(result, [0, 1, 2]);
    });

    it('should handle negative numbers', function() {
      var items = [-1, 1, -1, -2, 1];
      var identityFn = function(a, b) { return a === b; };
      var result = identity_deduplicate_array(items, identityFn);

      assert.deepEqual(result, [-1, 1, -2]);
    });

    it('should handle floating point numbers', function() {
      var items = [1.5, 2.5, 1.5, 3.7];
      var identityFn = function(a, b) { return a === b; };
      var result = identity_deduplicate_array(items, identityFn);

      assert.deepEqual(result, [1.5, 2.5, 3.7]);
    });

    it('should handle NaN (always unique)', function() {
      var items = [NaN, 1, NaN, 2];
      var identityFn = function(a, b) { return a === b; };
      var result = identity_deduplicate_array(items, identityFn);

      // NaN === NaN is false, so both should remain
      assert.equal(result.length, 4);
      assert.isNaN(result[0]);
      assert.equal(result[1], 1);
      assert.isNaN(result[2]);
      assert.equal(result[3], 2);
    });

    it('should handle Infinity', function() {
      var items = [Infinity, 1, Infinity, -Infinity];
      var identityFn = function(a, b) { return a === b; };
      var result = identity_deduplicate_array(items, identityFn);

      assert.deepEqual(result, [Infinity, 1, -Infinity]);
    });
  });

  describe('Performance and Large Arrays', function() {
    it('should handle large arrays efficiently', function() {
      var items = [];
      for (var i = 0; i < 1000; i++) {
        items.push(i % 100); // Will have duplicates
      }

      var identityFn = function(a, b) { return a === b; };
      var result = identity_deduplicate_array(items, identityFn);

      // Should have 100 unique values (0-99)
      assert.equal(result.length, 100);
    });

    it('should preserve order in large arrays', function() {
      var items = [99, 50, 1, 99, 50, 1];
      var identityFn = function(a, b) { return a === b; };
      var result = identity_deduplicate_array(items, identityFn);

      assert.deepEqual(result, [99, 50, 1]);
    });
  });

  describe('Identity Function Behavior', function() {
    it('should call identity function for each comparison', function() {
      var callCount = 0;
      var items = [1, 2, 3, 2, 1];
      var identityFn = function(a, b) {
        callCount++;
        return a === b;
      };

      identity_deduplicate_array(items, identityFn);

      // Comparisons made:
      // i=0: none (j starts at -1)
      // i=1 (2): compares with items[0] = 1 comparison
      // i=2 (3): compares with items[1], items[0] = 2 comparisons
      // i=3 (2): compares with items[2], items[1] (stops, match found) = 2 comparisons
      // i=4 (1): compares with items[3], items[2], items[1], items[0] (stops, match found) = 4 comparisons
      // Total: 0 + 1 + 2 + 2 + 4 = 9 comparisons
      assert.equal(callCount, 9);
    });

    it('should pass correct arguments to identity function', function() {
      var items = [1, 2, 3];
      var comparisons = [];
      var identityFn = function(a, b) {
        comparisons.push([a, b]);
        return false;
      };

      identity_deduplicate_array(items, identityFn);

      // Check that comparisons are made correctly (backwards from i-1 to 0)
      // i=1 (2): compares 2 with items[0]=1
      // i=2 (3): compares 3 with items[1]=2, then 3 with items[0]=1
      assert.deepEqual(comparisons, [
        [2, 1],
        [3, 2],
        [3, 1]
      ]);
    });

    it('should stop comparing once duplicate is found', function() {
      var items = [1, 2, 3, 4, 2];
      var comparisons = [];
      var identityFn = function(a, b) {
        comparisons.push([a, b]);
        return a === b;
      };

      identity_deduplicate_array(items, identityFn);

      // When comparing 2 (at index 4), should find match and stop
      var lastComparisons = comparisons.slice(-3);
      assert.deepEqual(lastComparisons[0], [2, 4]);
      assert.deepEqual(lastComparisons[1], [2, 3]);
      assert.deepEqual(lastComparisons[2], [2, 2]); // Should stop here
    });
  });

  describe('Return Value', function() {
    it('should return a new array', function() {
      var items = [1, 2, 3];
      var identityFn = function(a, b) { return a === b; };
      var result = identity_deduplicate_array(items, identityFn);

      assert.notStrictEqual(result, items);
    });

    it('should not modify original array', function() {
      var items = [1, 2, 1, 3, 2];
      var original = items.slice();
      var identityFn = function(a, b) { return a === b; };

      identity_deduplicate_array(items, identityFn);

      assert.deepEqual(items, original);
    });
  });
});
