"use strict";

var inherits = require('util').inherits;

var Computable = require('../computable');
var IRDOMPlacementType = require('../types/dom_placement');

var is_type_contained = require('../is_type_contained');
var CoralTypeError = require('../coral_type_error');

var htmlEntities = new (require('html-entities').XmlEntities)();

/**
 * @constructor
 * @extends Computable
 * @param {Scope} scope The scope that will contain this DOM element.
 * @param {string} text
 * @param {Computable} placement
 */
function DOMText(scope, text, placement) {
  this._text = htmlEntities.decode(text);

  var output_type = new IRDOMPlacementType();
  var input_computables = [placement];
  Computable.call(this, scope, input_computables, output_type);
}

inherits(DOMText, Computable);

/**
 * @override
 */
DOMText.prototype._clone = function (scope, input_computables) {
  return new DOMText(scope, this._text, input_computables[0]);
};

/**
 * @override
 */
DOMText.prototype.is_side_effect_causing = function () {
  return true;
};

/**
 * @override
 */
DOMText.prototype._validate_input = function (index, computable) {
  Computable.prototype._validate_input.call(this, index, computable);

  if (index === 0) {
    if (!is_type_contained(new IRDOMPlacementType(), computable.get_output_type())) {
      var dom_placement_type = new IRDOMPlacementType();
      throw new CoralTypeError("Must provide DOM placement", computable.get_output_type(), dom_placement_type);
    }
  } else {
    throw new Error("There can be no other inputs than a single Placement input");
  }
};

module.exports = DOMText;
