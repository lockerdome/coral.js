"use strict";

var cloneObject = require('../../lib/object_helpers').clone;

var sort_computables = require('../../ir/topologically_sort_computables');
var sort_scopes = require('../../ir/topologically_sort_scopes');

var Scope = require('../../ir/scope');
var ScopeParameter = require('../../ir/computables/scope_parameter');
var ScopeInstance = require('../../ir/computables/scope_instance');
var PolymorphicScopeInstance = require('../../ir/computables/polymorphic_scope_instance');
var AbstractPassthrough = require('../../ir/computables/abstract_passthrough');

var Callback = require('../../ir/computables/callback');
var VirtualEmitEvent = require('../../ir/computables/virtual_emitevent');

var IRDOMPlacementType = require('../../ir/types/dom_placement');

/**
 * This optimization takes any ScopeInstance or PolymorphicScopeInstance
 * of a Scope with only one instance and recreates both the instance and
 * the scope(s). Any computables in the parent scope which are only used
 * by the instance are pushed down into that instance's scope(s). This
 * prevents those computables from being processed in the parent scope
 * when the scope instance is not shown or needed yet.
 *
 * @param {Object} scope_data
 * @returns {Object} optimized scope_data
 */
function process_ir (scope_data) {
  var pushed = 0;
  var scope_map = {};
  var sorted_scopes = sort_scopes(scope_data.scopes);

  // Pushdown computables for valid instances.
  sorted_scopes.forEach(function (scope) {
    var instances = get_optimizable_instances(scope);

    instances.forEach(function (instance) {
      pushed += pushdown_computables(instance, scope_map);
    });
  });

  // Replace old scopes with new ones.
  scope_data.scopes.forEach(function (scope, i) {
    var scope_id = scope.get_identity();
    if (scope_map[scope_id]) {
      scope_data.scopes[i] = scope_map[scope_id];
    }
  });

  // Console log the number of pushed computables.
  if (pushed) {
    var plural = pushed === 1 ? 'computable' : 'computables';
    console.log('Pushed', pushed, plural + '.');
  }

  return scope_data;
}

/**
 * Only pushdown to instances (omit IterateArrays) that use their scope(s)
 * exactly once, and for which at least one scope is optimizable.
 *
 * @param {Scope} scope
 * @returns {Array.<ScopeInstance|PolymorphicScopeInstance>}
 */
function get_optimizable_instances (scope) {
  var valid_instances = [];
  var seen = {};

  for (var i = 0; i < scope.get_referenced_scope_count(); i++) {
    var child_scope = scope.get_referenced_scope(i);
    if (!is_valid_scope(child_scope)) continue;

    var instance = child_scope.get_instance(0);
    var instance_id = instance.get_identity();

    if (seen[instance_id]) continue;
    else seen[instance_id] = true;

    if (instance instanceof ScopeInstance) {
      valid_instances.push(instance);
    }
    else if (instance instanceof PolymorphicScopeInstance) {
      var choice_count = instance.get_choice_count();
      var scopes = instance.get_referenced_scopes();

      // Each scope must be used for only one choice.
      if (scopes.length === choice_count) {
        valid_instances.push(instance);
      }
    }
  }

  return valid_instances;
}

/**
 * Check if it is safe to modify scope inputs.
 * @param {Scope} scope
 * @returns {boolean}
 */
function is_valid_scope (scope) {
  return !scope.is_entry_point() &&
         !scope.is_shard_root() &&
         scope.get_instance_count() === 1;
}

/**
 * @param {ScopeInstance|PolymorphicScopeInstance} instance
 * @param {Object} scope_map Hash for tracking replaced scopes
 * @returns {number} How many computables were pushed
 */
function pushdown_computables (instance, scope_map) {
  var valid_scopes;

  if (instance instanceof ScopeInstance) {
    valid_scopes = [instance.get_scope_definition()];
  } else {
    valid_scopes = instance.get_referenced_scopes().filter(is_valid_scope);
  }

  var pushed = 0;
  var pushdown_data = [];
  var immovables = find_immovable_inputs(instance, valid_scopes);

  valid_scopes.forEach(function (scope) {
    var scope_id = scope.get_identity();
    var inputs = get_instance_inputs_by_scope(instance, scope);
    var pushdowns = find_pushdowns(instance, inputs, immovables);

    var new_computables = pushdowns.computables;
    if (!new_computables.length) return;

    var new_inputs = pushdowns.inputs;
    var new_scope = create_pushdown_scope(scope, new_computables, new_inputs, inputs);
    scope_map[scope_id] = new_scope;

    pushed += new_computables.length;
    scope.flush();

    pushdown_data.push({
      id: scope_id,
      new_scope: new_scope,
      computables: new_computables,
      inputs: new_inputs,
    });
  });

  // If no pushdown optimization was possible, abort.
  if (!pushdown_data.length) return pushed;

  var new_instance = create_pushdown_instance(instance, pushdown_data);

  // Reset all dependees to new_instance.
  while (instance.get_dependee_count()) {
    var dependee = instance.get_dependee(0);
    var input_indices = dependee.get_input_indices(instance);
    for (var i = 0; i < input_indices.length; ++i) {
      var index = input_indices[i];
      dependee.set_input(index, new_instance);
    }
  }

  instance.destroy();

  // Destroy computables that were pushed down.
  pushdown_data.forEach(function (data) {
    data.computables.forEach(function (computable) {
      computable.destroy();
    });
  });

  return pushed;
}

/**
 * Find all immovable inputs for scope instance. This is especially important
 * for PolymorphicScopeInstances, since scope choices won't be aware of each
 * other when deciding on pushdowns.
 *
 * @param {ScopeInstance|PolymorphicScopeInstance} instance
 * @param {Array.<Scope>} valid_scopes Instance scopes that can be pushed to
 * @returns {Object} A set of computable ids that cannot be pushed down
 */
function find_immovable_inputs (instance, valid_scopes) {
  var immovables = {};
  var i, input;

  // Initial placement inputs cannot be pushed down.
  for (i = 0; i < instance.get_input_count(); i++) {
    input = instance.get_input(i);
    if (input.get_output_type() instanceof IRDOMPlacementType) {
      immovables[input.get_identity()] = true;
    }
  }

  if (instance instanceof PolymorphicScopeInstance) {

    // The choice computable is an essential input to the scope instance.
    var choice_input = instance.get_choice_computable();
    immovables[choice_input.get_identity()] = true;

    // We know that each scope has exactly one choice (earlier validation)
    var choice_data = instance.get_choice_data();

    for (i = 1; i < instance.get_input_count(); i++) {
      input = instance.get_input(i);

      // If computable is used in all choices, no pushdown benefit.
      var in_all_scopes = true;
      var j;
      var choice;
      for (j = 0; j < choice_data.length; ++j) {
        choice = choice_data[j];
        if (choice.inputs.indexOf(input) === -1) {
          in_all_scopes = false;
          break;
        }
      }

      // Invalid scope inputs must remain in parent_scope.
      var in_invalid_scope = false;
      for (j = 0; j < choice_data.length; ++j) {
        choice = choice_data[j];
        if (choice.inputs.indexOf(input) !== -1 && valid_scopes.indexOf(choice.scope) === -1) {
          in_invalid_scope = true;
          break;
        }
      }

      if (in_all_scopes || in_invalid_scope) {
        immovables[input.get_identity()] = input;
      }
    }
  }

  return immovables;
}

/**
 * @param {ScopeInstance|PolymorphicScopeInstance} instance
 * @param {Scope} scope
 * @returns {Array.<Computable>} inputs
 */
function get_instance_inputs_by_scope (instance, scope) {
  var inputs = [];
  var i;

  if (instance instanceof ScopeInstance) {
    for (i = 0; i < scope.get_input_count(); i++) {
      inputs.push(scope.get_input(i));
    }
  }
  else if (instance instanceof PolymorphicScopeInstance) {
    var choice_data = instance.get_choice_data();

    for (i = 0; i < choice_data.length; i++) {
      var choice = choice_data[i];

      if (choice.scope === scope) {
        inputs = choice.inputs.slice();
        break;
      }
    }
  }

  return inputs;
}

/**
 * @param {ScopeInstance|PolymorphicScopeInstance} old_instance
 * @param {Array.<Object>} pushdown_data
 * @returns {Computable}
 */
function create_pushdown_instance (old_instance, pushdown_data) {
  var parent_scope = old_instance.get_containing_scope();
  var instance;

  if (old_instance instanceof ScopeInstance) {
    var data = pushdown_data[0];
    instance = new ScopeInstance(parent_scope, data.new_scope, data.inputs);
  }
  else if (old_instance instanceof PolymorphicScopeInstance) {
    var choice_input = old_instance.get_choice_computable();
    instance = new PolymorphicScopeInstance(parent_scope, choice_input);

    old_instance.get_choice_data().forEach(function (choice) {
      var scope_id = choice.scope.get_identity();

      // If optimized, replace choice scope and inputs.
      pushdown_data.forEach(function (data) {
        if (scope_id === data.id) {
          choice.scope = data.new_scope;
          choice.inputs = data.inputs;
        }
      });
      instance.add_choice(choice.type, choice.scope, choice.inputs);
    });
  }

  return instance;
}

/**
 * @param {Scope} old_scope Scope object to replace
 * @param {Array.<Computable>} computables Pushdowns from parent scope
 * @param {Array.<Computable>} inputs Inputs for new scope
 * @param {Array.<Computable>} old_inputs Original instance inputs to scope
 * @returns {Scope}
 */
function create_pushdown_scope (old_scope, computables, inputs, old_inputs) {
  var old_computables = [];

  // Hash: old_input_id -> [ScopeParameter dependees]
  var old_input_map = {};

  // Sort scope computables
  for (var i = 0, input_i = 0; i < old_scope.get_computable_count(); i++) {
    var computable = old_scope.get_computable(i);

    if (old_scope.is_input(computable)) {
      var input = old_inputs[input_i++];
      var input_id = input.get_identity();

      if (!old_input_map[input_id]) old_input_map[input_id] = [];
      old_input_map[input_id].push(computable);
    }
    else {
      old_computables.push(computable);
    }
  }

  var new_scope = new Scope();
  var clone_map = {};

  // Clone or create new scope parameters.
  inputs.forEach(function (input) {
    var input_id = input.get_identity();
    var new_param;

    if (input_id in old_input_map) {
      var old_params = old_input_map[input_id];

      // TODO: If multiple params, ensure all have same output type.
      // Consolidate multiple params to one.
      var param_to_clone = old_params[0];

      new_param = param_to_clone.clone([], new_scope);

      old_params.forEach(function (param) {
        clone_map[param.get_identity()] = new_param;
      });
    }
    else {
      new_param = new ScopeParameter(new_scope);
    }

    clone_map[input_id] = new_param;
  });

  // Sort separately, since dependencies aren't hooked up yet.
  var sorted_old = sort_computables(old_computables);
  var sorted_new = sort_computables(computables);

  // Clone computables into scope.
  sorted_new.concat(sorted_old).forEach(function (computable) {
    var computable_id = computable.get_identity();
    var inputs = [];

    // Assume all inputs will be available in clone_map, due to sort.
    for (var i = 0; i < computable.get_input_count(); i++) {
      var input = computable.get_input(i);
      var input_clone = clone_map[input.get_identity()];
      inputs.push(input_clone);
    }

    var clone = computable.clone(inputs, new_scope);
    clone_map[computable_id] = clone;

    // If computable used to be an input, map its old param id.
    if (computable_id in old_input_map) {
      old_input_map[computable_id].forEach(function (param) {
        clone_map[param.get_identity()] = clone;
      });
    }

    // If computable was an output, set output on new scope.
    if (old_scope.is_output(computable)) {
      var output_i = old_scope.get_output_index(computable);
      var field_name = old_scope.get_output_field_name(output_i);
      new_scope.add_output(clone, field_name);
    }
  });

  return new_scope;
}

/**
 * @param {ScopeInstance|PolymorphicScopeInstance} instance
 * @param {Array.<Computable>} old_inputs
 * @param {Object} immovables A set of computable ids
 * @returns {Object}
 */
function find_pushdowns (instance, old_inputs, immovables) {
  var scope = instance.get_containing_scope();
  var computables = {};
  var new_inputs = [];

  var seen = {};

  // Ensure inputs are checked/replaced in order
  var left = old_inputs.slice().reverse();

  while (left.length) {
    var input = left.pop();
    var identity = input.get_identity();

    if (seen[identity]) continue;
    else seen[identity] = true;

    if (can_push_down(input)) {
      computables[identity] = input;

      for (var i = 0; i < input.get_input_count(); i++) {
        left.push(input.get_input(i));
      }
    }
    else {
      immovables[identity] = true;
      new_inputs.push(input);
    }
  }

  var new_computables = Object.keys(computables).map(function (id) {
    return computables[id];
  });

  return {
    computables: new_computables,
    inputs: new_inputs
  };

  /**
   * @param {Computable} computable
   * @param {Object} ignored A set of ids to temporarily assume pushable
   * @returns {boolean}
   */
  function can_push_down (computable, ignored) {
    ignored = ignored ? cloneObject(ignored) : {};
    var identity = computable.get_identity();

    // Ignored set prevents infinite loops when recursing.
    if (identity in ignored) return true;
    else ignored[identity] = true;

    if (identity in computables || computable === instance) {
      return true;
    }

    if (identity in immovables ||
        computable.is_immovable() ||
        computable.get_containing_scope() !== scope ||
        !computable.get_dependee_count() ||
        needed_in_scope(computable, scope)) {
      return false;
    }

    // Passthroughs must stay attached to their parent.
    if (computable instanceof AbstractPassthrough) {
      if (!can_push_down(computable.get_parent(), ignored)) {
        return false;
      }
    }

    // Computable dependees must all be pushed down with it.
    for (var i = 0; i < computable.get_dependee_count(); i++) {
      var dependee = computable.get_dependee(i);
      if (!can_push_down(dependee, ignored)) {
        return false;
      }
    }

    return true;
  }
}

/**
 * Computables that meet this test can never be pushed down.
 *
 * @param {Computable} computable
 * @param {Scope} scope
 * @returns {boolean}
 */
function needed_in_scope (computable, scope) {
  return scope.is_input(computable) ||
         scope.is_output(computable) ||
         computable.is_immovable();
}

module.exports = process_ir;
