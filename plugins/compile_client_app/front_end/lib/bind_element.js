'use strict';
var Observable = require('./observables/observable.js');

function stringifySelectVal (val) {
  return val === null ? ""
    : val+'';
}

function stringifyVal (val) {
  return val === null || val === undefined ? ''
    : val+'';
}

Observable._bindElement = function bindElement(elem, obs, triggers) {
  if (!Observable.is(obs)) return;
  if (obs.get() != null) elem.value = obs.get();
  triggers = triggers || 'change';
  if (!Array.isArray(triggers)) {
    triggers = [triggers];
  }

  // TODO: Next pass, use framework events
  triggers.forEach(function(trigger) {
    elem.addEventListener(trigger, updateObs);
  });

  obs.on('afterChange', elem.nodeName === "SELECT" ? updateSelect : updateElem);

  var oldVal = obs.get();
  function updateElem(val) {
    var elemVal = elem.value;
    var prevVal = oldVal;
    oldVal = val;
    if (elemVal === stringifyVal(val)) return;
    else if (elemVal === stringifyVal(prevVal)) elem.value = stringifyVal(val);
    else obs.set(elemVal);
  }

  function updateSelect(val) {
    var elemVal = elem.value;

    var options = {};
    // Handle case where old option was removed from DOM and select auto-updated.
    var allOptions = elem.querySelectorAll("option[value]");
    for (var i = 0; i < allOptions.length; ++i) {
      var optionElement = allOptions[i];
      if (!optionElement.disabled) {
        options[optionElement.value] = true;
      }
    }

    var prevVal = stringifySelectVal(oldVal) !== "" && !options[oldVal] ? elemVal : oldVal;

    oldVal = val;
    if (elemVal === stringifySelectVal(val)) {
      if (elemVal === "") { // No viable options left
        unselectSelect();
      }
      return;
    }
    else if (elemVal === stringifySelectVal(prevVal)) {
      if (stringifySelectVal(val) === "") {
        unselectSelect();
      } else {
        if (options[val]) {
          elem.value = val;
        } else {
          unselectSelect();
        }
      }
    }
    else obs.set(elemVal === "" ? null : elemVal);
  }
  function unselectSelect () {
    oldVal = null;
    var disabledOption = elem.querySelector("option[disabled]");
    if (disabledOption) {
      elem.selectedIndex = disabledOption.index;
    } else {
      elem.selectedIndex = 0;
    }
  }
  function updateObs() {
    obs.set(elem.value);
    Observable.scheduler.run();
  }
};
