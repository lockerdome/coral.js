"use strict";

var IRVoidType = require('./types/void');
var IRCompoundType =  require('./types/compound');
var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;
var ScopeParameter = require('./computables/scope_parameter');

var topologically_sort_computables = require('./topologically_sort_computables');

// TODO: It would be useful to be able to track output usages, especially being aware of which phase it is being used in (can use computable trait for determining that part).

var unique_id = 0;

/**
 * The definition for a Scope which represents a collection of Computables with defined inputs and outputs, that can be referenced by any number of ScopeInstances.
 * @extends EventEmitter
 * @constructor
 */
function Scope (name) {
  this.setMaxListeners(0);

  this._name = name;
  this._identity = unique_id+'';

  unique_id++;

  this._inputs = [];

  this._outputs = [];
  this._output_field_name_to_computable = {};
  this._computable_identity_to_output_field_name = {};

  this._instances = [];
  this._computables = [];

  this._dependees = [];
  this._dependee_computables = [];

  this._referenced_scopes = [];
  this._referenced_scope_computables = [];

  var _this = this;

  this.on('scope_reference_added', function (scope, computable) {
    var referenced_scope_index = _this._referenced_scopes.indexOf(scope);
    var referenced_scope_computables;

    if (referenced_scope_index !== -1) {
      referenced_scope_computables =  _this._referenced_scope_computables[referenced_scope_index];
    } else {
      _this._referenced_scopes.push(scope);
      referenced_scope_computables = [];
      _this._referenced_scope_computables.push(referenced_scope_computables);
    }
    referenced_scope_computables.push(computable);

    computable.once('destroyed', function () {
      var scope_index = _this._referenced_scopes.indexOf(scope);
      var scope_referenced_scope_computables = _this._referenced_scope_computables[scope_index];

      scope_referenced_scope_computables = scope_referenced_scope_computables.filter(function(item) {
        return item !== computable;
      });

      var computable_index = referenced_scope_computables.indexOf(computable);
      referenced_scope_computables.splice(computable_index, 1);

      if (!referenced_scope_computables.length) {
        _this._referenced_scopes.splice(scope_index, 1);
        _this._referenced_scope_computables.splice(scope_index, 1);
      }
    });
  });

  this.on('instance_added', function (computable) {
    _this._instances.push(computable);

    var containing_scope = computable.get_containing_scope();

    containing_scope.emit('scope_reference_added', _this, computable);

    var dependee_index = _this._dependees.indexOf(containing_scope);
    if (dependee_index === -1) {
      _this._dependees.push(containing_scope);
      _this._dependee_computables.push([computable]);
    } else {
      _this._dependee_computables[dependee_index].push(computable);
    }

    computable.once('destroyed', function () {
      _this._instances = _this._instances.filter(function (item) {
        return item !== computable;
      });

      var dependee_index = _this._dependees.indexOf(containing_scope);
      if (dependee_index !== -1) {
        var dependee_computables = _this._dependee_computables[dependee_index];
        var dependee_computable_index = dependee_computables.indexOf(computable);

        dependee_computables.splice(dependee_computable_index, 1);

        if (!dependee_computables.length) {
          _this._dependees.splice(dependee_index, 1);
          _this._dependee_computables.splice(dependee_index, 1);
        }
      }

      _this.emit('instance_removed', computable);
    });
  });

  this.on('computable_added', function (computable) {
    _this._computables.push(computable);

    computable.once('destroyed', function () {
      var output_index = _this._outputs.indexOf(computable);
      if (output_index !== -1) {
        _this._outputs.splice(output_index, 1);
      }

      var computable_index = _this._computables.indexOf(computable);
      if (computable_index !== -1) {
        _this._computables.splice(computable_index, 1);
        _this.emit('computable_removed', computable);
      }
    });
  });

  this.on('parameter_added', function (computable) {
    if (_this.get_instance_count() > 0 ) {
      throw new Error("Cannot add ScopeParameters for Scopes that have instances");
    }

    _this._inputs.push(computable);

    computable.once('destroyed', function () {
      // TODO: Handle this by removing an input from all the scope instances
    });
  });
}

inherits(Scope, EventEmitter);

/**
 * @param {object} shard_metadata Contains trait and include_trait data for root of sharded script.
 */
Scope.prototype.set_shard_metadata = function (shard_metadata) {
  this._shard_metadata = shard_metadata;
};

/**
 * @returns {boolean} Whether the scope represents the root of a sharded script.
 */
Scope.prototype.is_shard_root = function () {
  return !!this._shard_metadata;
};

/**
 * @returns {object} An object containing shard traits or include traits. Null if scope is not a shard root.
 */
Scope.prototype.get_shard_metadata = function () {
  return this._shard_metadata || null;
};

/**
 * @param {string} shard_name A shard that is aggregated (included) into this scope's shard script.
 */
Scope.prototype.add_implied_shard = function (shard_name) {
  if (!this.is_shard_root()) return;
  var metadata = this.get_shard_metadata();
  if (!metadata.implied_shards) metadata.implied_shards = {};
  metadata.implied_shards[shard_name] = true;
};

/**
 * @returns {boolean} Whether the Scope represents the entry point for a zone.
 */
Scope.prototype.is_entry_point = function () {
  return false;
};

/**
 * @returns {Scope} A clone of the Scope with the same inputs, cloned internal Computables, and specified outputs.
 */
Scope.prototype.clone = function () {
  // Since we are topologically sorting the computables, we can assume that we will always have all inputs cloned and ready by the time we reach every computable.
  var sorted_computables = topologically_sort_computables(this._computables);
  var cloned_scope = new Scope();
  var computable_clones = [];

  for (var i = 0; i !== sorted_computables.length; ++i) {
    var computable = sorted_computables[i];

    var input_computables = [];
    var computable_input_count = computable.get_input_count();
    for (var j = 0; j !== computable_input_count; ++j) {
      var computable_input = computable.get_input(j);

      var cloned_input_position = sorted_computables.indexOf(computable_input);
      input_computables.push(computable_clones[cloned_input_position]);
    }

    var computable_clone = computable.clone(input_computables, cloned_scope);
    computable_clones.push(computable_clone);

    if (this.is_output(computable)) {
      cloned_scope.add_output(computable_clone, this.get_output_field_name(this.get_output_index(computable)));
    }
  }

  return cloned_scope;
};

/**
 * @param {ScopeParameter} parameter_computable
 * @returns {number}
 */
Scope.prototype.get_input_parameter_index = function (parameter_computable) {
  return this._inputs.indexOf(parameter_computable);
};

/**
 * @param {Computable} computable
 * @returns {boolean} Whether the given computable is an input for the Scope.
 */
Scope.prototype.is_input = function (computable) {
  return this._inputs.indexOf(computable) !== -1;
};

/**
 * A helper method for removing a ScopeParameter input from the Scope.
 * @param {number} index The index of the input to remove.
 */
Scope.prototype.remove_input = function (index) {
  var parameter = this.get_input(index);
  // This will throw if the parameter is unable to be removed.
  parameter.destroy();
};

/**
 * @param {number} index The index of the ScopeParameter to get.
 * @returns {?ScopeParameter} The ScopeParameter computable at the given parameter index.
 */
Scope.prototype.get_input = function (index) {
  return this._inputs[index];
};

/**
 * @returns {number} The total number of inputs for this Scope.
 */
Scope.prototype.get_input_count = function () {
  return this._inputs.length;
};

/**
 * @returns {IRType} The output type for the Scope.
 */
Scope.prototype.get_output_type = function () {
  var output_count = this.get_output_count();
  var output_type;

  if (output_count === 0) {
    output_type = new IRVoidType();
  } else {
    var output_type_map = {};
    for (var output_field_name in this._output_field_name_to_computable) {
      output_type_map[output_field_name] = this._output_field_name_to_computable[output_field_name].get_output_type();
    }

    output_type = new IRCompoundType(output_type_map);
  }

  return output_type;
};

/**
 * @param {string} field_name
 * @returns {Computable?}
 */
Scope.prototype.get_output_by_field_name = function (field_name) {
  return this._output_field_name_to_computable[field_name];
};

/**
 * @param {Computable} computable The computable to use as an output for the Scope.
 * @param {string} [output_field_name]
 * @returns {string} The path of the output Computable added.
 */
Scope.prototype.add_output = function (computable, output_field_name) {
  if (computable.get_containing_scope() !== this) {
    throw new Error("Computable must be part of scope to use as output");
  }

  if (this.is_output(computable)) {
    throw new Error(computable + " is already an output");
  }

  if (output_field_name) {
    if (this._output_field_name_to_computable[output_field_name]) {
      // TODO: probably want to have it do a replace operation.
      throw new Error("That output field name is already taken");
    }
    this._output_field_name_to_computable[output_field_name] = computable;
    this._computable_identity_to_output_field_name[computable.get_identity()] = output_field_name;
  } else {
    throw new Error("TODO");
  }

  this._outputs.push(computable);

  return output_field_name;
};

/**
 * @param {Computable} computable The computable to use as an output for the Scope.
 * @param {string} output_field_name The name of the output field to replace
 * @returns {string} The path of the output Computable added.
 */
Scope.prototype.replace_output = function(computable, output_field_name) {
  if (!output_field_name) {
    throw new Error('You must specify an output field name to replace!');
  }

  if (computable.get_containing_scope() !== this) {
    throw new Error("Computable must be part of scope to use as output");
  }

  if (this.is_output(computable)) {
    throw new Error(computable + " is already an output");
  }

  var old_output = this._output_field_name_to_computable[output_field_name];
  this._output_field_name_to_computable[output_field_name] = computable;
  this._computable_identity_to_output_field_name[computable.get_identity()] = output_field_name;
  if (old_output) {
    delete this._computable_identity_to_output_field_name[old_output.get_identity()];
  }

  this._outputs.push(computable);

  return output_field_name;
};

/**
 * @param {Computable} computable
 * @returns {boolean} Whether the given computable is an output for the Scope.
 */
Scope.prototype.is_output = function (computable) {
  return this.get_output_index(computable) !== -1;
};

/**
 * @param {Computable} computable
 * @returns {number}
 */
Scope.prototype.get_output_index = function (computable) {
  return this._outputs.indexOf(computable);
};

/**
 * @param {number} index
 * @returns {string}
 */
Scope.prototype.get_output_field_name = function (index) {
  var computable = this.get_output(index);
  if (!computable) throw new Error("No output at the given index, "+index);

  var output_field_name = this._computable_identity_to_output_field_name[computable.get_identity()];
  if (!output_field_name) {
    throw new Error(computable + " is not an output");
  }

  return output_field_name;
};

/**
 * @returns {number} The total number of outputs for this Scope.
 */
Scope.prototype.get_output_count = function () {
  return this._outputs.length;
};

/**
 * @param {number} index The index of the output to get.
 * @returns {?Computable} The Computable at the given output index.
 */
Scope.prototype.get_output = function (index) {
  return this._outputs[index];
};

/**
 * @param {Computable} computable
 * @returns {boolean}
 */
Scope.prototype.is_output_computable = function (computable) {
  return this._outputs.indexOf(computable) !== -1;
};

/**
 * @param {number} index The index to get the ScopeInstance at.
 * @returns {?ScopeInstance} The ScopeInstance Computable at the given index.
 */
Scope.prototype.get_instance = function (index) {
  return this._instances[index];
};

/**
 * @returns {number} The number of instances the scope has.
 */
Scope.prototype.get_instance_count = function () {
  return this._instances.length;
};

/**
 * @param {number} index The index of the computable to get.
 * @returns {?Computable} The internal Computable at the given index.
 */
Scope.prototype.get_computable = function (index) {
  return this._computables[index];
};

/**
 * @returns {number} The number of internal computables the Scope has.
 */
Scope.prototype.get_computable_count = function () {
  return this._computables.length;
};

/**
 * @returns {string} A string that uniquely identifies this Scope.
 */
Scope.prototype.get_identity = function () {
  return this._identity;
};

/**
* @returns {string} A string of the element or model name associated with the Scope.
*/
Scope.prototype.get_name = function () {
  return this._name;
};

/**
 * @param {number} index
 * @returns {?Scope}
 */
Scope.prototype.get_dependee_scope = function (index) {
  return this._dependees[index];
};

/**
 * @returns {number}
 */
Scope.prototype.get_dependee_scope_count = function () {
  return this._dependees.length;
};

/**
 * @param {number} index
 * @returns {Scope}
 */
Scope.prototype.get_referenced_scope = function (index) {
  return this._referenced_scopes[index];
};

/**
 * @returns {number}
 */
Scope.prototype.get_referenced_scope_count = function () {
  return this._referenced_scopes.length;
};

/**
 * @param {number} scope_index
 * @param {number} computable_index
 * @returns {Computable}
 */
Scope.prototype.get_referenced_scope_computable = function (scope_index, computable_index) {
  return this._referenced_scope_computables[scope_index][computable_index];
};

/**
 * @param {number} scope_index
 * @returns {Scope}
 */
Scope.prototype.get_referenced_scope_computable_count = function (scope_index) {
  return this._referenced_scope_computables[scope_index].length;
};

/**
 * A helper to destroy all of a Scope's computables and their dependees
 */
Scope.prototype.flush = function () {
  while (this.get_computable_count()) {
    this.get_computable(0).destroy();
  }
};

module.exports = Scope;
