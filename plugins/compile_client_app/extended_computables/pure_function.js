"use strict";
var format = require('util').format;

var PureFunction = require('../../../ir/computables/pure_function');

/**
 * @override
 */
PureFunction.prototype.client_side_code_reference_hook = function (compilation_context, instantiation_context) {
  return instantiation_context.allocate_local_symbol();
};


PureFunction.prototype.client_side_code_async_pre_initialize_hook = function (compilation_context, execution_context) {
  var inputs = [];
  var input_count = execution_context.get_input_symbol_count();
  var needs_recompute = false;

  for (var i = 0; i < input_count; i++) {
    var input_symbol = execution_context.get_input_symbol(i);
    needs_recompute = needs_recompute || this.is_output_updated_on_input_change(i);
    inputs.push(input_symbol);
  }

  var compute_method = needs_recompute ? '$$SCOPE_METHODS.promise_async_compute$$' :'$$SCOPE_METHODS.promise_async_compute_no_recompute$$';
  var own_reference = execution_context.get_own_reference();
  var packed_args = JSON.stringify(own_reference + inputs.join(''));
  var function_str = this.get_function().toString();

  execution_context.add_setup_code(compute_method + '(' + function_str + ',' + packed_args + ')');
};

/**
 * @override
 */
PureFunction.prototype.client_side_code_initialize_hook = function (compilation_context, execution_context) {
  if (this.is_initially_async()) {
    return;
  }

  var inputs = [];
  var input_count = execution_context.get_input_symbol_count();
  var needs_recompute = false;
  var is_async = this.is_needed_for_async_pre_initialize_phase();

  for (var i = 0; i < input_count; i++) {
    var input_symbol = execution_context.get_input_symbol(i);
    needs_recompute = needs_recompute || this.is_output_updated_on_input_change(i);
    inputs.push(input_symbol);
  }

  var compute_method = is_async && needs_recompute ? '$$SCOPE_METHODS.async_compute$$'
    : is_async ? '$$SCOPE_METHODS.async_compute_no_recompute$$'
    : needs_recompute ? '$$SCOPE_METHODS.sync_compute$$'
    : '$$SCOPE_METHODS.sync_compute_no_recompute$$';


  var own_reference = execution_context.get_own_reference();
  var packed_args = own_reference + inputs.join('');
  var function_str = this.get_function().toString();

  execution_context.add_setup_code(format(compute_method+'(%s,%j)', function_str, packed_args));
};
