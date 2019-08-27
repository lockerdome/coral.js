"use strict";

var VirtualArgs = require('../../../ir/computables/virtual_args');

/**
 * @override
 */
VirtualArgs.prototype.client_side_code_reference_hook = function (compilation_context, instantiation_context, scope_compilation_context) {
  return scope_compilation_context.get_symbols().special.ARGS_VIRTUAL;
};
