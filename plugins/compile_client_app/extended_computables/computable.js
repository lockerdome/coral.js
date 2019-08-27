"use strict";

var Computable = require('../../../ir/computable');
var IRDOMPlacementType = require('../../../ir/types/dom_placement');
var is_type_contained = require('../../../ir/is_type_contained');

/**
 * @returns {boolean}
 */
Computable.prototype.is_needed_for_async_pre_initialize_phase = function () {
  if (this._is_needed_for_async_pre_initialize_phase !== undefined) {
    return this._is_needed_for_async_pre_initialize_phase;
  }

  if (this.is_initially_async()) {
    this._is_needed_for_async_pre_initialize_phase = true;
    return true;
  }

  // Ensure model outputs are always async phase.
  if (this.get_containing_scope().is_output(this) && !this.get_containing_scope().get_output_by_field_name('after')) {
    return true;
  }

  var dependee_count = this.get_dependee_count();
  for (var i = 0; i < dependee_count; i++) {
    var dependee = this.get_dependee(i);
    var dependee_input_indexes = this.get_dependee_input_indexes(i);
    for (var j = 0; j < dependee_input_indexes.length; j++) {
      var dependee_input_metadata = dependee.get_client_side_input_metadata(dependee_input_indexes[j]);
      if (dependee_input_metadata.is_needed_for_async_pre_initialize_phase) {
        this._is_needed_for_async_pre_initialize_phase = true;
        return true;
      }
    }
  }
  this._is_needed_for_async_pre_initialize_phase = false;
  return false;
};

/**
 * @virtual
 * @param {CompilationContext} compilation_context
 * @param {InstantiationContext} instantiation_context
 * @param {ScopeCompilationContext} scope_compilation_context
 * @returns {string}
 */
Computable.prototype.client_side_code_reference_hook = function (compilation_context, instantiation_context, scope_compilation_context) {
  throw new Error("This subclass of Computable has not implemented client_side_code_reference_hook");
};

/**
 * @returns {boolean}
 */
Computable.prototype.is_needed_for_update_cycle = function () {
  if (this._is_needed_for_update_cycle !== undefined) {
    return this._is_needed_for_update_cycle;
  }

  if (this.is_mutable()) {
    this._is_needed_for_update_cycle = true;
    return true;
  }

  if (this.is_invariant()) {
    this._is_needed_for_update_cycle = false;
    return false;
  }

  // DOM placement inputs do not update.
  if (is_type_contained(new IRDOMPlacementType(), this.get_output_type())) {
    this._is_needed_for_update_cycle = false;
    return false;
  }

  var input_count = this.get_input_count();
  for (var i = 0; i !== input_count; ++i) {
    var input_computable = this.get_input(i);
    if (input_computable.is_needed_for_update_cycle()) {
      this._is_needed_for_update_cycle = true;
      return true;
    }
  }

  this._is_needed_for_update_cycle = false;
  return false;
};


// TODO: has_ is inconsistent, should use is_ and rename the function
/**
 * @returns {boolean}
 */
Computable.prototype.has_client_side_code_initialize_hook = function () {
  return true;
};

/**
 * @returns {boolean}
 */
Computable.prototype.is_needed_for_sync_initialize_phase = function () {
  if (this._is_needed_for_sync_initialize_phase  !== undefined) {
    return this._is_needed_for_sync_initialize_phase;
  }

  if (!this.is_needed_for_async_pre_initialize_phase()) {
    this._is_needed_for_sync_initialize_phase = true;
    return true;
  }

  var dependee_count = this.get_dependee_count();

  for (var i = 0; i < dependee_count; i++) {
    var dependee = this.get_dependee(i);
    var dependee_input_indexes = this.get_dependee_input_indexes(i);
    for (var j = 0; j < dependee_input_indexes.length; j++) {
      var dependee_input_metadata = dependee.get_client_side_input_metadata(dependee_input_indexes[j]);
      if (dependee_input_metadata.is_needed_for_sync_initialize_phase) {
        this._is_needed_for_sync_initialize_phase = true;
        return true;
      }
    }
  }

  this._is_needed_for_sync_initialize_phase = false;
  return false;
};

/**
 * TODO: Convert usages of this to return a string instead of calling a function with the return value.
 * @virtual
 * @param {CompilationContext} compilation_context
 * @param {ExecutionContext} execution_context
 */
Computable.prototype.client_side_code_initialize_hook = function (compilation_context, execution_context) {
  throw new Error("This subclass of Computable has not implemented client_side_code_initialize_hook");
};

/**
 * TODO: convert usages of this to return a string instead of calling a function with the return value.
 * @virtual
 * @param {CompilationContext} compilation_context
 * @param {ExecutionContext} execution_context
 */
Computable.prototype.client_side_code_async_pre_initialize_hook = function (compilation_context, execution_context) {
  throw new Error("This subclass of Computable has not implemented client_side_code_async_pre_initialize_hook");
};

/**
 * @param {number} index
 * @returns {{ is_needed_for_async_pre_initialize_phase: boolean, is_needed_for_sync_initialize_phase: boolean, is_needed_for_update_cycle: boolean }}
 */
Computable.prototype.get_client_side_input_metadata = function (index) {
  var is_needed_for_async_pre_initialize_phase = this.is_needed_for_async_pre_initialize_phase();
  var is_needed_for_update_cycle = this.is_needed_for_update_cycle();

  return {
    is_needed_for_async_pre_initialize_phase: is_needed_for_async_pre_initialize_phase,
    is_needed_for_sync_initialize_phase: !is_needed_for_async_pre_initialize_phase,
    is_needed_for_update_cycle: is_needed_for_update_cycle,
  };
};

/**
 * A hook for any special instructions the computable requires when it is disposed of client-side.
 *
 * I made the explicit decision to have all computables have a default cleanup hook instead of having a boolean getter and an optional cleanup hook that must be specified if the getter is true since they will likely have very similar logic and I don't want to potentially have a getter require the scope compilation context.
 * - I may revisit this later with a different way of structuring things, but this works for now.
 *
 * @param {CompilationContext} compilation_context
 * @param {ScopeCompilationContext} scope_compilation_context
 * @returns {string} Symbols that represent the cleanup instructions this computable requires.  Defaults to an empty string.
 */
Computable.prototype.client_side_code_cleanup_hook = function (compilation_context, scope_compilation_context) {
  return '';
};
