'use strict';

function CoralEvent (event) {
  this.originalEvent = event;
  this.propagationStopped = false;
  this.immediatePropagationStopped = false;

  var copy_keys = ['type', 'altKey', 'bubbles', 'button', 'buttons', 'cancelable', 'char', 'charCode', 'clientX', 'clientY', 'ctrlKey', 'currentTarget', 'data', 'detail', 'eventPhase', 'key', 'keyCode', 'metaKey', 'offsetX', 'offsetY', 'originalTarget', 'pageX', 'pageY', 'relatedTarget', 'screenX', 'screenY', 'shiftKey', 'target', 'toElement', 'view', 'which'];
  for (var i = 0; i < copy_keys.length; ++i) {
    var key = copy_keys[i];
    this[key] = event[key];
  }
}

CoralEvent.prototype.isDefaultPrevented = function () {
  return this.originalEvent.defaultPrevented;
};

CoralEvent.prototype.preventDefault = function () {
  this.originalEvent.preventDefault();
};

CoralEvent.prototype.isPropagationStopped = function () {
  return this.propagationStopped;
};

CoralEvent.prototype.stopPropagation = function () {
  this.originalEvent.stopPropagation();
  this.propagationStopped = true;
};

CoralEvent.prototype.isImmediatePropagationStopped = function () {
  return this.immediatePropagationStopped;
};

CoralEvent.prototype.stopImmediatePropagation = function () {
  this.originalEvent.stopImmediatePropagation();
  this.immediatePropagationStopped = true;
};

module.exports = CoralEvent;
