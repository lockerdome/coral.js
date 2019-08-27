"use strict";
/**
 * This optimization locates scopes that are only used in one place
 * (have only one instance) and converts them to an inline scope.
 * An 'inline scope' is really just taking all of the computables from
 * a scope and moving them to the same place as its only instance, then
 * remapping those to the parameters and dropping the scope.
 */

var topologically_sort_computables = require('../../../ir/topologically_sort_computables');
var PolymorphicScopeInstance = require('../../../ir/computables/polymorphic_scope_instance');
var CompoundNestedPassthrough = require('../../../ir/computables/compound_nested_passthrough');
var InsertInitializedElement = require('../../../ir/computables/insert_initialized_element');
var IterateArray = require('../../../ir/computables/iterate_array');
var scope_optimization_template = require('./scope_optimization_template');

/**
 * Creates inline scope optimization with custom validators for which
 * scopes can be inlined
 * @param {Function} additional_validators
 * @param {string} verb
 * @returns {Function}
 */
function generate_inline_optimization (additional_validator, verb) {
  return function (scope_data) {
    return scope_optimization_template(scope_data, full_validator, process, verb);
  };

  function full_validator (scope) {
    return additional_validator(scope) && validator(scope);
  }
}

/**
 * Check if a scope is valid for inlining
 * @param {Scope} scope
 * @returns {boolean}
 */
function validator (scope) {
  return !scope.is_shard_root() &&
    !scope.is_entry_point() &&
    valid_computables(scope) &&
    some_instances_are_valid(scope);
}

/**
 * Check if there is at least one scope instance that can be inlined
 * @param {Scope} scope
 * @returns {boolean}
 */
function some_instances_are_valid (scope) {
  var instance_count = scope.get_instance_count();
  for (var i = 0; i < instance_count; ++i) {
    if (instance_is_valid(scope.get_instance(i))) return true;
  }
  return false;
}

/**
 * Check if there is a scope instance can be inlined
 * @param {Scope} scope
 * @returns {boolean}
 */
function instance_is_valid (instance) {
  return !((instance instanceof PolymorphicScopeInstance) ||
    (instance instanceof IterateArray) ||
    is_direct_input(instance));
}
/**
 * Check if scope instance is used as a direct input
 * @returns {boolean}
 */
function is_direct_input (instance) {
  var dependee_count = instance.get_dependee_count();
  for (var i = 0; i < dependee_count; i++) {
    var dependee = instance.get_dependee(i);
    if (!(dependee instanceof CompoundNestedPassthrough)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if scope modifies the environment, or if any computables
 * are both inputs and outputs, which is not currently supported.
 * Also blacklist event handlers, since click events and elements
 * passed to them will have different meaning in a new scope.
 *
 * @returns {boolean}
 */
function valid_computables (scope) {
  var computable_count = scope.get_computable_count();
  for (var i = 0; i < computable_count; i++) {
    var computable = scope.get_computable(i);
    if (computable.is_immovable()) {
      return false;
    }
    if (scope.is_input(computable) && scope.is_output(computable)) {
      return false;
    }
  }
  return true;
}

/**
 * Take a scope that can be inlined and clone all of its computables
 * into the scopes containing its instances.
 *
 * @param {Scope} source_scope The scope to inline
 */

function process (source_scope) {
  var scope_instances_count = source_scope.get_instance_count();
  var computable_count = source_scope.get_computable_count();
  var computables = [];
  var input_computables = [];
  var i, computable;

  // Seperate out input computables and internal computables
  for (i = 0; i < computable_count; i++) {
    computable = source_scope.get_computable(i);
    if (source_scope.is_input(computable)) {
      input_computables.push(computable);
    } else {
      computables.push(computable);
    }
  }

  computables = topologically_sort_computables(computables);
  for (i = scope_instances_count - 1; i !== -1;  i--) {
    var instance = source_scope.get_instance(i);
    if (instance_is_valid(instance)) {
      inline_scope_instance(source_scope, instance, computables, input_computables);
    }
  }
}

/**
 * Take a scope instance that can be inlined and clone its computables into
 * the containing scope. Also, do cleanup on the instance and destroy it after
 * it is cloned.
 *
 * @param {Scope} source_scope The scope to inline
 * @param {ScopeInstance} instance The instance of the scope that is being cloned
 * @param {Array} computables Array of computables that are not input computables
 * @param {Array} input_computables
 */
function inline_scope_instance (source_scope, instance, computables, input_computables) {
  var target_scope = instance.get_containing_scope();
  var clone_map = {};
  var output_map = {};

  var input_length = input_computables.length;
  var i, j, computable, field_name, target_input;

  // Store instance inputs to replace scope parameter computables
  for (i = 0; i < input_length; ++i) {
    computable = input_computables[i];
    target_input = instance.get_input(i);
    clone_map[computable.get_identity()] = target_input;
  }

  // Clone all non-input computables
  for (i = 0; i < computables.length; i++) {
    computable = computables[i];
    var computable_id = computable.get_identity();

    var input_clones = [];
    var input_count = computable.get_input_count();
    for (j = 0; j < input_count; j++) {
      var input = computable.get_input(j);
      var input_clone = clone_map[input.get_identity()];
      input_clones.push(input_clone);
    }

    var clone = computable.clone(input_clones, target_scope);
    clone_map[computable_id] = clone;

    if (source_scope.is_output(computable)) {
      var output_index = source_scope.get_output_index(computable);
      field_name = source_scope.get_output_field_name(output_index);
      output_map[field_name] = clone;
    }
  }

  // Replace dependees' dependees' inputs with output clone
  var dependee_count = instance.get_dependee_count();
  for (i = 0; i < dependee_count; i++) {
    var dependee = instance.get_dependee(i);
    field_name = dependee.get_field_name();
    var output_computable_clone = output_map[field_name];

    if (!output_computable_clone) {
      throw new Error('Unable to find output computable: ' + field_name);
    }

    if (target_scope.is_output(dependee)) {
      target_scope.replace_output(output_computable_clone, field_name);
    }

    // Dependee array gets spliced, so use while loop
    while (dependee.get_dependee_count()) {
      var second_dependee = dependee.get_dependee(0);
      var input_indices = second_dependee.get_input_indices(dependee);
      for (j = 0; j < input_indices.length; j++) {
        second_dependee.set_input(input_indices[j], output_computable_clone);
      }
    }
  }

  // Destroy the instance and all its direct dependees
  instance.destroy();
}

module.exports = generate_inline_optimization;
