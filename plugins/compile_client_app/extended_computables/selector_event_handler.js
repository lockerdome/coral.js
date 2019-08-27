"use strict";

var SelectorEventHandler = require('../../../ir/computables/selector_event_handler');

/**
 * @param {CompilationContext} compilation_context
 * @param {ScopeCompilationContext} scope_compilation_context
 * @returns {string}
 */
SelectorEventHandler.prototype.internal_event_wiring_symbols_hook = function (compilation_context, scope_compilation_context) {
  var selector_global_symbol = compilation_context.allocate_global(this.get_selector());
  var input_symbols = this.generate_packed_args_hook(scope_compilation_context);

  return selector_global_symbol + this._function_global_symbol + input_symbols;
};
