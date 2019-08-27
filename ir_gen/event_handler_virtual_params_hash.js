"use strict";

// This is to serve as the single source of truth for event handler virtual parameters.  This is to prevent awkward and annoying duplication in the few spots that need to be aware of what virtual parameters are available and how to create computables for them.

var event_handler_virtual_params_hash = {
  event: {
    // requires_event: true,
    create: function (scope) {
      var VirtualEvent = require('../ir/computables/virtual_event');
      return new VirtualEvent(scope);
    }
  },
  element: {
    create: function (scope, inputs) {
      var VirtualElement = require('../ir/computables/virtual_element');
      var after_placement_output = inputs[0];
      return new VirtualElement(scope, after_placement_output);
    },
    // We want the whole object, not just the placement DOM node - this way we can get additional metadata on the object.
    input_references: function (scope_definition) {
      var after = scope_definition.outputs.after.replace(/\.after$/, '');
      return [after];
    }
  },
  elements: {
    create: function (scope) {
      var VirtualElements = require('../ir/computables/virtual_elements');
      return new VirtualElements(scope);
    }
  },
  evElement: {
    // requires_event: true,
    create: function (scope) {
      var VirtualEvElement = require('../ir/computables/virtual_evelement');
      return new VirtualEvElement(scope);
    }
  },
  emitEvent: {
    create: function (scope) {
      var VirtualEmitEvent = require('../ir/computables/virtual_emitevent');
      return new VirtualEmitEvent(scope);
    }
  }
};

module.exports = event_handler_virtual_params_hash;
