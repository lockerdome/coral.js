"use strict";

/* global Promise, $$HELPERS, $$SYMBOLS, Coral */

/**
 * These are global helpers that are used by Scope methods or Scope method helpers.
 * They do not exist on the Scope prototype.
**/

module.exports = function (register_global_helper) {

// Miscellaneous
// ===========================================================================

  register_global_helper (
    'report_error',
    /**
     * @param category
     * @param action
     * @param label
     */
    function (coral_instance, category, action, label) {
      if (coral_instance.settings.error_handler) {
        coral_instance.settings.error_handler(category, action, label);
      } else {
        console.error(
          'No error_handler specified in Coral settings; internal framework error details below.',
          '\ncategory:', category,
          '\naction:', action,
          '\nlabel:', label
        );
      }
    }
  );

  register_global_helper(
    'instantiate_root_scope',
    /**
     * Instantiate a root level scope, which is quite different in that no forwarding rules are set up for its borders, since no scope context will exist for it to interact with.  Values will be bound directly to the border parameters.
     *
     * @param {function} scope_async_pre_init_function
     * @param {function} scope_sync_init_function
     * @param {Object} parameter_values
     * @param {Object} parameter_name_to_symbol
     * @param {Object} coral_instance
     * @returns {Object} The created scope.
     */
    function (scope_async_pre_init_function, scope_sync_init_function, parameter_values, parameter_name_to_symbol, coral_instance) {
      var scope_context = null; // There is no scope context for root scopes.
      var scope = new Coral.Scope(scope_context, scope_async_pre_init_function, scope_sync_init_function, coral_instance);

      for (var parameter_name in parameter_name_to_symbol) {
        var parameter_symbol = parameter_name_to_symbol[parameter_name];
        scope.state[parameter_symbol] = parameter_values[parameter_name];
        var parameter_symbol_metadata = scope['$$SCOPE_METHODS.get_scope_symbol_metadata$$'](parameter_symbol);
        parameter_symbol_metadata.is_scope_parameter = true;
      }

      scope['$$SYMBOLS.scope_special.ASYNC_PRE_INIT$$']();
      return scope;
    }
  );

  register_global_helper(
    'mark_scope_symbol_metadata_for_update_cycle',
    function (scope_symbol_metadata) {
      scope_symbol_metadata.is_registered_for_update_cycle = true;
    }
  );

  register_global_helper(
    'add_observable_update',
    function (val, force) {
      var is_compute_update = false;
      Coral.Observable.scheduler.register_update(this.scope_context, this.symbol, val, is_compute_update, force);

      Coral.Observable.scheduler.run();
    }
  );

  // TODO: Don't I have reusable destroy handling wired in somewhere?
  register_global_helper(
    'zone_intercepted_sync_initialize',
    /**
     * The sync init function that overrides the sync initialize for zone entry scopes.
     *
     * Called after the parent zone is async initialized, and ready for us to display.
     */
    function () {
      var zone = this['$$SYMBOLS.scope_special.ZONE$$'];
      var has_already_sync_initialized = zone.is_ready();
      if (has_already_sync_initialized) {
        return;
      }

      var is_zone_entry_point_async_resolved = this['$$SYMBOLS.scope_special.IS_ASYNC_INIT_RESOLVED$$'];

      if (is_zone_entry_point_async_resolved) {
        this.state._sync_init.bind(this)();
        zone.enter_ready_state();
      } else {
        var async_init_unresolved = this['$$SYMBOLS.scope_special.ASYNC_INIT_RESOLVED$$'];

        var scope_context = this;

        // TODO: deduplicate
        if (scope_context.state._preload) {
          var preload_fragment = $$HELPERS.create_unescaped_html_fragment$$([scope_context.state._preload]);
          var preload_end_marker = $$HELPERS.create_empty_text_node$$();
          preload_fragment.appendChild(preload_end_marker);
          $$HELPERS.insert_after_placement$$(preload_fragment, scope_context.state[scope_context.state.begin_placement_symbol]);
          scope_context.state[scope_context.state.end_placement_symbol] = preload_end_marker;
        }

        var current_initialization_start_tick = zone._initialization_start_tick;

        var wait_till_resolved = new Coral.Unresolved(1,[],$$HELPERS.immediately_resolving_compute_callback$$,function () {
          if (current_initialization_start_tick !== zone._initialization_start_tick || scope_context['$$SCOPE_METHODS.is_destroyed$$']()) {
            return;
          }

          var begin_placement = scope_context.state[scope_context.state.begin_placement_symbol];
          var end_placement = scope_context.state[scope_context.state.end_placement_symbol];

          if (begin_placement !== end_placement && begin_placement && end_placement) {
            $$HELPERS.delete_between_placements$$(begin_placement, end_placement, true);
          }

          scope_context.state._sync_init.bind(scope_context)();
          zone.enter_ready_state();
        });

        async_init_unresolved.add_dependee(wait_till_resolved);
      }
    }
  );


// Nesteds and Indexed Other Array Utilities
// ===========================================================================

  register_global_helper(
    'get_at_path',
    /**
     * @param {Object} target
     * @param {Array.<string>} path
     */
    function (target, path) {
      return Coral.get_at_path(target, path);
    }
  );

  register_global_helper(
    'set_at_path',
    /**
     * @param {Object} target
     * @param {Array.<string>} path
     * @param {*} val
     * @returns {Object}
     */
    function (target, path, val) {
      target = typeof target === 'object' && target || {};
      var cur = target;
      for (var i = 0; i !== path.length - 1; ++i) {
        var entry = cur[path[i]];
        cur[path[i]] = typeof entry === 'object' && entry || {};
        cur = cur[path[i]];
      }
      cur[path[path.length - 1]] = val;
      return target;
    }
  );

// Scope Array helpers
// ===========================================================================

  register_global_helper(
    'generate_item_index_property_descriptor',
    function (items_symbol, symbol_instance_update_metadata) {
      return {
        enumerable: true,
        get: function () {
          return this["$$SYMBOLS.scope_special.SCRATCH$$"].scope_item_index;
        },
        // Sets on index parameters are not allowed, so I am just going to leave this empty.
        set: function (v) {}
      };
    }
  );

  register_global_helper(
    'item_index_forward_to_intercept',
    function (value, forward_to_scope) {
      var scratch = forward_to_scope.state['$$SYMBOLS.scope_special.SCRATCH$$'];
      var index = scratch.scope_item_index;
      return index;
    }
  );

  register_global_helper(
    'disallowed_item_index_set_handler',
    function () {
      throw new Error("Sets on index parameters are not allowed");
    }
  );

  register_global_helper(
    'generate_intermediate_input_property_descriptor',
    function () {
      return {
        enumerable: true,
        get: function () {
          var scratch_data = this['$$SYMBOLS.scope_special.SCRATCH$$'];
          var previous_scope = scratch_data.previous_scope;
          var previous_intermediate_output_symbol = scratch_data.previous_intermediate_output_symbol;

          return previous_scope.state[previous_intermediate_output_symbol];
        }
      };
    }
  );

  register_global_helper(
    'array_sync_scope_setup_raw',
    function (scope_array, initial_intermediate) {
      var safety_belt_text_node = $$HELPERS.create_empty_text_node$$();
      var scope_array_length = scope_array.length;
      if (scope_array_length) {
        var scope;
        for (var i = 0; i !== scope_array_length; ++i) {
          scope = scope_array[i];
          // TODO: clean up this hack
          var scope_scratch_data = scope.state['$$SYMBOLS.scope_special.SCRATCH$$'];
          scope_scratch_data.sync_intermediate_output_symbol = scope.state.end_placement_symbol;
          if (i !== 0) {
            scope_scratch_data.previous_intermediate_output_symbol = scope_scratch_data.previous_scope.state.end_placement_symbol;
            scope_scratch_data.previous_scope = scope_array[i - 1];
          }
          scope['$$SCOPE_METHODS.sync_initialize_array_scope$$']();
        }
        var last_scope_in_array = scope_array[scope_array_length - 1];
        var last_scope_in_array_end_placement_symbol = last_scope_in_array.state.end_placement_symbol;
        var last_scope_in_array_end_placement = last_scope_in_array.state[last_scope_in_array_end_placement_symbol];
        $$HELPERS.insert_after_placement$$(safety_belt_text_node, last_scope_in_array_end_placement);
      } else {
        $$HELPERS.insert_after_placement$$(safety_belt_text_node, initial_intermediate);
      }
      var final_intermediate_value = safety_belt_text_node;
      return final_intermediate_value;
    }
  );

  register_global_helper(
    'binary_search_scope_array',
    /**
     * @param {Array.<Object>} scope_array
     * @param {DOMNode} dom_node
     * @returns {Object} The scope that the given placement is inside of.
     */
    function (scope_array, dom_node) {
      if (scope_array.length === 1) {
        return scope_array[0];
      }

      var range_start_index = 0;
      var range_length = scope_array.length;

      var scope;
      while (range_length) {
        if (range_length === 1) {
          scope = scope_array[range_start_index];
          break;
        }

        var range_midpoint_index = Math.floor(range_length / 2) + range_start_index;
        var midpoint_scope = scope_array[range_midpoint_index];
        var midpoint_scope_scratch_data = midpoint_scope.state['$$SYMBOLS.scope_special.SCRATCH$$'];

        var midpoint_scope_end_placement = midpoint_scope.state[midpoint_scope_scratch_data.sync_intermediate_output_symbol];
        if (midpoint_scope_end_placement === dom_node) {
          scope = midpoint_scope;
          break;
        }

        var end_placement_relative_position = dom_node.compareDocumentPosition(midpoint_scope_end_placement);

        var is_dom_node_in_end_placement = (end_placement_relative_position & 8) === 8;
        if (is_dom_node_in_end_placement) {
          scope = midpoint_scope;
          break;
        }

        var is_dom_node_after_end_placement = (end_placement_relative_position & 2) === 2;
        if (is_dom_node_after_end_placement) {
          var old_range_start_index = range_start_index;
          range_start_index = range_midpoint_index + 1;
          var range_start_diff = range_start_index - old_range_start_index;
          range_length = range_length - range_start_diff;
          continue;
        }

        var midpoint_scope_begin_placement = midpoint_scope.state[midpoint_scope_scratch_data.sync_intermediate_input_symbol];

        // NOTE: The midpoint scope places itself immediately after its begin placement.
        var begin_placement_relative_position = dom_node.compareDocumentPosition(midpoint_scope_begin_placement);

        var is_dom_node_in_begin_placement = (begin_placement_relative_position & 8) === 8;
        if (is_dom_node_in_begin_placement) {
          scope = scope_array[range_midpoint_index - 1];
          break;
        }

        var is_dom_node_after_begin_placement = (begin_placement_relative_position & 2) === 2;
        if (is_dom_node_after_begin_placement) {
          scope = midpoint_scope;
          break;
        }

        // DOM node is somewhere before the midpoint, so update the range length to our current index.
        range_length = range_midpoint_index - range_start_index;
      }

      return scope;
    }
  );

  // TODO: Think some more about what if the same item references are in both the new and old arrays.
  register_global_helper(
    'generate_items_array_diff',
    /**
     * @param {Array.<*>} identity_deduplicated_items_array
     * @param {Array.<*>} identity_deduplicated_last_items_array
     * @param {function} identity_comparison
     * @returns {Object}
     *   new_item_indexes: Array.<number>
     *     Indexes of items that new scopes should be created for
     *   removed_item_indexes: Array.<number>
     *     Indexes of the original array whose items have been removed
     *   item_index_moves: Array.<number>
     *     Index pairs representing how matching items have moved
     *     i % 2 === 0 - Position in new array
     *     i % 2 === 1 - Position in old array
     *   item_updates: Array.<number>
     *     Indexes of items that have the same identity, but aren't equal (===)
     *   unchanged_items: Array.<number>
     *     Indexes of items that have the same identity and are equal (===)
     */
    function (identity_deduplicated_items_array, identity_deduplicated_last_items_array, identity_comparison) {
      var items_array = identity_deduplicated_items_array;
      var last_items_array = identity_deduplicated_last_items_array;

      var larger_length = Math.max(items_array.length, last_items_array.length);
      var unmatched_new_item_indexes = [];
      var unmatched_old_item_indexes = [];

      var updated_item_indexes = [];
      var unchanged_item_indexes = [];

      var i;
      var j;

      for (i = 0; i !== larger_length; ++i) {
        var item = items_array[i];
        var old_item = last_items_array[i];
        var beyond_items_array_length = i >= items_array.length;
        var beyond_old_items_array_length = i >= last_items_array.length;

        if (!beyond_items_array_length && beyond_old_items_array_length) {
          unmatched_new_item_indexes.push(i);
        } else if (beyond_items_array_length && !beyond_old_items_array_length) {
          unmatched_old_item_indexes.push(i);
        } else if (identity_comparison(item, old_item)) {
          if (item !== old_item) {
            updated_item_indexes.push(i);
          } else {
            unchanged_item_indexes.push(i);
          }
        } else {
          unmatched_old_item_indexes.push(i);
          unmatched_new_item_indexes.push(i);
        }
      }

      var new_item_indexes = [];
      var removed_item_indexes = [];
      var all_index_moves = [];

      if (unmatched_new_item_indexes.length && !unmatched_old_item_indexes.length) {
        new_item_indexes = unmatched_new_item_indexes;
      } else if (unmatched_old_item_indexes.length && !unmatched_new_item_indexes.length) {
        removed_item_indexes = unmatched_old_item_indexes;
      } else {
        for (i = 0; i !== unmatched_new_item_indexes.length; ++i) {
          var unmatched_new_item_index = unmatched_new_item_indexes[i];
          var unmatched_old_item_index;
          var unmatched_new_item = items_array[unmatched_new_item_index];
          var unmatched_old_item;
          var found_match = false;

          for (j = 0; j !== unmatched_old_item_indexes.length; ++j) {
            unmatched_old_item_index = unmatched_old_item_indexes[j];
            unmatched_old_item = last_items_array[unmatched_old_item_index];

            if (identity_comparison(unmatched_new_item, unmatched_old_item)) {
              found_match = true;
              break;
            }
          }

          if (found_match) {
            unmatched_old_item_indexes.splice(j, 1);
            if (unmatched_new_item !== unmatched_old_item) {
              updated_item_indexes.push(unmatched_new_item_index);
            } else {
              unchanged_item_indexes.push(unmatched_new_item_index);
            }

            all_index_moves.push(unmatched_new_item_index, unmatched_old_item_index);
          } else {
            new_item_indexes.push(unmatched_new_item_index);
          }
        }

        Array.prototype.push.apply(removed_item_indexes, unmatched_old_item_indexes);
      }

      return {
        item_updates: updated_item_indexes,
        unchanged_items: unchanged_item_indexes,
        new_item_indexes: new_item_indexes,
        removed_item_indexes: removed_item_indexes,
        item_index_moves: all_index_moves
      };
    }
  );

// Set Handlers
// ===========================================================================

  register_global_helper(
    'nested_set_handler',
    function (scope, value, metadata) {
      var source_computable_symbol = metadata.source_computable_symbol;
      var field_path = metadata.field_path;

      var source = scope.state[source_computable_symbol];
      var updated_source = $$HELPERS.set_at_path$$(source, field_path, value);

      scope['$$SCOPE_METHODS.traverse_symbol_ancestors$$'](source_computable_symbol, null, function (originating_scope, originating_symbol) {
        var is_compute_update = false;
        var is_forced_update = true;
        var initialization_start_tick;

        Coral.Observable.scheduler.register_update(originating_scope, originating_symbol, updated_source, is_compute_update, is_forced_update, initialization_start_tick, scope, metadata.symbol);
        Coral.Observable.scheduler.run();
      });
    }
  );

  register_global_helper(
    'dynamic_nested_set_handler',
    function (scope, value, metadata) {
      var source_computable_symbol = metadata.source_computable_symbol;
      var dynamic_field_symbol = metadata.dynamic_field_symbol;

      var source = scope.state[source_computable_symbol];
      var dynamic_field_name = scope.state[dynamic_field_symbol];

      var updated_source = $$HELPERS.set_at_path$$(source, [dynamic_field_name], value);

      scope['$$SCOPE_METHODS.traverse_symbol_ancestors$$'](source_computable_symbol, null, function (originating_scope, originating_symbol) {
        var is_compute_update = false;
        var is_forced_update = true;
        var initialization_start_tick;

        Coral.Observable.scheduler.register_update(originating_scope, originating_symbol, updated_source, is_compute_update, is_forced_update, initialization_start_tick, scope, metadata.symbol);
        Coral.Observable.scheduler.run();
      });
    }
  );

// Update Handlers / Compute Callbacks
// ===========================================================================

register_global_helper(
  'add_volatile_observable_update',
  function (val, force) {
    var is_compute_update = false;
    Coral.Observable.scheduler.register_update(this.scope_context, this.symbol, val, is_compute_update, force);

    Coral.Observable.scheduler.run();
  }
);

  register_global_helper(
    'register_volatile_observable_update_handler',
    /**
     * When a scope is destroyed before the async response comes in,
     * it is possible for the volatile update observable cleanup handler
     * to attempt to remove the handler we wire up below before it is wired
     * up, we want to avoid wiring the below handler up in those cases to
     * prevent wasteful volatile update adding to dead scopes.
     */
    function (observable) {
      var scope_not_destroyed = !!observable.scope_context;
      if (scope_not_destroyed) {
        observable.on('_set', $$HELPERS.add_volatile_observable_update$$);
      }
    }
  );

  register_global_helper(
    'async_compute_nested_path',
    function (resolve_callback, source, path) {
      resolve_callback($$HELPERS.get_at_path$$(source, path));
    }
  );

  register_global_helper(
    'async_compute_dynamic_nested_field',
    function (resolve_callback, source, field) {
      resolve_callback($$HELPERS.get_at_path$$(source, [field]));
    }
  );

  register_global_helper(
    'immediately_resolving_compute_callback',
    /**
     * @param {function} resolve_callback
     * @param {*} value
     */
    function (resolve_callback, value) {
      resolve_callback(value);
    }
  );

  register_global_helper(
    'conditional_scope_update',
    /**
     * @param {function} resolve_callback
     * @param {Object} scope_context
     * @param {string} symbols
     *   symbols[0] = scope symbol
     *   symbols[1] = determining value symbol
     *   symbols[2-N] = Two groups of separated async and sync input/output symbols.  Both levels of groupings are separated by seperate separator characters.
     */
    function (resolve_callback, scope_context, symbols) {
      var scope_symbol = symbols[0];
      var existing_scope = scope_context.state[scope_symbol];

      if (existing_scope instanceof Coral.Unresolved) {
        existing_scope = existing_scope.value;
      }

      var updated_boolean_determining_value = !!scope_context.state[symbols[1]];
      var scratch_data = existing_scope.state['$$SYMBOLS.scope_special.SCRATCH$$'];

      var last_boolean_determining_value = scratch_data.determining_value_boolean;

      // Return the existing scope to make it clear no change occurred.
      if (updated_boolean_determining_value === last_boolean_determining_value) {
        return resolve_callback(existing_scope);
      }

      var created_scope;
      var existing_scope_async_input_output_symbols;
      var existing_scope_sync_input_output_symbols;
      var new_scope_async_input_output_symbols;
      var new_scope_sync_input_output_symbols;
      var scope_async_pre_init_function;
      var scope_sync_init_function;

      var option_symbol_groups = symbols.slice(2).split('$$SYMBOLS.special.SEPARATOR_2$$');
      var truthy_input_output_symbol_groups = option_symbol_groups[0].split('$$SYMBOLS.special.SEPARATOR$$');
      var falsy_input_output_symbol_groups = option_symbol_groups[1].split('$$SYMBOLS.special.SEPARATOR$$');

      if (updated_boolean_determining_value) {
        existing_scope_async_input_output_symbols = falsy_input_output_symbol_groups[0];
        existing_scope_sync_input_output_symbols = falsy_input_output_symbol_groups[1];
        new_scope_async_input_output_symbols = truthy_input_output_symbol_groups[0];
        new_scope_sync_input_output_symbols = truthy_input_output_symbol_groups[1];
        scope_async_pre_init_function = scratch_data.truthy_scope_async_pre_init;
        scope_sync_init_function = scratch_data.truthy_scope_sync_init;
      } else {
        existing_scope_async_input_output_symbols = truthy_input_output_symbol_groups[0];
        existing_scope_sync_input_output_symbols = truthy_input_output_symbol_groups[1];
        new_scope_async_input_output_symbols = falsy_input_output_symbol_groups[0];
        new_scope_sync_input_output_symbols = falsy_input_output_symbol_groups[1];
        scope_async_pre_init_function = scratch_data.falsy_scope_async_pre_init;
        scope_sync_init_function = scratch_data.falsy_scope_sync_init;
      }

      var new_scope = scope_context['$$SCOPE_METHODS.create_scope$$'](scope_async_pre_init_function, scope_sync_init_function);

      scope_context['$$SYMBOLS.scope_special.ZONE$$'].initialize_scope_instance_parameters(scope_context, new_scope_async_input_output_symbols+new_scope_sync_input_output_symbols);

      // TODO: Deduplicate setup code, the block below is basically duplicated, but with different vars
      new_scope.state['$$SYMBOLS.scope_special.SCRATCH$$'] = {
        is_polymorphic_scope: true,
        determining_value_boolean: updated_boolean_determining_value,
        truthy_scope_async_pre_init: scratch_data.truthy_scope_async_pre_init,
        truthy_scope_sync_init: scratch_data.truthy_scope_sync_init,
        falsy_scope_async_pre_init: scratch_data.falsy_scope_async_pre_init,
        falsy_scope_sync_init: scratch_data.falsy_scope_sync_init,
        safety_belt_text_node: scratch_data.safety_belt_text_node
      };

      new_scope['$$SCOPE_METHODS.add_border_passthroughs$$'](new_scope_async_input_output_symbols, $$SYMBOLS.ranges.ASYNC_BORDER_RANGES$$);
      new_scope['$$SCOPE_METHODS.add_border_passthroughs$$'](new_scope_sync_input_output_symbols, $$SYMBOLS.ranges.SYNC_BORDER_RANGES$$);
      scope_context['$$SCOPE_METHODS.add_symbols_forwarding_rules$$'](new_scope, new_scope_async_input_output_symbols, $$SYMBOLS.ranges.ASYNC_BORDER_RANGES$$);
      scope_context['$$SCOPE_METHODS.add_symbols_forwarding_rules$$'](new_scope, new_scope_sync_input_output_symbols, $$SYMBOLS.ranges.SYNC_BORDER_RANGES$$);

      new_scope['$$SYMBOLS.scope_special.ASYNC_PRE_INIT$$']();

      existing_scope['$$SCOPE_METHODS.destroy_scope$$']();

      // NOTE: This keeps the upward forwarding in place, but the updates will be filtered out by the update cycle.  The updates will work themselves out of the system over time.
      var parent_scope = existing_scope.state['$$SYMBOLS.scope_special.PARENT_SCOPE$$'];
      parent_scope['$$SCOPE_METHODS.cleanup_scopes_forwarding_rules$$']([existing_scope], existing_scope_async_input_output_symbols + existing_scope_sync_input_output_symbols);

      var async_init_resolved_status = new_scope['$$SYMBOLS.scope_special.ASYNC_INIT_RESOLVED$$'];
      if (!new_scope['$$SYMBOLS.scope_special.IS_ZONE_ENTRY_POINT$$'] && async_init_resolved_status instanceof Coral.Unresolved) {
        var finish_when_resolved = new Coral.Unresolved(1, [async_init_resolved_status], function (cb) { cb(new_scope); }, resolve_callback);
        async_init_resolved_status.add_dependee(finish_when_resolved);
      } else {
        resolve_callback(new_scope);
      }
    }
  );

  register_global_helper(
    'polymorphic_scope_update',
    /**
     * @param {function} resolve_callback
     * @param {Object} scope_context
     * @param {string} symbols
     *   symbols[0] = scope symbol
     *   symbols[1] = determining value symbol
     */
    function (resolve_callback, scope_context, symbols) {
      var scope_symbol = symbols[0];
      var determining_value_symbol = symbols[1];

      var existing_scope = scope_context.state[scope_symbol];

      if (existing_scope instanceof Coral.Unresolved) {
        existing_scope = existing_scope.value;
      }

      var determining_value = scope_context.state[determining_value_symbol];

      var scratch_data = existing_scope.state['$$SYMBOLS.scope_special.SCRATCH$$'];
      var all_cases_data = scratch_data.cases;
      var existing_case_data = all_cases_data[scratch_data.current_case];

      var case_global_symbol;
      for (case_global_symbol in all_cases_data) {
        var case_value = Coral.sponges[case_global_symbol];

        if (determining_value === case_value) {
          break;
        }
      }

      // NOTE: Since we use an exact value match for the determining value, it is impossible for a change in determining value to not result in a change in scope.
      // * TODO: Think about possibility of case changing, but still using the same type of scope. Very oddball case, but I suppose it is possible.  Fine for now if it just destroys the existing and creates a new one.

      var case_data = all_cases_data[case_global_symbol];

      var new_scope_input_output_symbol_groups = case_data.input_output_symbols.split('$$SYMBOLS.special.SEPARATOR$$');
      var existing_scope_input_output_symbol_groups = existing_case_data.input_output_symbols.split('$$SYMBOLS.special.SEPARATOR$$');

      var new_scope_async_input_output_symbols = new_scope_input_output_symbol_groups[0];
      var new_scope_sync_input_output_symbols = new_scope_input_output_symbol_groups[1];
      var existing_scope_async_input_output_symbols = existing_scope_input_output_symbol_groups[0];
      var existing_scope_sync_input_output_symbols = existing_scope_input_output_symbol_groups[1];

      // TODO: Deduplicate setup code, the block below is basically duplicated, but with different vars.  Scratch data is different.
      var new_scope = scope_context['$$SCOPE_METHODS.create_scope$$'](case_data.async_pre_init, case_data.sync_init);

      scope_context['$$SYMBOLS.scope_special.ZONE$$'].initialize_scope_instance_parameters(scope_context, new_scope_async_input_output_symbols+new_scope_sync_input_output_symbols);

      new_scope.state['$$SYMBOLS.scope_special.SCRATCH$$'] = {
        is_polymorphic_scope: true,
        cases: all_cases_data,
        current_case: case_global_symbol,
        safety_belt_text_node: scratch_data.safety_belt_text_node
      };

      new_scope['$$SCOPE_METHODS.add_border_passthroughs$$'](new_scope_async_input_output_symbols, $$SYMBOLS.ranges.ASYNC_BORDER_RANGES$$);
      new_scope['$$SCOPE_METHODS.add_border_passthroughs$$'](new_scope_sync_input_output_symbols, $$SYMBOLS.ranges.SYNC_BORDER_RANGES$$);
      // TODO: We want to add a special dependency on these forwarding rules that will hold an update if a symbol has the possibility of changing in that update cycle and kill the update if that is the case.
      scope_context['$$SCOPE_METHODS.add_symbols_forwarding_rules$$'](new_scope, new_scope_async_input_output_symbols, $$SYMBOLS.ranges.ASYNC_BORDER_RANGES$$);
      scope_context['$$SCOPE_METHODS.add_symbols_forwarding_rules$$'](new_scope, new_scope_sync_input_output_symbols, $$SYMBOLS.ranges.SYNC_BORDER_RANGES$$);

      new_scope['$$SYMBOLS.scope_special.ASYNC_PRE_INIT$$']();

      existing_scope['$$SCOPE_METHODS.destroy_scope$$']();

      // NOTE: This keeps the upward forwarding in place, but the updates will be filtered out by the update cycle.  The updates will work themselves out of the system over time.
      var parent_scope = existing_scope.state['$$SYMBOLS.scope_special.PARENT_SCOPE$$'];
      parent_scope['$$SCOPE_METHODS.cleanup_scopes_forwarding_rules$$']([existing_scope], existing_scope_async_input_output_symbols + existing_scope_sync_input_output_symbols);

      var async_init_resolved_status = new_scope['$$SYMBOLS.scope_special.ASYNC_INIT_RESOLVED$$'];
      if (!new_scope['$$SYMBOLS.scope_special.IS_ZONE_ENTRY_POINT$$'] && async_init_resolved_status instanceof Coral.Unresolved) {
        var finish_when_resolved = new Coral.Unresolved(1, [async_init_resolved_status], function (cb) { cb(new_scope); }, resolve_callback);
        async_init_resolved_status.add_dependee(finish_when_resolved);
      } else {
        resolve_callback(new_scope);
      }
    }
  );

  register_global_helper(
    'array_scope_update',
    /**
     * @param {function} resolve_callback
     * @param {Object} scope_context
     * @param {Object} argument_data
     *   identity_comparison: {function}
     *   symbols: {string}
     *     symbols[0] = scope array symbol
     *     symbols[1] = items array symbol
     *     symbols[2] = initial intermediate symbol
     *   case_data: {Object}
     *     async_pre_init: {function}
     *     sync_init: {function}
     *     async_input_symbols: {string}
     *     sync_input_output_symbols: {string}
     */
    function (resolve_callback, scope_context, argument_data) {
      var symbols = argument_data.symbols;
      var identity_comparison = argument_data.identity_comparison;

      var items_array_symbol = symbols[1];
      var items_array = scope_context.state[items_array_symbol];
      var dedup = Coral.identity_deduplicate_array;
      var deduplicated_items = dedup(items_array, identity_comparison);

      // Grab last items and last indexes metadata
      var scope_array_symbol = symbols[0];
      var scratch = scope_context['$$SYMBOLS.scope_special.INSTANCE_UPDATE_METADATA_BY_SYMBOL$$'][scope_array_symbol].scratch;
      var last_items_array = scratch.last_items_array;

      // Since only one option exists, it maps to all indexes
      function to_range (el, i) { return i; }

      var option = {
        case_data: argument_data.case_data,
        last_items: last_items_array,
        last_indexes: last_items_array.map(to_range),
        current_items: deduplicated_items,
        current_indexes: deduplicated_items.map(to_range)
      };

      // Reset 'last' scratch data for next update
      scratch.last_items_array = deduplicated_items.slice();

      return $$HELPERS.base_array_scope_update$$(
        scope_context,
        resolve_callback,
        [option],
        symbols,
        deduplicated_items,
        identity_comparison
      );
    }
  );

  register_global_helper(
    'polymorphic_array_scope_update',
    /**
     * @param {function} resolve_callback
     * @param {Object} scope_context
     * @param {Object} argument_data
     *   identity_comparison: {function}
     *   map_function_func: {function}
     *   map_function_input_symbols: {string}
     *   symbols: {string}
     *     symbols[0] = scope array symbol
     *     symbols[1] = items array symbol
     *     symbols[2] = initial intermediate symbol
     *   data_by_case: {Object} case_value -> {Object}
     *     async_pre_init: {function}
     *     sync_init: {function}
     *     async_input_symbols: {string}
     *     sync_input_output_symbols: {string}
     */
    function (resolve_callback, scope_context, argument_data) {
      var identity_comparison = argument_data.identity_comparison;
      var symbols = argument_data.symbols;
      var data_by_case = argument_data.data_by_case;

      // Prep map function with current values
      var map_function = argument_data.map_function_func;
      var map_function_symbols = argument_data.map_function_input_symbols;
      var map_item_parameter_index = -1;
      var map_arguments = [];

      for (var i = 0; i < map_function_symbols.length; i++) {
        var symbol = map_function_symbols[i];
        if (symbol === '$$SYMBOLS.special.ITEM_VIRTUAL$$') {
          map_item_parameter_index = i;
          map_arguments.push(undefined);
        } else {
          map_arguments.push(scope_context.state[symbol]);
        }
      }

      var items_array_symbol = symbols[1];
      var items_array = scope_context.state[items_array_symbol];
      var dedup = Coral.identity_deduplicate_array;
      var deduplicated_items = dedup(items_array, identity_comparison);

      // Parse items by their case scopes
      var items_by_case = {};
      var indexes_by_case = {};

      deduplicated_items.forEach(function (item, i) {
        if (map_item_parameter_index !== -1) {
          map_arguments[map_item_parameter_index] = item;
        }
        var case_value = map_function.apply(null, map_arguments);

        if (!items_by_case[case_value]) items_by_case[case_value] = [];
        if (!indexes_by_case[case_value]) indexes_by_case[case_value] = [];

        items_by_case[case_value].push(item);
        indexes_by_case[case_value].push(i);
      });

      // Grab last items and last indexes metadata
      var scope_array_symbol = symbols[0];
      var scratch = scope_context['$$SYMBOLS.scope_special.INSTANCE_UPDATE_METADATA_BY_SYMBOL$$'][scope_array_symbol].scratch;
      var last_items_by_case = scratch.last_items_by_case;
      var last_indexes_by_case = scratch.last_indexes_by_case;

      // Build options array with all necessary data per case
      var options = Object.keys(data_by_case).map(function (case_value) {
        return {
          case_data: data_by_case[case_value],
          last_items: last_items_by_case[case_value] || [],
          last_indexes: last_indexes_by_case[case_value] || [],
          current_items: items_by_case[case_value] || [],
          current_indexes: indexes_by_case[case_value] || []
        };
      });

      // Reset 'last' scratch data for next update
      scratch.last_items_by_case = items_by_case;
      scratch.last_indexes_by_case = indexes_by_case;

      return $$HELPERS.base_array_scope_update$$(
        scope_context,
        resolve_callback,
        options,
        symbols,
        deduplicated_items,
        identity_comparison
      );
    }
  );

  register_global_helper(
    'base_array_scope_update',
    /**
     * @param {Scope} scope_context
     * @param {function} resolve_callback
     * @param {Array.<Object>} options
     *   case_data: {Object}
     *     sync_init: {function}
     *     async_pre_init: {function}
     *     sync_input_output_symbols: {string}
     *     async_input_symbols: {string}
     *   last_items: {Array.<*>}
     *   last_indexes: {Array.<number>}
     *   current_items: {Array.<*>}
     *   current_indexes: {Array.<number>}
     * @param {string} symbols
     *   symbols[0] = scope array symbol
     *   symbols[1] = items array symbol
     *   symbols[2] = initial intermediate symbol
     * @param {Array.<*>} deduplicated_items
     * @param {function} identity_comparison
     */
    function (scope_context, resolve_callback, options, symbols, deduplicated_items, identity_comparison) {
      var scope_array_symbol = symbols[0];
      var scope_array = scope_context.state[scope_array_symbol];
      if (scope_array instanceof Coral.Unresolved) scope_array = scope_array.value;

      var items_array_symbol = symbols[1];
      var items_array = scope_context.state[items_array_symbol];

      var zone = scope_context['$$SYMBOLS.scope_special.ZONE$$'];
      var updated_scope_array = new Array(deduplicated_items.length);
      var any_changes = false;

      options.forEach(function (option, option_index) {
        if (!option.last_items.length && !option.current_items.length) {
          return;
        }

        var current_items = option.current_items;
        var current_indexes = option.current_indexes;
        var last_scopes = option.last_indexes.map(function (i) {
          return scope_array[i];
        });

        var diff = $$HELPERS.generate_items_array_diff$$(
          current_items,
          option.last_items,
          identity_comparison
        );

        any_changes = any_changes || diff.item_index_moves.length ||
          diff.new_item_indexes.length || diff.removed_item_indexes.length ||
          current_indexes.join('') !== option.last_indexes.join('');

        var current_scopes = $$HELPERS.rebuild_diff_array$$(
          current_items.length,
          last_scopes,
          diff.item_index_moves,
          diff.removed_item_indexes
        );

        // Must use 'for' loop to handle undefined (new scope) indexes
        for (var i = 0; i < current_scopes.length; i++) {
          var scope = current_scopes[i];
          var index = current_indexes[i];

          if (!scope) {
            // Store option index for scopes that must be created
            updated_scope_array[index] = option_index;
            continue;
          }

          var item = current_items[i];
          var scratch = scope.state['$$SYMBOLS.scope_special.SCRATCH$$'];
          var scope_item_index = items_array.indexOf(item);
          scratch.scope_item_index = scope_item_index;
          updated_scope_array[index] = scope;
        }

        // Destroy scopes at removed indexes
        if (diff.removed_item_indexes.length) {
          var scopes_to_destroy = diff.removed_item_indexes.map(function (i) {
            var scope = last_scopes[i];
            scope['$$SCOPE_METHODS.destroy_scope$$']();
            return scope;
          });

          scope_context['$$SCOPE_METHODS.cleanup_scopes_forwarding_rules$$'](
            scopes_to_destroy,
            option.case_data.async_input_symbols + option.case_data.sync_input_output_symbols
          );
        }

        // Initialize params if new scopes needed
        if (diff.new_item_indexes.length) {
          zone.initialize_scope_instance_parameters(
            scope_context,
            option.case_data.async_input_symbols + option.case_data.sync_input_output_symbols
          );
        }
      });

      if (!any_changes) {
        return resolve_callback(scope_array);
      }

      // Create new array scopes
      var initial_intermediate_symbol = symbols[2];
      var unresolveds = [];

      updated_scope_array.forEach(function (option_index, i) {
        // Scopes that need creation have an option_index as a placeholder
        if (typeof option_index !== 'number') return;

        var option = options[option_index];
        var new_item = deduplicated_items[i];
        var previous_scope = updated_scope_array[i - 1];

        var new_scope = scope_context['$$SCOPE_METHODS.create_array_scope$$'](
          items_array_symbol,
          items_array.indexOf(new_item),
          option.case_data.async_pre_init,
          option.case_data.sync_init,
          option.case_data.async_input_symbols,
          option.case_data.sync_input_output_symbols,
          initial_intermediate_symbol,
          scope_array_symbol,
          previous_scope
        );

        updated_scope_array[i] = new_scope;
        new_scope['$$SYMBOLS.scope_special.ASYNC_PRE_INIT$$']();

        var is_zone = new_scope['$$SYMBOLS.scope_special.IS_ZONE_ENTRY_POINT$$'];
        var async_init_status = new_scope['$$SYMBOLS.scope_special.ASYNC_INIT_RESOLVED$$'];
        if (!is_zone && async_init_status instanceof Coral.Unresolved) {
          unresolveds.push(async_init_status);
        }
      });

      if (unresolveds.length) {
        var array_async_init_status = new Coral.Unresolved(
          unresolveds.length,
          unresolveds,
          function (cb) { cb(updated_scope_array); },
          resolve_callback
        );
        unresolveds.forEach(function (unresolved) {
          unresolved.add_dependee(array_async_init_status);
        });
      } else {
        return resolve_callback(updated_scope_array);
      }
    }
  );

  register_global_helper(
    'rebuild_diff_array',
    function (size, initial_array, moved_indexes, removed_indexes) {
      var updated_array = new Array(size);
      var i;

      for (i = 0; i < initial_array.length; i++) {
        if (i < size && removed_indexes.indexOf(i) === -1) {
          updated_array[i] = initial_array[i];
        }
      }

      for (i = 0; i < moved_indexes.length; i += 2) {
        var move_to = moved_indexes[i];
        var move_from = moved_indexes[i + 1];
        var item = initial_array[move_from];

        var curr_index = updated_array.indexOf(item);
        if (curr_index !== -1) {
          updated_array[curr_index] = undefined;
        }
        updated_array[move_to] = item;
      }

      return updated_array;
    }
  );

  register_global_helper(
    'generate_compute_callback',
    function (pure_function) {
      return function (resolve_callback) {
        var inputs = Array.prototype.slice.call(arguments, 1);
        resolve_callback(pure_function.apply(null, inputs));
      };
    }
  );

  register_global_helper(
    'handle_promise_resolving',
    function (resolve_callback, value) {
      if (value instanceof Promise) {
        value.then(function (result) {
          resolve_callback({ result: result });
        }, function (err) {
          // The promise being rejected should be considered an error state, it seems best to not pass through the error to avoid code not expecting an error and expecting some sort of specific sort of value otherwise.
          resolve_callback({ error: err });
        });
      } else {
        resolve_callback({ result: value });
      }
    }
  );

  register_global_helper(
    'generate_promise_compute_callback',
    function (pure_function) {
      return function (resolve_callback) {
        var inputs = Array.prototype.slice.call(arguments, 1);
        var output = pure_function.apply(null, inputs);
        $$HELPERS.handle_promise_resolving$$(resolve_callback, output);
      };
    }
  );

};
