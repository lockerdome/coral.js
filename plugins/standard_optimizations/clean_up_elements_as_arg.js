"use strict";

var InsertInitializedElement = require('../../ir/computables/insert_initialized_element');
var ScopeParameter = require('../../ir/computables/scope_parameter');
var VirtualPlacement = require('../../ir/computables/virtual_placement');
var AbstractPassthrough = require('../../ir/computables/abstract_passthrough');
var DOMUnescapedVariable = require('../../ir/computables/dom_unescaped_variable');

/**
 * This optimization locates any InsertInitializedElement computables that
 * exist in the same scope as their element input, then removes and/or
 * replaces those InsertInitializedElement computables by wiring the input
 * element directly.
 *
 * @param {Object} scope_data
 * @returns {Object} optimized scope_data
 */
function process_ir (scope_data) {
  var replaced = 0;

  scope_data.scopes.forEach(function (scope) {
    for (var i = 0; i < scope.get_computable_count(); i++) {
      var computable = scope.get_computable(i);
      if (removeable(computable)) {
        remove_and_replace(computable);
        replaced++;
      }
    }
  });

  if (replaced) {
    var name = 'InsertInitializedElement' + (replaced === 1 ? '' : 's');
    console.log('Replaced', replaced, name + '.');
  }

  return scope_data;
}

/**
 * InsertInitializedElements can be removed when their instance input
 * is not a ScopeParameter (i.e. the instance exists in scope).
 *
 * @param {Computable} computable
 * @returns {boolean}
 */
function removeable (computable) {
  return computable instanceof InsertInitializedElement &&
         !(computable.get_input(0) instanceof ScopeParameter);
}

/**
 * Remove computable and rewire its inputs directly to its outputs.
 * @param {InsertInitializedElement} computable
 */
function remove_and_replace (computable) {
  var scope = computable.get_containing_scope();
  var instance = computable.get_input(0);
  var placement = computable.get_input(1);

  // Replace instance's VirtualPlacement(s) with real placement.
  var virtual_placement = null;

  for (var i = 0; i < instance.get_input_count(); i++) {
    var input = instance.get_input(i);

    if (input instanceof VirtualPlacement) {
      virtual_placement = input;
      instance.set_input(i, placement);
    }
  }

  /**
   * If no virtual placement exists, the 'instance' is actually a passthrough
   * for the 'output' field_name of a model scope. In these situations, the
   * InsertInitializedElement can be replaced with a more specific computable.
   */
  if (!virtual_placement) {
    new DOMUnescapedVariable(scope, instance, placement);
  } else {
    virtual_placement.destroy();
  }

  // If InsertInitializedElement has any dependees, re-route 'after' output
  if (computable.get_dependee_count() || scope.is_output(computable)) {
    var nested_passthrough = instance.get_property('after');

    while (computable.get_dependee_count()) {
      var dependee = computable.get_dependee(0);
      var input_indices = dependee.get_input_indices(computable);
      for (var j = 0; j < input_indices.length; j++) {
        dependee.set_input(input_indices[j], nested_passthrough);
      }
    }

    if (scope.is_output(computable)) {
      scope.replace_output(nested_passthrough, 'after');
    }
  }

  computable.destroy();
  return;
}

module.exports = process_ir;
