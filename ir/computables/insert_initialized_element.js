"use strict";

var inherits = require('util').inherits;
var Computable = require('../computable');
var is_type_contained = require('../is_type_contained');
var ScopeParameter = require('./scope_parameter');
var IRDOMPlacementType = require('../types/dom_placement');
var type_parser = require('../type_parser');
var CoralTypeError = require('../coral_type_error');

// TODO: Make sure this works as expected when an element as arg gets passed into a different zone and that zone re-initializes.

/**
 * @constructor
 * @extends Computable
 * @param {Scope} scope
 * @param {Computable} element
 * @param {Computable} placement
 */
function InsertInitializedElement (scope, element, placement) {
  var output_type = new IRDOMPlacementType();
  var input_computables = [element, placement];
  Computable.call(this, scope, input_computables, output_type);
}

inherits(InsertInitializedElement, Computable);

/**
 * @param {ScopeCompilationContext} scope_compilation_context
 * @returns {string} The symbol for the scope instance object.
 */
InsertInitializedElement.prototype.get_scope_symbol = function (scope_compilation_context) {
  var element_parameter_input_computable = this.get_input(0);
  var scope_input_symbol = scope_compilation_context.get_computable_reference(element_parameter_input_computable);
  return scope_input_symbol;
};

/**
 * @returns {Array.<Scope>} All of the unique scope types that were detected as possible being used with this computable.
 */
InsertInitializedElement.prototype.get_referenced_scopes = function () {
  var element_input_computable = this.get_input(0);
  var origin_computables;

  // TODO: Remove support for non-ScopeParameters.
  if (element_input_computable instanceof ScopeParameter) {
    origin_computables = element_input_computable.get_origin_computables();
  } else {
    origin_computables = [element_input_computable];
  }

  var root_computables = origin_computables.map(function (computable) {
    return computable.get_parent ? computable.get_parent() : computable;
  });

  var referenced_scopes = [];
  for (var i = 0; i !== root_computables.length; ++i) {
    var root_computable = root_computables[i];

    var is_scope_referencing_type = !!root_computable.get_referenced_scopes;
    if (!is_scope_referencing_type) {
      // TODO: Why are there so many DOMText computables getting passed in here, that seems wrong
      continue;
    }

    referenced_scopes = referenced_scopes.concat(root_computable.get_referenced_scopes());
  }

  return referenced_scopes;
};

/**
 * @override
 */
InsertInitializedElement.prototype.is_side_effect_causing = function () {
  return true;
};

/**
 * @override
 */
InsertInitializedElement.prototype._validate_input = function (index, input_computable) {
  Computable.prototype._validate_input.call(this, index, input_computable);

  if (index === 0) {
    var element_type = type_parser('element');
    if (!is_type_contained(element_type, input_computable.get_output_type())) {
      throw new CoralTypeError("Input at index 0 must output an element", input_computable.get_output_type(), element_type);
    }
  } else if (index === 1) {
    var placement_type = new IRDOMPlacementType();
    if (!is_type_contained(placement_type, input_computable.get_output_type())) {
      throw new CoralTypeError("Input at index 1 must output a placement", input_computable.get_output_type(), placement_type);
    }
  } else {
    throw new Error("Only 2 input computables can be added");
  }
};

/**
 * @override
 */
InsertInitializedElement.prototype._clone = function (scope, input_computables) {
  return new InsertInitializedElement(scope, input_computables[0], input_computables[1]);
};

module.exports = InsertInitializedElement;
