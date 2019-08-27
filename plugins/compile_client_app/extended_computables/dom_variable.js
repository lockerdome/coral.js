"use strict";
var format = require('util').format;

var DOMVariable = require('../../../ir/computables/dom_variable');

/**
 * DOM interacting elements should never, ever appear in the async pre-initialize phase.
 * @override
 */
DOMVariable.prototype.is_needed_for_async_pre_initialize_phase = function () {
  return false;
};

/**
 * @override
 */
DOMVariable.prototype.client_side_code_reference_hook = function (compilation_context, instantiation_context) {
  return instantiation_context.allocate_local_symbol();
};

/**
 * @override
 */
DOMVariable.prototype.client_side_code_initialize_hook = function (compilation_context, execution_context) {
  var placement_symbol = execution_context.get_input_symbol(0);
  var value_symbol = execution_context.get_input_symbol(1);
  var own_reference = execution_context.get_own_reference();

  var packed_args = [
    own_reference,
    value_symbol,
    placement_symbol
  ].join('');

  execution_context.add_setup_code(format('$$SCOPE_METHODS.create_and_insert_variable_text$$(%j)', packed_args));
};
