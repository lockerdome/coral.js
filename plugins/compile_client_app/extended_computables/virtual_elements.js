"use strict";

var VirtualElements = require('../../../ir/computables/virtual_elements');

/**
 * @override
 */
VirtualElements.prototype.client_side_code_reference_hook = function (compilation_context, instantiation_context, scope_compilation_context) {
  return scope_compilation_context.get_symbols().special.ELEMENTS_VIRTUAL;
};
