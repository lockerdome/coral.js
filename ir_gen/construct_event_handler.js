"use strict";

var extract_event_callback_input_computables = require('./extract_event_callback_input_computables');

var key_validation = require('../lib/key_validation');

var ScopeInstanceInteractionEventHandler = require('../ir/computables/scope_instance_interaction_event_handler');
var EventHandler = require('../ir/computables/event_handler');
var KeyEventHandler = require('../ir/computables/key_event_handler');
var SelectorEventHandler = require('../ir/computables/selector_event_handler');

var ScopeRefComputables = require('./scope_refs.js');

var Callback = require('../ir/computables/callback');

/**
 * @param {Object} event_handler_virtual_params_hash
 * @param {Object} custom_computable_creators_by_event_type
 * @param {string} event_specification
 * @param {function} handler_function
 * @param {Array.<string>} params
 * @param {Scope} scope
 * @param {ScopeRefComputables} scope_ref_computables
 * @param {Object} scope_definition
 * @returns {Computable}
 */
function construct_event_computable (event_handler_virtual_params_hash, custom_computable_creators_by_event_type, event_specification, handler_function, params, scope, scope_ref_computables, scope_definition, info_by_scope_type) {
  var event_parts =  event_specification.match(/^(\S+)( (.*))?$/);

  if (!event_parts) {
    throw new Error("Invalid event specification, "+JSON.stringify(event_specification));
  }

  var event_type = event_parts[1];
  var event_selector = event_parts[3];

  var event_selector_computable;

  // If the given selector is a computable reference then use it, otherwise treat it as a DOM query selector.  It's possible to have a computable with a reference of 'div', which is also a valid DOM query selector, we will use the computable if present.
  if (event_selector) {
    try {
      event_selector_computable = scope_ref_computables.get_ref(event_selector);
    } catch (e) {}
  }

  var event_handler_scope_ref_computables = ScopeRefComputables.create_closure(scope_ref_computables);

  Object.keys(event_handler_virtual_params_hash).forEach(function (event_handler_virtual_param) {
    event_handler_scope_ref_computables.add_ref(event_handler_virtual_param, function () {
      var required_refs = [];
      if (event_handler_virtual_params_hash[event_handler_virtual_param].input_references) {
        required_refs = event_handler_virtual_params_hash[event_handler_virtual_param].input_references(scope_definition);
      }

      var input_computables = [];
      for (var i = 0; i < required_refs.length; ++i) {
        input_computables.push(scope_ref_computables.get_ref(required_refs[i]));
      }

      var virtual_computable = event_handler_virtual_params_hash[event_handler_virtual_param].create(scope, input_computables, scope_definition, info_by_scope_type, event_handler_virtual_param);
      return virtual_computable;
    });
  });

  var event_handler_input_computables = extract_event_callback_input_computables(params, event_handler_scope_ref_computables);

  var computable_creators_by_event_type = {
    keydown: function (scope, handler_function, event_handler_input_computables, event_specification, scope_definition) {
      throw new Error('Do not use "keydown" event directly. Instead make a key shortcut using "key" handler');
    },
    key: function (scope, handler_function, event_handler_input_computables, event_specification, scope_definition) {
      var compiled_key_sequence = [];
      var event_selector_array = event_selector.replace(/ /g, '').split('>');
      for (var i = 0; i < event_selector_array.length; ++i) {
        var compiled_key_strokes = {};
        var selector = event_selector_array[i];
        var strokes = selector.split('+');
        for (var j = 0; j < strokes.length; ++j) {
          var stroke = strokes[j];
          var transformed_key = key_validation.transform_key(stroke);
          if (transformed_key) compiled_key_strokes[transformed_key] = 1;
          else if (key_validation.validate_general_key(stroke)) compiled_key_strokes[stroke] = 1;
          else throw new Error(stroke + ' is not a supported key stroke to be used as a key board shortcut');
        }
        compiled_key_sequence.push(compiled_key_strokes);
      }
      return new KeyEventHandler(scope, handler_function, event_handler_input_computables, compiled_key_sequence);
    },
    default: function (scope, handler_function, event_handler_input_computables, event_specification, scope_definition) {
      if (event_selector) {
        if (event_selector_computable) {
          // TODO: validate that the computable is actually a scope instance type
          return new ScopeInstanceInteractionEventHandler(scope, handler_function, event_handler_input_computables, event_type, event_selector_computable);
        } else {
          return new SelectorEventHandler(scope, handler_function, event_handler_input_computables, event_type, event_selector);
        }
      } else {
        return new EventHandler(scope, handler_function, event_handler_input_computables, event_type);
      }
    }
  };

  for (var custom_event_type in custom_computable_creators_by_event_type) {
    computable_creators_by_event_type[custom_event_type] = custom_computable_creators_by_event_type[custom_event_type];
  }


  var computable;
  if (computable_creators_by_event_type[event_type]) {
    computable = computable_creators_by_event_type[event_type](scope, handler_function, event_handler_input_computables, event_specification, scope_definition);
  } else {
    computable = computable_creators_by_event_type.default(scope, handler_function, event_handler_input_computables, event_specification, scope_definition);
  }
  return computable;
}

module.exports = construct_event_computable;
