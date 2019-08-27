"use strict";

var inherits = require('util').inherits;
var format = require('util').format;

var Computable = require('../computable');
var CompoundNestedPassthrough = require('./compound_nested_passthrough');
var IRDOMPlacementType = require('../types/dom_placement');
var IRCompoundType = require('../types/compound');
var VirtualElement = require('./virtual_element');
var is_string_castable = require('../types/is_string_castable');
var is_type_contained = require('../is_type_contained');
var CoralTypeError = require('../coral_type_error');

/**
 * @constructor
 * @extends Computable
 * @param {Scope} scope The scope that will contain this DOM element.
 * @param {string} node_type
 * @param {Object.<string, Array.<Computable>>} attributes
 * @param {Computable} placement
 */
function DOMElement (scope, node_type, attributes, placement) {

  this._node_type = node_type;
  this._field_name_references = {};

  var output_type = new IRCompoundType({
    after: new IRDOMPlacementType(),
    inner: new IRDOMPlacementType()
  });

  var input_computables = [placement];

  // TODO: Should probably store index in here since all the code below is relying on the iterator order of this.
  var attrs = {};
  for (var attr in attributes) {
    var attribute_computables = attributes[attr];
    attrs[attr] = attribute_computables.slice();
    input_computables = input_computables.concat(attribute_computables);
  }

  this._attributes = attrs;

  Computable.call(this, scope, input_computables, output_type);
}

inherits(DOMElement, Computable);

/**
 * @override
 */
DOMElement.prototype._clone = function (scope, input_computables) {
  var cloned_attributes = {};

  var attribute_computable_index = 1;
  for (var attribute_name in this._attributes) {
    var current_attribute_computables = this._attributes[attribute_name];

    var attribute_computable_count = current_attribute_computables.length;
    var attribute_input_computables = input_computables.slice(attribute_computable_index, attribute_computable_index + attribute_computable_count);

    cloned_attributes[attribute_name] = attribute_input_computables;
    attribute_computable_index += attribute_computable_count;
  }

  return new DOMElement(scope, this._node_type, cloned_attributes, input_computables[0]);
};

/**
 * @override
 */
DOMElement.prototype.is_side_effect_causing = function () {
  return true;
};

/**
 * @override
 */
DOMElement.prototype._validate_input = function (index, computable) {
  Computable.prototype._validate_input.call(this, index, computable);

  var dom_placement_type = new IRDOMPlacementType();
  var computable_output_type = computable.get_output_type();
  if (index === 0 && !is_type_contained(dom_placement_type, computable_output_type)) {
    throw new CoralTypeError("Must provide DOM placement", computable_output_type, dom_placement_type);
  } else if (index > 0 && !is_string_castable(computable_output_type)) {
    var funcNameIfAvailable = computable.get_function && computable.get_function() && computable.get_function().name;
    var formattedFuncNameIfAvailable = (funcNameIfAvailable ? (' (aka "' + funcNameIfAvailable + '")') : '');
    throw new CoralTypeError('Must be string castable in order to inject into DOM. Attempted to use "' + computable.toString() + '"' + formattedFuncNameIfAvailable + ' of type "' + computable_output_type + '" which is not string castable');
  }
};

// TODO: This should take into account the writing to context that I would like to occur with the helper
/**
 * @override
 */
DOMElement.prototype.get_property = function (field_name) {
  if (field_name !== 'after' && field_name !== 'inner') {
    throw new Error(field_name + ' is not an output field for DOMElement, must be "after" or "inner"');
  }

  var is_async = false;
  return new CompoundNestedPassthrough(this, field_name, is_async);
};

/**
 * @param {string} field_name
 * @returns {string}
 */
DOMElement.prototype.get_field_name_reference = function (field_name) {
  var reference = this._field_name_references[field_name];
  if (!reference) {
    throw new Error("No reference found for that field, '"+field_name+"'");
  }

  return reference;
};


module.exports = DOMElement;
