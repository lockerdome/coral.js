"use strict";
var format = require('util').format;

var PolymorphicScopeInstance = require('../../../ir/computables/polymorphic_scope_instance');
var VirtualPlacement = require('../../../ir/computables/virtual_placement');
var IRExactValueType = require('../../../ir/types/exact_value');

var indexed_choice_input_output_symbols = require('../../../ir/computables/indexed_choice_input_output_symbols');


/**
 * @override
 */
PolymorphicScopeInstance.prototype.is_needed_for_async_pre_initialize_phase = function () {
  return true;
};

/**
 * @override
 */
PolymorphicScopeInstance.prototype.client_side_code_async_pre_initialize_hook = function (compilation_context, execution_context) {
  var own_reference = execution_context.get_own_reference();
  var condition_symbol = execution_context.get_input_symbol(0);
  var _this = this;

  var packed_args;
  var sync_output_symbols = '$$SYMBOLS.special.IGNORE$$';
  var async_output_symbols = '';

  if (this.is_truthy_falsy()) {
    var truthy_async_pre_init_symbol = compilation_context.reference_weak_symbol(this._choice_scopes[0].get_async_pre_init_identity());
    var truthy_sync_init_symbol = compilation_context.reference_weak_symbol(this._choice_scopes[0].get_sync_init_identity());
    var truthy_input_output_symbols = indexed_choice_input_output_symbols(execution_context, this._choice_computable_indexes[0], async_output_symbols, sync_output_symbols);

    var falsy_async_pre_init_symbol = compilation_context.reference_weak_symbol(this._choice_scopes[1].get_async_pre_init_identity());
    var falsy_sync_init_symbol = compilation_context.reference_weak_symbol(this._choice_scopes[1].get_sync_init_identity());
    var falsy_input_output_symbols = indexed_choice_input_output_symbols(execution_context, this._choice_computable_indexes[1], async_output_symbols, sync_output_symbols);

    packed_args = [
      own_reference,
      condition_symbol,
      truthy_sync_init_symbol
    ]
    .concat(
      truthy_input_output_symbols,
      '$$SYMBOLS.special.SEPARATOR_2$$',
      falsy_async_pre_init_symbol,
      falsy_sync_init_symbol,
      falsy_input_output_symbols
    )
    .join('');

    execution_context.add_setup_code(format('$$SCOPE_METHODS.conditional_instantiate_scope$$(Coral.sponges[%j],%j)', truthy_async_pre_init_symbol, packed_args));
  } else {
    var first_async_pre_init_symbol = compilation_context.reference_weak_symbol(this._choice_scopes[0].get_async_pre_init_identity());

    var args = [
      own_reference,
      condition_symbol
    ];
    for (var i = 0; i !== this._choice_types.length; ++i) {
      var choice_type = this._choice_types[i];
      var choice_case_global_symbol = this._choice_case_globals[i];
      var async_pre_init_symbol = compilation_context.reference_weak_symbol(this._choice_scopes[i].get_async_pre_init_identity());
      var sync_init_symbol = compilation_context.reference_weak_symbol(this._choice_scopes[i].get_sync_init_identity());

      var choice_input_output_symbols = indexed_choice_input_output_symbols(execution_context, this._choice_computable_indexes[i], async_output_symbols, sync_output_symbols);

      if (i !== 0) {
        args.push('$$SYMBOLS.special.SEPARATOR_2$$');
      }

      args.push(choice_case_global_symbol);
      if (i !== 0) {
        args.push(async_pre_init_symbol);
      }

      args = args.concat(
        sync_init_symbol,
        choice_input_output_symbols
      );
    }

    packed_args = args.join('');

    execution_context.add_setup_code(format('$$SCOPE_METHODS.polymorphic_instantiate_scope$$(Coral.sponges[%j],%j)', first_async_pre_init_symbol, packed_args));
  }
};

/**
 * @override
 */
PolymorphicScopeInstance.prototype.client_side_code_reference_hook = function (compilation_context, instantiation_context) {
  if (!this._choice_types.length) {
    throw new Error("Can't generate code for polymorphic scope with no choices");
  }

  if (!this.is_truthy_falsy()) {
    this._choice_case_globals = [];
    for (var j = 0; j !== this._choice_types.length; ++j) {
      var choice_type = this._choice_types[j];
      if (!(choice_type instanceof IRExactValueType)) {
        throw new Error("Cannot have truthy or falsy types alone or mixed with IRExactValueTypes");
      }
      this._choice_case_globals.push(compilation_context.allocate_global(choice_type.get_value()));
    }
  }

  // They all have the same compound output, so we only have to do this for one scope.
  var creating_scope_compilation_context = compilation_context.get_scope_compilation_context(this._choice_scopes[0].get_identity());

  var i;
  var field_name;

  var sync_output_count = creating_scope_compilation_context.get_sync_output_count();
  if (sync_output_count !== 1 && creating_scope_compilation_context.get_sync_output_field_name(0) !== 'after') {
    throw new Error("Expected only an after output for scopes");
  }
  this._field_name_references.after = instantiation_context.allocate_sync_internal_symbol('after');
  this._scope_symbol = instantiation_context.allocate_async_internal_symbol('scope');
  return this._scope_symbol;
};

/**
 * @override
 */
PolymorphicScopeInstance.prototype.is_needed_for_sync_initialize_phase = function () {
  return true;
};

/**
 * @override
 */
PolymorphicScopeInstance.prototype.client_side_code_initialize_hook = function (compilation_context, execution_context) {
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

  var scope_symbol = execution_context.get_own_reference();
  var after_symbol = this._field_name_references.after;
  execution_context.add_setup_code(format('$$SCOPE_METHODS.sync_setup_polymorphic_scope$$(%j)', scope_symbol + after_symbol));
};

/**
 * @override
 */
 PolymorphicScopeInstance.prototype.get_client_side_input_metadata = function (index) {
   var is_needed_for_async_pre_initialize_phase = false;
   var is_needed_for_sync_initialize_phase = false;
   var is_needed_for_update_cycle = false;

   if (index === 0) {
     // We need the choice computable to create the necessary scope instance and invoke its async pre-initialize function, so we absolutely need it in the async pre-initialize step.
     is_needed_for_async_pre_initialize_phase = true;
     is_needed_for_sync_initialize_phase = false;
     is_needed_for_update_cycle = this.get_input(0).is_needed_for_update_cycle();
   } else {
     var index_parameters = this.get_index_scope_parameters(index);

     for (var i = 0; i < index_parameters.length; i++) {
       var index_parameter = index_parameters[i];
       if (!is_needed_for_async_pre_initialize_phase && index_parameter.is_needed_for_async_pre_initialize_phase()) {
         is_needed_for_async_pre_initialize_phase = true;
       }

       if (!is_needed_for_sync_initialize_phase && index_parameter.is_needed_for_sync_initialize_phase()) {
         is_needed_for_sync_initialize_phase = true;
       }

       // TODO: Ummmm, this logic doesn't seem right.  If one of the index input computables isn't needed for the update cycle then this index isn't?
       is_needed_for_update_cycle = index_parameter.is_needed_for_update_cycle();
     }
   }

  return {
    is_needed_for_async_pre_initialize_phase: is_needed_for_async_pre_initialize_phase,
    is_needed_for_sync_initialize_phase: is_needed_for_sync_initialize_phase,
    is_needed_for_update_cycle: is_needed_for_update_cycle,
  };
};

/**
 * @override
 */
PolymorphicScopeInstance.prototype.client_side_code_cleanup_hook = function (compilation_context, scope_compilation_context) {
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
