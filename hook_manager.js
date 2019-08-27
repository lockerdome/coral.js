"use strict";

/**
 * @constructor
 */
function HookManager () {
  this._pipelineHooks = {}; // { hookName: hookObj }
}

/**
 * @param {String} hookName The Hook's name.
 * @param {function} listener The function to execute when the matching Hook is run.
 */
HookManager.prototype.onHook = function (hookName, listener) {
  var hook = this._getPipelineHook(hookName);
  hook.addListener(function () {
    var callback = arguments[0];
    var args = Array.prototype.slice.call(arguments, 1);
    function cb() {
      callback.apply(null, args);
    }
    listener.apply(null, [cb].concat(args));
  });
};

/**
 * @param {String} hookName The Hook's name.
 * @param {Array} argsArray The array of arguments to use for the listener(s) associated with that Hook.
 * @param {function} callback The callback to be executed after the Hook's listeners have finished executing.
 */
HookManager.prototype.runHook = function (hookName, argsArray, callback) {
  if (!Array.isArray(argsArray)) throw new Error('Must use an Array for 2nd argument of runHook (' + hookName + ')');
  var hook = this._getPipelineHook(hookName);
  hook.run(callback, argsArray);
};

/**
 * @private
 * @param {String} hookName The Hook's name.
 * @returns {Hook} Either an existing PipelineHook that matches the hookName or a new PipelineHook.
 */
HookManager.prototype._getPipelineHook = function (hookName) {
  if (hookName in this._pipelineHooks) {
    return this._pipelineHooks[hookName];
  } else {
    var newHook = new PipelineHook(hookName);
    this._pipelineHooks[hookName] = newHook;
    return newHook;
  }
};

/**
 * @param {String} hookName The PipelineHook's name.
 * @param {function} listener The function to execute when the matching PipelineHook is run. The function should take in exactly one input parameter and return the processed version of that input.
 */
HookManager.prototype.onPipelineHook = function (hookName, listener) {
  var pipelineHook = this._getPipelineHook(hookName);
  pipelineHook.addListener(listener);
};

/**
 * @param {String} hookName The PipelineHook's name.
 * @param {*} input An initial input value that will be processed by the PipelineHook's listeners in a chain.
 * @param {function} callback The callback that is executed after the input has been processed by the PipelineHook's listeners one at a time. The callback is passed the processed version of the input.
 */
HookManager.prototype.runPipelineHook = function (hookName, input, callback) {
  var pipelineHook = this._getPipelineHook(hookName);
  pipelineHook.run(callback, [input]);
};


/**
 * @constructor
 * @param {String} hookName The name of the PipelineHook.
 */
function PipelineHook (hookName) {
  this._hookName = hookName;
  this._listeners = [];
}

/**
 * @returns {String} Name of the PipelineHook.
 */
PipelineHook.prototype.getHookName = function () {
  return this._hookName;
};

/**
 * @returns {Array} Array of listeners associated with the PipelineHook.
 */
PipelineHook.prototype.getListeners = function () {
  return this._listeners;
};

/**
 * @param {function} listener The function to execute when the matching PipelineHook is run.
 */
PipelineHook.prototype.addListener = function (listener) {
  this.getListeners().push(listener);
};

/**
 * @param {function} callback The callback to be executed after the input has been processed by the PipelineHook's listener functions one at a time.
 * @param {*} input The input to use for the listeners associated with that PipelineHook.
 */
PipelineHook.prototype.run = function (callback, arrArgs) {
  var originalLength = arrArgs.length;
  var listeners = this.getListeners();
  var hookName = this.getHookName();
  var i = 0;
  processNext.apply(null, arrArgs);
  function processNext () {
    var args = Array.prototype.slice.call(arguments);
    if (args.length !== originalLength) throw new Error('No return value specified in listener for Hook "' + hookName + '"');
    var listener = listeners[i];
    if (!listener) return callback.apply(null, arguments);
    i++;
    listener.apply(null, [processNext].concat(args));
  }

};

module.exports = HookManager;
