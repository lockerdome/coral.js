"use strict";
var format = require('util').format;

var DOMText = require('../../../ir/computables/dom_text');

/**
 * DOM interacting elements should never, ever appear in the async pre-initialize phase.
 * @override
 */
DOMText.prototype.is_needed_for_async_pre_initialize_phase = function () {
  return false;
};

/**
 * @override
 */
DOMText.prototype.client_side_code_reference_hook = function (compilation_context, instantiation_context) {
  return instantiation_context.allocate_local_symbol();
};

/**
 * @override
 */
DOMText.prototype.client_side_code_initialize_hook = function (compilation_context, execution_context) {
  var text_string_symbol = compilation_context.allocate_global(this._text);
  var placement_symbol = execution_context.get_input_symbol(0);

  var create_and_insert_text_helper = compilation_context.get_global_helper_symbol('create_and_insert_text');

  var own_reference = execution_context.get_own_reference();
  var packed_args = [
    own_reference,
    text_string_symbol,
    placement_symbol
  ].join('');

  execution_context.add_setup_code(format('$$SCOPE_METHODS.sync_compute_no_recompute$$(Coral.sponges[%j],%j)', create_and_insert_text_helper, packed_args));
};
