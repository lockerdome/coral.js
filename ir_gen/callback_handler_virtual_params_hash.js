"use strict";

module.exports = function (event_handler_virtual_params_hash) {
  var callback_handler_virtual_params = {};

  for (var virtual_param_name in event_handler_virtual_params_hash) {
    var event_handler_virtual_param = event_handler_virtual_params_hash[virtual_param_name];
    if (event_handler_virtual_param.requires_event) {
      continue;
    }

    callback_handler_virtual_params[virtual_param_name] = event_handler_virtual_param;
  }

  callback_handler_virtual_params.args = {
    create: function (scope) {
      var VirtualArgs = require('../ir/computables/virtual_args');
      return new VirtualArgs(scope);
    }
  };

  return callback_handler_virtual_params;
};
