"use strict";
var format = require('util').format;

var Callback = require('../../../ir/computables/callback');

var util = require('util');
var format = util.format;

var generate_event_callback_packed_args = require('../generate_event_callback_packed_args');

/**
 * @override
 */
Callback.prototype.client_side_code_reference_hook = function (compilation_context, instantiation_context) {
  return instantiation_context.allocate_local_symbol();
};

/**
 * @override
 */
Callback.prototype.client_side_code_initialize_hook = function (compilation_context, execution_context) {
  var start_index = 0;
  var input_packed_args = generate_event_callback_packed_args(compilation_context.get_scope_compilation_context(this.get_containing_scope().get_identity()), this, start_index);

  var packed_args = execution_context.get_own_reference() + input_packed_args;
  var function_global_symbol = compilation_context.allocate_global(this.get_function());

  execution_context.add_setup_code(format('$$SCOPE_METHODS.setup_callback$$(Coral.sponges[%j],%j)', function_global_symbol, packed_args));
};
