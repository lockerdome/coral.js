"use strict";

var VirtualArrayItemIndex = require('../../../ir/computables/virtual_array_item_index');

/**
 * @override
 */
VirtualArrayItemIndex.prototype.client_side_code_reference_hook = function (compilation_context, instantiation_context, scope_compilation_context) {
  return scope_compilation_context.get_symbols().special.ITEM_INDEX_VIRTUAL;
};

/**
 * @override
 */
VirtualArrayItemIndex.prototype.has_client_side_code_initialize_hook = function () {
  return false;
};
