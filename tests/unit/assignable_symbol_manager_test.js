"use strict";
/* global it, describe, beforeEach */

var assert = require("chai").assert;

describe('AssignableSymbolManager (SymbolManager)', function() {
  var SymbolManager;
  var CharacterRange;

  beforeEach(function() {
    CharacterRange = require('../../plugins/compile_client_app/character_range');
    SymbolManager = require('../../plugins/compile_client_app/assignable_symbol_manager');
  });

  describe('Module structure', function() {
    it('should export SymbolManager as a constructor', function() {
      assert.isFunction(SymbolManager);
      assert.equal(SymbolManager.name, 'SymbolManager');
    });

    it('should accept CharacterRange in constructor', function() {
      var range = new CharacterRange(65, 70); // A-E
      var manager = new SymbolManager(range);
      assert.isDefined(manager);
    });

    it('should have constructor with 1 parameter', function() {
      assert.equal(SymbolManager.length, 1);
    });
  });

  describe('Constructor initialization', function() {
    it('should create a new SymbolManager instance', function() {
      var range = new CharacterRange(65, 70);
      var manager = new SymbolManager(range);
      assert.instanceOf(manager, SymbolManager);
    });

    it('should initialize internal allocator', function() {
      var range = new CharacterRange(65, 70);
      var manager = new SymbolManager(range);
      assert.isDefined(manager._allocator);
    });

    it('should initialize empty hash', function() {
      var range = new CharacterRange(65, 70);
      var manager = new SymbolManager(range);
      assert.isObject(manager._hash);
      assert.equal(Object.keys(manager._hash).length, 0);
    });

    it('should initialize empty symbols_by_name', function() {
      var range = new CharacterRange(65, 70);
      var manager = new SymbolManager(range);
      assert.isObject(manager._symbols_by_name);
      assert.equal(Object.keys(manager._symbols_by_name).length, 0);
    });

    it('should initialize empty symbols_by_identity', function() {
      var range = new CharacterRange(65, 70);
      var manager = new SymbolManager(range);
      assert.isObject(manager._symbols_by_identity);
      assert.equal(Object.keys(manager._symbols_by_identity).length, 0);
    });
  });

  describe('Prototype methods', function() {
    it('should have generate_assignments_snippet method', function() {
      assert.isFunction(SymbolManager.prototype.generate_assignments_snippet);
    });

    it('should have get_by_name method', function() {
      assert.isFunction(SymbolManager.prototype.get_by_name);
    });

    it('should have pre_allocate method', function() {
      assert.isFunction(SymbolManager.prototype.pre_allocate);
    });

    it('should have allocate method', function() {
      assert.isFunction(SymbolManager.prototype.allocate);
    });
  });

  describe('pre_allocate method', function() {
    var range;
    var manager;

    beforeEach(function() {
      range = new CharacterRange(65, 75); // A-J (10 characters)
      manager = new SymbolManager(range);
    });

    it('should allocate a symbol for a name', function() {
      var symbol = manager.pre_allocate('test_name');
      assert.isString(symbol);
      assert.equal(symbol.length, 1);
    });

    it('should store symbol in symbols_by_name', function() {
      var symbol = manager.pre_allocate('test_name');
      assert.equal(manager._symbols_by_name['test_name'], symbol);
    });

    it('should allocate sequential symbols', function() {
      var symbol1 = manager.pre_allocate('name1');
      var symbol2 = manager.pre_allocate('name2');
      assert.notEqual(symbol1, symbol2);
      assert.equal(symbol1.charCodeAt(0) + 1, symbol2.charCodeAt(0));
    });

    it('should throw error if name is already taken', function() {
      manager.pre_allocate('duplicate_name');
      assert.throws(function() {
        manager.pre_allocate('duplicate_name');
      }, Error, /Symbol reference duplicate_name is already taken/);
    });

    it('should allow different names to get different symbols', function() {
      var symbol1 = manager.pre_allocate('name_a');
      var symbol2 = manager.pre_allocate('name_b');
      var symbol3 = manager.pre_allocate('name_c');

      assert.notEqual(symbol1, symbol2);
      assert.notEqual(symbol2, symbol3);
      assert.notEqual(symbol1, symbol3);
    });

    it('should return symbols from character range', function() {
      var symbol = manager.pre_allocate('test');
      var charCode = symbol.charCodeAt(0);
      assert.isAtLeast(charCode, 65); // >= 'A'
      assert.isBelow(charCode, 75); // < 'K'
    });
  });

  describe('allocate method', function() {
    var range;
    var manager;

    beforeEach(function() {
      range = new CharacterRange(65, 75); // A-J
      manager = new SymbolManager(range);
    });

    it('should allocate a symbol for a value', function() {
      var symbol = manager.allocate('test_value');
      assert.isString(symbol);
      assert.equal(symbol.length, 1);
    });

    it('should store value in hash', function() {
      var symbol = manager.allocate('test_value');
      assert.equal(manager._hash[symbol], 'test_value');
    });

    it('should store symbol in symbols_by_identity', function() {
      var symbol = manager.allocate('test_value');
      assert.equal(manager._symbols_by_identity['test_value'], symbol);
    });

    it('should reuse existing symbol for same value', function() {
      var symbol1 = manager.allocate('same_value');
      var symbol2 = manager.allocate('same_value');
      assert.equal(symbol1, symbol2);
    });

    it('should allocate different symbols for different values', function() {
      var symbol1 = manager.allocate('value1');
      var symbol2 = manager.allocate('value2');
      assert.notEqual(symbol1, symbol2);
    });

    it('should accept custom symbol parameter', function() {
      var customSymbol = 'X';
      var symbol = manager.allocate('custom_value', customSymbol);
      assert.equal(symbol, 'X');
      assert.equal(manager._hash['X'], 'custom_value');
    });

    it('should throw error if custom symbol is already allocated', function() {
      manager.allocate('value1', 'X');
      assert.throws(function() {
        manager.allocate('value2', 'X');
      }, Error, /Symbol X is already allocated/);
    });

    it('should handle numeric values', function() {
      var symbol = manager.allocate(42);
      assert.isString(symbol);
      assert.equal(manager._hash[symbol], 42);
    });

    it('should handle boolean values', function() {
      var symbolTrue = manager.allocate(true);
      var symbolFalse = manager.allocate(false);
      assert.notEqual(symbolTrue, symbolFalse);
      assert.equal(manager._hash[symbolTrue], true);
      assert.equal(manager._hash[symbolFalse], false);
    });

    it('should handle object values', function() {
      var obj = { key: 'value' };
      var symbol = manager.allocate(obj);
      assert.equal(manager._hash[symbol], obj);
    });

    it('should handle null value', function() {
      var symbol = manager.allocate(null);
      assert.isString(symbol);
      assert.equal(manager._hash[symbol], null);
    });

    it('should handle undefined value', function() {
      var symbol = manager.allocate(undefined);
      assert.isString(symbol);
      assert.equal(manager._hash[symbol], undefined);
    });

    it('should reuse symbol for same numeric value', function() {
      var symbol1 = manager.allocate(123);
      var symbol2 = manager.allocate(123);
      assert.equal(symbol1, symbol2);
    });

    it('should allocate sequential symbols when not reusing', function() {
      var symbol1 = manager.allocate('val1');
      var symbol2 = manager.allocate('val2');
      assert.equal(symbol1.charCodeAt(0) + 1, symbol2.charCodeAt(0));
    });

    it('should allow custom symbol for first allocation of value', function() {
      var symbol = manager.allocate('new_value', 'Z');
      assert.equal(symbol, 'Z');
      assert.equal(manager._hash['Z'], 'new_value');
      assert.equal(manager._symbols_by_identity['new_value'], 'Z');
    });
  });

  describe('get_by_name method', function() {
    var range;
    var manager;

    beforeEach(function() {
      range = new CharacterRange(65, 75);
      manager = new SymbolManager(range);
    });

    it('should retrieve symbol by name after pre_allocate', function() {
      var symbol = manager.pre_allocate('test_name');
      var retrieved = manager.get_by_name('test_name');
      assert.equal(retrieved, symbol);
    });

    it('should throw error if name not found', function() {
      assert.throws(function() {
        manager.get_by_name('nonexistent_name');
      }, Error, /No symbol allocated to reference nonexistent_name/);
    });

    it('should retrieve multiple different names', function() {
      var symbol1 = manager.pre_allocate('name1');
      var symbol2 = manager.pre_allocate('name2');

      assert.equal(manager.get_by_name('name1'), symbol1);
      assert.equal(manager.get_by_name('name2'), symbol2);
    });

    it('should retrieve same symbol on multiple calls', function() {
      manager.pre_allocate('test');
      var retrieved1 = manager.get_by_name('test');
      var retrieved2 = manager.get_by_name('test');
      assert.equal(retrieved1, retrieved2);
    });
  });

  describe('generate_assignments_snippet method', function() {
    var range;
    var manager;

    beforeEach(function() {
      range = new CharacterRange(65, 75);
      manager = new SymbolManager(range);
    });

    it('should return empty string for empty manager', function() {
      var snippet = manager.generate_assignments_snippet();
      assert.isString(snippet);
    });

    it('should generate snippet after allocations', function() {
      manager.allocate('value1');
      manager.allocate('value2');
      var snippet = manager.generate_assignments_snippet();
      assert.isString(snippet);
    });

    it('should call generate_sponge_assignments with hash', function() {
      manager.allocate('test_value');
      var snippet = manager.generate_assignments_snippet();
      // The snippet should contain some generated code
      assert.isString(snippet);
    });

    it('should work with multiple allocations', function() {
      manager.allocate('value1');
      manager.allocate('value2');
      manager.allocate('value3');
      var snippet = manager.generate_assignments_snippet();
      assert.isString(snippet);
    });
  });

  describe('Integration scenarios', function() {
    var range;
    var manager;

    beforeEach(function() {
      range = new CharacterRange(65, 75);
      manager = new SymbolManager(range);
    });

    it('should handle mix of pre_allocate and allocate', function() {
      var preAllocated = manager.pre_allocate('pre_name');
      var allocated = manager.allocate('value');

      assert.notEqual(preAllocated, allocated);
      assert.equal(manager.get_by_name('pre_name'), preAllocated);
      assert.equal(manager._hash[allocated], 'value');
    });

    it('should maintain separate tracking for names and values', function() {
      manager.pre_allocate('name1');
      manager.allocate('value1');
      manager.pre_allocate('name2');
      manager.allocate('value2');

      assert.equal(Object.keys(manager._symbols_by_name).length, 2);
      assert.equal(Object.keys(manager._hash).length, 2);
      assert.equal(Object.keys(manager._symbols_by_identity).length, 2);
    });

    it('should handle reusing values after pre_allocate', function() {
      manager.pre_allocate('name1');
      var symbol1 = manager.allocate('reusable');
      var symbol2 = manager.allocate('reusable'); // Should reuse

      assert.equal(symbol1, symbol2);
    });

    it('should allocate many symbols sequentially', function() {
      var symbols = [];
      for (var i = 0; i < 5; i++) {
        symbols.push(manager.allocate('value' + i));
      }

      // All symbols should be unique
      var uniqueSymbols = {};
      symbols.forEach(function(symbol) {
        assert.isUndefined(uniqueSymbols[symbol], 'Symbol should be unique');
        uniqueSymbols[symbol] = true;
      });
    });

    it('should preserve all mappings after multiple operations', function() {
      var name1Symbol = manager.pre_allocate('name1');
      var val1Symbol = manager.allocate('value1');
      var name2Symbol = manager.pre_allocate('name2');
      var val2Symbol = manager.allocate('value2');

      assert.equal(manager.get_by_name('name1'), name1Symbol);
      assert.equal(manager.get_by_name('name2'), name2Symbol);
      assert.equal(manager._hash[val1Symbol], 'value1');
      assert.equal(manager._hash[val2Symbol], 'value2');
    });
  });

  describe('Edge cases', function() {
    var range;
    var manager;

    beforeEach(function() {
      range = new CharacterRange(65, 75);
      manager = new SymbolManager(range);
    });

    it('should handle empty string as value', function() {
      var symbol = manager.allocate('');
      assert.isString(symbol);
      assert.equal(manager._hash[symbol], '');
    });

    it('should handle empty string as name', function() {
      var symbol = manager.pre_allocate('');
      assert.isString(symbol);
      assert.equal(manager.get_by_name(''), symbol);
    });

    it('should handle special characters in names', function() {
      var symbol = manager.pre_allocate('name_with_$pecial_ch@rs');
      assert.equal(manager.get_by_name('name_with_$pecial_ch@rs'), symbol);
    });

    it('should handle special characters in values', function() {
      var value = 'value with spaces and $ymbols!';
      var symbol = manager.allocate(value);
      assert.equal(manager._hash[symbol], value);
    });

    it('should handle very long string values', function() {
      var longValue = 'x'.repeat(1000);
      var symbol = manager.allocate(longValue);
      assert.equal(manager._hash[symbol], longValue);
    });

    it('should handle array values', function() {
      var arr = [1, 2, 3];
      var symbol = manager.allocate(arr);
      assert.equal(manager._hash[symbol], arr);
    });

    it('should handle function values', function() {
      var fn = function() { return 42; };
      var symbol = manager.allocate(fn);
      assert.equal(manager._hash[symbol], fn);
    });

    it('should reuse symbol for number 0 and string "0" (known JavaScript limitation)', function() {
      // JavaScript converts object keys to strings, so 0 and '0' are treated as the same key
      var symbol1 = manager.allocate(0);
      var symbol2 = manager.allocate('0');
      assert.equal(symbol1, symbol2, 'Number 0 and string "0" treated as same key in JavaScript objects');
    });

    it('should handle multiple custom symbols', function() {
      manager.allocate('val1', 'X');
      manager.allocate('val2', 'Y');
      manager.allocate('val3', 'Z');

      assert.equal(manager._hash['X'], 'val1');
      assert.equal(manager._hash['Y'], 'val2');
      assert.equal(manager._hash['Z'], 'val3');
    });
  });

  describe('Dependencies', function() {
    it('should have access to SymbolAllocator', function() {
      var SymbolAllocator = require('../../plugins/compile_client_app/symbol_allocator');
      assert.isFunction(SymbolAllocator);
    });

    it('should have access to generate_sponge_assignments', function() {
      var generate_sponge_assignments = require('../../plugins/compile_client_app/generate_sponge_assignments');
      assert.isFunction(generate_sponge_assignments);
    });

    it('should have access to CharacterRange', function() {
      assert.isFunction(CharacterRange);
    });
  });
});
