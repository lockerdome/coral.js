"use strict";
var format = require('util').format;

var ScopeDependency = require('../../../ir/computables/scope_dependency');

/**
 * @override
 */
ScopeDependency.prototype.is_needed_for_async_pre_initialize_phase = function () {
  return true;
};

/**
 * @override
 */
ScopeDependency.prototype.client_side_code_async_pre_initialize_hook = function (compilation_context, execution_context) {
  var to_symbol = execution_context.get_own_reference();
  var type_symbol = this._type === 'css' ? '0' : '1';
  var separator = "$$SYMBOLS.special.SEPARATOR$$";

  var packed_args = [to_symbol, type_symbol, this._url, separator];
  var input_count = execution_context.get_input_symbol_count();
  for (var i = 0; i < input_count; i++) {
    var input_symbol = execution_context.get_input_symbol(i);
    packed_args.push(input_symbol);
  }

  execution_context.add_setup_code(format('$$SCOPE_METHODS.load_dependency_when_ready$$(%j)', packed_args.join('')));
};

/**
 * @override
 */
ScopeDependency.prototype.client_side_code_reference_hook = function (compilation_context, instantiation_context) {
  return instantiation_context.allocate_local_symbol();
};
