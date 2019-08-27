"use strict";

/**
 * @constructor
 * @param {CharacterRange} character_range
 */
function SymbolAllocator (character_range) {
  this._character_range = character_range;
  this._allocated_symbols = [];
  this._index = 0;
}

/**
 * Create clone of allocator, preserving the current state.
 * @returns {SymbolAllocator}
 */
SymbolAllocator.prototype.clone = function () {
  var clone = new SymbolAllocator(this._character_range);
  clone._allocated_symbols = this._allocated_symbols.slice();
  clone._index = this._index;
  return clone;
};

/**
 * Allocate the first unused valid symbol in character range.
 * @throws Error When the allocate function no longer has symbols to allocate from any range.
 * @returns {string} The allocated symbol
 */
SymbolAllocator.prototype.allocate = function () {
  var symbol = this._character_range.get_character(this._index++);
  if (!symbol) {
    var range = this._character_range.toString();
    throw new Error("Ran out of valid symbols with character range " + range);
  } else {
    this._allocated_symbols.push(symbol);
    return symbol;    
  }
};

/**
 * @returns {number}
 */
SymbolAllocator.prototype.get_symbol_count = function () {
  return this._allocated_symbols.length;
};

/**
 * @param {number} index
 * @returns {?string}
 */
SymbolAllocator.prototype.get_symbol = function (index) {
  return this._allocated_symbols[index];
};

module.exports = SymbolAllocator;
