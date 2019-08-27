'use strict';
/* globals $$HELPERS, $$SYMBOLS, Coral */

var has_reported_page_frozen_event = false;
var Unresolved = require('./unresolved');

// Zone phases
var INITIALIZING_PHASE = 0;
var READY_PHASE = 1;
var UPDATING_PHASE = 2;

// Scope computable states
var UNDETERMINED = 0;
var FULLY_RESOLVED_CHANGED_PROCESSING = 1;
var FULLY_RESOLVED_CHANGED_PROCESSED = 2;
var FULLY_RESOLVED_UNCHANGED = 3;
var READY_TO_RESOLVE = 4;
var WAITING_ON_DEPENDENCIES = 5;

/**
 * @constructor
 */
function Zone (scope) {
  this._phase = INITIALIZING_PHASE;
  this._entry_scope = scope;
  this._tick = 0;
  this._initialization_start_tick = this._tick;
  this._cycle_contains_breaking_change = false;
  this._pending_update_cycle_computables = [];
  this._current_update_cycle_computables = [];
  this._zones_forwarded_to = [];
  this._queued_post_update_handlers = [];
  this._queued_updated_observables = [];

  this._pending_update_cycle_scopes = [];
}

Zone.SYMBOL_UNDETERMINED = UNDETERMINED;
Zone.SYMBOL_FULLY_RESOLVED_CHANGED_PROCESSING = FULLY_RESOLVED_CHANGED_PROCESSING;
Zone.SYMBOL_FULLY_RESOLVED_CHANGED_PROCESSED = FULLY_RESOLVED_CHANGED_PROCESSED;
Zone.SYMBOL_FULLY_RESOLVED_UNCHANGED = FULLY_RESOLVED_UNCHANGED;
Zone.SYMBOL_READY_TO_RESOLVE = READY_TO_RESOLVE;
Zone.SYMBOL_WAITING_ON_DEPENDENCIES = WAITING_ON_DEPENDENCIES;

Zone.prototype.is_initializing = function () {
  return this._phase === INITIALIZING_PHASE;
};

Zone.prototype.is_ready = function () {
  return this._phase === READY_PHASE;
};

Zone.prototype.is_updating = function () {
  return this._phase === UPDATING_PHASE;
};

Zone.prototype.get_entry_point = function () {
  return this._entry_scope;
};

function merge_updates (updates) {
  var merged_updates = [];
  var scope_symbol_updates = {};

  for (var i = 0; i !== updates.length; ++i) {
    var update = updates[i];
    var symbol = update.symbol;
    var scope = update.scope;

    var scope_id = scope['$$SYMBOLS.scope_special.UNIQUE_ID$$'];
    var scope_symbol_identifier = scope_id+symbol;

    var seen_scope_symbol_updates = scope_symbol_updates[scope_symbol_identifier] || [];
    seen_scope_symbol_updates.push(update);
    scope_symbol_updates[scope_symbol_identifier] = seen_scope_symbol_updates;
  }

  for (var scope_symbol_update_key in scope_symbol_updates) {
    var all_scope_symbol_updates = scope_symbol_updates[scope_symbol_update_key];

    if (all_scope_symbol_updates.length === 1) {
      merged_updates.push(all_scope_symbol_updates[0]);
    } else {
      // TODO: Consider support for custom merge handlers at one point
      merged_updates.push(default_merge_updates_handler(all_scope_symbol_updates));
    }
  }

  return merged_updates;
}

Zone.prototype.enter_ready_state = function () {
  this._running_handlers = true;

  if (this._pending_update_cycle_computables.length) {
    this._current_update_cycle_computables = this._current_update_cycle_computables.concat(this._pending_update_cycle_computables);
    this._pending_update_cycle_computables = [];
  }

  for (var i = 0; i < this._queued_post_update_handlers.length; ++i) {
    var post_update_handler_data = this._queued_post_update_handlers[i];

    var scope = post_update_handler_data.scope;

    if (scope['$$SCOPE_METHODS.is_destroyed$$']()) {
      continue;
    }

    post_update_handler_data.handler.func(post_update_handler_data.value, scope, post_update_handler_data.handler.metadata);
  }

  var j;
  var updated_observable;
  for (j = 0; j < this._queued_updated_observables.length; ++j) {
    updated_observable = this._queued_updated_observables[j];
    updated_observable.before();
    updated_observable.update();
  }

  for (j = 0; j < this._queued_updated_observables.length; ++j) {
    updated_observable = this._queued_updated_observables[j];
    updated_observable.after();
  }

  if (i) {
    this._queued_post_update_handlers = [];
  }

  if (j) {
    this._queued_updated_observables = [];
  }

  this._phase = READY_PHASE;
  this._running_handlers = false;

  // Handles initialize methods adding updates synchronously or observable change methods adding updating synchronously.
  if (this._current_update_cycle_computables.length) {
    this.run_update_cycle();
  } else {
    if (this._cycle_contains_breaking_change) {
      this._cycle_contains_breaking_change = false;
      this.reinitialize();
    }
  }
};

Zone.prototype.reinitialize = function () {
  this._phase = INITIALIZING_PHASE;
  this._initialization_start_tick = this._tick;

  var entry_scope = this._entry_scope;
  entry_scope['$$SCOPE_METHODS.destroy_scope$$']();
  entry_scope['$$SYMBOLS.scope_special.IS_DESTROYED$$'] = false;

  if (entry_scope.state['$$SYMBOLS.scope_special.PARENT_SCOPE$$']) {
    var io_symbols = entry_scope['$$SCOPE_METHODS.get_scope_io_symbols$$']();
    entry_scope.state['$$SYMBOLS.scope_special.PARENT_SCOPE$$']['$$SYMBOLS.scope_special.ZONE$$'].initialize_scope_instance_parameters(entry_scope.state['$$SYMBOLS.scope_special.PARENT_SCOPE$$'], io_symbols);
  }

  entry_scope['$$SYMBOLS.scope_special.ASYNC_PRE_INIT$$']();

  var is_root_scope = !entry_scope.state['$$SYMBOLS.scope_special.PARENT_SCOPE$$'];
  if (is_root_scope) {
    return;
  }

  entry_scope['$$SYMBOLS.scope_special.SYNC_INIT$$']();
};

/**
 * @param {Array.<Object>} updates
 * @return {Object} The last update in the updates array
 */
function default_merge_updates_handler (updates) {
  return updates[updates.length - 1];
}

Zone.prototype._mark_current_update_cycle_computable_symbol = function (update) {
  var scope = update.scope;
  var symbol = update.symbol;
  var instance_update_metadata = scope['$$SYMBOLS.scope_special.INSTANCE_UPDATE_METADATA_BY_SYMBOL$$'];
  var symbol_instance_update_metadata = instance_update_metadata[symbol];

  var initial_update_cycle_computable_tick = symbol_instance_update_metadata.get_tick();
  if (initial_update_cycle_computable_tick < this._update_cycle_start_tick) {
    symbol_instance_update_metadata.set_state(FULLY_RESOLVED_CHANGED_PROCESSING);
  }
};

/**
 * @param {Array.<{{ scope: Object, symbol: string, forwarded: boolean, same_value: boolean, value: * }}>} updates
 */
Zone.prototype.add_updates = function (updates) {
  for (var i = 0; i < updates.length; ++i) {
    var update = updates[i];

    if (update.initialization_start_tick === undefined) {
      update.initialization_start_tick = this._initialization_start_tick;
    }

    if (this._phase === INITIALIZING_PHASE) {
      this._pending_update_cycle_computables.push(update);
    } else {
      if (this._phase === UPDATING_PHASE) {
        this._mark_current_update_cycle_computable_symbol(update);
      }
      this._current_update_cycle_computables.push(update);
    }
  }
};

Zone.prototype._create_async_update_callback = function (scope, symbol) {
  var current_initialization_start_tick = this._initialization_start_tick;

  return function (value) {
    Coral.Observable.scheduler.register_update(scope,symbol,value,true,false,current_initialization_start_tick);
    Coral.Observable.scheduler.run();
  };
};

function create_symbol_assignment_callback (scope, symbol) {
  return function (value) {
    scope.state[symbol] = value;
  };
}

function create_forward_to_update (scope, symbol, value, old_value, forced, same_value, forward_to_rule, set_source_scope, set_source_symbol) {
  var forward_to_rule_scope = forward_to_rule.scope;
  var forward_to_rule_symbol = forward_to_rule.symbol;

  var forward_to_update = {
    scope: forward_to_rule_scope,
    symbol: forward_to_rule_symbol,
    forwarded: true,
    forward_source_scope: scope,
    forward_source_symbol: symbol,
    set_source_scope: set_source_scope,
    set_source_symbol: set_source_symbol
  };

  if (forward_to_rule.intercept) {
    var new_value = forward_to_rule.intercept(value, forward_to_rule_scope);
    forward_to_update.value = new_value;
  } else {
    // Only add the forwarder's same_value key if value has not been intercepted
    forward_to_update.value = value;
    forward_to_update.forced = forced;
    forward_to_update.same_value = same_value;
  }

  return forward_to_update;
}



function create_phantom_dependency_callback (scope, symbol, old_value, forced, same_value, forward_to_rule, set_source_scope, set_source_symbol) {
  return function () {
    var forward_to_update = create_forward_to_update(scope, symbol, scope.state[symbol], old_value, forced, same_value, forward_to_rule, set_source_scope, set_source_symbol);
    forward_to_update.phantom = true;
    var forward_to_zone = forward_to_update.scope["$$SYMBOLS.scope_special.ZONE$$"];
    forward_to_zone.add_updates([forward_to_update]);
    forward_to_zone.run_update_cycle();
  };
}

// TODO: We seem to be passing maybe not the right symbols into this, like we shouldn't pass in the virtual symbols that point to non-virtual things, but pass in the non-virtual symbol that it points to.  Hmmm.
/**
 * @param {Object} scope
 * @param {string} symbols
 */
Zone.prototype.initialize_scope_instance_parameters = function (scope, symbols) {
  var special_symbols = ['$$SYMBOLS.special.SEPARATOR$$', '$$SYMBOLS.special.IGNORE$$', '$$SYMBOLS.special.ITEM_VIRTUAL$$'];
  var scope_update_metadata = scope['$$SYMBOLS.scope_special.UPDATE_METADATA_BY_SYMBOL$$'];
  var instance_update_metadata = scope['$$SYMBOLS.scope_special.INSTANCE_UPDATE_METADATA_BY_SYMBOL$$'];

  for (var i = 0; i !== symbols.length; ++i) {
    var symbol = symbols[i];

    if (special_symbols.indexOf(symbol) !== -1) {
      continue;
    }

    var current_value = scope.state[symbol];
    if (current_value instanceof Unresolved) {
      continue;
    }

    var status = this._process_dependency_hierarchy(scope, symbol);
    var is_unresolved = status === WAITING_ON_DEPENDENCIES || status === READY_TO_RESOLVE;
    if (is_unresolved) {
      // TODO: We should have a special subtype of Unresolved that doesn't require generating the second function, it just already does that and takes in a scope.
      var unresolved = new Unresolved(1, [], $$HELPERS.immediately_resolving_compute_callback$$, create_symbol_assignment_callback(scope, symbol));

      unresolved.value = current_value;

      // This will be resolved by the update cycle code when it update that symbol after the resolution function has completed.
      var symbol_update_metadata = scope_update_metadata[symbol];
      var symbol_instance_update_metadata = instance_update_metadata[symbol];
      if (symbol_update_metadata.is_recording_value_necessary) {
        symbol_instance_update_metadata.last_recorded_value = unresolved;
      } else {
        scope.state[symbol] = unresolved;
      }
    }
  }
};

function is_unavailable_dependency_status (symbol_status) {
  return symbol_status !== FULLY_RESOLVED_UNCHANGED;
}

/**
 * Start at a symbol, checking all the dependencies of it.  Will update the symbol of the currently processed symbol once it has finished checking the dependencies.  If the state is undetermined then recursively call the process that symbol.
 *
 * This function assumes that scope symbol's state has already been checked to see if it is undetermined or not.  This function should only be called with undetermined symbols.
 *
 * Returns the determined state for the given symbol.
 *
 * @param {Object} scope
 * @param {string} symbol
 * @param {boolean} descending If descending to a scope output for a compound nested passthrough, used to prevent it from going back up to the parent scope
 * @param {Object} traverse_from_scope
 * @returns {number} The determined status for the symbol.
 */
Zone.prototype._process_dependency_hierarchy = function (scope, symbol, descending, traverse_from_scope) {
  var scope_update_metadata = scope['$$SYMBOLS.scope_special.UPDATE_METADATA_BY_SYMBOL$$'];
  var instance_update_metadata = scope['$$SYMBOLS.scope_special.INSTANCE_UPDATE_METADATA_BY_SYMBOL$$'];

  var determined_status = UNDETERMINED;
  var has_pending_dependency = false;
  var symbol_update_metadata = scope_update_metadata[symbol];
  var symbol_instance_update_metadata = instance_update_metadata[symbol];

  if (!symbol_update_metadata || !symbol_instance_update_metadata) {
    return FULLY_RESOLVED_UNCHANGED;
  }

  var symbol_status = symbol_instance_update_metadata.get_status();
  var symbol_tick = symbol_instance_update_metadata.get_tick();
  var is_undetermined_state = symbol_status === UNDETERMINED || this._update_cycle_start_tick > symbol_tick;


  if (!is_undetermined_state) {
    return symbol_status;
  }

  var i;
  var j;

  var parent_scope = scope.state['$$SYMBOLS.scope_special.PARENT_SCOPE$$'];
  var forward_to_rules = symbol_instance_update_metadata.forward_to || [];

  var forward_to_metadata;
  var forward_to_scope;
  var forward_to_symbol;
  var forward_to_scope_update_metadata;
  var forward_to_symbol_update_metadata;
  var forward_to_symbol_status;
  var is_different_zone;


  // In some cases, like with an 'item_index' parameter, it may not have forward to rules and instead use set handler metadata.
  if (symbol_instance_update_metadata.is_item_index_parameter()) {
    forward_to_scope = symbol_instance_update_metadata.set_handler_metadata.forward_to_scope;
    forward_to_symbol = symbol_instance_update_metadata.set_handler_metadata.forward_to_array_symbol;
    forward_to_rules = forward_to_rules.concat(new Coral.ForwardRule(forward_to_scope, forward_to_symbol));
  }

  var may_be_compound_nested_passthrough_symbol = symbol_update_metadata.is_scope_input_output && !symbol_update_metadata.update_handler_input_symbols;
  if (may_be_compound_nested_passthrough_symbol) {
    for (i = 0; i !== forward_to_rules.length; ++i) {
      forward_to_metadata = forward_to_rules[i];
      forward_to_scope = forward_to_metadata.scope;

      // If the forward to scope is an element, we don't want to try to trace through that output, it is definitely a placement.
      var forward_to_scope_is_element = forward_to_scope.state.begin_placement_symbol;

      if (forward_to_scope === parent_scope || (traverse_from_scope && forward_to_scope === traverse_from_scope) || forward_to_scope_is_element) {
        continue;
      }

      forward_to_symbol = forward_to_metadata.symbol;
      forward_to_scope_update_metadata = forward_to_scope['$$SYMBOLS.scope_special.UPDATE_METADATA_BY_SYMBOL$$'];
      forward_to_symbol_update_metadata = forward_to_scope_update_metadata[forward_to_symbol];

      // We have to treat compound nested passthroughs special since they represent a point in the graph where in order to traverse up the hierarchy, we must navigate down into the scope through its output and up through its inputs.
      var is_compound_nested_passthrough_forward_rule = forward_to_symbol_update_metadata && forward_to_symbol_update_metadata.is_scope_output;
      if (!is_compound_nested_passthrough_forward_rule) {
        continue;
      }

      forward_to_symbol_status = forward_to_scope['$$SYMBOLS.scope_special.ZONE$$']._process_dependency_hierarchy(forward_to_scope, forward_to_symbol, true, scope);
      has_pending_dependency = is_unavailable_dependency_status(forward_to_symbol_status);
      break;
    }
  }

  if (!has_pending_dependency && symbol_update_metadata.is_scope_parameter && !descending) {
    // NOTE: This makes the assumption that scope parameters have no listed "update_handler_input_symbols" and must look up their dependency via the forwarding rule wired up on it and assumes that there will only be one forwarding rule wired up on this.
    // * NOTE: In most cases we never need an upward forwarding rule since the thing passed in is not mutable, but for right now we don't factor that in.  When real world performance numbers start appearing, then we might look at increasing the size of the generated code to reduce the update wiring we do.

    for (i = 0; i !== forward_to_rules.length; ++i) {
      forward_to_metadata = forward_to_rules[i];
      forward_to_scope = forward_to_metadata.scope;
      if (forward_to_scope !== parent_scope) {
        continue;
      }

      forward_to_symbol = forward_to_metadata.symbol;

      var forward_to_zone = forward_to_scope['$$SYMBOLS.scope_special.ZONE$$'];
      is_different_zone = forward_to_zone !== this;

      // If the zone is not currently updating, any input passed in from it from it is safe to use.
      if (is_different_zone && (forward_to_zone._phase === READY_PHASE || forward_to_zone._running_handlers)) {
        continue;
      }

      forward_to_symbol_status = forward_to_zone._process_dependency_hierarchy(forward_to_scope, forward_to_symbol, false, scope);

      // Status of '2' may not indicate pending if no current updates are sourced from the forward scope/symbol
      if (is_different_zone && forward_to_symbol_status === FULLY_RESOLVED_CHANGED_PROCESSED) {
        for (j = 0; j < this._current_update_cycle_computables.length; j++) {
          var update = this._current_update_cycle_computables[j];
          if (update.forward_source_scope === forward_to_scope && update.forward_source_symbol === forward_to_symbol) {
            has_pending_dependency = true;
            break;
          }
        }
      } else if (is_unavailable_dependency_status(forward_to_symbol_status)) {
        has_pending_dependency = true;
      }
    }
  } else if (!has_pending_dependency) {
    var dependency_symbols = symbol_update_metadata.update_handler_input_symbols || '';
    var update_trigger_dependency_symbols = symbol_update_metadata.get_update_trigger_input_symbols() || '';
    for (i = 0; i !== dependency_symbols.length; ++i) {
      var dependency_symbol = dependency_symbols[i];
      var dependency_status = this._process_dependency_hierarchy(scope, dependency_symbol);
      if (is_unavailable_dependency_status(dependency_status) && update_trigger_dependency_symbols.indexOf(dependency_symbol) !== -1) {
        has_pending_dependency = true;
      }
    }
  }

  determined_status = has_pending_dependency ? WAITING_ON_DEPENDENCIES : FULLY_RESOLVED_UNCHANGED;
  symbol_instance_update_metadata.set_state(determined_status);

  return determined_status;
};

Zone.prototype.get_tick = function () {
  return this._tick;
};

/**
 * Runs an update cycle for the zone.
 */
Zone.prototype.run_update_cycle = function () {
  if (this._running_handlers || this._currently_updating || this._phase === INITIALIZING_PHASE) {
    return;
  }

  this._phase = UPDATING_PHASE;
  this._currently_updating = true;

  var current_tick = ++this._tick;

  var is_new_update_cycle = !this._pending_update_cycle_scopes.length;
  if (is_new_update_cycle) {
    this._update_cycle_start_tick = current_tick;
  }

  this._current_update_cycle_computables = merge_updates(this._current_update_cycle_computables);
  var current_update_cycle_computables = this._current_update_cycle_computables;

  var current_update;

  var i, j, k;
  var scope;
  var symbol;
  var scope_update_metadata;
  var instance_update_metadata;
  var symbol_update_metadata;
  var symbol_instance_update_metadata;

  // Mark observables that are kicking off the cycle as processing, so any dependees correctly see any of the incoming computables as pending and wait on them.
  for (i = 0; i !== current_update_cycle_computables.length; ++i) {
    this._mark_current_update_cycle_computable_symbol(current_update_cycle_computables[i]);
  }

  /* jshint -W084 */
  while (current_update = current_update_cycle_computables.shift()) {
    scope = current_update.scope;
    symbol = current_update.symbol;

    var initialization_start_tick = current_update.initialization_start_tick;
    // Drop updates from previous initialization runs.
    if (this._initialization_start_tick > initialization_start_tick) {
      continue;
    }

    // Updates may be added as a courtesy to make sure that the symbol knows no change occurred for it, and anything waiting on it to resolve can do so.
    var has_value = current_update.hasOwnProperty('value');
    var value = has_value ? current_update.value : scope.state[symbol];
    var forced = current_update.forced;
    var is_compute_update = current_update.is_compute_update;
    var forwarded = current_update.forwarded;
    var forward_source_scope = current_update.forward_source_scope;
    var forward_source_symbol = current_update.forward_source_symbol;

    var set_source_scope = current_update.set_source_scope;
    var set_source_symbol = current_update.set_source_symbol;

    scope_update_metadata = scope['$$SYMBOLS.scope_special.UPDATE_METADATA_BY_SYMBOL$$'];
    instance_update_metadata = scope['$$SYMBOLS.scope_special.INSTANCE_UPDATE_METADATA_BY_SYMBOL$$'];

    symbol_update_metadata = scope_update_metadata[symbol];
    symbol_instance_update_metadata = instance_update_metadata[symbol];

    if (!symbol_update_metadata || !symbol_instance_update_metadata || !symbol_update_metadata.is_registered_for_update_cycle) {
      // console.warn("Skipping update for symbol not registered for update cycle", scope, symbol, symbol_update_metadata);
      continue;
    }

    var symbol_status = symbol_instance_update_metadata.get_status();
    var symbol_tick = symbol_instance_update_metadata.get_tick();

    if (scope['$$SCOPE_METHODS.is_destroyed$$']()) {
      continue;
    }

    var already_updated_since_update_cycle_start_tick = symbol_tick >= this._update_cycle_start_tick;

    // This can happen in situations like multiple sets to an Observable in the same function call or with how some update handlers will push updates for symbols that could possibly have changed already or something may have visited already and declared unchanged.
    // * This should really not happen otherwise, keep an eye on this.
    if (already_updated_since_update_cycle_start_tick && (symbol_status === FULLY_RESOLVED_UNCHANGED || symbol_status === FULLY_RESOLVED_CHANGED_PROCESSED)) {
      this._pending_update_cycle_computables.push(current_update);
      continue;
    }

    // If a symbol has a set update and yet has also been recomputed, don't apply the set update when it is waiting on the recompute update to be processed (READY_TO_RESOLVE), hold on to the set update for the next update cycle.
    var is_set_update_and_symbol_has_recomputed = already_updated_since_update_cycle_start_tick && !is_compute_update && symbol_status === READY_TO_RESOLVE;
    if (is_set_update_and_symbol_has_recomputed) {
      this._pending_update_cycle_computables.push(current_update);
      continue;
    }

    var current_value;

    // TODO: Maybe we should just have some sort of hook system here, so things that need special handling don't have to add their logic directly in here.
    // With certain proxied symbols we need to record updates as they come in here, in particular we need to do this for cases where the value proxied is not the same as the source such as with item, item nested and indexed other array items.
    if (symbol_update_metadata.is_recording_value_necessary) {
      current_value = symbol_instance_update_metadata.last_recorded_value;
      symbol_instance_update_metadata.last_recorded_value = value;
    } else {
      current_value = scope.state[symbol];
    }

    if (!scope['$$SYMBOLS.scope_special.IS_INITIALIZED$$']) {
      scope.state._init_pending_updates = scope.state._init_pending_updates || [];
      scope.state._init_pending_updates.push(current_update);
      continue;
    }

    // TODO: Optimize placement of this further, this is a simple good enough approach for now
    if (this._pending_update_cycle_scopes.indexOf(scope) === -1) {
      this._pending_update_cycle_scopes.push(scope);
    }

    var currently_unresolved = current_value instanceof Unresolved;

    if (currently_unresolved) {
      var unresolved = current_value;
      current_value = current_value.value;

      // Unresolveds will be used for computables used as scope parameters if they are found to have pending changes up the hierarchy when we create a new scope, we need to create an Unresolved since that is how we communicate with the async pre-init code that the value is not ready yet.
      unresolved.dependencies.push(value);
      unresolved.dependency_resolved();
    }

    var same_value = current_update.hasOwnProperty('same_value') ? current_update.same_value : current_value === value;

    var changed = !same_value || forced;

    symbol_instance_update_metadata.set_state(changed ? FULLY_RESOLVED_CHANGED_PROCESSED : FULLY_RESOLVED_UNCHANGED);

    // NOTE: It won't forward down an update unless it is a different value or the update was forced, which is why we don't check that here.
    if (changed && scope === this._entry_scope && symbol_update_metadata.is_scope_parameter && symbol_update_metadata.is_invariant) {
      if (!this._cycle_contains_breaking_change) {
        var begin_placement = this._entry_scope.state[this._entry_scope.state.begin_placement_symbol];
        var end_placement = this._entry_scope.state[this._entry_scope.state.end_placement_symbol];
        // console.trace("CLEARING ZONE", this._entry_scope, current_update, symbol_update_metadata);
        if (begin_placement !== end_placement && begin_placement && end_placement) {
          $$HELPERS.delete_between_placements$$(begin_placement, end_placement, true);
        }

        this._entry_scope.state[this._entry_scope.state.end_placement_symbol] = begin_placement;
      }

      scope.state[symbol] = value;

      this._pending_update_cycle_scopes = [];
      this._cycle_contains_breaking_change = true;
    }

    if (this._cycle_contains_breaking_change) {
      continue;
    }

    if (changed) {
      if (!same_value) {
        scope.state[symbol] = value;
      }

      var symbol_observable = symbol_instance_update_metadata.observable;
      if (symbol_observable && changed) {
        // TODO: Ideally we'd only want to do this if the observable has any listeners for its change handlers.
        this._queued_updated_observables.push(symbol_observable);
        symbol_observable.value = value;
      }

      if (symbol_update_metadata.post_update_handlers) {
        for (i = 0; i !== symbol_update_metadata.post_update_handlers.length; ++i) {
          this._queued_post_update_handlers.push({ scope: scope, value: value, handler: symbol_update_metadata.post_update_handlers[i] });
        }
      }

      if (!forwarded && !is_compute_update || (forwarded && forward_source_scope.state['$$SYMBOLS.scope_special.PARENT_SCOPE$$'] === scope)) {
        symbol_instance_update_metadata.run_set_handler(scope, value);
      }
    }

    // TODO: Find a clean way to remove indirection and more tightly link to non-dynamic scope instance types (such as normal elements and models), forward to rules are basically meant for cases where the scope may not always exist.
    var forward_rules = symbol_instance_update_metadata.forward_to;

    if (forward_rules) {
      for (i = 0; i !== forward_rules.length; ++i) {
        var forward_to_rule = forward_rules[i];
        var forward_to_rule_scope = forward_to_rule.scope;
        var forward_to_rule_symbol = forward_to_rule.symbol;
        var forward_to_rule_zone = forward_to_rule_scope['$$SYMBOLS.scope_special.ZONE$$'];

        var is_different_origin = forward_to_rule_scope !== forward_source_scope || forward_to_rule_symbol !== forward_source_symbol;

        if (forwarded && !is_different_origin) {
          continue;
        }

        var is_async_and_sync_initialized = forward_to_rule_scope['$$SYMBOLS.scope_special.IS_INITIALIZED$$'];

        var should_forward_update = false;
        if (is_async_and_sync_initialized) {
          should_forward_update = true;
        } else if (changed) {
          var is_sync_border_param = $$HELPERS.is_character_code_in_range$$($$SYMBOLS.ranges.SYNC_BORDER_RANGES$$, forward_to_rule_symbol.charCodeAt(0));
          var async_init_finished = forward_to_rule_scope['$$SYMBOLS.scope_special.IS_ASYNC_INIT_RESOLVED$$'] === true;

          // This handling is only necessary because Observable sets get pushed into the current update cycle, if they were always pending then we could assume that any time we create a scope, all updates to proxying symbols should not forward, since they would all be Unresolved parameters waiting for an initial value, since they would look up the hierarchy and see a pending change.
          should_forward_update = !is_sync_border_param && (
             async_init_finished ||
             (!currently_unresolved && !(forward_to_rule_scope.state[forward_to_rule_symbol] instanceof Unresolved))
           );
        }

        if (should_forward_update) {
          var forward_to_value = value;
          var held_by_phantom_dep = false;

          if (forward_to_rule.phantom_dependency_symbol) {
            var phantom_dependency_state = this._process_dependency_hierarchy(scope, forward_to_rule.phantom_dependency_symbol);

            if (phantom_dependency_state === WAITING_ON_DEPENDENCIES) {
              held_by_phantom_dep = true;

              var phantom_dependency_value = scope.state[forward_to_rule.phantom_dependency_symbol];
              var phantom_dependency_unresolved = scope['$$SCOPE_METHODS.create_placeholder_unresolved$$'](forward_to_rule.phantom_dependency_symbol);

              phantom_dependency_unresolved.compute_callback = $$HELPERS.immediately_resolving_compute_callback$$;

              var already_has_unresolved = phantom_dependency_value instanceof Unresolved;
              if (!already_has_unresolved) {
                phantom_dependency_unresolved.value = phantom_dependency_value;
              }

              // TODO: More cleanly hook up with zone forwarding to's update cycle.
              var dependee_unresolved = new Unresolved(1, [], create_phantom_dependency_callback(scope, symbol, current_value, forced, same_value, forward_to_rule, set_source_scope, set_source_symbol));
              phantom_dependency_unresolved.add_dependee(dependee_unresolved);
            }
          }

          if (!held_by_phantom_dep) {
            // TODO: This should probably go through Observable.scheduler.register_update
            var forward_to_update = create_forward_to_update(scope, symbol, value, current_value, forced, same_value, forward_to_rule, set_source_scope, set_source_symbol);
            forward_to_rule_zone.add_updates([forward_to_update]);
          }

          if (forward_to_rule_zone !== this && this._zones_forwarded_to.indexOf(forward_to_rule_zone) === -1) {
            this._zones_forwarded_to.push(forward_to_rule_zone);
          }
        }
      }
    }

    var update_cycle_symbols = scope['$$SYMBOLS.scope_special.TOPOLOGICALLY_ORDERED_UPDATE_CYCLE_SYMBOLS$$'];

    var found_index = update_cycle_symbols.indexOf(symbol);
    var start_index;
    if (found_index === -1) {
      start_index = 0;
    } else {
      start_index = found_index + 1;
    }

    for (i = start_index; i < update_cycle_symbols.length; ++i) {
      var update_cycle_symbol = update_cycle_symbols[i];
      var update_cycle_symbol_update_metadata = scope_update_metadata[update_cycle_symbol];

      if (set_source_scope && set_source_symbol && set_source_scope === scope && set_source_symbol === update_cycle_symbol) {
        continue;
      }

      var update_trigger_input_symbols = update_cycle_symbol_update_metadata.get_update_trigger_input_symbols();
      if (!update_trigger_input_symbols) {
        continue;
      }

      if (changed) {
        var update_cycle_symbol_input_index = update_trigger_input_symbols.indexOf(symbol);
        if (update_cycle_symbol_input_index === -1) {
          continue;
        }
      } else {
        var always_recompute_input_symbols = update_cycle_symbol_update_metadata.get_always_recompute_input_symbols();
        if (always_recompute_input_symbols.indexOf(symbol) === -1) {
          continue;
        }
      }

      this._perform_scope_symbol_update_process(scope, update_cycle_symbol);
    }
  }

  var has_ready_to_resolve_pending_symbols = false;
  if (this._pending_update_cycle_scopes.length) {
    // Perform an ascending order sort so that we don't have to look up from scope parameters to parent scopes to determine if the symbol forwarding to the scope parameter is pending.  We get to simplify the logic this way.
    this._pending_update_cycle_scopes.sort(function ascending_order_sort (scope_a, scope_b) {
      return scope_a['$$SYMBOLS.scope_special.UNIQUE_ID$$'] - scope_b['$$SYMBOLS.scope_special.UNIQUE_ID$$'];
    });

    var updated_pending_update_cycle_scopes = [];

    for (i = 0; i < this._pending_update_cycle_scopes.length; ++i) {
      var pending_update_cycle_scope = this._pending_update_cycle_scopes[i];

      if (pending_update_cycle_scope['$$SCOPE_METHODS.is_destroyed$$']()) {
        continue;
      }

      var pending_scope_update_metadata = pending_update_cycle_scope['$$SYMBOLS.scope_special.UPDATE_METADATA_BY_SYMBOL$$'];
      var pending_instance_update_metadata = pending_update_cycle_scope['$$SYMBOLS.scope_special.INSTANCE_UPDATE_METADATA_BY_SYMBOL$$'];
      var pending_scope_update_cycle_symbols = pending_update_cycle_scope['$$SYMBOLS.scope_special.TOPOLOGICALLY_ORDERED_UPDATE_CYCLE_SYMBOLS$$'];
      var contains_pending_symbol = false;

      for (j = 0; j < pending_scope_update_cycle_symbols.length; ++j) {
        var pending_scope_symbol = pending_scope_update_cycle_symbols[j];
        var pending_symbol_instance_update_metadata = pending_instance_update_metadata[pending_scope_symbol];
        var pending_scope_symbol_status = pending_symbol_instance_update_metadata.get_status();
        var pending_scope_symbol_tick = pending_symbol_instance_update_metadata.get_tick();
        var is_undetermined_state = pending_scope_symbol_status === UNDETERMINED || this._update_cycle_start_tick > pending_scope_symbol_tick;
        if (is_undetermined_state) continue;

        if (pending_scope_symbol_status === READY_TO_RESOLVE) {
          has_ready_to_resolve_pending_symbols = true;
          contains_pending_symbol = true;
          continue;
        }

        if (pending_scope_symbol_status !== WAITING_ON_DEPENDENCIES) {
          continue;
        }

        contains_pending_symbol = true;
        this._perform_scope_symbol_update_process(pending_update_cycle_scope, pending_scope_symbol);
      }

      if (contains_pending_symbol) {
        updated_pending_update_cycle_scopes.push(pending_update_cycle_scope);
      }
    }

    this._pending_update_cycle_scopes = updated_pending_update_cycle_scopes;
  }

  var is_fully_updated = !this._pending_update_cycle_scopes.length;

  var _zones_forwarded_to = this._zones_forwarded_to.slice();
  this._zones_forwarded_to = [];
  _zones_forwarded_to.forEach(function (zone) {
    zone.run_update_cycle();
  });

  this._currently_updating = false;

  if (is_fully_updated) {
    this._pending_update_cycle_scopes = [];
    this.enter_ready_state();
  } else if (current_update_cycle_computables.length) {
    this.run_update_cycle();
  } else if (!has_ready_to_resolve_pending_symbols && !has_reported_page_frozen_event) {
    // If the parent zone is updating, it's possible the 5s are just this zone's scopes waiting on updates from the parent zone.
    var parent_zone_is_updating = this._entry_scope.state['$$SYMBOLS.scope_special.PARENT_SCOPE$$'] && this._entry_scope.state['$$SYMBOLS.scope_special.PARENT_SCOPE$$']['$$SYMBOLS.scope_special.ZONE$$'].is_updating();
    if (!parent_zone_is_updating) {
      has_reported_page_frozen_event = true;
      var event_category = 'FrameworkUpdateCyclePageFreeze';
      var event_action = document.readyState !== "complete" ? 'DuringPageLoad' : 'AfterPageLoad';
      var event_label = null;
      var scope_context = this._entry_scope;
      var coral_instance = scope_context.coral_instance;
      $$HELPERS.report_error$$(coral_instance, event_category, event_action, event_label);
    }
  }
};

Zone.prototype._perform_scope_symbol_update_process = function (scope, update_cycle_symbol) {
  var j;
  var scope_update_metadata = scope['$$SYMBOLS.scope_special.UPDATE_METADATA_BY_SYMBOL$$'];
  var instance_update_metadata = scope['$$SYMBOLS.scope_special.INSTANCE_UPDATE_METADATA_BY_SYMBOL$$'];
  var update_cycle_symbol_instance_update_metadata = instance_update_metadata[update_cycle_symbol];
  var update_cycle_symbol_update_metadata = scope_update_metadata[update_cycle_symbol];
  var always_recompute_symbols = update_cycle_symbol_update_metadata.get_always_recompute_input_symbols();
  var dependee_update_input_values = [];
  var has_unavailable_dependencies = false;
  var has_changed_inputs = false;
  var dependee_current_value = scope.state[update_cycle_symbol];
  var update_handler_input_symbols = update_cycle_symbol_update_metadata.update_handler_input_symbols;

  for (j = 0; j !== update_handler_input_symbols.length; ++j) {
    var dependee_input_symbol = update_handler_input_symbols[j];
    var dependee_input_value;

    if ($$HELPERS.is_global_symbol$$(dependee_input_symbol)) {
      dependee_input_value = Coral.sponges[dependee_input_symbol];
    } else if (dependee_input_symbol === '$$SYMBOLS.special.CURRENT_VALUE_VIRTUAL$$') {
      dependee_input_value = dependee_current_value;
      if (dependee_input_value instanceof Unresolved) {
        dependee_input_value = dependee_input_value.value;
      }
    } else {
      var dependee_input_status = this._process_dependency_hierarchy(scope, dependee_input_symbol);

      if (dependee_input_status !== FULLY_RESOLVED_UNCHANGED || always_recompute_symbols.indexOf(dependee_input_symbol) !== -1) {
        has_changed_inputs = true;
      }

      if (dependee_input_status === FULLY_RESOLVED_CHANGED_PROCESSING ||
          dependee_input_status === READY_TO_RESOLVE ||
          dependee_input_status === WAITING_ON_DEPENDENCIES) {
        has_unavailable_dependencies = true;
        break;
      }

      dependee_input_value = scope.state[dependee_input_symbol];
    }
    dependee_update_input_values.push(dependee_input_value);
  }

  var update_symbol_status = has_unavailable_dependencies ? WAITING_ON_DEPENDENCIES : READY_TO_RESOLVE;
  update_cycle_symbol_instance_update_metadata.set_state(update_symbol_status);

  if (update_symbol_status === READY_TO_RESOLVE) {
    // TODO: Support doing sync update processing in a far more efficient manner than having everything go down the async path.
    var resolve_callback = this._create_async_update_callback(scope, update_cycle_symbol);

    if (has_changed_inputs || dependee_current_value instanceof Unresolved) {
      var async_update_handler = update_cycle_symbol_update_metadata.update_handler;

      if (update_cycle_symbol_update_metadata.raw_update_handler_input_data) {
        async_update_handler(resolve_callback, scope, update_cycle_symbol_update_metadata.raw_update_handler_input_data);
      } else {
        dependee_update_input_values.unshift(resolve_callback);
        async_update_handler.apply(null, dependee_update_input_values);
      }
    } else {
      resolve_callback(dependee_current_value);
    }
  }
};

module.exports = Zone;
