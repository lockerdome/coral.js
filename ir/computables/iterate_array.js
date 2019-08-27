"use strict";

var inherits = require('util').inherits;
var format = require('util').format;

var ScopeCreator = require('./scope_creator');
var CompoundNestedPassthrough = require('./compound_nested_passthrough');

var IRArrayType = require('../types/array');
var IRAnyType = require('../types/any');
var IRAnyPermittingUnionType = require('../types/any_permitting_union');
var IRExactValueType = require('../types/exact_value');
var IRCompoundType = require('../types/compound');
var IRDOMPlacementType = require('../types/dom_placement');

var VirtualIntermediate = require('./virtual_intermediate');
var VirtualArrayItem = require('./virtual_array_item');

var is_type_contained = require('../is_type_contained');
var type_at_path = require('../type_at_path');
var CoralTypeError = require('../coral_type_error');

var INITIAL_INTERMEDIATE_COMPUTABLE_INDEX = 0;
var ARRAY_COMPUTABLE_INDEX = 1;
var INTERMEDIATE_VIRTUAL_INDEX = 2;
var ITEM_VIRTUAL_INDEX = 3;
var ARRAY_MAP_FUNCTION_INPUT_START_INDEX = 4;

// TODO: Split out handling for single item iterate array into subclass of this

// What if in the same update cycle the items array is updating and an item update comes in?
// - An item update would force a recompute of the dynamic element list.
// What if a nested updates in the same update cycle that the base has pending changes coming in for it?
// * I suppose it depends on whether the base computable ends up updating or not. It's a really weird situation to be in, not dropping the update could lead to a change being applied to something that makes no real sense.
// * Ideally things would be set up so this would be impossible, having users edit something that real-time updates at the same time like a bad idea.
// * We currently discard if equal or pending at the moment, except when forced.

// Multiple nesteds or items updating in the same update cycle?  We definitely wouldn't want to trigger items array updates for each and every one of them, we'd want to have just one items array update for all.
// * It's very likely in one tick that some event handler could very well update multiple nesteds on an item.

/**
 * @constructor
 * @emits Scope#instance_added
 * @extends ScopeCreator
 * @param {Scope} scope The Scope this IterateArray will reside in.
 * @param {Computable} initial_intermediate_computable The Computable that will be used as the initial value for the intermediate, after which each created Scope is responsible for creating something of the same type, potentially transforming the initial value.
 *   - The output type of the IterateArray must be identical to the output type for the initial intermediate computable.  The IterateArray's output will be the intermediate output of the last created Scope.
 * @param {computable} array_computable An array of values.
 * @param {VirtualArrayItem} item_virtual_computable
 * @param {VirtualIntermediate} intermediate_virtual_computable
 * @param {function} identity_comparison_function A comparison function for determining if two items should be considered equivalent.
 * - a, b -> boolean
 * @param {function} [array_map_function]
 * @param {Array.<Computable>} [array_map_function_input_computables] The input computables needed to compute the map function.
 */
function IterateArray (scope, initial_intermediate_computable, array_computable, item_virtual_computable, intermediate_virtual_computable, identity_comparison_function, array_map_function, array_map_function_input_computables) {
  this._choice_types = [];
  this._choice_scopes = [];
  this._choice_computable_indexes = [];
  this._unique_scopes = [];
  this._choice_output_paths = [];

  // TODO: It feels really wrong to expose the scope array from this, but my current element as arg plans require that to be the case.
  // TODO: scope array compound makes the assumption that it is only used for elements for now.  By the time that needs to change I'll likely not be exposing it.
  var output_type = new IRCompoundType({ after: initial_intermediate_computable.get_output_type(), scope_array: new IRArrayType(new IRCompoundType({ after: new IRDOMPlacementType() }, false), 0) }, false);

  if (!(item_virtual_computable instanceof VirtualArrayItem)) {
    throw new Error("item_virtual_computable parameter must be a VirtualArrayItem computable, got "+item_virtual_computable.constructor.name);
  }
  if (!(intermediate_virtual_computable instanceof VirtualIntermediate)) {
    throw new Error("intermediate_virtual_computable parameter must be a VirtualIntermediate computable, got "+intermediate_virtual_computable.constructor.name);
  }

  var intermediate_virtual = intermediate_virtual_computable;
  var item_virtual = item_virtual_computable;
  this._intermediate_virtual = intermediate_virtual;
  this._item_virtual = item_virtual;

  this._array_map_function = array_map_function;
  this._array_map_function_input_computables = array_map_function_input_computables;

  if (this._array_map_function && !this._array_map_function_input_computables) {
    throw new Error("Must provide array map function computables if providing array map function");
  }

  if (!array_map_function && this._choice_types.length > 1) {
    throw new Error("Must provide map function if using more than one option");
  }

  var input_computables = [
    initial_intermediate_computable,
    array_computable,
    intermediate_virtual_computable,
    item_virtual_computable
  ];

  if (array_map_function_input_computables) {
    input_computables = input_computables.concat(array_map_function_input_computables);
  }

  this._choice_input_computables_start_index = input_computables.length;
  this._identity_comparison_function = identity_comparison_function;

  ScopeCreator.call(this, scope, input_computables, output_type);

  var _this = this;
  this.on("dependee_added", function (index, computable) {
    if (index === 0) {
      _this.set_output_type(new IRCompoundType({ after: computable.get_output_type(), scope_array: new IRArrayType(new IRCompoundType({ after: new IRDOMPlacementType() }, false), 0) }, false));
    }
  });
}

inherits(IterateArray, ScopeCreator);

IterateArray.prototype.is_mapless_single_option_iterate_array = function () {
  return this.get_choice_count() === 1 && !this._array_map_function;
};

// TODO: Create some sort of scope referencing type trait and use that
IterateArray.prototype.get_referenced_scopes = function () {
  return this._unique_scopes;
};

/**
 * @param {string} field_name
 * @returns {string}
 */
IterateArray.prototype.get_field_name_reference = function (field_name) {
  var reference = this._field_name_references[field_name];
  if (!reference) {
    throw new Error("No reference found for that field, '"+field_name+"'");
  }

  return reference;
};

/**
 * @param {string} field_name
 */
IterateArray.prototype.get_property = function (field_name) {
  if (field_name !== 'after' && field_name !== 'scope_array') {
    throw new Error(field_name + ' is not an output field for IterateArray, must be "after" or "scope_array"');
  }
  var is_async = field_name === 'scope_array';
  return new CompoundNestedPassthrough(this, field_name, is_async);
};

/**
 * @returns {function}
 */
IterateArray.prototype.get_identity_comparison_function = function () {
  return this._identity_comparison_function;
};

/**
 * @override
 */
IterateArray.prototype.is_side_effect_causing = function () {
  // TODO: Not always true, but likely true.  Flesh this out later.
  return true;
};

/**
 * @override
 */
IterateArray.prototype.is_invariant = function () {
  // TODO: This will not always be true in the future, for now I'm making an assumption based on what actually uses this type of computable.
  return true;
};

/**
 * @param {number} index
 * @returns {boolean} Whether the given index corresponds to a map function input computable.
 */
IterateArray.prototype._is_array_map_function_index = function (index) {
  return index >= ARRAY_MAP_FUNCTION_INPUT_START_INDEX && index < this._choice_input_computables_start_index;
};

/**
 * @override
 */
IterateArray.prototype.is_initially_async = function () {
  return true;
};

/**
 * @returns {Computable}
 */
IterateArray.prototype.get_initial_intermediate_computable = function () {
  return this.get_input(INITIAL_INTERMEDIATE_COMPUTABLE_INDEX);
};

/**
 * @returns {Computable}
 */
IterateArray.prototype.get_array_computable = function () {
  return this.get_input(ARRAY_COMPUTABLE_INDEX);
};

/**
 * @returns {number}
 */
IterateArray.prototype.get_choice_count = function () {
  return this._choice_types.length;
};

/**
 * @override
 */
IterateArray.prototype.is_output_updated_on_input_change = function (index) {
  // We can't really make any good assumptions at the moment as to whether a Scope will output something different based on an input changing, so we just assume the worst.
  return index !== INTERMEDIATE_VIRTUAL_INDEX && index !== ITEM_VIRTUAL_INDEX;
};

// TODO: need to check the output type of the scope output chosen
// * What if they passed an output computable of the scope.  Worth sanity checking that.
// TODO: PolymorphicScopeInstance's add_choice is nearly identical other than what they allow for choice_key, and virtual computable checks.
/**
 * @param {IRExactValueType} choice_key
 * @param {Scope} scope
 * @param {Array.<Computable>} input_computables
 * @param {string} intermediate_output_field
 */
IterateArray.prototype.add_choice = function (choice_key, scope, input_computables, intermediate_output_field) {
  if (!(choice_key instanceof IRExactValueType)) {
    throw new Error("Key must be an IRExactvalue");
  }

  if (!scope) {
    throw new Error("Must provide a scope for the choice");
  }

  // TODO: Probably also don't want to allow nested paths beyond the top level.
  if (!intermediate_output_field) {
    throw new Error("Must provide a field to use for the intermediate from the scope's output compound");
  }

  if (scope === this.get_containing_scope()) {
    throw new Error("Cannot instantiate same Scope as the IterateArray is contained in");
  }

  for (var i = 0; i !== this._choice_types.length; ++i) {
    var choice_type = this._choice_types[i];
    if (choice_key.equals(choice_type)) {
      throw new Error(choice_key +" is already present as a choice in the IterateArray");
    }
  }

  this._choice_types.push(choice_key);
  this._choice_scopes.push(scope);
  this._choice_output_paths.push(intermediate_output_field);

  var scope_output_type = type_at_path(scope.get_output_type(), intermediate_output_field);
  if (!is_type_contained(this._intermediate_virtual.get_output_type(), scope_output_type)) {
    throw new CoralTypeError("Scope output must match the intermediate", this._intermediate_virtual.get_output_type(), this._intermediate_virtual.get_output_type());
  }

  var input_start_index = this.get_input_count();
  this._choice_computable_indexes.push(input_computables.map(function (computable, index) {
    return input_start_index + index;
  }));

  for (i = 0; i !== input_computables.length; ++i) {
    var input_computable = input_computables[i];
    this.set_input(input_start_index + i, input_computable);
  }

  scope.emit('instance_added', this);

  if (this._unique_scopes.indexOf(scope) === -1) {
    this._unique_scopes.push(scope);
  }
};

/**
 * @param {IRExactValue} choice_key
 */
IterateArray.prototype.remove_choice = function (choice_key) {
  throw new Error("TODO");
};

/**
 * @override
 */
IterateArray.prototype._validate_input = function (index, computable) {
  ScopeCreator.prototype._validate_input.call(this, index, computable);

  if (index === INITIAL_INTERMEDIATE_COMPUTABLE_INDEX) {
    if (is_type_contained(this.get_output_type().get_key_type('after'), computable.get_output_type())) {
      return;
    }

    // TODO: If the output type is different, it is possible it is ok.  Need to check all of the choices to make sure the input is acceptable.  Likely will do this later.
    throw new Error("TODO: Need to think through changes in output type for intermediate");
  } else if (index === ARRAY_COMPUTABLE_INDEX) {
    var any_type = new IRAnyType();
    var array_type = new IRArrayType(any_type);

    var array_computable_output_type = computable.get_output_type();

    var any_or_array_union = new IRAnyPermittingUnionType([array_type]);

    if (is_type_contained(any_or_array_union, array_computable_output_type)) {
      return;
    }

    throw new CoralTypeError("Invalid array computable given", array_computable_output_type, any_or_array_union);
  } else if (index === INTERMEDIATE_VIRTUAL_INDEX) {
    if (this._intermediate_virtual !== computable) {
      throw new Error("Can't assign input index "+INTERMEDIATE_VIRTUAL_INDEX+" to anything other than the intermediate virtual computable");
    }
  } else if (index === ITEM_VIRTUAL_INDEX) {
    if (this._item_virtual !== computable) {
      throw new Error("Can't assign input index "+ITEM_VIRTUAL_INDEX+" to anything other than the item virtual computable");
    }
  } else if (this._is_array_map_function_index(index)) {
    // TODO: validate map function input computables
  } else {
    // TODO: deduplicate with PolymorphicScopeInstance
    var scope_parameters = this.get_index_scope_parameters(index);

    for (var i = 0; i !== scope_parameters.length; ++i) {
      var scope_parameter = scope_parameters[i];
      if (!is_type_contained(scope_parameter.get_required_output_type(), computable.get_output_type())) {
        throw new CoralTypeError("Input is not compatible with scope parameter required type", computable.get_output_type(), scope_parameter.get_required_output_type());
      }
    }
  }
};

// TODO: deduplicate with PolymorphicScopeInstance
/**
 * @override
 */
IterateArray.prototype.get_index_scope_parameters = function (index) {
  var output = [];

  for (var i = 0; i !== this._choice_computable_indexes.length; ++i) {
    var input_indexes = this._choice_computable_indexes[i];
    var choice_scope = this._choice_scopes[i];
    for (var j = 0; j !== input_indexes.length; ++j) {
      var input_index = input_indexes[j];
      if (input_index === index) {
        output.push(choice_scope.get_input(j));
      }
    }
  }

  return output;
};

/**
 * @returns {string} The symbol for the scope instance array.
 */
IterateArray.prototype.get_scope_symbol = function () {
  return this._scope_array_symbol;
};

/**
 * @param {ScopeParameter} scope_parameter
 * @returns {Array.<Computable>}
 */
IterateArray.prototype.get_scope_parameter_bound_input_computables = function (scope_parameter) {
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
IterateArray.prototype._clone = function (scope, input_computables) {
  var array_map_function_input_computables;
  if (this._array_map_function) {
    array_map_function_input_computables = input_computables.slice(ARRAY_MAP_FUNCTION_INPUT_START_INDEX, ARRAY_MAP_FUNCTION_INPUT_START_INDEX + this._array_map_function_input_computables.length);
  }

  var cloned_computable = new IterateArray(
    scope,
    input_computables[INITIAL_INTERMEDIATE_COMPUTABLE_INDEX],
    input_computables[ARRAY_COMPUTABLE_INDEX],
    input_computables[ITEM_VIRTUAL_INDEX],
    input_computables[INTERMEDIATE_VIRTUAL_INDEX],
    this.get_identity_comparison_function(),
    this._array_map_function,
    array_map_function_input_computables
  );

  for (var i = 0; i !== this._choice_types.length; ++i) {
    var choice_type = this._choice_types[i];
    var choice_scope = this._choice_scopes[i];
    var input_indexes = this._choice_computable_indexes[i];
    var choice_output_path = this._choice_output_paths[i];

    var choice_input_computables = [];
    for (var j = 0; j < input_indexes.length; ++j) {
      var index = input_indexes[j];
      choice_input_computables.push(input_computables[index]);
    }

    cloned_computable.add_choice(choice_type, choice_scope, choice_input_computables, choice_output_path);
  }

  return cloned_computable;
};

module.exports = IterateArray;
