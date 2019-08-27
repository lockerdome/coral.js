"use strict";

var ScopeInstance = require('../../ir/computables/scope_instance');
var InsertInitializedElement = require('../../ir/computables/insert_initialized_element');

var PolymorphicScopeInstance = require('../../ir/computables/polymorphic_scope_instance');
var IterateArray = require('../../ir/computables/iterate_array');
var IRDomPlacementType = require('../../ir/types/dom_placement');

function generate_event_callback_packed_args (scope_compilation_context, computable, start_index) {
  var input_symbols = '';
  var input_count = computable.get_input_count();

  for (var i = start_index; i !== input_count; ++i) {
    var input_computable = computable.get_input(i);

    var is_element_as_arg = false;
    if (input_computable.is_scope_parameter()) {
      var dependee_count = input_computable.get_dependee_count();
      for (var j = 0; j < dependee_count; ++j) {
        var dependee_computable = input_computable.get_dependee(j);

        if (dependee_computable && dependee_computable instanceof InsertInitializedElement) {
          is_element_as_arg = true;
          break;
        }
      }
    }

    var is_scope_instance_type = input_computable instanceof ScopeInstance || input_computable instanceof PolymorphicScopeInstance || input_computable instanceof IterateArray;

    // TODO: Hack for whether it is an element or not
    var is_model = input_computable instanceof ScopeInstance && !(input_computable.get_output_type().get_key_type('after') instanceof IRDomPlacementType);

    var use_unpacked = computable.is_input_using_parameter_option(i, 'unpacked');

    if (is_element_as_arg) {
      input_symbols += '$$SYMBOLS.special.FLAG$$' + scope_compilation_context.get_computable_reference(input_computable);
    } else if (is_scope_instance_type && !is_model) {
      input_symbols += '$$SYMBOLS.special.FLAG$$' + input_computable.get_scope_symbol();
    } else if (is_scope_instance_type && is_model) {
      input_symbols += input_computable.get_field_name_reference('output');
    } else if (use_unpacked) {
      input_symbols += '$$SYMBOLS.special.USE_UNPACKED$$' + scope_compilation_context.get_computable_reference(input_computable);
    } else {
      input_symbols += scope_compilation_context.get_computable_reference(input_computable);
    }
  }
  return input_symbols;
}

module.exports = generate_event_callback_packed_args;
