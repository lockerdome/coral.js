"use strict";

// TODO: I'm certain there is a better way to abstract this than to allow null callbacks.
/**
 * An abstraction for representing a value that has not yet been determined.
 *
 * @constructor
 * @param {number} unresolved_count The number of times dependency_resolved will be called on this Unresolved before compute_callback will be called.
 * @param {Array.<*>} dependencies An array of values that can include special Unresolved values.
 * @param {function} compute_callback All dependencies will be passed to the function in the order in which they were passed here, an additional callback argument will be added on to the end to call with the final value for the Unresolved.
 * @param {function} resolve_callback The function that will be called when the Unresolved has resolved.
 */
function Unresolved (unresolved_count, dependencies, compute_callback, resolve_callback) {
  this.unresolved_count = unresolved_count;
  this.dependencies = dependencies;
  this.dependees = [];
  this.compute_callback = compute_callback;
  this.resolve_callback = resolve_callback;
  this.value = undefined;
}

/**
 * Notify a dependee Unresolved that the dependency Unresolved has resolved.
 */
Unresolved.prototype.dependency_resolved = function dependency_resolved () {
  if (--this.unresolved_count === 0) {
    var _this = this;
    var dependencies = [function(result) {
      _this.value = result;
      if (_this.resolve_callback) {
        _this.resolve_callback.call(undefined, result);
      }
      for (var j = 0; j !== _this.dependees.length; ++j) {
        _this.dependees[j].dependency_resolved();
      }
    }];

    for (var i = 0; i !== this.dependencies.length; ++i) {
      var dependency = this.dependencies[i];
      if (dependency instanceof Unresolved) {
        dependencies.push(dependency.value);
      } else {
        dependencies.push(dependency);
      }
    }

    this.compute_callback.apply(undefined, dependencies);
  }
};

/**
 * Called by any user of the Unresolved who wants to be notified when the Unresolved has resolved.
 * @param {Unresolved} dependee
 */
Unresolved.prototype.add_dependee = function add_dependee (dependee) {
  this.dependees.push(dependee);
};

module.exports = Unresolved;
