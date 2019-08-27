"use strict";

var VirtualIntermediate = require('../../../ir/computables/virtual_intermediate');

/**
 * @override
 */
VirtualIntermediate.prototype.client_side_code_reference_hook = function (compilation_context, instantiation_context, scope_compilation_context) {
  return scope_compilation_context.get_symbols().special.PREVIOUS_INTERMEDIATE;
};

/**
 * @override
 */
VirtualIntermediate.prototype.has_client_side_code_initialize_hook = function () {
  return false;
};
