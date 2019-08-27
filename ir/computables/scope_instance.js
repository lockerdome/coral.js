"use strict";

var inherits = require('util').inherits;
var ScopeCreator = require('./scope_creator');
var CompoundNestedPassthrough = require('./compound_nested_passthrough');

var is_type_contained = require('../is_type_contained');
var CoralTypeError = require('../coral_type_error');

// TODO: traits, especially for inputs, such as whether the output will be updated on specific inputs.

/**
 * @constructor
 * @emits Scope#instance_added
 * @extends ScopeCreator
 * @param {Scope} containing_scope The scope that will contain this scope instantiation.
 * @param {Scope} creating_scope The scope definition that will be created when this computable is brought into existence.
 * @param {Array.<Computable>} input_computables The Computables to be passed to the Scope.
 */
function ScopeInstance (containing_scope, creating_scope, input_computables) {
  if (containing_scope === creating_scope) {
    throw new Error("Cannot instantiate same Scope that ScopeInstance is residing in");
  }

  this._creating_scope = creating_scope;

  this._async_field_names = [];
  this._sync_field_names = [];

  this._field_name_references = {};

  var i;
  var field_name;

  var output_type = creating_scope.get_output_type();
  ScopeCreator.call(this, containing_scope, input_computables, output_type);

  if (creating_scope.get_input_count() !== input_computables.length) {
    throw new Error("Incorrect number of input computables provided, expected "+creating_scope.get_input_count()+" got "+input_computables.length);
  }

  creating_scope.emit('instance_added', this);
}

inherits(ScopeInstance, ScopeCreator);

/**
 * @override
 */
ScopeInstance.prototype.get_index_scope_parameters = function (index) {
  return [this.get_scope_definition().get_input(index)];
};

// TODO: Create some sort of scope referencing type trait and use that
ScopeInstance.prototype.get_referenced_scopes = function () {
  return [this.get_scope_definition()];
};

/**
 * @param {ScopeParameter} scope_parameter
 * @returns {Array.<Computable>}
 */
ScopeInstance.prototype.get_scope_parameter_bound_input_computables = function (scope_parameter) {
  return [this.get_input(scope_parameter.get_parameter_index())];
};

/**
 * @override
 */
ScopeInstance.prototype.is_side_effect_causing = function () {
  // TODO: Not always true, but likely true.  Flesh this out later.

  return true;
};

/**
 * @override
 */
ScopeInstance.prototype.is_output_updated_on_input_change = function (index) {
  // TODO: this may not always be true based on structure of underlying scope and what output is exposed
  // * This is going to be really annoying to fully wire up, it would need to do a full flow analysis for every index.

  return this.is_invariant();
};

/**
 * @override
 */
ScopeInstance.prototype.is_invariant = function () {
  var creating_scope = this.get_scope_definition();
  var output_count = creating_scope.get_output_count();
  for (var i = 0; i !== output_count; ++i) {
    var output_computable = creating_scope.get_output(i);
    if (output_computable.is_invariant()) {
      return true;
    }
  }

  return false;
};

/**
 * @override
 */
ScopeInstance.prototype.is_initially_async = function () {
  return true;
};

/**
 * @override
 */
ScopeInstance.prototype._validate_input = function (index, input_computable) {
  ScopeCreator.prototype._validate_input.call(this, index, input_computable);

  var creating_scope = this.get_scope_definition();
  if (index >= creating_scope.get_input_count()) {
    throw new Error("Scope does not have a parameter for index " + index);
  }

  var input_parameter = creating_scope.get_input(index);
  if (!is_type_contained(input_parameter.get_required_output_type(), input_computable.get_output_type())) {
    throw new CoralTypeError("Input computable not compatible with scope parameter", input_computable.get_output_type(), input_parameter.get_required_output_type());
  }
};

/**
 * @param {string} field_name
 * @returns {string}
 */
ScopeInstance.prototype.get_field_name_reference = function (field_name) {
  var reference = this._field_name_references[field_name];
  if (!reference) {
    throw new Error("No reference found for that field, '"+field_name+"'");
  }

  return reference;
};

/**
 * @returns {Scope} The Scope that will be created when this ScopeInstance is created.
 */
ScopeInstance.prototype.get_scope_definition = function () {
  return this._creating_scope;
};

/**
 * @returns {string} The symbol for the scope instance object.
 */
ScopeInstance.prototype.get_scope_symbol = function () {
  return this._scope_symbol;
};

/**
 * @override
 */
ScopeInstance.prototype.get_property = function (field_name) {
  return new CompoundNestedPassthrough(this, field_name);
};

/**
 * @override
 */
ScopeInstance.prototype._clone = function (scope, input_computables) {
  return new ScopeInstance(scope, this.get_scope_definition(), input_computables);
};

module.exports = ScopeInstance;
