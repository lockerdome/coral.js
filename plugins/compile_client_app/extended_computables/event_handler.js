"use strict";

var EventHandler = require('../../../ir/computables/event_handler');

var generate_event_callback_packed_args = require('../generate_event_callback_packed_args');

/**
 * @override
 */
EventHandler.prototype.client_side_code_reference_hook = function (compilation_context, instantiation_context) {
  this._function_global_symbol = compilation_context.allocate_global(this.get_function());
  return this._function_global_symbol;
};

/**
 * Event handlers do not wire themselves up, they are wired up by the ScopeCompilationContext in the form of packed instructions which is interpreted on demand.
 *
 * @override
 */
EventHandler.prototype.has_client_side_code_initialize_hook = function () {
  return false;
};

/**
 * @param {ScopeCompilationContext} scope_compilation_context
 * @returns {string}
 */
EventHandler.prototype.generate_packed_args_hook = function (scope_compilation_context) {
  return generate_event_callback_packed_args(scope_compilation_context, this, this.override_function_parameter_start_index);
};

/**
 * @param {CompilationContext} compilation_context
 * @param {ScopeCompilationContext} scope_compilation_context
 * @returns {string} The symbols needed for wiring up a scope event handler for dispatch.
 */
EventHandler.prototype.internal_event_wiring_symbols_hook = function (compilation_context, scope_compilation_context) {
  var input_symbols = this.generate_packed_args_hook(scope_compilation_context);
  return this._function_global_symbol + input_symbols;
};

/**
 * @override
 */
EventHandler.prototype.client_side_code_cleanup_hook = function (compilation_context, execution_context) {
  return this._event_type === 'initialize' ? '$$SYMBOLS.cleanup.EVENT_LISTENERS$$' : '';
};
