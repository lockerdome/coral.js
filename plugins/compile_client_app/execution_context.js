"use strict";

// TODO: We will likely want to have multi-character references for computable at some point, but we can generally get by without using various tricks.  This code assumes that everything is done with single character references.
// * Things get really complicated once we start having very strange virtual computables.

// TODO: I'm not really happy with the interface provided here, it just isn't quite right.

/**
 * @constructor
 * @param {string} reference
 * @param {string} phase_adjusted_input_references
 * @param {string} async_pre_init_input_references
 * @param {string} sync_init_input_references
 * @param {Object} internal_symbol_hash
 */
function ExecutionContext(reference, phase_adjusted_input_symbols, async_pre_init_input_symbols, sync_init_input_symbols, internal_symbol_hash) {
  this._reference = reference;
  this._input_symbols = phase_adjusted_input_symbols;

  this._async_pre_init_input_symbols = async_pre_init_input_symbols;
  this._sync_init_input_symbols = sync_init_input_symbols;

  this._internal_symbols = internal_symbol_hash;
  this._setup_code = '';
}

/**
 * @returns {number}
 */
ExecutionContext.prototype.get_input_count = function () {
  return this._input_symbols.length;
};

/**
 * @param {number} index
 * @returns {string}
 */
ExecutionContext.prototype.get_input_symbol = function (index) {
  return this._input_symbols[index];
};

/**
 * @returns {number}
 */
ExecutionContext.prototype.get_input_symbol_count = function () {
  return this._input_symbols.length;
};

/**
 * @param {number} start_index
 * @param {number} end_index
 * @returns {string}
 */
ExecutionContext.prototype.get_async_pre_init_symbol_range = function (start_index, end_index) {
  return this._async_pre_init_input_symbols.slice(start_index, end_index).filter(function (sym) {
    return !!sym;
  });
};

/**
 * @param {number} start_index
 * @param {number} end_index
 * @returns {string}
 */
ExecutionContext.prototype.get_async_pre_init_non_sync_init_symbol_range = function (start_index, end_index) {
  var sync_init_input_symbols = this._sync_init_input_symbols;

  return this._async_pre_init_input_symbols.slice(start_index, end_index).filter(function (sym, index) {
    return sym && !sync_init_input_symbols[start_index + index];
  });
};

/**
 * @param {number} start_index
 * @param {number} end_index
 * @returns {string}
 */
ExecutionContext.prototype.get_sync_init_non_async_pre_init_symbol_range = function (start_index, end_index) {
  var async_pre_init_input_symbols = this._async_pre_init_input_symbols;

  return this._sync_init_input_symbols.slice(start_index, end_index).filter(function (sym, index) {
    return sym && !async_pre_init_input_symbols[start_index + index];
  });
};

/**
 * @param {number} start_index
 * @param {number} end_index
 * @returns {string}
 */
ExecutionContext.prototype.get_sync_init_symbol_range = function (start_index, end_index) {
  return this._sync_init_input_symbols.slice(start_index, end_index).filter(function (sym) {
    return !!sym;
  });
};

/**
 * @returns {string}
 */
ExecutionContext.prototype.get_own_reference = function () {
  return this._reference;
};

/**
 * @param {string} name
 * @returns {string}
 * @throws {Error} If the given name does not correspond to an allocated internal symbol.
 */
ExecutionContext.prototype.get_internal_symbol_by_name = function (name) {
  var symbol = this._internal_symbols[name];
  if (!symbol) {
    throw new Error("No internal symbol at the name, "+name);
  }

  return symbol;
};

/**
 * @param {string} code_snippet
 */
ExecutionContext.prototype.add_setup_code = function (code_snippet) {
  this._setup_code += code_snippet;
};

/**
 * @returns {string}
 */
ExecutionContext.prototype.get_setup_code = function () {
  return this._setup_code;
};

module.exports = ExecutionContext;
