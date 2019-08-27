"use strict";

var KeyEventHandler = require('../../../ir/computables/key_event_handler');

/**
 * @override
 */
KeyEventHandler.prototype.client_side_code_reference_hook = function (compilation_context, instantiation_context) {
  this._function_global_symbol = compilation_context.allocate_global(this.get_function());
  this._event_sequence_symbol = compilation_context.allocate_global(this._event_sequence);
  return this._function_global_symbol;
};

/**
 * @param {CompilationContext} compilation_context
 * @param {ScopeCompilationContext} scope_compilation_context
 * @returns {string} The symbols needed for wiring up a scope event handler for dispatch.
 */
KeyEventHandler.prototype.internal_event_wiring_symbols_hook = function (compilation_context, scope_compilation_context) {
  var input_symbols = this.generate_packed_args_hook(scope_compilation_context);
  return this._event_sequence_symbol + this._function_global_symbol + input_symbols;
};
