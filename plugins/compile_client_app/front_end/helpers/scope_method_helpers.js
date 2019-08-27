"use strict";

/* global $$SYMBOLS, $$HELPERS, Coral */

/**
 * This file contains helpers that are placed on the Scope prototype.
 * They are not called in async and sync functions. They are called by the Scope methods called by async and sync functions.
**/
module.exports = function (register_scope_method) {

// Scope creation and destruction
// ===========================================================================

  register_scope_method(
    'create_scope',
    /**
     * @param {function} scope_async_pre_init_function
     * @param {function} sync_init_function
     * @returns {Object} A scope loaded with the necessary metadata symbols.
     */
    function (scope_async_pre_init_function, sync_init_function) {
      return new Coral.Scope(this, scope_async_pre_init_function, sync_init_function, this.coral_instance);
    }
  );

  register_scope_method(
    'destroy_scope',
    function recursive_destroy_scope_cascade () {
      this['$$SYMBOLS.scope_special.IS_DESTROYED$$'] = true;

      // TODO: Make sure Unresolveds are cleaned up on zone re-initialization
      // TODO: Think about case where scope is destroyed through Observable.set and has things in it async initializing
      if (this instanceof Coral.Unresolved) {
        return;
      }

      var cleanup_instructions = this.state['$$SYMBOLS.scope_special.CLEANUP_INSTRUCTIONS$$'];
      if (!cleanup_instructions) return;

      var i = 0;
      while (i !== cleanup_instructions.length) {
        var instruction = cleanup_instructions[i];
        switch (instruction) {
          case '$$SYMBOLS.cleanup.REMOVE_DOM$$': {
            var begin_placement = this.state[this.state.begin_placement_symbol];
            var end_placement = this.state[this.state.end_placement_symbol];
            if (begin_placement && begin_placement.parentNode && end_placement) {
              $$HELPERS.delete_between_placements$$(begin_placement, end_placement, true);
              begin_placement.parentNode.removeChild(begin_placement);
            }
            var parent_scope = this.state['$$SYMBOLS.scope_special.PARENT_SCOPE$$'];
            var focus_element = parent_scope.state[parent_scope.state.begin_placement_symbol];
            // If we have a text node, get next element sibling
            if (focus_element.nodeType === 3) {
              focus_element = focus_element.nextElementSibling;
            }
            if (focus_element) {
              focus_element.tabIndex = -1;
              focus_element.style.outline = 'none';
              focus_element.focus();
            }
            ++i;
            break;
          }

          case '$$SYMBOLS.cleanup.SUBSCRIBED_OBSERVABLES$$': {
            var subscribed = this.state['$$SYMBOLS.scope_special.SUBSCRIBED_OBSERVABLES$$'];
            if (subscribed) {
              var obs;
              while (subscribed.length) {
                obs = subscribed.pop();
                obs.scope_context = null;
                obs.removeListener('_set', $$HELPERS.add_volatile_observable_update$$);
              }
            }
            ++i;
            break;
          }

          case '$$SYMBOLS.cleanup.EVENT_LISTENERS$$': {
            var event_listeners = this.state['$$SYMBOLS.scope_special.EVENT_LISTENERS$$'];
            if (event_listeners) {
              while (event_listeners.length) {
                var observable_and_event = event_listeners.pop();
                var observable = observable_and_event.observable;
                var event_info = observable_and_event.event_info;
                observable.removeListener(event_info.event_name, event_info.listener);
              }
            }
            ++i;
            break;
          }

          default: {
            var cascade_destroy_to = this.state[instruction];
            if (cascade_destroy_to instanceof Coral.Unresolved) {
              cascade_destroy_to = cascade_destroy_to.value;
            }

            if (Array.isArray(cascade_destroy_to)) {
              for (var j = 0; j !== cascade_destroy_to.length; ++j) {
                var cascade_to_array_scope = cascade_destroy_to[j];
                recursive_destroy_scope_cascade.call(cascade_to_array_scope);
              }
            } else {
              recursive_destroy_scope_cascade.call(cascade_destroy_to);
            }

            ++i;
          }
        }
      }
    }
  );

  register_scope_method(
    'is_destroyed',
    function recursive_is_destroyed () {
      // TODO: If we remove volatile update handlers on destroy, then the handling in here shouldn't need to scan upward since there shouldn't be anything inserting updates to things other than the parameters for the destroyed scope and its descendants.

      if (this['$$SYMBOLS.scope_special.IS_DESTROYED$$']) {
        return true;
      }

      var parent_scope = this.state['$$SYMBOLS.scope_special.PARENT_SCOPE$$'];
      if (!parent_scope) {
        return false;
      }

      return recursive_is_destroyed.call(parent_scope);
    }
  );

  register_scope_method(
    'get_scratch_bucket',
    function (bucket_name) {
      var scratch = this['$$SYMBOLS.scope_special.SCRATCH$$'];
      if (!scratch) {
        scratch = {};
        this['$$SYMBOLS.scope_special.SCRATCH$$'] = scratch;
      }
      if (!scratch[bucket_name]) {
        scratch[bucket_name] = {};
      }
      return scratch[bucket_name];
    }
  );

  register_scope_method(
    'get_scope_symbol_value',
    function (symbol) {
      return this.state[symbol];
    }
  );

  register_scope_method(
    'get_scope_symbol_metadata',
    function (symbol) {
      var scope_metadata = this['$$SYMBOLS.scope_special.UPDATE_METADATA_BY_SYMBOL$$'];
      if (!scope_metadata[symbol]) scope_metadata[symbol] = new Coral.ScopeSymbolMetadata();
      return scope_metadata[symbol];
    }
  );

  register_scope_method(
    'get_instance_symbol_metadata',
    function (symbol) {
      var instance_metadata = this['$$SYMBOLS.scope_special.INSTANCE_UPDATE_METADATA_BY_SYMBOL$$'];
      if (!instance_metadata[symbol]) instance_metadata[symbol] = new Coral.InstanceSymbolMetadata(this);
      return instance_metadata[symbol];
    }
  );

  register_scope_method(
    'await_scope_async_init',
    function (scope) {
      var child_async_init_unresolved = scope['$$SYMBOLS.scope_special.ASYNC_INIT_RESOLVED$$'];
      if (!scope['$$SYMBOLS.scope_special.IS_ZONE_ENTRY_POINT$$'] && child_async_init_unresolved instanceof Coral.Unresolved) {
        var parent_async_init_unresolved = this['$$SYMBOLS.scope_special.ASYNC_INIT_RESOLVED$$'];
        parent_async_init_unresolved.unresolved_count++;
        parent_async_init_unresolved.dependencies.push(child_async_init_unresolved);
        child_async_init_unresolved.add_dependee(parent_async_init_unresolved);
      }
    }
  );

  register_scope_method(
    'add_border_passthroughs',
    /**
     * @param {string} packed_args
     *   packed_args[0-N] = Input and output argument symbols.
     * @param {Array.<number>} range
     */
    function (packed_args, range) {
      // TODO: alternatives to creating functions here?  Seems like I'm going to have to create two functions per, which is not great.
      for (var i = 0; i !== packed_args.length; ++i) {
        var current_parent_symbol = packed_args[i];
        if (current_parent_symbol === '$$SYMBOLS.special.PLACEMENT_VIRTUAL$$' || current_parent_symbol === '$$SYMBOLS.special.IGNORE$$') {
          continue;
        }
        this['$$SCOPE_METHODS.proxy_parent_symbol$$']($$HELPERS.get_character_in_range$$(range, i), current_parent_symbol);
      }
    }
  );

  register_scope_method(
    'proxy_parent_symbol',
    /**
     * @param {string} symbol
     * @param {string} parent_symbol
     */
    function (symbol, parent_symbol) {
      Object.defineProperty(this.state, symbol, {
        enumerable: true,
        get: function () {
          return this["$$SYMBOLS.scope_special.PARENT_SCOPE$$"].state[parent_symbol];
        },
        set: function (v) {
          this["$$SYMBOLS.scope_special.PARENT_SCOPE$$"].state[parent_symbol] = v;
        }
      });
    }
  );

  // TODO: Once I have something better in place for easily knowing what is updatable or not, don't wire up forwarding rules for non-updatable things.
  register_scope_method(
    'add_symbols_forwarding_rules',
    /**
     * @param {Object} scope
     * @param {string} input_output_symbols
     * @param {Array.<number>} range
     * @param {string} [scopes_array_symbol]
     * @param {string} [determining_value_symbol]
     */
    function (scope, input_output_symbols, range, scopes_array_symbol, determining_value_symbol) {
      var _this = this;

      // TODO: Do this cleaner
      // TODO: Only do this for zone entry scopes for now.
      scope.state['_io_'+range[0]] = input_output_symbols;

      var border_symbol_index = -1;

      for (var i = 0; i !== input_output_symbols.length; ++i) {
        border_symbol_index++;
        var input_output_symbol = input_output_symbols[i];

        // Skip special reserved characters.
        switch (input_output_symbol) {
        case '$$SYMBOLS.special.PREVIOUS_INTERMEDIATE$$':
        case '$$SYMBOLS.special.NEXT_INTERMEDIATE$$':
        case '$$SYMBOLS.special.IGNORE$$':
        case '$$SYMBOLS.special.PLACEMENT_VIRTUAL$$':
          continue;
        }

        var indexed_border_char_code = $$HELPERS.get_character_in_range$$(range, border_symbol_index);

        var scope_symbol_scope_metadata = scope['$$SCOPE_METHODS.get_scope_symbol_metadata$$'](indexed_border_char_code);
        var scope_symbol_instance_metadata = scope['$$SCOPE_METHODS.get_instance_symbol_metadata$$'](indexed_border_char_code);

        /* TODO: This isn't always true or necessary, but simplifies things for
                 now. If I had the forwarding symbol encoded in such a way to
                 denotate that it is updatable, then this could be easily
                 determined, but unfortunately that is not so at the moment. */
        scope_symbol_scope_metadata.is_registered_for_update_cycle = true;
        scope_symbol_scope_metadata.is_scope_parameter = true;

        if (scopes_array_symbol && input_output_symbol === '$$SYMBOLS.special.ITEM_INDEX_VIRTUAL$$') {
          scope.state['$$SYMBOLS.scope_special.SCRATCH$$'].symbols_needing_recording.push(indexed_border_char_code);
          scope_symbol_scope_metadata.is_recording_value_necessary = true;
          scope_symbol_instance_metadata.assign_set_handler(
            $$HELPERS.disallowed_item_index_set_handler$$,
            { forward_to_scope: this, forward_to_array_symbol: scopes_array_symbol }
          );

          var scopes_array_symbol_instance_metadata = _this['$$SCOPE_METHODS.get_instance_symbol_metadata$$'](scopes_array_symbol);
          scopes_array_symbol_instance_metadata.is_scope_input_output = true;
          scopes_array_symbol_instance_metadata.add_forward_rule(
            scope,
            indexed_border_char_code,
            determining_value_symbol,
            $$HELPERS.item_index_forward_to_intercept$$
          );
        } else {
          var io_symbol_scope_metadata = this['$$SCOPE_METHODS.get_scope_symbol_metadata$$'](input_output_symbol);
          var io_symbol_instance_metadata = this['$$SCOPE_METHODS.get_instance_symbol_metadata$$'](input_output_symbol);
          io_symbol_scope_metadata.is_scope_input_output = true;
          io_symbol_instance_metadata.add_forward_rule(
            scope,
            indexed_border_char_code,
            determining_value_symbol
          );
          scope_symbol_instance_metadata.add_forward_rule(this, input_output_symbol);
        }
      }
    }
  );

  register_scope_method(
    'cleanup_scopes_forwarding_rules',
    /**
     * Remove any forwarding rules on the input/output symbols that point to a removed scope.
     *
     * @param {Array.<Object>} removed_scopes
     * @param {string} input_output_symbols
     */
    function (removed_scopes, input_output_symbols) {
      var instance_metadata = this['$$SYMBOLS.scope_special.INSTANCE_UPDATE_METADATA_BY_SYMBOL$$'];

      for (var i = 0; i !== input_output_symbols.length; ++i) {
        // TODO: Skip symbol if it is one of the special characters
        var symbol = input_output_symbols[i];
        var instance_symbol_metadata = instance_metadata[symbol];
        if (instance_symbol_metadata) {
          instance_symbol_metadata.remove_forward_to_scopes(removed_scopes);
        }
      }
    }
  );

// Miscellaneous
// ===========================================================================

  register_scope_method(
    'get_symbol_observable',
    function (symbol) {
      var scope_instance_update_metadata = this['$$SYMBOLS.scope_special.INSTANCE_UPDATE_METADATA_BY_SYMBOL$$'];
      var symbol_instance_update_metadata = scope_instance_update_metadata[symbol];
      return symbol_instance_update_metadata && symbol_instance_update_metadata.observable;
    }
  );

  register_scope_method(
    'register_symbol_observable',
    function (symbol, observable) {
      var scope_instance_update_metadata = this['$$SYMBOLS.scope_special.INSTANCE_UPDATE_METADATA_BY_SYMBOL$$'];
      var symbol_instance_update_metadata = scope_instance_update_metadata[symbol];
      symbol_instance_update_metadata.observable = observable;
    }
  );

  register_scope_method(
    'extract_handler_argument',
    function (symbol, options) {
      return this['$$SCOPE_METHODS.traverse_symbol_ancestors$$'](symbol, null, traverse_callback);

      function traverse_callback (scope, symbol, metadata, instance_metadata) {
        if (options && options.use_unpacked) {
          return scope.state[symbol];
        }

        if (instance_metadata && instance_metadata.observable) {
          return instance_metadata.observable;
        }

        if (!metadata || !instance_metadata || !metadata.is_registered_for_update_cycle) {
          return scope.state[symbol];
        } else {
          var observable = new Coral.Observable(scope.state[symbol]);
          observable.on('_set', $$HELPERS.add_observable_update$$);
          observable.symbol = symbol;
          observable.scope_context = scope;

          scope['$$SCOPE_METHODS.register_symbol_observable$$'](symbol, observable);
          return observable;
        }

      }
    }
  );

  register_scope_method(
    'dome_wrap_element',
    function (scope_instance_symbol) {
      var already_created_symbol_observable = this['$$SCOPE_METHODS.get_symbol_observable$$'](scope_instance_symbol);
      if (already_created_symbol_observable) {
        return already_created_symbol_observable;
      }

      var scope_instance = this.state[scope_instance_symbol];
      // TODO: ScopeInstance should not be Unresolved at this point, but it has
      //       happened. Look into the root cause, so we can omit this check.
      if (scope_instance instanceof Coral.Unresolved) scope_instance = scope_instance.value;

      if (Array.isArray(scope_instance)) {
        var dome_element_collection = new Coral.DomeElementCollection(this, scope_instance_symbol);
        this['$$SCOPE_METHODS.register_symbol_observable$$'](scope_instance_symbol, dome_element_collection);
        return dome_element_collection;
      } else if (scope_instance && scope_instance.state['$$SYMBOLS.scope_special.SCRATCH$$']) {
        // TODO: Checking for scratch data to use this versus simple DomeElement isn't necessarily a perfect assumption.  I will likely start storing that data differently one data.  What is really need to start doing is start using different constructor functions so I can easily identify between these different types.
        var conditional_dome_element = new Coral.DomeConditionalElement(this, scope_instance_symbol);
        this['$$SCOPE_METHODS.register_symbol_observable$$'](scope_instance_symbol, conditional_dome_element);
        return conditional_dome_element;
      } else {
        return new Coral.DomeElement(scope_instance);
      }
    }
  );

// Zone
// ===========================================================================

  register_scope_method(
    'get_scope_io_symbols',
    function () {
      // TODO: This is too much of a hackjob
      var async_symbol = this.state['_io_'+$$SYMBOLS.ranges.ASYNC_BORDER_RANGES$$[0]];
      var sync_symbol = this.state['_io_'+$$SYMBOLS.ranges.SYNC_BORDER_RANGES$$[0]];
      return async_symbol + sync_symbol;
    }
  );

// Placeholder Unresolveds
// ===========================================================================

  register_scope_method(
    'assign_internal',
    /**
     * Used for immediately resolving a placeholder unresolved with a given value.
     *
     * @param {string} to_symbol
     * @param {*} value
     */
    function (to_symbol, value) {
      if (this['$$SYMBOLS.scope_special.IS_ASYNC_INIT_RESOLVED$$'] === true) {
        this.state[to_symbol] = value;
        return;
      }

      var placeholder_unresolved = this.state[to_symbol];

      // TODO: do this in a prettier way
      placeholder_unresolved.unresolved_count = 1;
      placeholder_unresolved.dependencies = [value];
      placeholder_unresolved.compute_callback = $$HELPERS.immediately_resolving_compute_callback$$;

      placeholder_unresolved.dependency_resolved();
    }
  );

  register_scope_method(
    'assign_internal_unresolved',
    /**
     * @param {string} to_symbol
     * @param {Array.<*>} dependencies
     * @param {function} compute_callback The compute callback for the Unresolved to use that can handle computing a value using the resolved values for the given dependencies.
     *  The compute callback should hand the resolve callback, its first parameter a single value that will be assigned to the to_symbol on the scope_context's state, replacing the Unresolved.
     */
    function (to_symbol, dependencies, compute_callback) {
      // This method should not be used in any phase other than the initialize phase, so this assumption is sound here.
      var placeholder_unresolved = this.state[to_symbol];

      var unresolved_count = 0;
      for (var i = 0; i !== dependencies.length; ++i) {
        var dependency = dependencies[i];
        if (dependency instanceof Coral.Unresolved) {
          unresolved_count++;
          dependency.add_dependee(placeholder_unresolved);
        }
      }

      var immediately_resolving = unresolved_count === 0;
      if (immediately_resolving) {
        unresolved_count = 1;
      }
      // TODO: Do a better job of managing the Unresolved, this is a hack.
      placeholder_unresolved.unresolved_count = unresolved_count;
      placeholder_unresolved.dependencies = dependencies;
      placeholder_unresolved.compute_callback = compute_callback;

      if (immediately_resolving) {
        placeholder_unresolved.dependency_resolved();
      }
    }
  );

  // TODO: Optimize this, profiler is not happy with this.
  // -  One way of doing that will be to use fewer placeholder unresolveds, in particular a large portion of these probably have to do with constants being brought in using this.
  // - Creating a new function every time sucks too.  Consider creating a sub-type of Unresolved that has a hard-coded behavior it follows on resolve instead of using a function, just assigning to a spot on an object.
  register_scope_method(
    'create_placeholder_unresolved',
    /**
     * @param {string} symbol
     * @returns {Unresolved} A placeholder Unresolved which ensures that a slot has an Unresolved which can be used to wait while waiting for something to add more details to the Unresolved and eventually resolve it.
     */
    function (symbol) {
      // TODO: Figure out a way to have this work as expected for reinitialization.  Don't do this for parameters.
      var scope_context = this;
      var existing_value = scope_context.state[symbol];
      if (existing_value instanceof Coral.Unresolved) {
        return existing_value;
      }

      function resolve_callback (result) {
        scope_context.state[symbol] = result;
      }

      var unresolved = new Coral.Unresolved(1, [], null, resolve_callback);
      scope_context.state[symbol] = unresolved;

      return unresolved;
    }
  );

// Update Cycle
// ===========================================================================

  register_scope_method(
    'register_for_update_cycle',
    /**
     * @param {function} func
     * @param {string} packed_args
     *   packed_args[0] = symbol
     *   packed_args[1-N] = Input symbols
     */
    function (func, packed_args) {
      var symbol = packed_args[0];
      var arg_symbols = packed_args.slice(1);

      // TODO: we really need a reliable mechanism for getting this thing all set up and manipulating it in very specific ways
      var scope_symbol_metadata = this['$$SCOPE_METHODS.get_scope_symbol_metadata$$'](symbol);
      var instance_symbol_metadata = this['$$SCOPE_METHODS.get_instance_symbol_metadata$$'](symbol);
      instance_symbol_metadata.observable = null;

      // TODO: This is to make sure element as arg doesn't result in dependee symbols or other bits of metadata being wired up more than once.
      // * One day when I have the time this will all get cleaned up when I do element as arg a different way that doesn't cause weirdness with metadata wiring.
      if (this['$$SYMBOLS.scope_special.IS_INITIALIZED$$']) {
        return scope_symbol_metadata;
      }

      this['$$SYMBOLS.scope_special.TOPOLOGICALLY_ORDERED_UPDATE_CYCLE_SYMBOLS$$'] += symbol;

      scope_symbol_metadata.assign_update_handler(func, arg_symbols);
      this['$$SCOPE_METHODS.traverse_symbol_ancestors$$'](symbol, $$HELPERS.mark_scope_symbol_metadata_for_update_cycle$$);

      return scope_symbol_metadata;
    }
  );

  register_scope_method(
    'register_for_update_cycle_non_recomputed',
    function (symbol) {
      this['$$SCOPE_METHODS.register_for_update_cycle$$'](null, symbol);
    }
  );

  register_scope_method(
    'register_for_update_cycle_with_added_raw_input',
    /**
     * @param {function} func
     * @param {string} packed_args
     * @param {string} raw_argument_data
     */
    function (func, packed_args, raw_argument_data) {
      var scope_symbol_metadata = this['$$SCOPE_METHODS.register_for_update_cycle$$'](func, packed_args);
      scope_symbol_metadata.assign_raw_update_handler_input_data(raw_argument_data);
    }
  );

  register_scope_method(
    'register_for_limited_update_cycle',
    /**
     * For when you want to only recompute on specific inputs changing, but not all of them.
     */
    function (callback, packed_args, limited_recompute_symbols) {
      var scope_symbol_metadata = this['$$SCOPE_METHODS.register_for_update_cycle$$'](callback, packed_args);
      scope_symbol_metadata.assign_limited_recompute_symbols(limited_recompute_symbols);
    }
  );

  register_scope_method(
    'register_for_update_cycle_with_set_handler',
    /**
     * @param {function} func
     * @param {string} packed_args
     *   packed_args[0] = symbol
     *   packed_args[1-N] = Input symbols
     * @param {function} set_handler
     * @param {*} set_handler_metadata
     */
    function (func, packed_args, set_handler, set_handler_metadata) {
      this['$$SCOPE_METHODS.register_for_update_cycle$$'](func, packed_args);
      var scope_symbol_instance_metadata = this['$$SCOPE_METHODS.get_instance_symbol_metadata$$'](packed_args[0]);
      scope_symbol_instance_metadata.assign_set_handler(set_handler, set_handler_metadata);
    }
  );

  register_scope_method(
    'traverse_symbol_ancestors',
    /**
     * @param {string} symbol
     * @param {function} [func] Code to execute on metadata of symbol and its ancestors
     * @param {function} [callback] Code to execute on root ancestor and its metadata
     * @returns The return value of 'callback'
     */
    function traverse_symbol_ancestors (symbol, func, callback) {
      var update_metadata = this['$$SYMBOLS.scope_special.UPDATE_METADATA_BY_SYMBOL$$'][symbol];
      var instance_update_metadata = this['$$SYMBOLS.scope_special.INSTANCE_UPDATE_METADATA_BY_SYMBOL$$'][symbol];
      if (func) func(update_metadata, instance_update_metadata);

      if (update_metadata && update_metadata.is_scope_parameter &&
          instance_update_metadata && instance_update_metadata.forward_to) {
        var parent_scope = this.state['$$SYMBOLS.scope_special.PARENT_SCOPE$$'];
        var forward_to_rules = instance_update_metadata.forward_to;

        for (var i = 0; i < forward_to_rules.length; i++) {
          var rule = forward_to_rules[i];
          if (rule.scope === parent_scope) {
            return traverse_symbol_ancestors.call(rule.scope, rule.symbol, func, callback);
          }
        }
      }
      if (callback) {
        return callback(this, symbol, update_metadata, instance_update_metadata);
      }
    }
  );

// Compute Helpers
// ===========================================================================

  register_scope_method(
    'base_sync_compute',
    /**
     * @param {function} compute_function
     * @param {string} packed_args
     *   packed_args[0]   = symbol to assign value to on scope context's state
     *   packed_args[1-N] = input symbols
     */
    function (compute_function, packed_args) {
      var to_symbol = packed_args[0];

      var inputs = [];
      for (var i = 1; i < packed_args.length; i++) {
        var name = packed_args[i];
        var is_global = $$HELPERS.is_global_symbol$$(name);
        var input = is_global ? Coral.sponges[name] : this.state[name];
        inputs.push(input);
      }

      var value = compute_function.apply(null, inputs);
      this['$$SCOPE_METHODS.assign_internal$$'](to_symbol, value);
    }
  );

  register_scope_method(
    'get_subscribed_observables',
    function () {
      var key = '$$SYMBOLS.scope_special.SUBSCRIBED_OBSERVABLES$$';
      if (!this.state[key]) this.state[key] = [];
      return this.state[key];
    }
  );

  register_scope_method(
    'get_event_listeners',
    function () {
      var key = '$$SYMBOLS.scope_special.EVENT_LISTENERS$$';
      if (!this.state[key]) this.state[key] = [];
      return this.state[key];
    }
  );

  register_scope_method(
    'base_async_compute',
    function (compute_callback, packed_arguments) {
      var assign_to_name = packed_arguments[0];

      var dependency_names = packed_arguments.slice(1);
      var dependencies = [];
      var unresolved_count = 0;
      for (var i = 0; i !== dependency_names.length; ++i) {
        var dependency_name = dependency_names[i];
        var dependency;
        if ($$HELPERS.is_global_symbol$$(dependency_name)) {
          dependency = Coral.sponges[dependency_name];
        } else {
          dependency = this.state[dependency_name];
        }

        if (dependency instanceof Coral.Unresolved) ++unresolved_count;
        dependencies.push(dependency);
      }

      if (unresolved_count === 0) {
        var _this = this;
        dependencies.unshift(function (value) {
          _this['$$SCOPE_METHODS.assign_internal$$'](assign_to_name, value);
        });
        compute_callback.apply(null, dependencies);
      } else {
        this['$$SCOPE_METHODS.assign_internal_unresolved$$'](assign_to_name, dependencies, compute_callback);
      }
    }
  );

// Constant, ConstantInitializedVariable
// ===========================================================================

  register_scope_method(
    'map_in_globals_raw',
    function (packed_args, register_for_updates) {
      for (var i = 1; i < packed_args.length; i+=2) {
        var assign_to_symbol = packed_args[i - 1];
        var global_symbol = packed_args[i];

        if (register_for_updates) {
          this['$$SCOPE_METHODS.register_for_update_cycle_non_recomputed$$'](assign_to_symbol);
        }

        var global_val = Coral.sponges[global_symbol];
        if (typeof global_val === 'object') {
          global_val = Coral.deepClone(global_val);
        }
        this['$$SCOPE_METHODS.assign_internal$$'](assign_to_symbol, global_val);
      }

    }
  );

// InsertInitializedElement
// ===========================================================================

  register_scope_method(
    'proxy_element_as_arg_scope_symbol',
    function (proxy_symbol, providing_scope, providing_scope_symbol) {
      Object.defineProperty(this.state, proxy_symbol, {
        enumerable: true,
        configurable: true, // Allow the proxy to be overriden if element as arg scope is reused.
        get: function () {
          return providing_scope.state[providing_scope_symbol];
        },
        set: function (v) {
          providing_scope.state[providing_scope_symbol] = v;
        }
      });
    }
  );

// IterateArray
// ===========================================================================

  register_scope_method(
    'create_array_scope',
    /**
     * @param {string} items_symbol
     * @param {number} item_index
     * @param {function} async_pre_init
     * @param {function} sync_init
     * @param {string} async_input_output_symbols
     * @param {string} sync_input_output_symbols
     * @param {string} initial_intermediate_symbol
     * @param {string} scope_array_symbol
     * @param {Object} previous_scope
     * @returns {Object} scope
     */
    function (items_symbol, item_index, async_pre_init, sync_init, async_input_output_symbols, sync_input_output_symbols, initial_intermediate_symbol, scope_array_symbol, previous_scope) {
      var j;
      var scope = this['$$SCOPE_METHODS.create_scope$$'](async_pre_init, sync_init);
      var sync_intermediate_output_symbol;
      var sync_intermediate_input_symbol;
      var async_input_output_border_index = 0;
      for (j = 0; j !== async_input_output_symbols.length; ++j) {
        var async_input_symbol = async_input_output_symbols[j];
        var async_input_symbol_char_code = async_input_symbol.charCodeAt(0);

        var index_async_input_symbol = $$HELPERS.get_character_in_range$$($$SYMBOLS.ranges.ASYNC_BORDER_RANGES$$, async_input_output_border_index);
        async_input_output_border_index++;
        if (async_input_symbol === '$$SYMBOLS.special.ITEM_INDEX_VIRTUAL$$') {
          Object.defineProperty(scope.state, index_async_input_symbol, $$HELPERS.generate_item_index_property_descriptor$$());
        } else {
          scope['$$SCOPE_METHODS.proxy_parent_symbol$$'](index_async_input_symbol, async_input_symbol);
        }
      }

      var sync_input_output_border_index = 0;

      for (j = 0; j !== sync_input_output_symbols.length; ++j) {
        var sync_input_output_symbol = sync_input_output_symbols[j];
        var sync_input_output_symbol_char_code = sync_input_output_symbol.charCodeAt(0);
        var index_sync_input_output_symbol = $$HELPERS.get_character_in_range$$($$SYMBOLS.ranges.SYNC_BORDER_RANGES$$, sync_input_output_border_index);
        sync_input_output_border_index++;

        if (sync_input_output_symbol === '$$SYMBOLS.special.IGNORE$$' || sync_input_output_symbol === '$$SYMBOLS.special.NEXT_INTERMEDIATE$$') {
          sync_intermediate_output_symbol = index_sync_input_output_symbol;
        } else if (sync_input_output_symbol === '$$SYMBOLS.special.ITEM_INDEX_VIRTUAL$$') {
          Object.defineProperty(scope.state, index_sync_input_output_symbol, $$HELPERS.generate_item_index_property_descriptor$$());
        } else if (sync_input_output_symbol === '$$SYMBOLS.special.PREVIOUS_INTERMEDIATE$$') {
          sync_intermediate_input_symbol = index_sync_input_output_symbol;
          Object.defineProperty(scope.state, index_sync_input_output_symbol, $$HELPERS.generate_intermediate_input_property_descriptor$$());
        } else {
          scope['$$SCOPE_METHODS.proxy_parent_symbol$$'](index_sync_input_output_symbol, sync_input_output_symbol);
        }
      }

      scope.state['$$SYMBOLS.scope_special.SCRATCH$$'] = {
        symbols_needing_recording: [],
        previous_scope: previous_scope || this,
        previous_intermediate_output_symbol: previous_scope && previous_scope.state['$$SYMBOLS.scope_special.SCRATCH$$'].sync_intermediate_output_symbol || initial_intermediate_symbol,
        scope_item_index: item_index,
        items_symbol: items_symbol,
        scope_array_symbol: scope_array_symbol,
        sync_intermediate_input_symbol: sync_intermediate_input_symbol,
        sync_intermediate_output_symbol: sync_intermediate_output_symbol
      };

      this['$$SCOPE_METHODS.add_symbols_forwarding_rules$$'](scope, async_input_output_symbols, $$SYMBOLS.ranges.ASYNC_BORDER_RANGES$$, scope_array_symbol, scope_array_symbol);
      this['$$SCOPE_METHODS.add_symbols_forwarding_rules$$'](scope, sync_input_output_symbols, $$SYMBOLS.ranges.SYNC_BORDER_RANGES$$, scope_array_symbol, scope_array_symbol);

      return scope;
    }
  );

  register_scope_method(
    'sync_initialize_array_scope',
    function () {
      this['$$SCOPE_METHODS.record_initial_symbol_values$$']();
      this['$$SYMBOLS.scope_special.SYNC_INIT$$']();
    }
  );

  register_scope_method(
    'record_initial_symbol_values',
    function () {
      var scope_scratch_data = this.state['$$SYMBOLS.scope_special.SCRATCH$$'];
      var symbols_needing_recording = scope_scratch_data.symbols_needing_recording;
      if (symbols_needing_recording.length) {
        var scope_instance_update_metadata = this['$$SYMBOLS.scope_special.INSTANCE_UPDATE_METADATA_BY_SYMBOL$$'];

        for (var j = 0; j !== symbols_needing_recording.length; ++j) {
          var symbol_needing_recording = symbols_needing_recording[j];
          var symbol_instance_update_metadata = scope_instance_update_metadata[symbol_needing_recording];
          symbol_instance_update_metadata.last_recorded_value = this.state[symbol_needing_recording];
        }
      }
    }
  );

  register_scope_method(
    'extract_callback_arguments',
    function (packed_args, invocation_arguments) {
      var virtuals = Coral.sponges['$$SYMBOLS.globals.CALLBACK_VIRTUALS$$'];
      var args = [];
      var i;
      var use_unpacked_flag = false;
      for (i = 0; i !== packed_args.length; ++i) {
        var symbol = packed_args[i];
        var arg_value;
        var virtual_handler = virtuals[symbol];
        var end_placement;
        if (virtual_handler) {
          arg_value = virtual_handler(this);
        } else if (symbol === '$$SYMBOLS.special.ELEMENT_VIRTUAL$$') {
          end_placement = this.state[this.state.end_placement_symbol];
          arg_value = end_placement;
        } else if (symbol === '$$SYMBOLS.special.ELEMENTS_VIRTUAL$$') {
          var begin_placement = this.state[this.state.begin_placement_symbol];
          end_placement = this.state[this.state.end_placement_symbol];
          var top_level_view_nodes = $$HELPERS.gather_placement_range$$(begin_placement, end_placement);
          arg_value = $$HELPERS.filter_out_text_nodes$$(top_level_view_nodes);
        } else if (symbol === '$$SYMBOLS.special.EMITEVENT_VIRTUAL$$') {
          arg_value = this.generateEmitEventHandler();
        } else if (symbol === '$$SYMBOLS.special.ARGS_VIRTUAL$$') {
          arg_value = invocation_arguments;
        } else if (symbol === '$$SYMBOLS.special.FLAG$$') {
          // Next symbol is a scope instance type.
          i++;
          var scope_instance_symbol = packed_args[i];
          arg_value = this['$$SCOPE_METHODS.dome_wrap_element$$'](scope_instance_symbol);
        } else if (symbol === '$$SYMBOLS.special.USE_UNPACKED$$') {
          use_unpacked_flag = true;
          continue;
        } else {
          arg_value = this['$$SCOPE_METHODS.extract_handler_argument$$'](symbol, {use_unpacked: use_unpacked_flag});
          if (use_unpacked_flag) use_unpacked_flag = false;
        }

        args.push(arg_value);
      }

      return args;
    }
  );

  register_scope_method(
    'dispatch_initialize_event',
    function (handler_function, packed_args) {
      // keep track of change event listeners registered to observables in this scope
      // so we can remove these listeners when the scope gets destroyed
      var event_listeners = this['$$SCOPE_METHODS.get_event_listeners$$']();

      var _on = Coral.Observable.prototype.on;

      Coral.Observable.prototype.on = function (event_name, listener) {
        var parent_prototype = Object.getPrototypeOf(Coral.Observable.prototype); // EventEmitter.prototype
        parent_prototype.on.apply(this, arguments);

        if (['beforeChange', 'change', 'afterChange'].indexOf(event_name) !== -1) {
          event_listeners.push({
            observable: this,
            event_info: {
              event_name: event_name,
              listener: listener
            }
          });
        }

        return this;
      };

      var args = this['$$SCOPE_METHODS.extract_callback_arguments$$'](packed_args);
      handler_function.apply(null, args);
      Coral.Observable.prototype.on = _on;
      return this;
    }
  );

  register_scope_method(
    'dispatch_callback_handler',
    function (handler_function, packed_args, invocation_arguments) {
      var args = this['$$SCOPE_METHODS.extract_callback_arguments$$'](packed_args, invocation_arguments);
      return handler_function.apply(null, args);
    }
  );

  register_scope_method(
    'dispatch_event_handler',
    /**
     * @param {function} event_handler_function
     * @param {string} packed_args
     * @param {CoralEvent} event
     * @param {Array.<Node>} top_level_element_view_nodes
     */
    function (event_handler_function, packed_args, event, top_level_element_view_nodes) {
      var virtuals = Coral.sponges['$$SYMBOLS.globals.EVENT_VIRTUALS$$'];
      var args = [];
      var i;
      var use_unpacked_flag = false;
      for (i = 0; i !== packed_args.length; ++i) {
        var symbol = packed_args[i];
        var arg_value;
        var virtual_handler = virtuals[symbol];
        var end_placement;

        if (virtual_handler) {
          arg_value = virtual_handler(this);
        } else if (symbol === '$$SYMBOLS.special.EVENT_VIRTUAL$$') {
          arg_value = event;
        } else if (symbol === '$$SYMBOLS.special.EVELEMENT_VIRTUAL$$') {
          arg_value = event.currentTarget;
        } else if (symbol === '$$SYMBOLS.special.ELEMENT_VIRTUAL$$') {
          end_placement = this.state[this.state.end_placement_symbol];
          arg_value = end_placement;
        } else if (symbol === '$$SYMBOLS.special.ELEMENTS_VIRTUAL$$') {
          var begin_placement = this.state[this.state.begin_placement_symbol];
          end_placement = this.state[this.state.end_placement_symbol];
          var top_level_view_nodes = $$HELPERS.gather_placement_range$$(begin_placement, end_placement);
          arg_value = $$HELPERS.filter_out_text_nodes$$(top_level_view_nodes);
        } else if (symbol === '$$SYMBOLS.special.EMITEVENT_VIRTUAL$$') {
          arg_value = this.generateEmitEventHandler();
        } else if (symbol === '$$SYMBOLS.special.FLAG$$') {
          // Next symbol is a scope instance type.
          i++;
          var scope_instance_symbol = packed_args[i];
          arg_value = this['$$SCOPE_METHODS.dome_wrap_element$$'](scope_instance_symbol);
        } else if (symbol === '$$SYMBOLS.special.USE_UNPACKED$$') {
          use_unpacked_flag = true;
          continue;
        } else {
          arg_value = this['$$SCOPE_METHODS.extract_handler_argument$$'](symbol, {use_unpacked: use_unpacked_flag});
          if (use_unpacked_flag) use_unpacked_flag = false;
        }

        args.push(arg_value);
      }

      event_handler_function.apply(null, args);
    }
  );

  register_scope_method(
    'waterfall_scope_event',
    function recursive_waterfall_scope_event (event, event_type_descending_instruction_symbols, event_type_own_event_instruction_symbols) {
      /* jshint loopfunc:true */
      var i;
      var j;
      var event_target = event.target;
      var event_type = event.type;
      var begin_placement;
      var end_placement;
      var _this = this;

      var seen_scopes = event.originalEvent._seen_scopes || [];
      seen_scopes.push(this);
      event.originalEvent._seen_scopes = seen_scopes;

      for (i = 0; i !== event_type_descending_instruction_symbols.length; ++i) {
        var scope_symbol = event_type_descending_instruction_symbols[i];
        var scope_instance_representation = this.state[scope_symbol];

        if (scope_instance_representation instanceof Coral.Unresolved) {
          scope_instance_representation = scope_instance_representation.value;
        }

        // In the case of an element as arg, it is possible that one of the users of the scope that contains it does not pass down a scope instance type for it.
        if (!scope_instance_representation) {
          continue;
        }

        if (Array.isArray(scope_instance_representation)) {
          if (!scope_instance_representation.length) {
            continue;
          }

          var first_scope = scope_instance_representation[0];
          var last_scope = scope_instance_representation[scope_instance_representation.length - 1];

          var first_scope_scratch_data = first_scope.state['$$SYMBOLS.scope_special.SCRATCH$$'];
          var containing_scope = first_scope_scratch_data.previous_scope;
          begin_placement = containing_scope.state[first_scope_scratch_data.previous_intermediate_output_symbol];
          end_placement = last_scope.state[last_scope.state['$$SYMBOLS.scope_special.SCRATCH$$'].sync_intermediate_output_symbol];
        } else {
          begin_placement = scope_instance_representation.state[scope_instance_representation.state.begin_placement_symbol];
          end_placement = scope_instance_representation.state[scope_instance_representation.state.end_placement_symbol];
        }

        if ($$HELPERS.is_in_placement_range$$(event_target, begin_placement, end_placement)) {
          var interacted_with_scope_instance = scope_instance_representation;

          if (Array.isArray(scope_instance_representation)) {
            interacted_with_scope_instance = $$HELPERS.binary_search_scope_array$$(scope_instance_representation, event_target);
          }

          var scope_instance_event_instructions = interacted_with_scope_instance.state['$$SYMBOLS.scope_special.EVENT_INSTRUCTIONS$$'] && interacted_with_scope_instance.state['$$SYMBOLS.scope_special.EVENT_INSTRUCTIONS$$'][event_type];

          if (scope_instance_event_instructions) {
            recursive_waterfall_scope_event.call(interacted_with_scope_instance, event, scope_instance_event_instructions.dispatch_to_children_symbols, scope_instance_event_instructions.own_event_handler_symbol_groups);
          }
          break;
        }
      }

      // If descendant scope has requested propagation be stopped, then don't execute handlers.
      if (event.isPropagationStopped()) {
        return;
      }

      var top_level_view_nodes;

      if (event_type_own_event_instruction_symbols.length) {
        begin_placement = this.state[this.state.begin_placement_symbol];
        end_placement = this.state[this.state.end_placement_symbol];
        top_level_view_nodes = $$HELPERS.gather_placement_range$$(begin_placement, end_placement);
      }

      for (i = 0; i !== event_type_own_event_instruction_symbols.length; ++i) {
        var event_handler_symbols = event_type_own_event_instruction_symbols[i];
        var event_handler;

        var first_symbol_value = Coral.sponges[event_handler_symbols[0]];
        var second_symbol_value = Coral.sponges[event_handler_symbols[1]];
        var is_unconditional_dispatch = typeof first_symbol_value === "function";
        var is_keyboard_shortcut_dispatch = Array.isArray(first_symbol_value);
        var is_selector_based_dispatch = !is_keyboard_shortcut_dispatch && typeof second_symbol_value === "function";

        if (is_unconditional_dispatch) {
          event_handler = first_symbol_value;
          event.currentTarget = top_level_view_nodes.length > 1 ? top_level_view_nodes : top_level_view_nodes[0];
          this['$$SCOPE_METHODS.dispatch_event_handler$$'](event_handler, event_handler_symbols.slice(1), event, top_level_view_nodes);
          continue;
        }

        if (is_selector_based_dispatch) {
          var selector = first_symbol_value;
          event_handler = second_symbol_value;

          var found_match = false;
          for (j = 0; !found_match && j !== top_level_view_nodes.length; ++j) {
            var view_node = top_level_view_nodes[j];
            if (view_node.nodeType === Node.ELEMENT_NODE) {

              // This is the silly thing I have to do to figure out how the browser supports matching on selector - https://developer.mozilla.org/en-US/docs/Web/API/Element/matches
              var matches_function = view_node.matches || view_node.matchesSelector || view_node.msMatchesSelector || view_node.oMatchesSelector || view_node.webkitMatchesSelector;
              if (matches_function.call(view_node, selector) && (view_node === event_target || view_node.compareDocumentPosition(event_target) & Node.DOCUMENT_POSITION_CONTAINED_BY)) {
                found_match = true;
                break;
              }

              var query_selector_results = view_node.querySelectorAll(selector);
              for (var k = 0; k !== query_selector_results.length; ++k) {
                var query_selector_result = query_selector_results[k];

                if (query_selector_result === event_target || (query_selector_result.compareDocumentPosition(event_target) & Node.DOCUMENT_POSITION_CONTAINED_BY)) {
                  found_match = true;
                  event.currentTarget = query_selector_result;
                  break;
                }
              }
            }
          }

          if (found_match) {
            this['$$SCOPE_METHODS.dispatch_event_handler$$'](event_handler, event_handler_symbols.slice(2), event, top_level_view_nodes);
          }
        } else if (is_keyboard_shortcut_dispatch) {
          if (event.type !== 'keydown') return;
          var key_shortcut_manager = Coral.helpers.key_shortcut_manager;
          var key_event_command = first_symbol_value;

          key_shortcut_manager.queue_key_sequence_check(key_event_command, (function () {
            var key_event_handler = second_symbol_value;
            var input_symbols = event_handler_symbols.slice(2);
            var top_level_view_node = top_level_view_nodes.length > 1 ? top_level_view_nodes : top_level_view_nodes[0];
            var scope_context = _this;
            return function () {
              event.currentTarget = top_level_view_node;
              scope_context['$$SCOPE_METHODS.dispatch_event_handler$$'](key_event_handler, input_symbols, event, top_level_view_nodes);
            };
          })());
        } else {
          begin_placement = this.state[event_handler_symbols[0]];
          end_placement = this.state[event_handler_symbols[1]];

          var is_element_as_arg_case = event_handler_symbols[0] === '$$SYMBOLS.special.IGNORE$$';
          if (is_element_as_arg_case) {
            var element_as_arg_scope_representation = end_placement;
            if (element_as_arg_scope_representation instanceof Coral.Unresolved) {
              element_as_arg_scope_representation = element_as_arg_scope_representation.value;
            }

            if (Array.isArray(element_as_arg_scope_representation)) {
              if (!element_as_arg_scope_representation.length) {
                continue;
              }

              var first_element_as_arg_scope = element_as_arg_scope_representation[0];
              var last_element_as_arg_scope =  element_as_arg_scope_representation[element_as_arg_scope_representation.length - 1];

              begin_placement = first_element_as_arg_scope.state[first_element_as_arg_scope.state.begin_placement_symbol];
              end_placement = last_element_as_arg_scope.state[last_element_as_arg_scope.state.end_placement_symbol];
            } else {
              begin_placement = element_as_arg_scope_representation.state[element_as_arg_scope_representation.state.begin_placement_symbol];
              end_placement = element_as_arg_scope_representation.state[element_as_arg_scope_representation.state.end_placement_symbol];
            }
          }

          if ($$HELPERS.is_in_placement_range$$(event_target, begin_placement, end_placement)) {
            event_handler = Coral.sponges[event_handler_symbols[2]];

            var matched_placement_range = $$HELPERS.gather_placement_range$$(begin_placement, end_placement);
            event.currentTarget = matched_placement_range.length > 1 ? matched_placement_range : matched_placement_range[0];

            this['$$SCOPE_METHODS.dispatch_event_handler$$'](event_handler, event_handler_symbols.slice(3), event, top_level_view_nodes);
          }
        }
      }
    }
  );

  register_scope_method(
    'generate_global_event_type_dispatcher',
    /**
     * @param {Array.<string>} event_type_descending_instruction_symbol_groups
     * @param {Array.<string>} event_type_own_event_instruction_symbol_groups
     * @returns {function}
     */
    function (event_type_descending_instruction_symbol_groups, event_type_own_event_instruction_symbol_groups) {
      var scope_context = this;
      return function (e) {
        var begin_placement = scope_context.state[scope_context.state.begin_placement_symbol];
        var end_placement = scope_context.state[scope_context.state.end_placement_symbol];

        if (scope_context['$$SCOPE_METHODS.is_destroyed$$']()) {
          return;
        }

        if ($$HELPERS.is_in_placement_range$$(e.target, begin_placement, end_placement)) {
          var coralEvent = new Coral.CoralEvent(e);
          scope_context.coral_instance.settings.event = coralEvent;

          scope_context['$$SCOPE_METHODS.waterfall_scope_event$$'](coralEvent, event_type_descending_instruction_symbol_groups, event_type_own_event_instruction_symbol_groups);

          Coral.Observable.scheduler.run();
        }
      };
    }
  );

// DOMElement
// ===========================================================================
// TODO: Once I figure out attribute assignment special cases for
//       different browsers and what not, create a helper to automatically
//       handle based on that.

  register_scope_method(
    'generate_element_after_inner_output',
    /**
     * @param {DOMElement} elem
     * @param {string} packed_args
     *   packed_args[0] = Symbol on scope context for placement to use
     *   packed_args[1] = Scope context symbol to place after output placement at
     *   packed_args[2] = Scope context symbol to place inner output placement at
     */
    function (elem, packed_args) {
      this.state[packed_args[1]] = $$HELPERS.insert_after_placement$$(elem, this.state[packed_args[0]]);
      this.state[packed_args[2]] = elem.appendChild($$HELPERS.create_empty_text_node$$());
    }
  );

};
