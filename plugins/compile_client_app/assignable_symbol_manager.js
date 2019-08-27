"use strict";

var SymbolAllocator = require('./symbol_allocator');
var generate_sponge_assignments = require('./generate_sponge_assignments');

/**
 * Essentially a glorified data store for SymbolAllocator
 * @param {CharacterRange} range
 */
function SymbolManager (range) {
  this._allocator = new SymbolAllocator(range);
  this._hash = {};
  this._symbols_by_name = {};
  this._symbols_by_identity = {};
}

/**
 * @returns {string} A JavaScript code snippet that assigns all of the allocated symbols.
 */
SymbolManager.prototype.generate_assignments_snippet = function () {
  return generate_sponge_assignments(this._hash);
};

/**
 * @param {string} name
 */
SymbolManager.prototype.get_by_name = function (name) {
  if (!this._symbols_by_name.hasOwnProperty(name)) {
    throw new Error('No symbol allocated to reference ' + name);
  }
  return this._symbols_by_name[name];
};

/**
 * Allocate a symbol for an unknown value.
 * @param {string} name Temporary reference to allocated symbol
 * @returns {string} symbol
 */
SymbolManager.prototype.pre_allocate = function (name) {
  if (this._symbols_by_name.hasOwnProperty(name)) {
    throw new Error('Symbol reference ' + name + ' is already taken.');
  }

  var symbol = this._allocator.allocate();
  this._symbols_by_name[name] = symbol;

  return symbol;
};

/**
 * Allocate a symbol and map it to its value.
 * @param {*} value
 * @param {string} symbol Optional custom hash key
 * @returns {string} symbol
 */
SymbolManager.prototype.allocate = function (value, symbol) {

  // If symbol given, ensure it wont overwrite an existing symbol
  if (symbol && this._hash.hasOwnProperty(symbol)) {
    throw new Error('Symbol ' + symbol + ' is already allocated.');
  }

  // If no symbol given, try to return existing symbol with the value.
  if (!symbol && this._symbols_by_identity.hasOwnProperty(value)) {
    return this._symbols_by_identity[value];
  }

  symbol = symbol || this._allocator.allocate();
  this._hash[symbol] = value;
  this._symbols_by_identity[value] = symbol;

  return symbol;
};

module.exports = SymbolManager;
