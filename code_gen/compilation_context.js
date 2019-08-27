"use strict";

var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;

var toSource = require('tosource');
var minify_stringified_function = require('./functions/minify');
var uglify = require('uglify-js');

var topologically_sort_computables = require('../ir/topologically_sort_computables');
var topologically_sort_scopes = require('../ir/topologically_sort_scopes');

/**
 * Represents the global compilation context when compiling an application.
 *
 * Manages all globals for the compiler.
 *
 * @constructor
 * @inherits EventEmitter
 * @param {Compiler} compiler
 * @param {Array.<Scope>} scopes
 * @param {boolean} minify
 */
function CompilationContext(compiler, scopes, minify) {
  this._compiler = compiler;
  this._scopes = topologically_sort_scopes(scopes).reverse();
  // TODO: This really doesn't need to be done for every CompilationContext instance
  this._minify = minify;

  this._scope_compilation_context_by_identity = {};
}

inherits(CompilationContext, EventEmitter);

/**
 * TODO: Potentially have this be aware of when the helper is used.
 *       Useful to also know what helpers use what helpers.
 *
 * @param {string} name
 * @returns {string} A symbol to use as a handle for the helper.
 */
CompilationContext.prototype.get_global_helper_symbol = function (name) {
  return this._global_symbols.get_by_name(name);
};


/**
 * TODO: consider if there is a better way than to expose this
 * @param {string} identity
 * @returns {ScopeCompilationContext}
 */
CompilationContext.prototype.get_scope_compilation_context = function (identity) {
  var scope_compilation_context = this._scope_compilation_context_by_identity[identity];

  if (!scope_compilation_context) {
    throw new Error("No scope compilation context for that identity, "+identity);
  }

  return scope_compilation_context;
};

/**
 * @returns {number}
 */
CompilationContext.prototype.get_scope_count = function () {
  return this._scopes.length;
};

/**
 * @param {number} index
 * @returns {?Scope}
 */
CompilationContext.prototype.get_scope = function (index) {
  return this._scopes[index];
};

/**
 * @param {*} val
 * @returns {string} The allocated symbol
 */
CompilationContext.prototype.allocate_global = function (val) {
  return this._allocate_global(val, this._global_symbols);
};

/**
 * Allocate to a custom name instead of an automatically determined one.
 *
 * @param {string} name The name that the global we be available at
 * @param {*} val The value to use for the global
 * @returns {string} The name parameter value.
 */
CompilationContext.prototype.allocate_named_global = function (name, value) {
  return this._allocate_global(value, this._global_symbols, name);
};

/**
* @returns {boolean}
*/
CompilationContext.prototype.needs_minification = function () {
  return !!this._minify;
};

/**
 * @param {*} val
 * @returns {string} An optimized string representation of the given value
 */
CompilationContext.prototype._create_optimized_representation = function (val) {
  var needs_minification = this.needs_minification();
  if (typeof val === 'object' && val !== null) {
    if (needs_minification) {
      return uglify.minify('sliceThisAndEqualOff=' + toSource(val, null, '') + ';', {
        fromString: true
      }).code.slice(21, -1) || '{}';
    } else {
      return toSource(val, null, '');
    }
  } else if (typeof val === 'function') {
    if (needs_minification) {
      return minify_stringified_function(val.toString());
    } else {
      return val.toString().replace(/^function anonymous/, 'function');
    }
  } else {
    return JSON.stringify(val);
  }
};

/**
 * @param {*} val The value to set the global symbol to.
 * @param {AssignableSymbolManager} manager Where to allocate the symbol
 * @param {string} symbol Used instead of allocating a new symbol
 * @returns {string} The symbol that can be used to reference the global by.
 */
CompilationContext.prototype._allocate_global = function (val, manager, symbol) {
  var stringified_val = this._create_optimized_representation(val);
  symbol = manager.allocate(stringified_val, symbol);
  this.emit('global_symbol_requested', symbol, stringified_val);
  return symbol;
};

/**
 * @returns {string} The weak symbol that can be used to reference the
 *                   global by when referencing it or resolving it.
 */
var next_weak_symbol = 0;
CompilationContext.define_weak_symbol = function () {
  return '_weak_'+(next_weak_symbol++)+'_';
};

/**
 * @param {string} weak_symbol The key to that will be used when resolving the global.
 * @returns {string} The symbol that can be used to reference the global by.
 */
CompilationContext.prototype.reference_weak_symbol = function (weak_symbol) {
  return this._global_symbols.get_by_name(weak_symbol);
};

/**
 * @param {string} weak_symbol
 * @param {function} value
 */
CompilationContext.prototype.resolve_weak_symbol = function (weak_symbol, value) {
  var symbol = this._global_symbols.pre_allocate(weak_symbol);
  return this._allocate_global(value, this._global_symbols, symbol);
};

module.exports = CompilationContext;
