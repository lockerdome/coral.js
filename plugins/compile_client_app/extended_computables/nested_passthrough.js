"use strict";
var format = require('util').format;

var NestedPassthrough = require('../../../ir/computables/nested_passthrough');

/**
 * @override
 */
NestedPassthrough.prototype.client_side_code_reference_hook = function (compilation_context, instantiation_context) {
  if (this.has_client_side_code_initialize_hook()) {
    return instantiation_context.allocate_local_symbol();
  }
};

/**
 * @override
 */
NestedPassthrough.prototype.has_client_side_code_initialize_hook = function () {
  var dependee_count = this.get_dependee_count();
  var has_dependees_other_than_nested_passthrough = false;

  for (var i = 0; i < dependee_count; ++i) {
    var dependee = this.get_dependee(i);
    if (dependee && !(dependee instanceof NestedPassthrough)) {
      has_dependees_other_than_nested_passthrough = true;
      break;
    }
  }

  return has_dependees_other_than_nested_passthrough;
};

/**
 * @override
 */
NestedPassthrough.prototype.client_side_code_initialize_hook = function (compilation_context, execution_context, scope_compilation_context) {
  var base_computable = this.get_input(0);
  var property_path = [this.get_field_name()];

  while (base_computable instanceof NestedPassthrough) {
    property_path.unshift(base_computable.get_field_name());
    base_computable = base_computable.get_input(0);
  }

  var own_reference = execution_context.get_own_reference();
  var source_computable_symbol = scope_compilation_context.get_computable_reference(base_computable);

  var property_path_array_symbol = compilation_context.allocate_global(property_path);

  var args = [
    own_reference,
    source_computable_symbol,
    property_path_array_symbol
  ];
  var packed_args = args.join('');
  execution_context.add_setup_code(format('$$SCOPE_METHODS.nested_compute$$(%j)', packed_args));
};
