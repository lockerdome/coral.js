"use strict";
var format = require('util').format;

var IterateArray = require('../../../ir/computables/iterate_array');
var VirtualPlacement = require('../../../ir/computables/virtual_placement');

var INITIAL_INTERMEDIATE_COMPUTABLE_INDEX = 0;
var ARRAY_COMPUTABLE_INDEX = 1;
var INTERMEDIATE_VIRTUAL_INDEX = 2;
var ITEM_VIRTUAL_INDEX = 3;
var ARRAY_MAP_FUNCTION_INPUT_START_INDEX = 4;

/**
 * Determine the sync init output symbol string to use for binding to the outputs, in particular we will look for the intermediate output and add a special symbol there, and up to that point add special IGNORE symbols to note that we don't care about outputs other than the intermediate.
 * @param {ScopeCompilationContext} scope_compilation_context
 * @param {string} intermediate_output_field_name
 * @returns {Array.<string>}
 */
function generate_sync_init_output_symbols (scope_compilation_context, intermediate_output_field_name) {
  var output_symbols = '';

  var sync_output_count = scope_compilation_context.get_sync_output_count();
  for (var i = 0; i !== sync_output_count; ++i) {
    if (scope_compilation_context.get_sync_output_field_name(i) === intermediate_output_field_name) {
      output_symbols += '$$SYMBOLS.special.NEXT_INTERMEDIATE$$';
      break;
    } else {
      output_symbols += '$$SYMBOLS.special.IGNORE$$';
    }
  }

  return output_symbols;
}

/**
 * @override
 */
IterateArray.prototype.is_needed_for_async_pre_initialize_phase = function () {
  return true;
};

/**
 * @override
 */
IterateArray.prototype.client_side_code_async_pre_initialize_hook = function (compilation_context, execution_context) {
  var _this = this;

  var scope_array_symbol = execution_context.get_own_reference();
  var final_intermediate_output_symbol = this._field_name_references.after;

  var initial_intermediate_symbol = execution_context.get_sync_init_symbol_range(INITIAL_INTERMEDIATE_COMPUTABLE_INDEX, INITIAL_INTERMEDIATE_COMPUTABLE_INDEX + 1)[0];
  var items_array_symbol = execution_context.get_input_symbol(ARRAY_COMPUTABLE_INDEX);

  var identity_comparison_function_global_symbol = compilation_context.allocate_global(this._identity_comparison_function);

  var packed_args;

  if (this.is_mapless_single_option_iterate_array()) {
    var async_pre_init_function_symbol = compilation_context.reference_weak_symbol(this._choice_scopes[0].get_async_pre_init_identity());
    var sync_init_function_symbol = compilation_context.reference_weak_symbol(this._choice_scopes[0].get_sync_init_identity());

    var scope_input_output_symbols = (function (execution_context) {
      var async_input_symbols = execution_context.get_async_pre_init_symbol_range(_this._choice_input_computables_start_index, execution_context.get_input_count());

      var sync_input_symbols = execution_context.get_sync_init_non_async_pre_init_symbol_range(_this._choice_input_computables_start_index, execution_context.get_input_count());

      var choice_scope_compilation_context = compilation_context.get_scope_compilation_context(_this._choice_scopes[0].get_identity());
      var sync_output_symbols = generate_sync_init_output_symbols(choice_scope_compilation_context, _this._choice_output_paths[0]);

      return async_input_symbols.concat(
        '$$SYMBOLS.special.SEPARATOR$$',
        sync_input_symbols,
        sync_output_symbols
      );
    })(execution_context);

    packed_args = [
      scope_array_symbol,
      sync_init_function_symbol,
      items_array_symbol,
      initial_intermediate_symbol,
      final_intermediate_output_symbol,
      identity_comparison_function_global_symbol
    ]
    .concat(
      scope_input_output_symbols
    )
    .join('');

    execution_context.add_setup_code(format('$$SCOPE_METHODS.array_instantiate_scope$$(Coral.sponges[%j],%j)', async_pre_init_function_symbol, packed_args));
  } else {
    var map_function_global_symbol = compilation_context.allocate_global(this._array_map_function);
    var map_function_input_symbols = execution_context.get_async_pre_init_symbol_range(ARRAY_MAP_FUNCTION_INPUT_START_INDEX, this._choice_input_computables_start_index);

    var choice_option_symbols = (function (execution_context, choice_types, choice_scopes, choice_case_globals, choice_computable_indexes) {
      var option_symbols = [];

      for (var i = 0 ; i !== choice_types.length; ++i) {
        var global_case_symbol = choice_case_globals[i];
        var async_pre_init_function_symbol = compilation_context.reference_weak_symbol(choice_scopes[i].get_async_pre_init_identity());
        var sync_init_function_symbol = compilation_context.reference_weak_symbol(choice_scopes[i].get_sync_init_identity());
        var input_indexes = choice_computable_indexes[i];

        // TODO: Clean up gathering symbols for input indexes.
        var async_input_symbols = (function (input_indexes, get_symbol_range, execution_context) {
          var output = '';
          for (var j = 0; j !== input_indexes.length; ++j) {
            var input_index = input_indexes[j];
            output += get_symbol_range.call(execution_context, input_index, input_index + 1).join('');
          }

          return output;
        })(input_indexes, execution_context.get_async_pre_init_symbol_range, execution_context);

        var sync_input_symbols = (function (input_indexes, get_symbol_range, execution_context) {
          var output = '';
          for (var j = 0; j !== input_indexes.length; ++j) {
            var input_index = input_indexes[j];
            output += get_symbol_range.call(execution_context, input_index, input_index + 1).join('');
          }

          return output;
        })(input_indexes, execution_context.get_sync_init_non_async_pre_init_symbol_range, execution_context);

        var choice_scope_compilation_context = compilation_context.get_scope_compilation_context(_this._choice_scopes[i].get_identity());
        var sync_output_symbols = generate_sync_init_output_symbols(choice_scope_compilation_context, _this._choice_output_paths[i]);

        option_symbols = option_symbols.concat(
          '$$SYMBOLS.special.SEPARATOR_2$$',
          global_case_symbol,
          async_pre_init_function_symbol,
          sync_init_function_symbol,
          async_input_symbols,
          '$$SYMBOLS.special.SEPARATOR$$',
          sync_input_symbols,
          sync_output_symbols
        );
      }

      return option_symbols;
    })(execution_context, this._choice_types, this._choice_scopes, this._choice_case_globals, this._choice_computable_indexes);

    packed_args = [
      scope_array_symbol,
      items_array_symbol,
      initial_intermediate_symbol,
      final_intermediate_output_symbol,
      identity_comparison_function_global_symbol,
      map_function_global_symbol
    ]
    .concat(
      map_function_input_symbols,
      choice_option_symbols
    )
    .join('');

    execution_context.add_setup_code(format('$$SCOPE_METHODS.polymorphic_array_instantiate_scope$$(Coral.sponges[%j],%j)', map_function_global_symbol, packed_args));
  }
};

/**
 * @override
 */
IterateArray.prototype.is_needed_for_sync_initialize_phase = function () {
  return true;
};

/**
 * @override
 */
IterateArray.prototype.client_side_code_reference_hook = function (compilation_context, instantiation_context) {
  if (!this._choice_types.length) {
    throw new Error("Can't generate code for a IterateArray with no choices");
  }

  this._scope_array_symbol = instantiation_context.allocate_async_internal_symbol('scope_array');

  if (!this.is_mapless_single_option_iterate_array()) {
    this._choice_case_globals = [];
    for (var i = 0; i !== this._choice_types.length; ++i) {
      var choice_type = this._choice_types[i];
      this._choice_case_globals.push(compilation_context.allocate_global(choice_type.get_value()));
    }
  }

  var final_intermediate_symbol = instantiation_context.allocate_sync_internal_symbol('final_intermediate');

  this._field_name_references = {
    scope_array: this._scope_array_symbol,
    after: final_intermediate_symbol
  };

  return this._scope_array_symbol;
};

/**
 * @override
 */
IterateArray.prototype.client_side_code_initialize_hook = function (compilation_context, execution_context) {
  var input_count = this.get_input_count();
  var is_passed_as_arg = false;
  for (var i = 0; i !== input_count; ++i) {
    var input_computable = this.get_input(i);
    if (input_computable instanceof VirtualPlacement) {
      is_passed_as_arg = true;
      break;
    }
  }

  if (is_passed_as_arg) {
    return;
  }

  var initial_intermediate_symbol = execution_context.get_input_symbol(INITIAL_INTERMEDIATE_COMPUTABLE_INDEX);

  var scope_array_symbol = execution_context.get_internal_symbol_by_name('scope_array');

  var packed_args = scope_array_symbol;

  execution_context.add_setup_code(format("$$SCOPE_METHODS.array_sync_scope_setup$$(%j)", packed_args));
};

/**
 * @override
 */
 IterateArray.prototype.get_client_side_input_metadata = function (index) {
  var is_needed_for_async_pre_initialize_phase = false;
  var is_needed_for_sync_initialize_phase = false;

  var is_array_computable_in_update_cycle = this.get_input(ARRAY_COMPUTABLE_INDEX).is_needed_for_update_cycle();
  var is_needed_for_update_cycle = false;

  if (index === INITIAL_INTERMEDIATE_COMPUTABLE_INDEX || index === INTERMEDIATE_VIRTUAL_INDEX) {
    // It is pretty important that this only be handled at the sync phase, otherwise the IterateArray's items cannot be processed in parallel at the async phase.
    is_needed_for_async_pre_initialize_phase = false;
    is_needed_for_sync_initialize_phase = true;
    is_needed_for_update_cycle = false;
  } else if (this._is_array_map_function_index(index)) {
    // We should only ever run the map function at the async initialization phase or during the update cycle.
    is_needed_for_async_pre_initialize_phase = true;
    is_needed_for_sync_initialize_phase = false;
    is_needed_for_update_cycle = is_array_computable_in_update_cycle;
  } else if (index === ARRAY_COMPUTABLE_INDEX || index === ITEM_VIRTUAL_INDEX) {
    is_needed_for_async_pre_initialize_phase = true;
    is_needed_for_sync_initialize_phase = true;
    is_needed_for_update_cycle = is_array_computable_in_update_cycle;
  } else {
    var index_parameters = this.get_index_scope_parameters(index);

    // TODO: Think about whether I want to handle intermediate computable here

    // TODO: deduplicate with PolymorphicScopeInstance
    for (var i = 0; i !== index_parameters.length; ++i) {
      var index_parameter = index_parameters[i];
      if (!is_needed_for_async_pre_initialize_phase && index_parameter.is_needed_for_async_pre_initialize_phase()) {
        is_needed_for_async_pre_initialize_phase = true;
      }

      if (!is_needed_for_sync_initialize_phase && index_parameter.is_needed_for_sync_initialize_phase()) {
        is_needed_for_sync_initialize_phase = true;
      }

      is_needed_for_update_cycle = index_parameter.is_needed_for_update_cycle();
    }
  }

  return {
    is_needed_for_async_pre_initialize_phase: is_needed_for_async_pre_initialize_phase,
    is_needed_for_sync_initialize_phase: is_needed_for_sync_initialize_phase,
    is_needed_for_update_cycle: is_needed_for_update_cycle
  };
};

/**
 * @override
 */
IterateArray.prototype.client_side_code_cleanup_hook = function (compilation_context, scope_compilation_context) {
  for (var i = 0; i !== this._choice_scopes.length; ++i) {
    var choice_scope = this._choice_scopes[i];
    var contained_scope_compilation_context = compilation_context.get_scope_compilation_context(choice_scope.get_identity());
    var contained_scope_cleanup_instructions = contained_scope_compilation_context.get_cleanup_instructions();
    if (contained_scope_cleanup_instructions.length) {
      return this.get_scope_symbol(scope_compilation_context);
    }
  }

  return '';
};
