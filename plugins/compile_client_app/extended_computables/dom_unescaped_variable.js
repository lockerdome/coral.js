"use strict";
var format = require('util').format;

var DOMUnescapedVariable = require('../../../ir/computables/dom_unescaped_variable');

/**
 * DOM interacting elements should never, ever appear in the async pre-initialize phase.
 * @override
 */
DOMUnescapedVariable.prototype.is_needed_for_async_pre_initialize_phase = function () {
  return false;
};

/**
 * @override
 */
DOMUnescapedVariable.prototype.client_side_code_reference_hook = function (compilation_context, instantiation_context) {
  return instantiation_context.allocate_local_symbol();
};

/**
 * @override
 */
DOMUnescapedVariable.prototype.client_side_code_initialize_hook = function (compilation_context, execution_context) {
  var placement_symbol = execution_context.get_input_symbol(0);
  var value_symbol = execution_context.get_input_symbol(1);
  var create_and_insert_unescaped_string_helper = '$$SCOPE_METHODS.create_and_insert_unescaped_string$$';

  var own_reference = execution_context.get_own_reference();

  var packed_args = [
    own_reference,
    value_symbol,
    placement_symbol
  ].join('');

  execution_context.add_setup_code(format(create_and_insert_unescaped_string_helper+'(%j)', packed_args));
};
