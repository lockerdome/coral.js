"use strict";

var Constant = require('../../../ir/computables/constant');

/**
 * @override
 */
Constant.prototype.has_client_side_code_initialize_hook = function () {
  return false;
};

/**
 * @override
 */
Constant.prototype.client_side_code_reference_hook = function (compilation_context, instantiation_context) {
  var val = this.get_value();
  return compilation_context.allocate_global(val);
};
