"use strict";

var inherits = require('util').inherits;
var Computable = require('../computable');
var NestedPassthrough = require('./nested_passthrough');
var IRUnionType = require('../types/union');
var IRAnyType = require('../types/any');

/**
 * ScopeParameters are Computables that represent an input for a Scope.
 *
 * ScopeParameters always have zero inputs.
 * @constructor
 * @emits Scope#added_parameter
 * @extends Computable
 * @param {Scope} scope The Scope that contains this ScopeParameter.
 * @param {IRType} [output_type] The type that the ScopeParameter requires.  Uses IRAnyType if the ScopeParameter has no specific requirements.
 * @param {string} [name] A name for the parameter
 * @param {boolean} [force_invariant]
 */
function ScopeParameter (scope, output_type, name, force_invariant) {
  if (scope.get_instance_count() > 0) {
    throw new Error("Can't add ScopeParameters while Scope has ScopeInstances");
  }
  this._is_zone_entry_parameter = scope.is_entry_point();
  if (this._is_zone_entry_parameter) {
    this._force_invariant = typeof force_invariant === 'boolean' ? force_invariant : false;
  } else if (typeof force_invariant === 'boolean') {
    throw new Error('Should not set invariant: true/false for non-zone entry scope parameters');
  }

  var input_computables = [];

  if (!output_type) {
    output_type = new IRAnyType();
  }

  this._name = name;
  this._required_output_type = output_type;

  Computable.call(this, scope, input_computables, output_type);

  scope.emit("parameter_added", this);

  this._instances = [];
  this._unique_instances = [];
  var _this = this;

  _this.on("input_changed", function () {
    _this.set_output_type(calculate_output_type());
  });

  scope.on('instance_added', function (computable) {
    _this._instances.push(computable);
    if (_this._unique_instances.indexOf(computable) === -1) {
      _this._unique_instances.push(computable);
    }

    _this.set_output_type(calculate_output_type());

    // TODO: look at inputs and figure out if any return true for the traits
  });

  scope.on('instance_removed', function (computable) {
    var instance_count = 0;
    var instance_index = -1;
    for (var i = 0; i < _this._instances.length; ++i) {
      if (_this._instances[i] === computable) {
        instance_count++;
        instance_index = i;
      }
    }
    _this._instances.splice(instance_index, 1);

    if (instance_count === 1) {
      var unique_instance_index = _this._unique_instances.indexOf(computable);
      _this._unique_instances.splice(unique_instance_index, 1);
    }

    _this.set_output_type(calculate_output_type());
  });

  function calculate_output_type () {
    var bound_input_computable_output_types = [];

    for (var i = 0; i !== _this._unique_instances.length; ++i) {
      var scope_instance = _this._unique_instances[i];
      var bound_input_computables = scope_instance.get_scope_parameter_bound_input_computables(_this);
      for (var j = 0; j !== bound_input_computables.length; ++j) {
        var bound_input_computable = bound_input_computables[j];
        var bound_input_computable_output_type = bound_input_computable.get_output_type();
        bound_input_computable_output_types.push(bound_input_computable_output_type);
      }
    }

    if (!bound_input_computable_output_types.length) return _this.get_required_output_type();
    else if (bound_input_computable_output_types.length === 1) return bound_input_computable_output_types[0];
    else return new IRUnionType(bound_input_computable_output_types);
  }
}

inherits(ScopeParameter, Computable);

/**
 * @returns {string}
 */
ScopeParameter.prototype.get_name = function () {
  return this._name;
};

/**
 * @returns {IRType} The required output type
 */
ScopeParameter.prototype.get_required_output_type = function () {
  return this._required_output_type;
};

/**
 * @returns {number} The index for the scope parameter in its scope.
 */
ScopeParameter.prototype.get_parameter_index = function () {
  return this.get_containing_scope().get_input_parameter_index(this);
};

/**
 * @override
 */
ScopeParameter.prototype.get_property = function (field_name) {
  return new NestedPassthrough(this, field_name);
};

/**
 * @override
 */
ScopeParameter.prototype.is_scope_parameter = function () {
  return true;
};

// TODO: Traits based on "worst case" (most permissive) for all usages of it
//       * Just do this on demand

// TODO: Needs to be aware of the type of scope it is in, and adjust itself accordingly.
//       * Traits for a zone entry scope parameter will always reflect a variant computable.

/**
 * @override
 */
ScopeParameter.prototype.is_output_updated_externally = function () {
  if (this._is_zone_entry_parameter) {
    return false;
  }

  throw new Error("TODO");
};

/**
 * @override
 */
ScopeParameter.prototype.is_output_updated_on_mutate = function () {
  if (this._is_zone_entry_parameter) {
    return false;
  }

  throw new Error("TODO");
};

/**
 * @override
 */
ScopeParameter.prototype.is_mutable = function () {
  if (this._is_zone_entry_parameter) {
    return false;
  }

  // TODO:
  return false;
};

/**
 * @override
 */
ScopeParameter.prototype.is_invariant = function () {
  if (typeof this._force_invariant === 'boolean') {
    return this._force_invariant;
  }
  // TODO: This is likely to cause issues if we start using is_invariant in the optimizations
  //  * Re-evaluate where this check lives, it should probably live somewhere else so that caching doesn't happen at the computable level.
  if (typeof this._is_invariant === 'boolean') {
    return this._is_invariant;
  }
  var is_invariant = true;
  var origin_computables = this._get_immediate_origin_computables();
  for (var i = 0; i < this._unique_instances.length; ++i) {
    var instance_origin_computables = this._get_instance_origin_computables(i);
    for (var j = 0; j < instance_origin_computables.length; ++j) {
      var instance_origin_computable = instance_origin_computables[j];
      if (!(instance_origin_computable.is_invariant())) {
        is_invariant = false;
        break;
      }
    }

    if (!is_invariant) break;
  }
  this._is_invariant = is_invariant;
  return is_invariant;
};

/**
 * @override
 */
ScopeParameter.prototype.is_compile_time_constant = function () {
  // TODO: determine if compile time constant based on usages.
  return false;
};

/**
 * @override
 */
ScopeParameter.prototype.is_side_effect_causing = function () {
  throw new Error("TODO");
};

ScopeParameter.prototype._get_instance_origin_computables = function (i) {
  var scope_instance = this._unique_instances[i];
  return scope_instance.get_scope_parameter_bound_input_computables(this);
};

ScopeParameter.prototype._get_immediate_origin_computables = function () {
  var bound_input_computables = [];
  for (var i = 0; i !== this._unique_instances.length; ++i) {
    bound_input_computables.push.apply(bound_input_computables, this._get_instance_origin_computables(i));
  }
  return bound_input_computables;
};

/**
 * Trace up from the scope parameter to all non-scope parameter originating computables.
 *
 * @returns {Array.<Computable>}
 */
ScopeParameter.prototype.get_origin_computables = function () {
  var bound_input_computables = this._get_immediate_origin_computables();
  var i;
  var unique_bound_input_computables = [];
  var bound_input_computable;
  for (i = 0; i !== bound_input_computables.length; ++i) {
    bound_input_computable = bound_input_computables[i];
    if (unique_bound_input_computables.indexOf(bound_input_computable) === -1) {
      unique_bound_input_computables.push(bound_input_computable);
    }
  }

  var source_computables = [];
  for (i = 0; i !== unique_bound_input_computables.length; ++i) {
    bound_input_computable = unique_bound_input_computables[i];

    if (bound_input_computable instanceof ScopeParameter) {
      var source_computable_results = bound_input_computable.get_origin_computables();
      for (var j = 0; j < source_computable_results.length; ++j) {
        var source_computable_result = source_computable_results[j];
        if (source_computables.indexOf(source_computable_result) === -1) {
          source_computables.push(source_computable_result);
        }
      }
    } else {
      if (source_computables.indexOf(bound_input_computable) === -1) {
        source_computables.push(bound_input_computable);
      }
    }
  }

  return source_computables;
};

/**
 * @override
 */
ScopeParameter.prototype._clone = function (scope) {
  return new ScopeParameter(scope, this._required_output_type, this._name, this._force_invariant);
};

module.exports = ScopeParameter;
