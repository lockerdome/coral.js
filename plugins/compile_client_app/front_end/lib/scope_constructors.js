"use strict";

/* global $$HELPERS, Coral*/

var scope_number = 0;

function Scope (scope_context, async_pre_init_function, sync_init_function, coral_instance) {
  this.coral_instance = coral_instance;

  this['$$SYMBOLS.scope_special.UPDATE_METADATA_BY_SYMBOL$$'] = {};
  this['$$SYMBOLS.scope_special.INSTANCE_UPDATE_METADATA_BY_SYMBOL$$'] = {};
  this['$$SYMBOLS.scope_special.ASYNC_PRE_INIT$$'] = async_pre_init_function;
  this['$$SYMBOLS.scope_special.SYNC_INIT$$'] = sync_init_function;
  // TODO: NOTE: There is a spot in zone assuming this is an incrementing integer, may want to change the name to reflect that.
  this['$$SYMBOLS.scope_special.UNIQUE_ID$$'] = scope_number++;
  this['$$SYMBOLS.scope_special.IS_DESTROYED$$'] = false;
  this['$$SYMBOLS.scope_special.IS_INITIALIZED$$'] = false;
  this['$$SYMBOLS.scope_special.ASYNC_INIT_RESOLVED$$'] = null;
  this['$$SYMBOLS.scope_special.IS_ASYNC_INIT_RESOLVED$$'] = false;
  this['$$SYMBOLS.scope_special.TOPOLOGICALLY_ORDERED_UPDATE_CYCLE_SYMBOLS$$'] = '';

  // TODO: It would be nice if we could specify both of these immediately to their proper values.
  this['$$SYMBOLS.scope_special.IS_ZONE_ENTRY_POINT$$'] = false;
  this['$$SYMBOLS.scope_special.ZONE$$'] = null;

  this.state = {};
  this.state['$$SYMBOLS.scope_special.PARENT_SCOPE$$'] = scope_context;
}

Scope.prototype.generateEmitEventHandler = function () {
  var _this = this;
  var scope_context = this.state['$$SYMBOLS.scope_special.PARENT_SCOPE$$'];
  var event = scope_context.coral_instance.settings.event;

  return function emitEventHandler (name, data, use_proto, override_origin_emit_event) {
    var current_scope = _this;
    if (use_proto) {
      current_scope = current_scope.state['$$SYMBOLS.scope_special.PARENT_SCOPE$$'];
    }

    var catch_handler;
    var scope_data = [];
    while (current_scope) {
      var current_state = current_scope.state;
      var catch_handlers = current_state['$$SYMBOLS.scope_special.CATCH_HANDLER$$'];

      // If the emitEvent hits a scope that has not finished initializing yet, queue it up to retry once it is done.  It will retry from the originating scope.  Note that when this is hit for the originating scope, it will be considered initialized.
      if (!current_scope['$$SYMBOLS.scope_special.IS_INITIALIZED$$']) {
        if (!current_state._pending_emits) current_state._pending_emits = [];
        current_state._pending_emits.push(pending_emit_event);
        return;
      }

      var scope_data_symbol = current_state.__scope_data_symbol;
      if (scope_data_symbol) {
        var current_scope_data = current_state[scope_data_symbol];
        if (current_scope_data instanceof Coral.Unresolved) {
          current_scope_data = current_scope_data.value;
        }
        scope_data.push(current_scope_data);
      }
      if (catch_handlers && (catch_handlers[name] || catch_handlers['*'])) {
        catch_handler = current_state[(catch_handlers[name] || catch_handlers['*'])];
        break;
      }

      current_scope = current_state['$$SYMBOLS.scope_special.PARENT_SCOPE$$'];
    }

    if (catch_handler) {
      var args = [data, scope_data, event, override_origin_emit_event || _this.generateEmitEventHandler(), name];
      catch_handler.apply(null, args);
    }

    function pending_emit_event () {
      emitEventHandler(name, data, use_proto, override_origin_emit_event);
    }
  };
};

// TODO: We should probably have subtypes of this for the various optional field configurations
function ScopeSymbolMetadata () {
  this.is_scope_parameter = false;
  this.is_scope_input_output = false;
  this.is_scope_output = false;

  // TODO: It's messy that we only use this for zone entry scope parameters
  this.is_invariant = false;
  this.is_recording_value_necessary = false;
  this.is_registered_for_update_cycle = false;

  this.post_update_handlers = null;

  this.update_handler = null;
  this.update_handler_input_symbols = null;
  this.raw_update_handler_input_data = null;
  this.always_recompute_symbols = '';

  this.set_handler = null;
}

ScopeSymbolMetadata.prototype = {
  /**
   * @param {function} func The post-update handler
   * @param {*} metadata This value will the third arg to the post-update handler
   */
  add_post_update_handler: function (func, metadata) {
    if (!this.post_update_handlers) this.post_update_handlers = [];

    // TODO: Only need to do this for element as arg
    for (var i = 0; i < this.post_update_handlers.length; i++) {
      var c = this.post_update_handlers[i];
      if (c.func === func && c.metadata === metadata) return;
    }
    this.post_update_handlers.push({ func: func, metadata: metadata });
  },
  get_update_trigger_input_symbols: function () {
    return this.limited_recompute_symbols || this.update_handler_input_symbols;
  },
  assign_raw_update_handler_input_data: function (raw_data) {
    this.raw_update_handler_input_data = raw_data;
  },
  assign_limited_recompute_symbols: function (limited_recompute_symbols) {
    this.limited_recompute_symbols = limited_recompute_symbols;
  },
  assign_update_handler: function (func, symbols) {
    this.update_handler = func;
    this.update_handler_input_symbols = symbols;
  },
  // Update triggering symbols that happen to trigger an update even if the input recomputed to the same value.
  // - The symbols here should be part of the result of get_update_trigger_input_symbols and not unique symbols.
  assign_always_recompute_symbols: function (symbols) {
    this.always_recompute_symbols = symbols;
  },
  get_always_recompute_input_symbols: function () {
    return this.always_recompute_symbols;
  }
};

function InstanceSymbolMetadata (scope) {
  this.forward_to = null;
  this.last_recorded_value = undefined;
  this.scratch = null;
  this.state = null;
  this.scope = scope;
  this.observable = null;
  this.set_handler = null;
  this.set_handler_metadata = null;
}

InstanceSymbolMetadata.prototype = {
  is_item_index_parameter: function () {
    return this.is_scope_parameter &&
      this.set_handler_metadata &&
      this.set_handler_metadata.forward_to_scope;
  },
  assign_set_handler: function (func, metadata) {
    this.set_handler = func;
    this.set_handler_metadata = metadata;
  },
  run_set_handler: function (scope, value) {
    if (this.set_handler) {
      this.set_handler(scope, value, this.set_handler_metadata);
    }
  },
  add_forward_rule: function (scope, symbol, phantom_dep, intercept) {
    if (!this.forward_to) this.forward_to = [];
    var new_rule = new ForwardRule(scope, symbol, phantom_dep, intercept);
    this.forward_to.push(new_rule);
  },
  remove_forward_to_scopes: function (removed_scopes) {
    if (!this.forward_to) return;
    this.forward_to = this.forward_to.filter(function (rule) {
      return removed_scopes.indexOf(rule.scope) === -1;
    });
  },
  set_state: function (status) {
    var zone = this.scope['$$SYMBOLS.scope_special.ZONE$$'];
    var shifted_tick = zone.get_tick() << 3;
    this.state = shifted_tick | (status || 0);
  },
  get_status: function () {
    return this.state & 7;
  },
  get_tick: function () {
    return this.state >> 3;
  }
};

function ForwardRule (scope, symbol, phantom_dep, intercept) {
  this.scope = scope;
  this.symbol = symbol;
  this.phantom_dependency_symbol = phantom_dep || null;
  this.intercept = intercept || null;
}

module.exports = {
  scope: Scope,
  scope_symbol_metadata: ScopeSymbolMetadata,
  instance_symbol_metadata: InstanceSymbolMetadata,
  forward_rule: ForwardRule
};
