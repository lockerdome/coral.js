"use strict";

/**
 * @constructor
 * @param {SymbolAllocator} local_symbol_allocator
 * @param {SymbolAllocator} input_symbol_allocator
 * @param {SymbolAllocator} async_internal_symbol_allocator
 * @param {SymbolAllocator} sync_internal_symbol_allocator
 */
function InstantiationContext (local_symbol_allocator, input_symbol_allocator, async_internal_symbol_allocator, sync_internal_symbol_allocator, internal_symbol_hash) {
  this._locals = local_symbol_allocator;
  this._inputs = input_symbol_allocator;

  this._sync_internal_symbol_allocator = sync_internal_symbol_allocator;
  this._async_internal_symbol_allocator = async_internal_symbol_allocator;

  this._internal_symbols = internal_symbol_hash;

  this._allocated_locals = [];
  this._allocated_inputs = [];
}

/**
 * @private
 * @param {string} name
 * @param {SymbolAllocator} symbol_allocator
 * @returns {string}
 */
InstantiationContext.prototype._allocate_internal_symbol = function (name, symbol_allocator) {
  var existing_internal_symbol = this._internal_symbols[name];
  if (existing_internal_symbol) {
    return existing_internal_symbol;
  }

  var allocated_symbol = symbol_allocator.allocate();
  this._internal_symbols[name] = allocated_symbol;
  return allocated_symbol;
};

/**
 * @param {string} name A name to use for reference by the computable for obtaining this same internal by the computable in another phase.
 * @returns {string}
 */
InstantiationContext.prototype.allocate_sync_internal_symbol = function (name) {
  return this._allocate_internal_symbol(name, this._sync_internal_symbol_allocator);
};

/**
 * @param {string} name A name to use for reference by the computable for obtaining this same internal by the computable in another phase.
 * @returns {string}
 */
InstantiationContext.prototype.allocate_async_internal_symbol = function (name) {
  return this._allocate_internal_symbol(name, this._async_internal_symbol_allocator);
};

/**
 * @returns {string}
 */
InstantiationContext.prototype.allocate_local_symbol = function () {
  var symbol = this._locals.allocate();
  this._allocated_locals.push(symbol);

  return symbol;
};

/**
 * @returns {string}
 */
InstantiationContext.prototype.allocate_input_symbol = function () {
  var symbol = this._inputs.allocate();
  this._allocated_inputs.push(symbol);

  return symbol;
};

module.exports = InstantiationContext;
