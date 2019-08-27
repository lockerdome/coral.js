"use strict";

var inherits = require('util').inherits;

var Computable = require('../computable');
var IRDOMPlacementType = require('../types/dom_placement');

var is_type_contained = require('../is_type_contained');
var CoralTypeError = require('../coral_type_error');

/**
 * @constructor
 * @extends Computable
 * @param {Scope} scope The scope that will contain this DOM element.
 * @param {string} html The inline HTML string to that represents this DOM Inline element.
 * @param {Computable} placement A {@link Computable} that outputs a placement for this DOM element to be inserted using.
 */
function DOMInlineElement (scope, html, placement) {
  if (!html || typeof html !== 'string') {
    throw new Error("Must provide an html string to use");
  }

  this._html = html;

  var output_type = new IRDOMPlacementType();
  var input_computables = [placement];
  Computable.call(this, scope, input_computables, output_type);
}

inherits(DOMInlineElement, Computable);

/**
 * @override
 */
DOMInlineElement.prototype._clone = function (scope, input_computables) {
  return new DOMInlineElement(scope, this._html, input_computables[0]);
};

/**
 * @override
 */
DOMInlineElement.prototype.is_side_effect_causing = function () {
  return true;
};

/**
 * @override
 */
DOMInlineElement.prototype._validate_input = function (index, computable) {
  Computable.prototype._validate_input.call(this, index, computable);

  if (index !== 0) {
    throw new Error("Only one input can be specified, the placement");
  }

  var dom_placement_type = new IRDOMPlacementType();
  var computable_output_type = computable.get_output_type();
  if (!is_type_contained(dom_placement_type, computable_output_type)) {
    throw new CoralTypeError("Must provide DOM placement", computable_output_type, dom_placement_type);
  }
};

module.exports = DOMInlineElement;
