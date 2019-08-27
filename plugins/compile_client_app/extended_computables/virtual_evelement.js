"use strict";

var VirtualEvElement = require('../../../ir/computables/virtual_evelement');

/**
 * @override
 */
VirtualEvElement.prototype.client_side_code_reference_hook = function (compilation_context, instantiation_context, scope_compilation_context) {
  return scope_compilation_context.get_symbols().special.EVELEMENT_VIRTUAL;
};
