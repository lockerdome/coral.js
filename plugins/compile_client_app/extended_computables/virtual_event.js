"use strict";

var VirtualEvent = require('../../../ir/computables/virtual_event');

/**
 * @override
 */
VirtualEvent.prototype.client_side_code_reference_hook = function (compilation_context, instantiation_context, scope_compilation_context) {
  return scope_compilation_context.get_symbols().special.EVENT_VIRTUAL;
};
