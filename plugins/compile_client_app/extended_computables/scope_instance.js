"use strict";
var format = require('util').format;

var ScopeInstance = require('../../../ir/computables/scope_instance');
var VirtualPlacement = require('../../../ir/computables/virtual_placement');
var CompoundNestedPassthrough = require('../../../ir/computables/compound_nested_passthrough');


/**
 * Scopes have an async pre-initialize method that needs to be called in the async phase.
 *
 * @override
 */
ScopeInstance.prototype.is_needed_for_async_pre_initialize_phase = function () {
  return true;
};

/**
 * @override
 */
ScopeInstance.prototype.client_side_code_async_pre_initialize_hook = function (compilation_context, execution_context) {
  var _this = this;
  var scope_async_pre_init_reference = compilation_context.reference_weak_symbol(this.get_scope_definition().get_async_pre_init_identity());
  var scope_sync_init_reference = compilation_context.reference_weak_symbol(this.get_scope_definition().get_sync_init_identity());

  var creating_scope = this.get_scope_definition();
  var creating_scope_compilation_context = compilation_context.get_scope_compilation_context(creating_scope.get_identity());

  // TODO: deduplicate
  var async_input_output_symbols = (function (execution_context, creating_scope_compilation_context) {
    var async_symbols = execution_context.get_async_pre_init_symbol_range(0, execution_context.get_input_count());

    var async_output_count = creating_scope_compilation_context.get_async_output_count();
    var output_args = '';
    for (var i = 0; i !== async_output_count; ++i) {
      output_args += _this._field_name_references[_this._async_field_names[i]] || '$$SYMBOLS.special.IGNORE$$';
    }

    return async_symbols
      .concat(output_args)
      .join('');
  })(execution_context, creating_scope_compilation_context);

  var sync_input_output_symbols = (function (execution_context, creating_scope_compilation_context) {
    var i;
    var sync_symbols = execution_context.get_sync_init_non_async_pre_init_symbol_range(0, execution_context.get_input_count());

    var sync_output_count = creating_scope_compilation_context.get_sync_output_count();
    var output_args = '';
    for (i = 0; i !== sync_output_count; ++i) {
      var output_symbol = _this._field_name_references[_this._sync_field_names[i]];
      if (!output_symbol) {
        throw new Error("No sync output for field name "+_this._sync_field_names[i]+" this is problematic with how some sync fields are expected to be set such as after");
      }
      output_args += output_symbol;
    }

    return sync_symbols
      .concat(output_args)
      .join('');
  })(execution_context, creating_scope_compilation_context);

  var scope_symbol = execution_context.get_own_reference();

  var packed_args = [
    scope_symbol,
    scope_sync_init_reference,
    async_input_output_symbols,
    '$$SYMBOLS.special.SEPARATOR$$',
    sync_input_output_symbols
  ].join('');

  execution_context.add_setup_code(format('$$SCOPE_METHODS.instantiate_scope$$(Coral.sponges[%j],%j)', scope_async_pre_init_reference, packed_args));
};

/**
 * @override
 */
ScopeInstance.prototype.client_side_code_reference_hook = function (compilation_context, instantiation_context) {
  var creating_scope_compilation_context = compilation_context.get_scope_compilation_context(this.get_scope_definition().get_identity());

  var i;
  var field_name;

  var async_output_count = creating_scope_compilation_context.get_async_output_count();
  for (i = 0; i !== async_output_count; ++i) {
    field_name = creating_scope_compilation_context.get_async_output_field_name(i);
    this._async_field_names.push(field_name);
  }

  var sync_output_count = creating_scope_compilation_context.get_sync_output_count();
  for (i = 0; i !== sync_output_count; ++i) {
    field_name = creating_scope_compilation_context.get_sync_output_field_name(i);
    // TODO: We need to make sure the after symbol is assigned because things assume that will be set correctly and rely on being able to get at it.  There is effectively an implicit user of 'after' everywhere, even if it doesn't seem like it.
    this._field_name_references[field_name] = instantiation_context.allocate_sync_internal_symbol('sync-'+i);
    this._sync_field_names.push(field_name);
  }

  this._scope_symbol = instantiation_context.allocate_async_internal_symbol('scope');
  return this._scope_symbol;
};

/**
 * Scopes have a sync initialize method that need to be called in the sync phase.
 *
 * @override
 */
ScopeInstance.prototype.is_needed_for_sync_initialize_phase = function () {
  return true;
};

/**
 * @override
 */
ScopeInstance.prototype.client_side_code_initialize_hook = function (compilation_context, execution_context) {
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
  execution_context.add_setup_code(format('$$SCOPE_METHODS.sync_setup_scope$$(%j)', scope_symbol));
};

/**
 * @override
*/
ScopeInstance.prototype.get_client_side_input_metadata = function (index) {
  var creating_scope = this.get_scope_definition();
  var scope_parameter_computable = creating_scope.get_input(index);

  return {
    is_needed_for_async_pre_initialize_phase: scope_parameter_computable.is_needed_for_async_pre_initialize_phase(),
    is_needed_for_sync_initialize_phase: scope_parameter_computable.is_needed_for_sync_initialize_phase(),
    is_needed_for_update_cycle: scope_parameter_computable.is_needed_for_update_cycle(),
  };
};

/**
 * @override
 */
ScopeInstance.prototype.client_side_code_cleanup_hook = function (compilation_context, scope_compilation_context) {
  var contained_scope = this.get_scope_definition();
  var contained_scope_compilation_context = compilation_context.get_scope_compilation_context(contained_scope.get_identity());

  return contained_scope_compilation_context.get_cleanup_instructions().length ? this.get_scope_symbol(scope_compilation_context) : '';
};
