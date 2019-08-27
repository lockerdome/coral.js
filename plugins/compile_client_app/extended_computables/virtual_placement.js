"use strict";

var VirtualPlacement = require('../../../ir/computables/virtual_placement');

/**
 * @override
 */
VirtualPlacement.prototype.client_side_code_reference_hook = function (compilation_context, instantiation_context, scope_compilation_context) {
  return scope_compilation_context.get_symbols().special.PLACEMENT_VIRTUAL;
};
