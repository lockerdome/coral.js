"use strict";
var format = require('util').format;

var ScopeDataMarker = require('../../../ir/computables/scope_data_marker');

ScopeDataMarker.prototype.client_side_code_initialize_hook = function (compilation_context, execution_context) {
  var packed_args = execution_context.get_input_symbol(0);
  execution_context.add_setup_code(format('$$SCOPE_METHODS.mark_scope_data$$(%j)', packed_args));
};

/**
 * @override
 */
ScopeDataMarker.prototype.client_side_code_reference_hook = function (compilation_context, instantiation_context) {
};
