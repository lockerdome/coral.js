"use strict";

var VirtualElement = require('../../../ir/computables/virtual_element');

/**
 * @override
 */
VirtualElement.prototype.client_side_code_reference_hook = function (compilation_context, instantiation_context, scope_compilation_context) {
  return scope_compilation_context.get_symbols().special.ELEMENT_VIRTUAL;
};
