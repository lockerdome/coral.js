"use strict";

var ConstantInitializedVariable = require('../../../ir/computables/constant_initialized_variable');

var util = require('util');
var format = util.format;

/**
 * @override
 */
ConstantInitializedVariable.prototype.has_client_side_code_initialize_hook = function () {
  return true;
};

/**
 * @override
 */
ConstantInitializedVariable.prototype.client_side_code_reference_hook = function (compilation_context, instantiation_context) {
  return instantiation_context.allocate_local_symbol();
};

/**
 * @override
 */
ConstantInitializedVariable.prototype.client_side_code_initialize_hook = function (compilation_context, execution_context) {
  // TODO: Ideally we'd do all of the constant initialized variables in one function call
  var value_global_symbol = compilation_context.allocate_global(this.get_value());

  var packed_args = [
    execution_context.get_own_reference(),
    value_global_symbol
  ].join('');

  execution_context.add_setup_code(format('$$SCOPE_METHODS.map_in_mutable_globals$$(%j)', packed_args));
};
