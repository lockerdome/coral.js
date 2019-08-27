"use strict";

var inherits = require('util').inherits;

var Computable = require('../computable');
var IRDOMPlacementType = require('../types/dom_placement');
var is_string_castable = require('../types/is_string_castable');
var CoralTypeError = require('../coral_type_error');

// TODO: For update code path, update text value of text node.

/**
 * @constructor
 * @extends Computable
 * @param {Scope} scope The scope that will contain this DOM element.
 * @param {Computable} value
 * @param {Computable} placement
 */
function DOMVariable(scope, value, placement) {
  var output_type = new IRDOMPlacementType();
  var input_computables = [placement, value];
  Computable.call(this, scope, input_computables, output_type);
}

inherits(DOMVariable, Computable);

/**
 * @override
 */
DOMVariable.prototype._clone = function (scope, input_computables) {
  return new DOMVariable(scope, input_computables[1], input_computables[0]);
};

/**
 * @override
 */
DOMVariable.prototype.is_side_effect_causing = function () {
  return true;
};

/**
 * @override
 */
DOMVariable.prototype._validate_input = function (index, computable) {
  Computable.prototype._validate_input.call(this, index, computable);

  var computable_output_type = computable.get_output_type();
  if (index === 0 && !(computable_output_type instanceof IRDOMPlacementType)) {
    var dom_placement_type = new IRDOMPlacementType();
    throw new CoralTypeError("Must provide DOM placement", computable_output_type, dom_placement_type);
  } else if (index === 1 && !is_string_castable(computable_output_type)) {
    var funcNameIfAvailable = computable.get_function && computable.get_function() && computable.get_function().name;
    var formattedFuncNameIfAvailable = (funcNameIfAvailable ? (' (aka "' + funcNameIfAvailable + '")') : '');
    throw new CoralTypeError('Must be string castable in order to inject into DOM. Attempted to use "' + computable.toString() + '"' + formattedFuncNameIfAvailable + ' of type "' + computable_output_type + '" which is not string castable');
  } else if (index > 1) {
    throw new Error("DOMVariable expects only a placement and value computable");
  }
};

module.exports = DOMVariable;
