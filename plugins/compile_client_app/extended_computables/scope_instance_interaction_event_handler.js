"use strict";

var ScopeInstanceInteractionEventHandler = require('../../../ir/computables/scope_instance_interaction_event_handler');

/**
 * @param {CompilationContext} compilation_context
 * @param {ScopeCompilationContext} scope_compilation_context
 * @returns {string}
 */
ScopeInstanceInteractionEventHandler.prototype.internal_event_wiring_symbols_hook = function (compilation_context, scope_compilation_context) {
  var input_symbols = this.generate_packed_args_hook(scope_compilation_context);
  var scope_instance_computable = this.get_scope_instance();
  return '$$SYMBOLS.special.IGNORE$$' + scope_compilation_context.get_computable_reference(scope_instance_computable) + this._function_global_symbol + input_symbols;
};
