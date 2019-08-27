"use strict";

var VirtualEmitEvent = require('../../../ir/computables/virtual_emitevent');

/**
 * @override
 */
VirtualEmitEvent.prototype.client_side_code_reference_hook = function (compilation_context, instantiation_context, scope_compilation_context) {
  return scope_compilation_context.get_symbols().special.EMITEVENT_VIRTUAL;
};
