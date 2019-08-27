"use strict";
var format = require('util').format;

var AbstractChannelHandler = require('../../../ir/computables/abstract_channel_handler');

/**
 * @override
 */
AbstractChannelHandler.prototype.client_side_code_reference_hook = function (compilation_context, instantiation_context) {
  return null;
};

/**
 * @override
 */
AbstractChannelHandler.prototype.client_side_code_initialize_hook = function (compilation_context, execution_context, scope_compilation_context) {
  var constants = this.get_client_side_code_constants();
  var channel_args = '' + constants.channel_type_symbol;
  var regex = new RegExp('^' + constants.match_name + '_');
  for (var i = 0; i < this._handler_names.length; ++i) {
    channel_args += compilation_context.allocate_global(this._handler_names[i].replace(regex, ''));
    channel_args += scope_compilation_context._reference_by_identity[this.get_input(i).get_identity()];
  }
  execution_context.add_setup_code(format('$$SCOPE_METHODS.setup_channels$$(%j)', channel_args));
};
