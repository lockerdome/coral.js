"use strict";

/**
 * An independent component that exists within a Scope, that can reference or be referenced by other components in that Scope.
 *
 * Rules:
 * - All references must be bound, having unbound references is illegal.
 * - All Computables must have a containing Scope.
 * - Implementations are responsible for defining their traits by overriding the getters.
 */

var inherits = require('util').inherits;
var EventEmitter = require('events').EventEmitter;
var IRType = require('./type');
var IRVoidType = require('./types/void');

var current_unique_id = 0;

/**
 * Abstract base for all Computable implementations.
 * @constructor
 * @extends EventEmitter
 * @emits Scope#computable_added
 * @param {Scope} scope The scope this computable is associated with.
 * @param {Array.<Computable>} input_computables The Computables to bind the inputs to.
 * @param {IRType} output_type The output type specification.
 */
function Computable (scope, input_computables, output_type) {
  this.setMaxListeners(0);
  if (!scope || !scope.emit) {
    throw new Error("It is illegal to have an unscoped Computable");
  }
  if (!(output_type instanceof IRType)) {
    throw new Error("Must pass in an IRType output type");
  }

  this._identity = ''+current_unique_id;
  current_unique_id++;

  this._output_type = output_type;
  this._inputs = [];
  this._dependees = [];
  this._scope = scope;

  var _this = this;

  // TODO: this needs to be updated when dependee's inputs are removed
  function find_dependee (computable) {
    var dependee_entry;
    for (var i = 0; i !== _this._dependees.length; ++i) {
      var current_entry = _this._dependees[i];
      if (current_entry.computable === computable) {
        dependee_entry = current_entry;
        break;
      }
    }

    return { entry: dependee_entry, index: i };
  }

  // TODO: come up with a better way to handle all these cases than to use the event emitter pattern, just feels awkward.
  this.on('dependee_added', function (computable, input_index) {
    var dependee_result = find_dependee(computable);
    var dependee_entry = dependee_result.entry;
    if (dependee_entry) {
      dependee_entry.indexes.push(input_index);
    } else {
      dependee_entry = {
        computable: computable,
        indexes: [input_index],
        destroy_listener: function () {
          var dependee_result = find_dependee(computable);
          _this._dependees.splice(dependee_result.index, 1);
        },
        cleanup: function () {
          computable.removeListener('destroyed', dependee_entry.destroy_listener);
        }
      };

      _this._dependees.push(dependee_entry);
      computable.once('destroyed', dependee_entry.destroy_listener);
    }
  });

  this.on('dependee_removed', function (computable, input_index) {
    var dependee_result = find_dependee(computable);

    var dependee_entry = dependee_result.entry;

    var indexes = dependee_entry.indexes;
    var input_indexes_entry_index = indexes.indexOf(input_index);
    if (input_indexes_entry_index !== -1) {
      indexes.splice(input_indexes_entry_index, 1);
    }
    if (!indexes.length) {
      _this._dependees.splice(dependee_result.index, 1);
      dependee_entry.cleanup();
    }
  });

  for (var i = 0; i < input_computables.length; i++) {
    var input_computable = input_computables[i];
    this.set_input(i, input_computable);
  }

  scope.emit('computable_added', this);
}

inherits(Computable, EventEmitter);

/**
 * @returns {string}
 */
Computable.prototype.toString = function () {
  return this.constructor.name + '-' + this.get_identity();
};

/**
 * @returns {string} A string that uniquely identifies this Computable.
 */
Computable.prototype.get_identity = function () {
  return this._identity;
};

// TODO: change to validate all at once?  Would certainly make some spots less awkward.
/**
 * Validate the usability of a Computable for the given index.
 *
 * Subclasses of Computable will want to override this to add the validations they want and call the base class' _validate_input method.
 *
 * @private
 * @param {number} index The index the computable is requesting to fill.
 * @param {Computable} computable The computable to check whether it can be used as an input.
 * @throws {Error} When the input is invalid.
 */
Computable.prototype._validate_input = function (index, computable) {
  if (!computable || !(computable instanceof Computable)) {
    throw new Error("Input "+index+" is not a computable; got "+computable);
  }
  var void_type = new IRVoidType();
  if (computable.get_output_type().equals(void_type)) {
    throw new Error("Can not use void as an input "+computable);
  }

  var scope = this.get_containing_scope();
  var input_containing_scope = computable.get_containing_scope();
  if (input_containing_scope !== scope) {
    throw new Error("All input computables must reside in the same scope as the computable that is being created");
  }

  if (computable.is_destroyed()) {
    throw new Error("Cannot use a destroyed computable as an input");
  }
};

/**
 * @param {number} index
 */
Computable.prototype._reevaluate_input = function (index) {
  var index_input_computable = this.get_input(index);
  this._validate_input(index, index_input_computable);
};

/**
 * @virtual
 * @param {string} field_name The field name to get a computable at.
 * @returns {Computable} The Computable at the given field name.
 */
Computable.prototype.get_property = function (field_name) {
  throw new Error("Called get_property on a computable that didn't implement it");
};

/**
 * @returns {Scope} The Scope that contains this Computable.
 */
Computable.prototype.get_containing_scope = function () {
  return this._scope;
};

/**
 * Removes the Computable and anything that relies on it from the containing Scope.
 * @emits Computable#destroyed
 */
Computable.prototype.destroy = function () {
  while (this.get_dependee_count()) {
    this.get_dependee(0).destroy();
  }

  this._scope = null;

  this.emit("destroyed");
};

/**
 * @returns {boolean} Whether the Computable has been destroyed.
 */
Computable.prototype.is_destroyed = function () {
  return !this._scope;
};

/**
 * Performs a shallow clone of the Computable.
 *
 * @param {Array.<Computable>} [input_computables] The Computables to use as inputs in place of the current input Computables.  Must reside in the given Scope.
 * @param {Scope} [scope] The Scope the cloned Computable will reside in.
 * @returns {Computable} A shallow clone of the Computable in the same scope (unless given a particular Scope), with the same input Computables (unless given alternative input Computables), but no dependees.
 */
Computable.prototype.clone = function (input_computables, scope) {
  if (this.is_destroyed()) {
    throw new Error("Cannot clone a destroyed Computable");
  }

  if (!input_computables) {
    input_computables = this._inputs.slice();
  }

  if (!scope) {
    scope = this.get_containing_scope();
  }

  return this._clone(scope, input_computables);
};

/**
 * A private virtual method where each Computable subclass will define how they are cloned using the given input Computables and Scope.
 *
 * @virtual
 * @private
 * @param {Scope} scope The Scope that the Computable will reside in.
 * @param {Array.<Computable>} [input_computables] The Computables to use as inputs.  Defaults to the Computables current inputs if not provided.
 * @returns {Computable} A shallow cloned version of the current Computable with no dependees.
 */
Computable.prototype._clone = function (scope, input_computables) {
  throw new Error("This subclass of Computable has not implemented clone");
};

/**
 * @returns {boolean} Returns whether the Computable is a scope parameter or not.
 */
Computable.prototype.is_scope_parameter = function () {
  return false;
};

/**
 * Sets the input parameter at the given index to a different Computable.
 *
 * This same thing can be accomplished using Computable.prototype.clone with new inputs and destroying the original Computable, however that destroy operation will mean recreating all of the dependees it may have.  With this you can avoid that destroy and recreate process.
 *
 * @emits Computable#dependee_removed
 * @emits Computable#dependee_added
 * @param {number} index The index of the input parameter to bind.
 * @param {Computable} computable The computable to use for the reference.
 */
Computable.prototype.set_input = function (index, computable) {
  if (this.is_destroyed()) {
    throw new Error("Cannot update inputs for a destroyed Computable");
  }

  if (!computable) {
    throw new Error("It is illegal to unbind a reference");
  }

  var old_input_computable = this._inputs[index];

  var is_same_computable = old_input_computable === computable;
  if (is_same_computable) {
    return;
  }

  this._validate_input(index, computable);

  if (old_input_computable) {
    old_input_computable.emit('dependee_removed', this, index);
  }
  this._inputs[index] = computable;
  computable.emit('dependee_added', this, index);
};

/**
 * @param {number} index The index to get the bound input Computable at.
 * @returns {?Computable} The input Computable bound at the given index.
 */
Computable.prototype.get_input = function (index) {
  return this._inputs[index];
};

/**
 * @returns {number} The number of inputs the Computable has.
 */
Computable.prototype.get_input_count = function () {
  return this._inputs.length;
};

/**
 * @param {Computable} input The computable to get the input indexes of
 * @returns {Array.<Number>} The indices of the given input computable
 */
Computable.prototype.get_input_indices = function(input) {
  var indices = [];
  var index = 0;
  while ((index = this._inputs.indexOf(input, index)) !== -1) {
    indices.push(index);
    index++;
  }
  return indices;
};

/**
 * @param {number} index The index to get the dependee at.
 * @returns {Computable} The dependee at the given index.
 */
Computable.prototype.get_dependee = function (index) {
  var dependee_entry = this._dependees[index];
  return dependee_entry && dependee_entry.computable;
};

/**
 * @param {number} index The index to get the dependee input indexes at.
 * @returns {Array.<number>} The dependee input indexes for the dependee at the given index.
 *   * For example, a constant used twice by a certain Computable, would have one entry for that Computable using the constant twice, but would have two input indexes in the result from this function.
 */
Computable.prototype.get_dependee_input_indexes = function (index) {
  var dependee_entry = this._dependees[index];
  if (!dependee_entry) {
    throw new Error("Unable to find dependee input indexes for dependee at index, " +index);
  }

  return dependee_entry.indexes;
};

/**
 * @returns {number} The number of dependees this Computable has.
 */
Computable.prototype.get_dependee_count = function () {
  return this._dependees.length;
};

/**
 * @returns {IRType} The output type specified for the Computable.
 */
Computable.prototype.get_output_type = function () {
  return this._output_type;
};

/**
 * @param {IRType} type The output type specified for the Computable.
 */
Computable.prototype.set_output_type = function (type) {
  var original_output_type = this._output_type;
  this._output_type = type;
  if (original_output_type.equals(this._output_type)) {
    return;
  }

  var dependee_count = this.get_dependee_count();
  for (var i = 0; i < dependee_count; i++) {
    var dependee = this.get_dependee(i);
    var input_indices = dependee.get_input_indices(this);
    for (var j = 0; j < input_indices.length; ++j) {
      dependee._reevaluate_input(input_indices[j]);
    }
  }
};

/**
 * @param {number} index The index of the input to check whether it can cause the output to change.
 * @returns {boolean} Whether the Computable will change if the input at the given index changes.
 */
Computable.prototype.is_output_updated_on_input_change = function (index) {
  return false;
};

/**
 * @returns {boolean} Whether the Computable may change by means outside of our control without any warning.
 */
Computable.prototype.is_output_updated_externally = function () {
  return false;
};

/**
 * @returns {boolean} Whether the Computable can change as the result of a mutation within the context of the framework.
 */
Computable.prototype.is_output_updated_on_mutate = function () {
  return false;
};

/**
 * @returns {boolean} Whether the Computable is allowed to be mutated by another Computable, it is possible that the Computable could be mutated without changing.
 */
Computable.prototype.is_mutable = function () {
  return false;
};

/**
 * @returns {boolean} Whether the Computable will ever change by any means after its initial value.
 */
Computable.prototype.is_invariant = function () {
  if (this.is_output_updated_externally() || this.is_output_updated_on_mutate()) return false;
  var input_count = this.get_input_count();
  for (var i = 0; i < input_count; i++) {
    if (this.is_output_updated_on_input_change(i)) return false;
  }
  return true;
};

/**
 * @returns {boolean} Whether the Computable's initial value can be determined at compile time.
 */
Computable.prototype.is_compile_time_constant = function() {
  return false;
};

/**
 * @returns {boolean} Whether the Computable being present has some sort of side effect on the environment, such as displaying something to a user.
 */
Computable.prototype.is_side_effect_causing = function () {
  return false;
};

/**
 * @returns {boolean} Whether the Computable output must be initially resolved asynchronously.
 */
Computable.prototype.is_initially_async = function ()  {
  return false;
};

/**
 * @returns {boolean} Whether the computable is allowed to be moved from one scope to another, such as with inlining.
 */
Computable.prototype.is_immovable = function () {
  return false;
};

module.exports = Computable;
