"use strict";
var format = require('util').format;

var DOMInlineElement = require('../../../ir/computables/dom_inline_element');

/**
 * DOM interacting elements should never, ever appear in the async pre-initialize phase.
 * @override
 */
DOMInlineElement.prototype.is_needed_for_async_pre_initialize_phase = function () {
  return false;
};

/**
 * @override
 */
DOMInlineElement.prototype.client_side_code_reference_hook = function (compilation_context, instantiation_context) {
  return instantiation_context.allocate_local_symbol();
};

/**
 * @override
 */
DOMInlineElement.prototype.client_side_code_initialize_hook = function (compilation_context, execution_context) {
  var html_string_symbol = compilation_context.allocate_global(this._html);
  var placement_symbol = execution_context.get_input_symbol(0);
  var create_and_insert_inline_html_element_helper = compilation_context.get_global_helper_symbol('create_and_insert_inline_html_element');

  var own_reference = execution_context.get_own_reference();

  var packed_args = [
    own_reference,
    html_string_symbol,
    placement_symbol
  ].join('');

  execution_context.add_setup_code(format('$$SCOPE_METHODS.sync_compute_no_recompute$$(Coral.sponges[%j],%j)', create_and_insert_inline_html_element_helper, packed_args));
};
