"use strict";

var inherits = require('util').inherits;

var ScopeCreator = require('./scope_creator');
var CompoundNestedPassthrough = require('./compound_nested_passthrough');

var IRAnyPermittingUnionType = require('../types/any_permitting_union');
var IRVoidType = require('../types/void');
var IRExactValueType = require('../types/exact_value');
var IRTruthyType = require('../types/truthy');
var IRFalsyType = require('../types/falsy');
var IRDOMPlacementType = require('../types/dom_placement');
var IRCompoundType = require('../types/compound');
var CoralTypeError = require('../coral_type_error');

var is_type_contained = require('../is_type_contained');

var format = require('util').format;

// TODO: validate that output fields are the same phase output types

// TODO: I'm getting really annoyed by the duplication in here and IterateArray, I can clean that up with something like a mixin.

// TODO: really think about compound output handling here, they won't all be able to expose the same compound.
// TODO: reduce duplication with compound nested passthrough handling throughout the computables that use that style

// TODO: Make sure everything is hooking up correctly when we have multiple of the same input computable, I believe that is being handled correctly already, but worth double checking.

/**
 * Represents an single entity or no entity that can be presented as any number of different types of Scopes based on a value given to it.
 *
 * If a value does not match a choice, then the Polymorphic scope will not output anything, but if the value does match a choice it will use the given Scope.
 *
 * If one of the choices has a void output, then all outputs must be void.
 *
 * @constructor
 * @emits Scope#instance_added
 * @extends ScopeCreator
 * @param {Scope} containing_scope The scope that will contain this scope instantiation.
 * @param {Computable} choice_computable The Computable whose output decides the presentation of this PolymorphicScopeInstance.
 */
function PolymorphicScopeInstance (containing_scope, choice_computable) {
  this._choice_scopes = [];
  this._choice_types = [];
  this._choice_computable_indexes = [];
  this._unique_scopes = [];

  this._field_name_references = {};

  this._async_field_names = [];
  this._sync_field_names = [];

  var input_computables = [choice_computable];
  var output_type = new IRCompoundType({ after: new IRDOMPlacementType(), scope: new IRCompoundType({ after: new IRDOMPlacementType() }) });
  ScopeCreator.call(this, containing_scope, input_computables, output_type);
}

inherits(PolymorphicScopeInstance, ScopeCreator);


// TODO: Create some sort of scope referencing type trait and use that
PolymorphicScopeInstance.prototype.get_referenced_scopes = function () {
  return this._unique_scopes;
};

// TODO: reduce duplication with IterateArray
/**
 * @param {ScopeParameter} scope_parameter
 * @returns {Array.<Computable>}
 */
PolymorphicScopeInstance.prototype.get_scope_parameter_bound_input_computables = function (scope_parameter) {
  var output = [];

  var scope_parameter_scope = scope_parameter.get_containing_scope();
  var scope_parameter_index = scope_parameter.get_parameter_index();

  for (var i = 0; i !== this._choice_computable_indexes.length; ++i) {
    var choice_scope = this._choice_scopes[i];
    if (scope_parameter_scope !== choice_scope) {
      continue;
    }

    var input_indexes = this._choice_computable_indexes[i];
    output.push(this.get_input(input_indexes[scope_parameter_index]));
  }

  return output;
};

/**
 * @override
 */
PolymorphicScopeInstance.prototype.is_side_effect_causing = function () {
  // TODO: Not always true, but likely true.  Flesh this out later.
  return true;
};

/**
 * @override
 */
PolymorphicScopeInstance.prototype.is_invariant = function () {
  // TODO: This will not always be true in the future, for now I'm making an assumption based on what actually uses this type of computable.
  return true;
};

/**
 * @override
 */
PolymorphicScopeInstance.prototype.is_output_updated_on_input_change = function (index) {
  // TODO: choice input special handling
  // TODO: this may not always be true based on structure of underlying scope and what output is exposed
  return this.is_invariant();
};

/**
 * @override
 */
PolymorphicScopeInstance.prototype.is_initially_async = function () {
  return true;
};

/**
 * @override
 */
PolymorphicScopeInstance.prototype.get_index_scope_parameters = function (index) {
  var output = [];

  for (var i = 0; i < this._choice_computable_indexes.length; i++) {
    var input_indexes = this._choice_computable_indexes[i];
    var choice_scope = this._choice_scopes[i];
    for (var j = 0; j < input_indexes.length; j++) {
      var input_index = input_indexes[j];
      if (input_index === index) {
        output.push(choice_scope.get_input(j));
      }
    }
  }

  return output;
};

/**
 * @override
 */
PolymorphicScopeInstance.prototype._validate_input = function (index, computable) {
  ScopeCreator.prototype._validate_input.call(this, index, computable);

  if (index === 0) {
    if (!this._choice_types.length) {
      return;
    }

    var type_union = new IRAnyPermittingUnionType(this._choice_types);

    if (is_type_contained(type_union, computable.get_output_type())) {
      return;
    }

    throw new CoralTypeError("Invalid type given for choice", computable.get_output_type(), type_union);
  } else {
    var scope_parameters = this.get_index_scope_parameters(index);

    for (var i = 0; i < scope_parameters.length; i++) {
      var scope_parameter = scope_parameters[i];
      if (!is_type_contained(scope_parameter.get_required_output_type(), computable.get_output_type())) {
        throw new CoralTypeError("Input is not compatible with scope parameter required type", computable.get_output_type(), scope_parameter.get_required_output_type());
      }
    }
  }
};

/**
 * @returns {Computable}
 */
PolymorphicScopeInstance.prototype.get_choice_computable = function () {
  return this.get_input(0);
};

/**
 * @returns {number} The number of choices available.
 */
PolymorphicScopeInstance.prototype.get_choice_count = function () {
  return this._choice_types.length;
};

/**
 * @param {IRExactValueType|IRTruthyType|IRFalsyType} choice_key
 * @param {Scope} scope
 * @param {Array.<Computable>} input_computables
 */
PolymorphicScopeInstance.prototype.add_choice = function (choice_key, scope, input_computables) {
  if (!(choice_key instanceof IRExactValueType || choice_key instanceof IRTruthyType || choice_key instanceof IRFalsyType)) {
    throw new Error("Key must be an IRExactValueType, IRTruthyType or IRFalsyType this will be expanded to other IRTypes later");
  }

  if (!scope) {
    throw new Error("Must provide a scope for the choice");
  }

  if (scope === this.get_containing_scope()) {
    throw new Error("Cannot instantiate same Scope as the PolymorphicScopeInstance is contained in");
  }

  if (this.get_choice_index(choice_key) !== -1) {
    throw new Error(choice_key + " is already present as a choice in the polymorphic scope");
  }

  this._choice_types.push(choice_key);
  this._choice_scopes.push(scope);

  var input_start_index = this.get_input_count();
  this._choice_computable_indexes.push(input_computables.map(function (computable, index) {
    return input_start_index + index;
  }));

  for (var i = 0; i < input_computables.length; i++) {
    var input_computable = input_computables[i];
    this.set_input(input_start_index + i, input_computable);
  }

  if (this._unique_scopes.indexOf(scope) === -1) {
    this._unique_scopes.push(scope);
  }

  scope.emit('instance_added', this);
  this.set_output_type(scope.get_output_type());
};

/**
 * @param {IRExactValueType|IRTruthyType|IRFalsyType} choice The choice to remove as a possibility.
 *
 * - Removes inputs related to that Scope
 * - Update output, alert all dependees for them to re-validate
 */
PolymorphicScopeInstance.prototype.remove_choice = function (key) {
  // TODO: all the things
  throw new Error("TODO");
};

/**
 * @param {IRType} choice_key
 * @returns {number} index of choice key
 */
PolymorphicScopeInstance.prototype.get_choice_index = function (choice_key) {
  for (var i = 0; i < this._choice_types.length; i++) {
    var choice_type = this._choice_types[i];
    if (choice_key.equals(choice_type)) {
      return i;
    }
  }
  return -1;
};

// TODO: Need to make sure we handle when an input is removed from a scope we have.  This is a general problem we need to solve for computables.

/**
 * @returns {boolean}
 */
PolymorphicScopeInstance.prototype.is_truthy_falsy = function () {
  var choice_types = this._choice_types;
  if (choice_types.length !== 2) return false;

  var has_truthy = false;
  var has_falsy = false;

  for (var i = 0; i !== choice_types.length; ++i) {
    var choice_type = choice_types[i];
    if (choice_type instanceof IRTruthyType) {
      has_truthy = true;
    } else if (choice_type instanceof IRFalsyType) {
      has_falsy = true;
    }
  }

  return has_truthy && has_falsy;
};

/**
 * @returns {string} The symbol for the scope instance object.
 */
PolymorphicScopeInstance.prototype.get_scope_symbol = function () {
  return this._scope_symbol;
};

/**
 * @param {string} field_name
 * @returns {string}
 */
PolymorphicScopeInstance.prototype.get_field_name_reference = function (field_name) {
  var reference = this._field_name_references[field_name];
  if (!reference) {
    throw new Error("No reference found for that field, '"+field_name+"'");
  }

  return reference;
};

/**
 * @override
 */
PolymorphicScopeInstance.prototype._clone = function (scope, input_computables) {
  var cloned_computable = new PolymorphicScopeInstance(scope, input_computables[0]);

  for (var i = 0; i !== this._choice_types.length; ++i) {
    var choice_type = this._choice_types[i];
    var choice_scope = this._choice_scopes[i];
    var input_indexes = this._choice_computable_indexes[i];

    var choice_input_computables = input_indexes.map(get_input_computable_at_index);

    cloned_computable.add_choice(choice_type, choice_scope, choice_input_computables);
  }

  return cloned_computable;

  function get_input_computable_at_index (index) {
    return input_computables[index];
  }
};

/**
 * @override
 */
PolymorphicScopeInstance.prototype.get_property = function (field_name) {
  return new CompoundNestedPassthrough(this, field_name);
};

/**
 * @param {Array.<Computable>} inputs (Optional)
 * @returns {Array.<Object>} choices
 */
PolymorphicScopeInstance.prototype.get_choice_data = function (inputs) {
  var choices = [];
  var _this = this;

  for (var i = 0; i < this._choice_types.length; i++) {
    var choice_type = this._choice_types[i];
    var choice_scope = this._choice_scopes[i];
    var input_indexes = this._choice_computable_indexes[i];

    var choice_input_computables = input_indexes.map(get_input_computable_at_index);

    choices.push({
      type: choice_type,
      scope: choice_scope,
      inputs: choice_input_computables
    });
  }

  return choices;

  function get_input_computable_at_index (index) {
    return inputs ? inputs[index] : _this.get_input(index);
  }
};

module.exports = PolymorphicScopeInstance;
