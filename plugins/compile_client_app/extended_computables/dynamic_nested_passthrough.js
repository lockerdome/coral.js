"use strict";
var format = require('util').format;

var DynamicNestedPassthrough = require('../../../ir/computables/dynamic_nested_passthrough');


/**
 * @override
 */
DynamicNestedPassthrough.prototype.client_side_code_reference_hook = function (compilation_context, instantiation_context) {
  return instantiation_context.allocate_local_symbol();
};

/**
 * @override
 */
DynamicNestedPassthrough.prototype.client_side_code_initialize_hook = function (compilation_context, execution_context, scope_compilation_context) {
  var base_computable = this.get_input(0);
  var dynamic_path_computable = this.get_input(1);
  var own_reference = execution_context.get_own_reference();
  var source_computable_symbol = scope_compilation_context.get_computable_reference(base_computable);
  var dynamic_path_computable_symbol = scope_compilation_context.get_computable_reference(dynamic_path_computable);

  var packed_args = [
    own_reference,
    source_computable_symbol,
    dynamic_path_computable_symbol
  ].join('');

  execution_context.add_setup_code(format('$$SCOPE_METHODS.dynamic_nested_compute$$(%j)', packed_args));
};
