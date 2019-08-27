"use strict";

var CompoundNestedPassthrough = require('../../../ir/computables/compound_nested_passthrough');

/**
 * @override
 */
CompoundNestedPassthrough.prototype.client_side_code_reference_hook = function (compilation_context, instantiation_context, scope_compilation_context) {
  var reference;
  var parent_computable = this.get_parent();
  var field_name = this.get_field_name();

  if (parent_computable._field_name_references[field_name]) {
    reference = parent_computable._field_name_references[field_name];
  }

  // Specifically override any existing value with an output symbol, this is to make sure we don't wind up with something broken for after placements.
  // TODO: Clean all of this up
  if (this.get_containing_scope().is_output(this)) {
    reference = scope_compilation_context._get_output_symbol(this);
  }

  if (!reference) {
    var creating_scope = parent_computable.get_scope_definition();
    var output_computable = creating_scope.get_output_by_field_name(field_name);
    var is_async_field = output_computable.is_needed_for_async_pre_initialize_phase();
    reference = is_async_field ? instantiation_context.allocate_async_internal_symbol('field_output') : instantiation_context.allocate_sync_internal_symbol('field_output');
  }

  parent_computable._field_name_references[field_name] = reference;

  return reference;
};

/**
 * @override
 */
CompoundNestedPassthrough.prototype.has_client_side_code_initialize_hook = function () {
  return false;
};
