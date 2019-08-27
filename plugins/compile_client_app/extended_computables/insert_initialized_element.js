"use strict";
var format = require('util').format;

var InsertInitializedElement = require('../../../ir/computables/insert_initialized_element');


/**
 * @override
 */
InsertInitializedElement.prototype.client_side_code_reference_hook = function (compilation_context, instantiation_context) {
  return instantiation_context.allocate_local_symbol();
};

/**
 * @override
 */
InsertInitializedElement.prototype.is_needed_for_sync_initialize_phase = function () {
  return true;
};

/**
 * @override
 */
InsertInitializedElement.prototype.client_side_code_initialize_hook = function (compilation_context, execution_context) {
  var dom_output_symbol = execution_context.get_own_reference();
  var element_symbol = execution_context.get_input_symbol(0);
  var placement_symbol = execution_context.get_input_symbol(1);
  var packed_args = [
    dom_output_symbol,
    element_symbol,
    placement_symbol
  ].join('');

  execution_context.add_setup_code(format('$$SCOPE_METHODS.initialize_element_as_arg$$(%j)', packed_args));
};

/**
 * @override
 */
InsertInitializedElement.prototype.get_client_side_input_metadata = function (index) {
  return {
    is_needed_for_async_pre_initialize_phase: false,
    is_needed_for_sync_initialize_phase: true,
    is_needed_for_update_cycle: index === 0,
  };
};
