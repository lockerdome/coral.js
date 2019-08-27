"use strict";
var format = require('util').format;

var DOMElement = require('../../../ir/computables/dom_element');

/**
 * DOM interacting elements should never, ever appear in the async pre-initialize phase.
 * @override
 */
DOMElement.prototype.is_needed_for_async_pre_initialize_phase = function () {
  return false;
};

/**
 * @override
 */
DOMElement.prototype.client_side_code_reference_hook = function (compilation_context, instantiation_context) {
  this._field_name_references.after = instantiation_context.allocate_sync_internal_symbol('after');
  this._field_name_references.inner = instantiation_context.allocate_sync_internal_symbol('inner');

  return this._field_name_references.after;
};

/**
 * @override
 */
DOMElement.prototype.client_side_code_initialize_hook = function (compilation_context, execution_context) {
  var placement_symbol = execution_context.get_input_symbol(0);

  // TODO: evaluate need to have special helpers for specific element types, especially "div", so we don't have to specify the "div" over and over.  Perhaps we could also have globals for the node types.

  var packed_args;

  var node_type_ref = compilation_context.allocate_global(this._node_type);
  var after_symbol = this._field_name_references.after;
  var inner_symbol = this._field_name_references.inner;
  var args = [
    node_type_ref,
    placement_symbol,
    after_symbol,
    inner_symbol
  ];

  if (!Object.keys(this._attributes).length) {
    packed_args = args.join('');
    execution_context.add_setup_code(format('$$SCOPE_METHODS.create_and_insert_element$$(%j)', packed_args));
    return;
  }

  var attr_computable_index = 1;
  var after_first_attribute = false;
  for (var attribute_name in this._attributes) {
    if (after_first_attribute) {
      args.push('$$SYMBOLS.special.SEPARATOR$$');
    } else {
      after_first_attribute = true;
    }

    var attribute_computables = this._attributes[attribute_name];

    args.push(compilation_context.allocate_global(attribute_name));

    for (var i = 0; i !== attribute_computables.length; ++i) {
      args.push(execution_context.get_input_symbol(attr_computable_index));
      attr_computable_index++;
    }
  }

  packed_args = args.join('');
  execution_context.add_setup_code(format('$$SCOPE_METHODS.create_and_insert_element_with_attributes$$(%j)', packed_args));
};
