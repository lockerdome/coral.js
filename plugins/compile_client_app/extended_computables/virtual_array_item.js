"use strict";

var VirtualArrayItem = require('../../../ir/computables/virtual_array_item');

/**
 * @override
 */
VirtualArrayItem.prototype.client_side_code_reference_hook = function (compilation_context, instantiation_context, scope_compilation_context) {
  return scope_compilation_context.get_symbols().special.ITEM_VIRTUAL;
};

/**
 * @override
 */
VirtualArrayItem.prototype.has_client_side_code_initialize_hook = function () {
  return false;
};
