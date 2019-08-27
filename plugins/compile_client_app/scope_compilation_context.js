"use strict";

var format = require('util').format;

var topologically_sort_computables = require('../../ir/topologically_sort_computables');

var InstantiationContext = require('./instantiation_context');
var ExecutionContext = require('./execution_context');

var SymbolAllocator = require('./symbol_allocator');

var EventHandler = require('../../ir/computables/event_handler');
var VirtualEmitEvent = require('../../ir/computables/virtual_emitevent');
var VirtualPlacement = require('../../ir/computables/virtual_placement');
var InsertInitializedElement = require('../../ir/computables/insert_initialized_element');


var Scope = require('../../ir/scope');

var symbol_range_to_character_range = require('./symbol_range_to_character_range');

var EventWiringCutoffMarker = require('../../ir/computables/event_wiring_cutoff_marker');

/**
 * @returns {string}
 */
Scope.prototype.get_async_pre_init_identity = function () {
  return this._async_pre_init_identity;
};

/**
 * @returns {string}
 */
Scope.prototype.get_sync_init_identity = function () {
  return this._sync_init_identity;
};

/**
 * @param {Scope} scope
 * @returns {Array.<Computable>}
 */
function get_scope_computables (scope) {
  var output = [];
  var computable_count = scope.get_computable_count();
  for (var i = 0; i !== computable_count; ++i) {
    output.push(scope.get_computable(i));
  }

  return output;
}

/**
 * @param {Scope} scope
 * @returns {Array.<Computable>}
 */
function get_scope_inputs (scope) {
  var output = [];
  var input_count = scope.get_input_count();
  for (var i = 0; i !== input_count; ++i) {
    output.push(scope.get_input(i));
  }

  return output;
}

/**
 * @param {Scope} scope
 * @returns {Array.<Computable>}
 */
function get_scope_outputs (scope) {
  var output = [];
  var output_count = scope.get_output_count();
  for (var i = 0; i !== output_count; ++i) {
    output.push(scope.get_output(i));
  }

  return output;
}

function check_is_needed_for_async_pre_initialize_phase (computable) {
  return computable.is_needed_for_async_pre_initialize_phase();
}

function check_is_needed_for_sync_initialize_phase (computable) {
  return computable.is_needed_for_sync_initialize_phase();
}

// TODO clean up execution context creation
/**
 * @param {Computable} computable
 * @param {Array.<Computable>} local_computables
 * @param {Array.<string>} local_references
 * @param {string} phase_property The phase to require the input metadata to match in order to include the reference in the execution context
 * @returns {Array.<string>} The references for the phase for the given computable
 */
function get_execution_context_input_references (computable, local_computables, local_references, phase_property) {
  var inputs = [];
  var input_count = computable.get_input_count();

  for (var i = 0; i !== input_count; ++i) {
    var input_metadata = computable.get_client_side_input_metadata(i);
    if (!input_metadata[phase_property]) {
      inputs.push(null);
      continue;
    }

    var input_computable = computable.get_input(i);
    var computable_index = local_computables.indexOf(input_computable);
    inputs.push(local_references[computable_index]);
    if (computable_index === -1) {
      throw new Error("Unable to find computable reference for "+input_computable+", something is likely wrong with the get_client_side_input_metadata functions on some computable");
    }
  }

  return inputs;
}

/**
 * @param {CompilationContext} compilation_context
 * @param {ScopeCompilationContext} scope_compilation_context
 * @returns {string} Symbols that represent the scope symbols that need to have cascades destroyed to.
 */
function generate_scope_cleanup_instructions (compilation_context, scope_compilation_context) {
  var scope = scope_compilation_context.get_scope();

  var computable_count = scope.get_computable_count();
  var cleanup_instructions = '';
  for (var i = 0; i !== computable_count; ++i) {
    var computable = scope.get_computable(i);
    cleanup_instructions += computable.client_side_code_cleanup_hook(compilation_context, scope_compilation_context);
  }

  return cleanup_instructions;
}

/**
 * @param {Scope} scope
 * @returns {{ handlers, initialize_computables  }}
 */
function generate_own_event_handler (scope) {
  if (scope._own_event_handlers !== undefined) {
    return scope._own_event_handlers;
  }

  var output = { handlers: {}, initialize_computables: [] };

  var computables = scope._computables;
  for (var i = 0; i !== computables.length; ++i) {
    var computable = computables[i];

    if (!(computable instanceof EventHandler)) {
      continue;
    } else if (computable.get_event_type() === 'initialize') {
      output.initialize_computables.push(computable);
      continue;
    }

    var event_type = computable.get_event_type();
    var event_computables = output.handlers[event_type] || [];

    event_computables.push(computable);

    output.handlers[event_type] = event_computables;
  }

  scope._own_event_handlers = output;

  return output;
}

/**
 * @param {Scope} scope
 * @returns {Object.<string, Computable>}
 */
function generate_dispatch_event_computable_map (scope) {
  if (scope._dispatch_event_hash) {
    return scope._dispatch_event_hash;
  }

  var contained_scopes = [];
  var contained_scope_computables = [];
  var i;
  var j;
  var k;
  var scope_computable;

  var element_as_arg_computables = [];

  var scope_computables = scope._computables;
  for (i = 0; i !== scope_computables.length; ++i) {
    scope_computable = scope_computables[i];
    if (scope_computable instanceof InsertInitializedElement) {
      element_as_arg_computables.push(scope_computable);
    }
  }

  for (i = 0; i !== element_as_arg_computables.length; ++i) {
    var element_as_arg_computable = element_as_arg_computables[i];
    var element_as_arg_referenced_scopes = element_as_arg_computable.get_referenced_scopes();

    for (j = 0; j !== element_as_arg_referenced_scopes.length; ++j) {
      var element_as_arg_referenced_scope = element_as_arg_referenced_scopes[j];
      var element_as_arg_referenced_scope_index = contained_scopes.indexOf(element_as_arg_referenced_scope);
      if (element_as_arg_referenced_scope_index === -1) {
        element_as_arg_referenced_scope_index = contained_scopes.push(element_as_arg_referenced_scope) - 1;
        contained_scope_computables.push([]);
      }

      contained_scope_computables[element_as_arg_referenced_scope_index].push(element_as_arg_computable);
    }
  }

  var referenced_scope_count = scope.get_referenced_scope_count();
  for (i = 0; i !== referenced_scope_count; ++i) {
    var referenced_scope_computable_count = scope.get_referenced_scope_computable_count(i);
    var referenced_scope_computables = [];
    for (j = 0; j !== referenced_scope_computable_count; ++j) {
      var referenced_scope_computable = scope.get_referenced_scope_computable(i, j);

      var input_count = referenced_scope_computable.get_input_count();

      // TODO: Not quite true, possible for one case to be virtual and others not, we want it only if the inputs for the scope in question are non-virtual.
      // TODO: This needs to be factored better, too many things are aware of this logic
      var is_virtual = false;
      for (k = 0; k !== input_count; ++k) {
        var input_computable = referenced_scope_computable.get_input(k);
        if (input_computable instanceof VirtualPlacement) {
          is_virtual = true;
          break;
        }
      }

      if (is_virtual) {
        continue;
      }

      if (referenced_scope_computables.indexOf(referenced_scope_computable) === -1) {
        referenced_scope_computables.push(referenced_scope_computable);
      }
    }

    if (referenced_scope_computables.length) {
      var referenced_scope = scope.get_referenced_scope(i);
      var referenced_scope_index = contained_scopes.indexOf(referenced_scope);
      if (referenced_scope_index === -1) {
        referenced_scope_index = contained_scopes.push(referenced_scope) - 1;
        contained_scope_computables.push([]);
      }

      contained_scope_computables[referenced_scope_index] = contained_scope_computables[referenced_scope_index].concat(referenced_scope_computables);
    }
  }

  var output = {};
  for (i = 0; i !== contained_scopes.length; ++i) {
    var contained_scope = contained_scopes[i];

    // TODO: Clean this up
    var is_scope_event_wiring_cutoff_marker = false;
    var scope_computable_count = contained_scope.get_computable_count();
    for (j = 0; j < scope_computable_count; ++j) {
      scope_computable = contained_scope.get_computable(j);
      if (scope_computable instanceof EventWiringCutoffMarker) {
        is_scope_event_wiring_cutoff_marker = true;
        break;
      }
    }

    if (is_scope_event_wiring_cutoff_marker) {
      continue;
    }

    var contained_scope_event_names;
    if (contained_scope._contained_scope_event_names) {
      contained_scope_event_names = contained_scope._contained_scope_event_names;
    } else {
      var contained_scope_own_handlers = generate_own_event_handler(contained_scope).handlers;
      var dispatch_event_computable_map = generate_dispatch_event_computable_map(contained_scope);

      var contained_scope_event_name_hash = {};
      var contained_scope_handled_event_name;
      for (contained_scope_handled_event_name in contained_scope_own_handlers) {
        contained_scope_event_name_hash[contained_scope_handled_event_name] = true;
      }
      for (contained_scope_handled_event_name in dispatch_event_computable_map) {
        contained_scope_event_name_hash[contained_scope_handled_event_name] = true;
      }

      contained_scope_event_names = Object.keys(contained_scope_event_name_hash);

      // TODO: Don't store this on the scope itself
      contained_scope._contained_scope_event_names = contained_scope_event_names;
    }

    var contained_scope_computable_array = contained_scope_computables[i];

    for (j = 0; j !== contained_scope_computable_array.length; ++j) {
      var contained_scope_computable = contained_scope_computable_array[j];
      for (k = 0; k !== contained_scope_event_names.length; ++k) {
        var contained_scope_event_name = contained_scope_event_names[k];
        var event_computables = output[contained_scope_event_name] || [];

        if (event_computables.indexOf(contained_scope_computable) === -1) {
          event_computables.push(contained_scope_computable);
        }

        output[contained_scope_event_name] = event_computables;
      }
    }
  }

  scope._dispatch_event_hash = output;
  return output;
}

/**
 * @constructor
 * @param {Object} symbols
 * @param {Scope} scope
 * @param {CompilationContext} compilation_context
 * @param {Boolean} is_root_scope
 */
function ScopeCompilationContext (symbols, scope, compilation_context, is_root_scope) {

  this._symbols = symbols;
  this._async_border_character_range = symbol_range_to_character_range(symbols.ranges.ASYNC_BORDER_RANGES);
  this._sync_border_character_range = symbol_range_to_character_range(symbols.ranges.SYNC_BORDER_RANGES);
  var async_internal_character_range = symbol_range_to_character_range(symbols.ranges.ASYNC_DYNAMIC_INTERNAL_RANGES);
  var sync_internal_character_range = symbol_range_to_character_range(symbols.ranges.SYNC_DYNAMIC_INTERNAL_RANGES);

  // TODO: This will be removed eventually when the code is refactored.
  var symbol_test_range = symbol_range_to_character_range(symbols.ranges.ALLOCATION_TEST_RANGE);

  this._async_dynamic_internal_state_symbol_allocator = new SymbolAllocator(async_internal_character_range);
  this._sync_dynamic_internal_state_symbol_allocator = new SymbolAllocator(sync_internal_character_range);

  this._internal_by_identity = {};
  this._named_internals_for_identity = {};

  this._scope = scope;
  this._compilation_context = compilation_context;
  this._is_root_scope = is_root_scope;

  var computable_count = this._scope.get_computable_count();
  for (var i = 0; i !== computable_count; ++i) {
    var computable = this._scope.get_computable(i);
    this._named_internals_for_identity[computable.get_identity()] = {};
  }

  var ordered_scope_computables = topologically_sort_computables(get_scope_computables(scope));
  this._ordered_scope_computables = ordered_scope_computables;

  this._sync_initialize_computables = ordered_scope_computables.filter(check_is_needed_for_sync_initialize_phase);
  this._async_pre_initialize_computables = ordered_scope_computables.filter(check_is_needed_for_async_pre_initialize_phase);

  var scope_inputs = get_scope_inputs(scope);
  var scope_outputs = get_scope_outputs(scope);

  var _this = this;

  var is_async_pre_initialize_computable = function (computable) {
    return _this._async_pre_initialize_computables.indexOf(computable) !== -1;
  };

  var is_only_sync_initialize_computable = function (computable) {
    return _this._sync_initialize_computables.indexOf(computable) !== -1 && !is_async_pre_initialize_computable(computable);
  };

  this._sync_input_computables = scope_inputs.filter(is_only_sync_initialize_computable);
  this._sync_output_computables = scope_outputs.filter(is_only_sync_initialize_computable);
  this._async_input_computables = scope_inputs.filter(is_async_pre_initialize_computable);
  this._async_output_computables = scope_outputs.filter(is_async_pre_initialize_computable);

  // TODO: all analysis needed should be done here, the function generation functions should have no hard work to do.
  // * Basically, I should be able to re-run one of the function generation functions and it shouldn't screw with anything.  That and I should be able to run them in either order.

  // TODO: move reference handling code to own function
  this._reference_by_identity = {};

  // TODO: Both of these will be removed at some point, we don't use symbols either of these generate.
  //       For now they are just used for tracking.  They are largely still here for legacy purposes.
  var local_symbol_allocator = new SymbolAllocator(symbol_test_range);
  var input_symbol_allocator = new SymbolAllocator(symbol_test_range);

  this._output_assignments_needed_hash = {
    // symbol -> context symbol
    async_pre_init: {},
    sync_init: {}
  };


  ordered_scope_computables.forEach(function (computable) {
    // Distinguish between async and sync computables. Some computables generate code for both async and sync phases and have special handling.
    var internal_allocator = is_async_pre_initialize_computable(computable) ? _this._async_dynamic_internal_state_symbol_allocator :  _this._sync_dynamic_internal_state_symbol_allocator;

    // Provide a reference (symbol) for each computable on the scope. Not every computable will have a symbol, and some may have more than one.
    // TODO: reference handling needs restructuring
    var reference = (function process_reference (computable, local_symbol_allocator, input_symbol_allocator, dynamic_internal_allocator) {
      // The InstantiationContext gives computables the ability to allocate symbols within the computable's function.
      var instantiation_context = new InstantiationContext(local_symbol_allocator, input_symbol_allocator, _this._async_dynamic_internal_state_symbol_allocator, _this._sync_dynamic_internal_state_symbol_allocator, _this._named_internals_for_identity[computable.get_identity()]);

      var original_input_symbol_count = input_symbol_allocator.get_symbol_count();
      var original_local_symbol_count = local_symbol_allocator.get_symbol_count();

      var reference = computable.client_side_code_reference_hook(compilation_context, instantiation_context, _this, { symbols: symbols });

      var updated_local_symbol_count = local_symbol_allocator.get_symbol_count();
      var updated_input_symbol_count = input_symbol_allocator.get_symbol_count();
      var is_scope_output = scope.is_output(computable);
      var output_needs_handling = is_scope_output;
      var internal_symbol;

      if (updated_input_symbol_count !== original_input_symbol_count) {
        internal_symbol = _this._get_input_symbol(computable);
      } else if (updated_local_symbol_count !== original_local_symbol_count) {
        if (is_scope_output) {
          internal_symbol = _this._get_output_symbol(computable);
          output_needs_handling = false;
        } else {
          internal_symbol = dynamic_internal_allocator.allocate();
        }
      } else if (is_scope_output && reference === _this._get_output_symbol(computable)) {
        internal_symbol = reference;
        output_needs_handling = false;
      }

      if (internal_symbol) {
        _this._internal_by_identity[computable.get_identity()] = internal_symbol;
        reference = internal_symbol;
      }

      // Nothing has taken charge of assigning the value to this output, this is likely the case if an input is an output.
      // * Does it happen anytime else?
      if (output_needs_handling) {
        var output_symbol = _this._get_output_symbol(computable);
        var output_phase = _this._async_output_computables.indexOf(computable) !== -1 ? 'async_pre_init' : 'sync_init';
        _this._output_assignments_needed_hash[output_phase][output_symbol] = reference;
      }

      return reference;
    })(computable, local_symbol_allocator, input_symbol_allocator, internal_allocator);

    _this._reference_by_identity[computable.get_identity()] = reference;
  });


  // TODO: Right now this maps in global constants into local constants, ideally we'd map in all of the constants at once.
  // * I don't want to map in global constant symbols and just let the code handle global symbols it sees.
  // context ref symbol -> global ref symbol
  this._globals_to_map_in_hash = (function () {
    var globals_to_map_in_hash = {};
    var computable_count = scope.get_computable_count();

    var mapped_global_reference_to_internal_reference = {};

    for (var i = 0; i !== computable_count; ++i) {
      var computable = scope.get_computable(i);
      if (computable.is_compile_time_constant() && computable.is_invariant()) {
        var global_reference = _this._reference_by_identity[computable.get_identity()];
        var internal_symbol;
        if (mapped_global_reference_to_internal_reference[global_reference]) {
          internal_symbol = mapped_global_reference_to_internal_reference[global_reference];
        } else {
          internal_symbol = _this._async_dynamic_internal_state_symbol_allocator.allocate();
          mapped_global_reference_to_internal_reference[global_reference] = internal_symbol;
        }
        globals_to_map_in_hash[internal_symbol] = global_reference;
        _this._reference_by_identity[computable.get_identity()] = internal_symbol;
      }
    }

    return globals_to_map_in_hash;
  })();

  this._async_references = this._async_pre_initialize_computables.map(function (computable) {
    return _this.get_computable_reference(computable);
  });
  this._sync_references = this._sync_initialize_computables.map(function (computable) {
    return _this.get_computable_reference(computable);
  });

  // NOTE: This relies on the reference hooks being executed before it.
  (function () {
    /**
     * string -> Array.<Computable>
     */
    _this._event_handling_computables_by_type = generate_dispatch_event_computable_map(scope);

    var event_handler_info = generate_own_event_handler(scope);
    _this._own_event_handlers_by_type = event_handler_info.handlers;
    _this._initialize_event_computables = event_handler_info.initialize_computables;

    _this._dispatch_event_types_set = (function () {
      var own_and_child_event_names = Object.keys(_this._own_event_handlers_by_type).concat(Object.keys(_this._event_handling_computables_by_type));
      var output = {};
      for (var k = 0; k !== own_and_child_event_names.length; ++k) {
        var event_name = own_and_child_event_names[k];
        output[event_name] = true;
      }
      return output;
    })();

    /**
     * Packed arguments describing how to dispatch the different events that arrive.
     *
     * Common case is that the scope itself won't have any event handlers, but a child will.
     *
     * There will be two different sections of the packed args.  The first section describes events in child scopes, the second section describes handling for events in this scope.  Those two sections will be separated by a special separator character.
     *
     * Child event format:
     *
     * child_event_group[0] = The global symbol which contains the name of the event.
     * child_event_group[1-N] = Information to use for determining when to dispatch to the child, and how to obtain a reference to the child to dispatch to it grouped by scope instance or scope instance array.  No separator character is needed since each group is 3 characters long.
     *
     * NOTE: In the scope array case I'm assuming each entry has metadata that defines their sync intermediate input and output symbol
     *
     * child_event_subgroup[0] = Scope internal symbol for the scope or scope array.
     * child_event_subgroup[1] = Scope internal symbol for the begin placement.
     * child_event_subgroup[2] = Scope internal symbol for the end placement.
     *
     * Own event format:
     *
     * Events handler instructions are grouped by the event type.
     *
     * The wiring for each event handler for the event type is separated by a special separator character.
     *
     * own_event_group[0] = The global symbol which contains the name of the event.
     * own_event_group[1-N] = Event handler wiring for each event handler relevant to this event type, separated by a special separator character.
     *
     * Simple event handler "click":
     *   own_event_subgroup[0] = Global symbol for the handler function to use.
     *   own_event_subgroup[1-N] = Scope internal symbols to use as inputs to the event handler.
     *
     * Scope instance event handler: "click button":
     *
     *   own_event_subgroup[0] = Scope internal symbol for the begin placement
     *   own_event_subgroup[1] = Scope internal symbol for the end placement
     *   own_event_subgroup[2] =  Global symbol for the handler function to use.
     *   own_event_subgroup[3-N] = Scope internal symbols to use as inputs to the event handler.
     *
     * Selector event handler: "click .button":
     *
     *   own_event_subgroup[0] = Global symbol for the selector.
     *   own_event_subgroup[1] = Global symbol for the handler function to use.
     *   own_event_subgroup[2-N] = Scope internal symbols to use as inputs to the event handler.
     *
     * Key event handler: "key g>d":
     *   own_event_subgroup[0] = Global symbol for the compiled key shortcut event sequence.
     *   own_event_subgroup[1] = Global symbol for the handler function to use.
     *   own_event_subgroup[2-N] = Scope internal symbols to use as inputs to the event handler.
     */
    _this._packed_event_instructions = (function () {
      var descending_child_event_symbol_section = (function (compilation_context, scope_compilation_context, event_handling_computables_by_type) {
        var output = '';

        var event_types = Object.keys(event_handling_computables_by_type);
        for (var i = 0; i !== event_types.length; ++i) {
          var event_type = event_types[i];
          var event_type_global_symbol = compilation_context.allocate_global(event_type);

          if (i !== 0) {
            output += '$$SYMBOLS.special.SEPARATOR_3$$';
          }

          output += event_type_global_symbol;

          var event_type_handling_computables = event_handling_computables_by_type[event_type];
          for (var j = 0; j !== event_type_handling_computables.length; ++j) {
            var event_type_handling_computable = event_type_handling_computables[j];
            var scope_symbol = event_type_handling_computable.get_scope_symbol(_this);
            output += scope_symbol;
          }
        }

        return output;
      })(compilation_context, _this, _this._event_handling_computables_by_type);

      var own_event_handler_symbols_section = (function (compilation_context, scope_compilation_context, own_event_handlers_by_type) {
        var output = '';

        var own_event_types = Object.keys(own_event_handlers_by_type);
        for (var i = 0; i !== own_event_types.length; ++i) {
          var event_type = own_event_types[i];
          var event_type_handlers = own_event_handlers_by_type[event_type];
          var event_type_global_symbol = compilation_context.allocate_global(event_type);

          if (i !== 0) {
            output += '$$SYMBOLS.special.SEPARATOR_3$$';
          }
          output += event_type_global_symbol;

          var included_event_type_handlers = 0;
          for (var j = 0; j !== event_type_handlers.length; ++j) {
            if (included_event_type_handlers !== 0) {
              output += '$$SYMBOLS.special.SEPARATOR$$';
            }
            var internal_event_wiring_symbols = event_type_handlers[j].internal_event_wiring_symbols_hook(compilation_context, scope_compilation_context);
            if (internal_event_wiring_symbols) {
              included_event_type_handlers++;
              output += internal_event_wiring_symbols;
            }
          }
        }

        return output;
      })(compilation_context, _this, _this._own_event_handlers_by_type);

      if (!descending_child_event_symbol_section.length && !own_event_handler_symbols_section.length) {
        return '';
      }

      return descending_child_event_symbol_section + '$$SYMBOLS.special.SEPARATOR_2$$' + own_event_handler_symbols_section;
    })();
  })();

  // NOTE: Relies on reference hooks running before this.
  this._cleanup_instructions = generate_scope_cleanup_instructions (compilation_context, this);

}

/**
 * @returns {Symbols}
 */
ScopeCompilationContext.prototype.get_symbols = function () {
  return this._symbols;
};

/**
 * @returns {Boolean}
 */
 ScopeCompilationContext.prototype.is_root_scope = function () {
   return this._is_root_scope;
 };


/**
 * @returns {string}
 */
ScopeCompilationContext.prototype.get_cleanup_instructions = function () {
  return this._cleanup_instructions;
};

/**
 * @param {Computable} computable
 * @returns {string}
 */
ScopeCompilationContext.prototype.get_computable_reference = function (computable) {
  return this._reference_by_identity[computable.get_identity()];
};

/**
 * @returns {Scope}
 */
ScopeCompilationContext.prototype.get_scope = function () {
  return this._scope;
};

ScopeCompilationContext.prototype.get_computable_internal_symbol = function (computable_identity) {
  return this._internal_by_identity[computable_identity];
};

ScopeCompilationContext.prototype.get_computable_named_internal_symbol = function (computable_identity, name) {
  var named_internals = this._named_internals_for_identity[computable_identity];
  var symbol = named_internals[name];

  return symbol;
};

// TODO: remove this at some point later, definitely better ways of doing this
/**
 * @private
 * @param {Computable} computable
 * @returns {string}
 */
ScopeCompilationContext.prototype._get_output_symbol = function (computable) {
  var async_output_index = this._async_output_computables.indexOf(computable);
  if (async_output_index !== -1) {
    return this.get_async_output_symbol(async_output_index);
  }

  var sync_output_index = this._sync_output_computables.indexOf(computable);
  if (sync_output_index !== -1) {
    return this.get_sync_output_symbol(sync_output_index);
  }

  throw new Error("Don't use this method except in cases where it is a known output");
};

// TODO: remove this at some point later, definitely better ways of doing this
/**
 * @private
 * @param {Computable} computable
 * @returns {string}
 */
ScopeCompilationContext.prototype._get_input_symbol = function (computable) {
  var async_input_index = this._async_input_computables.indexOf(computable);
  if (async_input_index !== -1) {
    return this.get_async_input_symbol(async_input_index);
  }

  var sync_input_index = this._sync_input_computables.indexOf(computable);
  if (sync_input_index !== -1) {
    return this.get_sync_input_symbol(sync_input_index);
  }

  throw new Error("Don't use this method except in cases where it is a known input");
};

/**
 * @returns {number} The number of async internal symbols this scope has.
 */
ScopeCompilationContext.prototype.get_async_internal_count = function () {
  return this._async_dynamic_internal_state_symbol_allocator.get_symbol_count();
};

/**
 * @returns {number} The number of sync internal symbols this scope has.
 */
ScopeCompilationContext.prototype.get_sync_internal_count = function () {
  return this._sync_dynamic_internal_state_symbol_allocator.get_symbol_count();
};

/**
 * @returns {number}
 */
ScopeCompilationContext.prototype.get_async_input_count = function () {
  return this._async_input_computables.length;
};

function get_output_symbols_registeration_snippet (scope_compilation_context) {
  var scope = scope_compilation_context.get_scope();
  var output_computables = get_scope_outputs(scope);
  var output_symbols = '';
  for (var i = 0; i < output_computables.length; ++i) {
    output_symbols += scope_compilation_context._get_output_symbol(output_computables[i]);
  }

  return '$$SCOPE_METHODS.register_output_symbols$$("' + output_symbols + '")';
}

// NOTE: This function makes the assumption that async internals will be determined before sync internals.
/**
 * @param {CompilationContext} compilation_context
 * @param {ScopeCompilationContext} scope_compilation_context
 * @returns {string} The snippet that will initialize the placeholder unresolveds.
 */
function get_placeholder_unresolveds_initialization_snippet (compilation_context, scope_compilation_context) {
  var async_internal_count = scope_compilation_context.get_async_internal_count();

  var async_output_count = scope_compilation_context.get_async_output_count();
  var async_input_count = scope_compilation_context.get_async_input_count();
  var sync_input_count = scope_compilation_context.get_sync_input_count();

  return '$$SCOPE_METHODS.populate_placeholder_unresolveds$$('+async_internal_count+','+async_output_count+','+async_input_count+','+sync_input_count+')';
}

/**
 * @returns {number} The number of internal symbols allocated in the sync initialize phase.
 */
ScopeCompilationContext.prototype.get_sync_initialize_phase_internal_count = function () {
  return this._get_internal_count(this._sync_initialize_computables);
};

/**
 * @param {number} index
 * @returns {Computable}
 */
ScopeCompilationContext.prototype.get_async_input_computable = function (index) {
  return this._async_input_computables[index];
};

/**
 * @param {number} index
 * @returns {string}
 */
ScopeCompilationContext.prototype.get_async_input_symbol = function (index) {
  var symbol = this._async_border_character_range.get_character(index);
  if (symbol === false) {
    throw new Error("Invalid async input symbol index " + index + " exceeds range " + this._async_border_character_range);
  }
  return symbol;
};

/**
 * @returns {number}
 */
ScopeCompilationContext.prototype.get_async_output_count = function () {
  return this._async_output_computables.length;
};

/**
 * @param {number} index
 * @returns {Computable}
 */
ScopeCompilationContext.prototype.get_async_output_computable = function (index) {
  return this._async_output_computables[index];
};

/**
 * @param {number} index
 * @returns {string}
 */
ScopeCompilationContext.prototype.get_async_output_symbol = function (index) {
  var async_input_symbol_count = this.get_async_input_count();
  var symbol = this._async_border_character_range.get_character(async_input_symbol_count + index);
  if (symbol === false) {
    throw new Error("Invalid async output symbol index " + index + " exceeds range " + this._async_border_character_range);
  }
  return symbol;
};

/**
 * @param {number} index
 * @returns {string}
 */
ScopeCompilationContext.prototype.get_async_output_field_name = function (index) {
  var scope = this._scope;

  var computable = this.get_async_output_computable(index);
  var scope_output_index = scope.get_output_index(computable);

  return scope.get_output_field_name(scope_output_index);
};

/**
 * @returns {number}
 */
ScopeCompilationContext.prototype.get_sync_input_count = function () {
  return this._sync_input_computables.length;
};

/**
 * @param {number} index
 * @returns {Computable}
 */
ScopeCompilationContext.prototype.get_sync_input_computable = function (index) {
  return this._sync_input_computables[index];
};

/**
 * @param {number} index
 * @returns {string}
 */
ScopeCompilationContext.prototype.get_sync_input_symbol = function (index) {
  var symbol = this._sync_border_character_range.get_character(index);
  if (symbol === false) {
    throw new Error("Invalid sync intput symbol index " + index + " exceeds range " + this._sync_border_character_range);
  }
  return symbol;
};

/**
 * @returns {number}
 */
ScopeCompilationContext.prototype.get_sync_output_count = function () {
  return this._sync_output_computables.length;
};

/**
 * @param {number} index
 * @returns {Computable}
 */
ScopeCompilationContext.prototype.get_sync_output_computable = function (index) {
  return this._sync_output_computables[index];
};

/**
 * @param {number} index
 * @returns {string}
 */
ScopeCompilationContext.prototype.get_sync_output_symbol = function (index) {
  var sync_input_symbol_count = this.get_sync_input_count();
  var symbol = this._sync_border_character_range.get_character(sync_input_symbol_count + index);
  if (symbol === false) {
    throw new Error("Invalid sync output symbol index " + index + " exceeds range " + this._sync_border_character_range);
  }
  return symbol;
};

/**
 * @param {number} index
 * @returns {string}
 */
ScopeCompilationContext.prototype.get_sync_output_field_name = function (index) {
  var scope = this._scope;

  var computable = this.get_sync_output_computable(index);
  var scope_output_index = scope.get_output_index(computable);

  return scope.get_output_field_name(scope_output_index);
};

/**
 * @param {CompilationContext} compilation_context
 * @param {Object} output_assignments_needed_hash
 * @returns {Array.<string>}
 */
function generate_outstanding_output_assignments (compilation_context, output_assignments_needed_hash) {
  var packed_args = '';
  for (var output_symbol in output_assignments_needed_hash) {
    var source_reference_symbol = output_assignments_needed_hash[output_symbol];
    packed_args += output_symbol + source_reference_symbol;
  }

  return '$$SCOPE_METHODS.async_transfer_values$$(' + JSON.stringify(packed_args) + ')';
}

/**
 * @returns {{
 *   pre_compute: Array.<string>,
 *   compute: Array.<string>,
 *   post_compute: Array.<string>
 * }}
 * The generated code for the different parts of the async initialize function.
 */
ScopeCompilationContext.prototype.generate_async_pre_init_parts = function () {
  var scope = this._scope;
  var compilation_context = this._compilation_context;
  var _this = this;
  var async_pre_initialize_computables = this._async_pre_initialize_computables;

  var pre_compute_code = [];
  var compute_code = [];
  var post_compute_code = [];

  // NOTE: Avoid allocating global symbols for "pre_compute_code", it will not be available at the right time now with how things run at the moment for shard roots.

  var is_element_scope = !!scope.get_output_by_field_name('after');
  if (is_element_scope) { // determine begin and end placement

    var uses_element_virtual_computable = (function (ordered_scope_computables) {
      var VirtualElement = require('../../ir/computables/virtual_element');
      return ordered_scope_computables.some(function (computable) {
        return computable instanceof VirtualElement;
      });
    })(this._ordered_scope_computables);

    var is_used_by_event_handler = (function (scope) {
      var instance_count = scope.get_instance_count();
      for (var i = 0; i !== instance_count; ++i) {
        var instance = scope.get_instance(i);
        var dependee_count = instance.get_dependee_count();
        for (var j = 0; j !== dependee_count; ++j) {
          var instance_dependee_computable = instance.get_dependee(j);
          if (instance_dependee_computable instanceof EventHandler) {
            return true;
          }
        }
      }

      return false;
    })(scope);

    // TODO: This makes the assumption that the begin placement is the first input.
    var internal_begin_placement_symbol = this.get_computable_reference(scope.get_input(0));
    var internal_end_placement_symbol = this._get_output_symbol(scope.get_output_by_field_name('after'));
    pre_compute_code.push('$$SCOPE_METHODS.register_element_begin_end_placements$$('+JSON.stringify(internal_begin_placement_symbol+internal_end_placement_symbol)+')');
  }


  pre_compute_code.push(get_output_symbols_registeration_snippet(this));

  pre_compute_code.push(get_placeholder_unresolveds_initialization_snippet(compilation_context, this));

  if (scope.is_entry_point()) {
    var input_parameter_variant_flags = "";
    var i;

    for (i = 0; i !== this._async_input_computables.length; ++i) {
      input_parameter_variant_flags += this._async_input_computables[i].is_invariant() ? '$$SYMBOLS.special.FLAG$$' : '$$SYMBOLS.special.IGNORE$$';
    }

    input_parameter_variant_flags += '$$SYMBOLS.special.SEPARATOR$$';

    for (i = 0; i !== this._sync_input_computables.length; ++i) {
      input_parameter_variant_flags += this._sync_input_computables[i].is_invariant() ? '$$SYMBOLS.special.FLAG$$' : '$$SYMBOLS.special.IGNORE$$';
    }

    pre_compute_code.push('$$SCOPE_METHODS.initialize_zone$$('+JSON.stringify(scope.get_preload())+','+JSON.stringify(input_parameter_variant_flags)+')');
  } else {
    pre_compute_code.push('$$SCOPE_METHODS.inherit_zone$$()');
  }


  (function map_in_globals (globals_to_map_in_hash) {
    if (!Object.keys(globals_to_map_in_hash).length) return;

    var packed_args = '';
    for (var context_reference_name in globals_to_map_in_hash) {
      var global_reference_symbol = globals_to_map_in_hash[context_reference_name];
      packed_args += context_reference_name + global_reference_symbol;
    }

    compute_code.push('$$SCOPE_METHODS.map_in_globals$$(' + JSON.stringify(packed_args) + ')');
  })(_this._globals_to_map_in_hash);

  async_pre_initialize_computables.forEach(function (computable, index) {
    var setup = null;
    var inputs;
    var execution_context;

    var reference = _this._async_references[index];

    var is_initially_async = computable.is_initially_async();
    var has_client_side_code_initialize_hook = computable.has_client_side_code_initialize_hook();
    if (is_initially_async || has_client_side_code_initialize_hook) {
      inputs = get_execution_context_input_references(computable, async_pre_initialize_computables, _this._async_references, 'is_needed_for_async_pre_initialize_phase');
      var async_pre_init_input_symbols = inputs;
      var sync_init_input_symbols = get_execution_context_input_references(computable, _this._sync_initialize_computables, _this._sync_references, 'is_needed_for_sync_initialize_phase');

      execution_context = new ExecutionContext(reference, inputs, async_pre_init_input_symbols, sync_init_input_symbols, _this._named_internals_for_identity[computable.get_identity()]);
      if (is_initially_async) {
        computable.client_side_code_async_pre_initialize_hook(compilation_context, execution_context, _this);
      } else if (has_client_side_code_initialize_hook) {
        computable.client_side_code_initialize_hook(compilation_context, execution_context, _this);
      }

      setup = execution_context.get_setup_code();
    }

    if (setup) {
      compute_code.push(setup);
    }
  });

  // TODO: Remove this when certain that it is no longer needed.
  // This used to concat its returned value onto compute_code, but seems to be unnecessary now.
  if (Object.keys(_this._output_assignments_needed_hash.async_pre_init).length) {
    throw new Error('There should not be outstanding output assignments for async pre_init.');
  }

  if (this._packed_event_instructions.length) {
    post_compute_code.push('$$SCOPE_METHODS.register_event_handling$$(' + JSON.stringify(this._packed_event_instructions) + ')');
  }

  return {
    pre_compute: pre_compute_code,
    compute: compute_code,
    post_compute: post_compute_code
  };
};

/**
 * @returns {{
 *   pre_compute: Array.<string>,
 *   compute: Array.<string>,
 *   post_compute: Array.<string>
 * }}
 * The generated code for the different parts of the sync initialize function.
 * Note that nothing goes into the pre_compute part for this since async runs before sync and sync depends on async being done - the field is there to keep consistency with the output of 'generate_async_pre_init_parts'
 */
ScopeCompilationContext.prototype.generate_sync_init_parts = function () {
  var pre_compute_code = [];
  var compute_code = [];
  var post_compute_code = [];

  var scope = this._scope;
  var compilation_context = this._compilation_context;

  var sync_initialize_computables = this._sync_initialize_computables;

  var _this = this;

  sync_initialize_computables.forEach(function (computable, index) {
    var reference = _this._sync_references[index];

    var setup = null;
    var has_async_pre_init_hook = computable.is_initially_async();
    var is_already_sync_initialized = !has_async_pre_init_hook && computable.is_needed_for_async_pre_initialize_phase();

    if (computable.has_client_side_code_initialize_hook() && !is_already_sync_initialized) {
      var inputs = get_execution_context_input_references(computable, sync_initialize_computables, _this._sync_references, 'is_needed_for_sync_initialize_phase');
      var sync_init_input_symbols = inputs;
      var async_pre_init_input_symbols = get_execution_context_input_references(computable, _this._async_pre_initialize_computables, _this._async_references, 'is_needed_for_async_pre_initialize_phase');

      var execution_context = new ExecutionContext(reference, inputs, async_pre_init_input_symbols, sync_init_input_symbols, _this._named_internals_for_identity[computable.get_identity()]);
      computable.client_side_code_initialize_hook(compilation_context, execution_context, _this);
      setup = execution_context.get_setup_code();
    }

    if (setup) {
      compute_code.push(setup);
    }
  });

  if (Object.keys(_this._output_assignments_needed_hash.sync_init).length) {
    post_compute_code.push(generate_outstanding_output_assignments(compilation_context, _this._output_assignments_needed_hash.sync_init));
  }

  // Add cleanup instructions
  if (this._cleanup_instructions) {
    post_compute_code.push('$$SCOPE_METHODS.register_cleanup_instructions$$('+JSON.stringify(this._cleanup_instructions)+')');
  }

  post_compute_code.push('$$SCOPE_METHODS.finalize_scope$$()');

  // Add initialize events
  // This is after finalize_scope so that initialize methods can add updates and have them get processed immediately if possible.
  this._initialize_event_computables.forEach(function (initialize_event_computable) {
    var initialize_packed_args = initialize_event_computable.generate_packed_args_hook(_this);
    post_compute_code.push(format('$$SCOPE_METHODS.dispatch_initialize_event$$(Coral.sponges[%j],%j)', _this.get_computable_reference(initialize_event_computable), initialize_packed_args));
  });

  return {
    pre_compute: pre_compute_code,
    compute: compute_code,
    post_compute: post_compute_code
  };
};

module.exports = ScopeCompilationContext;
