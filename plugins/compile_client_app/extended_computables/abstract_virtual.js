"use strict";

var AbstractVirtual = require('../../../ir/computables/abstract_virtual');

/**
 * @override
 */
AbstractVirtual.prototype.has_client_side_code_initialize_hook = function () {
  return false;
};

/**
 * @override
 */
AbstractVirtual.prototype.client_side_code_reference_hook = function (compilation_context, instantiation_context) {
  throw new Error("This virtual has not overriden the client_side_code_reference_hook");
};
