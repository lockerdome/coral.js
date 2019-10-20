"use strict";

/* global $$HELPERS, $$SYMBOLS, Coral */

/**
 * This file organizes all scope methods that are used directly in the
 * generated code by their associated computables.
 * They are called in async and sync functions.
 * They are guaranteed single-byte symbols.
 */

module.exports = function (register_scope_method) {

// ScopeDependency
// ===========================================================================

  register_scope_method(
    'load_dependency_when_ready',
    /**
     * @param {string} packed_args A string of symbols
     *   packed_args[0]     - to_symbol
     *   packed_args[1]     - An int representing dependency type
     *   packed_args[2...n] - Dependency url
     *   packed_args[n]     - Separator
     *   packed_args[n+1..] - The dependency's dependencies
     */
    function (packed_args) {
      var scope_context = this;
      var to_symbol = packed_args[0];
      var type = packed_args[1] === '0' ? 'css' : 'javascript';
      var halves = packed_args.slice(2).split("$$SYMBOLS.special.SEPARATOR$$");
      var url = halves[0].replace(/{{(\w+)}}/g, function (match, global_name) {
        return scope_context.coral_instance.settings.deps_template_variables[global_name];
      });

      var dependencies = halves[1].split('').map(function (symbol) { return scope_context.state[symbol]; });

      scope_context['$$SCOPE_METHODS.assign_internal_unresolved$$'](to_symbol, dependencies, function (resolve_callback) {
        $$HELPERS.load_dependency$$(url, url, type, scope_context.coral_instance, function() {
          resolve_callback(true);
        });
      });
      return scope_context;
    }
  );

// Constant, ConstantInitializedVariable
// ===========================================================================

  register_scope_method(
    'map_in_globals',
    /**
     * @param {string} packed_args A string representing an array of symbols
     *   packed_args[i % 2 === 0] The symbol where the value will be placed
     *   packed_args[i % 2 === 1] The global symbol where the value will be pulled from
     */
    function (packed_args) {
      this['$$SCOPE_METHODS.map_in_globals_raw$$'](packed_args, false);
      return this;
    }
  );

  register_scope_method(
    'map_in_mutable_globals',
    /**
     * @param {string} packed_args A string representing an array of symbols
     *   packed_args[i % 2 === 0] The symbol where the value will be placed
     *   packed_args[i % 2 === 1] The global symbol where the value will be pulled from
     */
    function (packed_args) {
      this['$$SCOPE_METHODS.map_in_globals_raw$$'](packed_args, true);
      return this;
    }
  );

// PureFunction
// ===========================================================================

  register_scope_method(
    'async_compute',
    /**
     * @param {function} pure_function
     * @param {string} packed_args
     *   packed_args[0]   = The symbol on scope context to assign the result to
     *   packed_args[1-N] = The inputs to the compute callback
     */
    function (pure_function, packed_args) {
      var callback = $$HELPERS.generate_compute_callback$$(pure_function);
      this['$$SCOPE_METHODS.register_for_update_cycle$$'](callback, packed_args);
      this['$$SCOPE_METHODS.base_async_compute$$'](callback, packed_args);
      return this;
    }
  );

  register_scope_method(
    'promise_async_compute',
    /**
     * @param {function} pure_function
     * @param {string} packed_args
     *   packed_args[0]   = The symbol on scope context to assign the result to
     *   packed_args[1-N] = The inputs to the compute callback
     */
    function (pure_function, packed_args) {
      var callback = $$HELPERS.generate_promise_compute_callback$$(pure_function);
      this['$$SCOPE_METHODS.register_for_update_cycle$$'](callback, packed_args);
      this['$$SCOPE_METHODS.base_async_compute$$'](callback, packed_args);
      return this;
    }
  );

  register_scope_method(
    'promise_async_compute_no_recompute',
    /**
     * @param {function} pure_function
     * @param {string} packed_args
     *   packed_args[0]   = The symbol on scope context to assign the result to
     *   packed_args[1-N] = The inputs to the compute callback
     */
    function (pure_function, packed_args) {
      var callback = $$HELPERS.generate_promise_compute_callback$$(pure_function);
      this['$$SCOPE_METHODS.register_for_update_cycle_non_recomputed$$'](packed_args[0]);
      this['$$SCOPE_METHODS.base_async_compute$$'](callback, packed_args);
      return this;
    }
  );

  register_scope_method(
    'async_compute_no_recompute',
    function (pure_function, packed_args) {
      var callback = $$HELPERS.generate_compute_callback$$(pure_function);
      this['$$SCOPE_METHODS.register_for_update_cycle_non_recomputed$$'](packed_args[0]);
      this['$$SCOPE_METHODS.base_async_compute$$'](callback, packed_args);
      return this;
    }
  );

  register_scope_method(
    'sync_compute',
    function (pure_function, packed_args) {
      var callback = $$HELPERS.generate_compute_callback$$(pure_function);
      this['$$SCOPE_METHODS.register_for_update_cycle$$'](callback, packed_args);
      this['$$SCOPE_METHODS.base_sync_compute$$'](pure_function, packed_args);
      return this;
    }
  );

  // And DOMInlineElement, DOMText
  register_scope_method(
    'sync_compute_no_recompute',
    function (pure_function, packed_args) {
      this['$$SCOPE_METHODS.register_for_update_cycle_non_recomputed$$'](packed_args[0]);
      this['$$SCOPE_METHODS.base_sync_compute$$'](pure_function, packed_args);
      return this;
    }
  );


// Callback
// ===========================================================================

  register_scope_method(
    'setup_callback',
    /**
     * @param {function} callback_handler
     * @param {string} packed_args
     *   packed_args[0] = The symbol on scope_context to assign the created closure for the callback to
     *   packed_args[1] = Symbols that represent the inputs to the callback handler.  Special symbols will be used in places where specific virtuals are required (like args or emitEvent).
     */
    function (callback_handler, packed_args) {
      var scope_context = this;
      var uses_args = packed_args.indexOf('$$SYMBOLS.special.ARGS_VIRTUAL$$') !== -1;

      var assign_to_symbol = packed_args[0];
      var invokable_callback = function () {
        var input_symbols = packed_args.slice(1);
        var args = uses_args ? Array.prototype.slice.call(arguments) : undefined;
        return scope_context['$$SCOPE_METHODS.dispatch_callback_handler$$'](callback_handler, input_symbols, args);
      };

      scope_context['$$SCOPE_METHODS.assign_internal$$'](assign_to_symbol, invokable_callback);

      return scope_context;
    }
  );

// CatchHandler MessageHandler AbstractChannelHandler
// ===========================================================================

  register_scope_method(
    'setup_channels',
    function (packed_args) {
      var packed_args_length = packed_args.length;
      var handler_name = packed_args[0];
      var handling = {};
      for (var i = 1; i < packed_args_length; i+=2) {
        handling[Coral.sponges[packed_args[i]]] = packed_args[i+1];
      }
      this.state[handler_name] = handling;
      return this;
    }
  );

// DOMElement
// ===========================================================================

  register_scope_method(
    'create_and_insert_element',
    /**
     * @param {string} packed_args
     *   packed_args[0] = Global symbol for DOM element type
     *   packed_args[1] = Symbol on scope context for placement to use
     *   packed_args[2] = Scope context symbol to place after output placement at
     *   packed_args[3] = Scope context symbol to place inner output placement at

     */
    function (packed_args) {
      var elem = document.createElement(Coral.sponges[packed_args[0]]);
      this['$$SCOPE_METHODS.generate_element_after_inner_output$$'](elem, packed_args.slice(1));
      return this;
    }
  );

  register_scope_method(
    'create_and_insert_element_with_attributes',
    /**
     * @param {string} packed_args
     *   packed_args[0]    = Global symbol for DOM element type
     *   packed_args[1]    = Symbol on scope context for placement to use
     *   packed_args[2]    = Scope context symbol to place after output placement at
     *   packed_args[3]    = Scope context symbol to place inner output placement at
     *   packed_args[4-N]
     *     Groups of symbols seperated by a special separator symbol.
     *
     *     Each group starts with a global attribute name symbol.
     *     Every symbol after that until the separator or end is concatted together to form the value to use.
     */
    function (packed_args) {
      var scope_context = this;
      var dom_element = document.createElement(Coral.sponges[packed_args[0]]);
      var attribute_symbol_groups = packed_args.slice(4).split('$$SYMBOLS.special.SEPARATOR$$');
      var assign_to_symbol = packed_args[2];

      for (var i = 0; i < attribute_symbol_groups.length; ++i) {
        var attribute_symbols = attribute_symbol_groups[i];
        var attribute_name = Coral.sponges[attribute_symbols[0]];

        var attribute_value = '';
        var attribute_input_value;
        var attribute_input_symbols = attribute_symbols.slice(1);
        var single_attribute_variable = attribute_input_symbols.length === 1;
        var j;
        var attribute_symbol;

        for (j = 0; j < attribute_input_symbols.length; ++j) {
          attribute_symbol = attribute_input_symbols[j];

          attribute_input_value = scope_context.state[attribute_symbol];
          var attribute_converted_input_value = $$HELPERS.convert_to_attribute_value$$(attribute_input_value);
          if (attribute_converted_input_value) {
            attribute_value += attribute_converted_input_value;
          }
        }

        for (j = 0; j < attribute_input_symbols.length; ++j) {
          attribute_symbol = attribute_input_symbols[j];
          var symbol_metadata = scope_context['$$SCOPE_METHODS.get_scope_symbol_metadata$$'](attribute_symbol);

          if (attribute_name === 'class') {
            symbol_metadata.add_post_update_handler(
              $$HELPERS.generate_dom_element_class_post_update_handler$$(attribute_value),
              assign_to_symbol+attribute_input_symbols
            );
          } else if (attribute_name === 'style') {
            symbol_metadata.add_post_update_handler(
              $$HELPERS.dom_element_style_post_update_handler$$,
              assign_to_symbol+attribute_input_symbols
            );
          } else if (single_attribute_variable) {
            // Wire up two-way binding, so when the tag value changes, we update the observable automatically.
            if (attribute_name === 'value' && ['INPUT', 'SELECT', 'TEXTAREA'].indexOf(dom_element.nodeName) !== -1) {
              var symbol_observable = this['$$SCOPE_METHODS.extract_handler_argument$$'](attribute_symbol);
              if (Coral.Observable.is(symbol_observable)) {
                var input_events;
                if (dom_element.nodeName === "INPUT" && dom_element.getAttribute("type") === "range") {
                  input_events = ['change', 'input'];
                } else {
                  input_events = ['change', 'keyup'];
                }

                Coral.Observable._bindElement(dom_element, symbol_observable, input_events);
              }
            }

            symbol_metadata.add_post_update_handler(
              $$HELPERS.dom_element_simple_attribute_input_post_update_handler$$,
              assign_to_symbol+attribute_symbols[0]
            );
          } else {
            // TODO: Ideally we'd register one post-update handler for all the symbols, that support isn't in the framework yet however.
            symbol_metadata.add_post_update_handler(
              $$HELPERS.dom_element_complex_attribute_input_post_update_handler$$,
              assign_to_symbol+attribute_symbols
            );
          }
        }

        if (attribute_name === "style") {
          dom_element.style.cssText = attribute_value;
        } else if (attribute_name === "class" || !single_attribute_variable || attribute_input_value != null) {
          dom_element.setAttribute(attribute_name, attribute_value);
        }
      }

      scope_context['$$SCOPE_METHODS.generate_element_after_inner_output$$'](dom_element, packed_args.slice(1,4));

      return scope_context;
    }
  );

// DOMVariable
// ===========================================================================

  register_scope_method(
    'create_and_insert_variable_text',
    /**
     * Creates and inserts a text node based on a symbol that contains some form of text.
     *
     * @param {string} packed_args
     *   packed_args[0] = Symbol where placement should be assigned to.
     *   packed_args[1] = Symbol for text value.
     *   packed_args[2] = Symbol for placement that we should insert text node after.
     */
    function (packed_args) {
      var assign_to_symbol = packed_args[0];
      var text_symbol = packed_args[1];
      var source_placement_symbol = packed_args[2];
      var symbol_metadata = this['$$SCOPE_METHODS.get_scope_symbol_metadata$$'](text_symbol);

      symbol_metadata.add_post_update_handler(
        $$HELPERS.escaped_dom_variable_post_update_handler$$,
        assign_to_symbol
      );

      var text_value = this.state[text_symbol];
      var source_placement = this.state[source_placement_symbol];

      this.state[assign_to_symbol] = $$HELPERS.create_and_insert_text$$(text_value, source_placement);

      return this;
    }
  );

// DOMUnescapedVariable
// ===========================================================================

  register_scope_method(
    'create_and_insert_unescaped_string',
    /**
     * @param {string} packed_args
     *   packed_args[0] = Symbol where placement should be assigned
     *   packed_args[1] = Symbol for the HTML string
     *   packed_args[2] = Symbol for the source placement
     */
    function (packed_args) {
      var assign_to_symbol = packed_args[0];
      var html_string_symbol = packed_args[1];
      var source_placement_symbol = packed_args[2];
      var symbol_metadata = this['$$SCOPE_METHODS.get_scope_symbol_metadata$$'](html_string_symbol);

      symbol_metadata.add_post_update_handler(
        $$HELPERS.unescaped_dom_variable_post_update_handler$$,
        source_placement_symbol+assign_to_symbol
      );
      var html_string_value = this.state[html_string_symbol];
      if (html_string_value === null || html_string_value === undefined) {
        html_string_value = '';
      }

      var source_placement_value = this.state[source_placement_symbol];
      var frag = $$HELPERS.create_unescaped_html_fragment$$(html_string_value);
      var after_injection_placement = $$HELPERS.create_empty_text_node$$();
      frag.appendChild(after_injection_placement);
      $$HELPERS.insert_after_placement$$(frag,source_placement_value);
      this.state[assign_to_symbol] = after_injection_placement;

      return this;
    }
  );

// ScopeInstance
// ===========================================================================

  register_scope_method(
    'sync_setup_scope',
    /**
     * Synchronously initializes a single scope.
     * @param {string} scope_symbol The scope object to run the sync initialize on
     */
    function (scope_symbol) {
      var scope = this.state[scope_symbol];
      var scope_scratch = scope.state['$$SYMBOLS.scope_special.SCRATCH$$'];

      if (scope_scratch && scope_scratch.post_update_handler) {
        var symbol_metadata = this['$$SCOPE_METHODS.get_scope_symbol_metadata$$'](scope_symbol);
        symbol_metadata.add_post_update_handler(scope_scratch.post_update_handler, scope_symbol);
      }

      scope['$$SYMBOLS.scope_special.SYNC_INIT$$']();
      return this;
    }
  );

  register_scope_method(
    'sync_setup_polymorphic_scope',
    /**
     * Sync initialize a polymorphic scope.
     * @param {string} packed_args
     *   packed_args[0] = scope symbol
     *   packed_args[1] = after output symbol for polymorphic scope computable
     */
    function (packed_args) {
      var scope_symbol = packed_args[0];
      var after_output_symbol = packed_args[1];

      this['$$SCOPE_METHODS.sync_setup_scope$$'](scope_symbol);

      var polymorphic_scope = this.state[scope_symbol];
      var internal_after_placement = polymorphic_scope.state[polymorphic_scope.state.end_placement_symbol];
      var safety_belt_text_node = $$HELPERS.create_empty_text_node$$();
      $$HELPERS.insert_after_placement$$(safety_belt_text_node, internal_after_placement);

      polymorphic_scope.state['$$SYMBOLS.scope_special.SCRATCH$$'].safety_belt_text_node = safety_belt_text_node;

      this.state[after_output_symbol] = safety_belt_text_node;
      return this;
    }
  );

  register_scope_method(
    'instantiate_scope',
    /**
     * @param {function} scope_async_pre_init_function
     * @param {string} packed_args
     *   packed_args[0] = Symbol where scope object should be assigned on scope_context
     *   packed_args[1] = Global symbol for sync init function
     *
     *   packed_args[2-N] = Symbols where each async input and output for the scope async init should be assigned
     *   packed_args[N+1] = Special separator symbol
     *   packed_args[N+1-M] = Symbols where each sync input and output for the scope sync init should be assigned
     */
    function (scope_async_pre_init_function, packed_args) {
      var scope_context = this;
      var scope_symbol = packed_args[0];
      var sync_init_symbol = packed_args[1];

      var scope = this['$$SCOPE_METHODS.create_scope$$'](scope_async_pre_init_function, Coral.sponges[sync_init_symbol]);

      var phase_symbol_groups = packed_args.split('$$SYMBOLS.special.SEPARATOR$$');

      var async_input_output_symbols = phase_symbol_groups[0].slice(2);
      scope['$$SCOPE_METHODS.add_border_passthroughs$$'](async_input_output_symbols, $$SYMBOLS.ranges.ASYNC_BORDER_RANGES$$);
      var sync_input_output_symbols = phase_symbol_groups[1];
      scope['$$SCOPE_METHODS.add_border_passthroughs$$'](sync_input_output_symbols, $$SYMBOLS.ranges.SYNC_BORDER_RANGES$$);

      scope_context['$$SCOPE_METHODS.add_symbols_forwarding_rules$$'](scope, async_input_output_symbols, $$SYMBOLS.ranges.ASYNC_BORDER_RANGES$$);
      scope_context['$$SCOPE_METHODS.add_symbols_forwarding_rules$$'](scope, sync_input_output_symbols, $$SYMBOLS.ranges.SYNC_BORDER_RANGES$$);

      scope['$$SYMBOLS.scope_special.ASYNC_PRE_INIT$$']();

      scope_context['$$SCOPE_METHODS.await_scope_async_init$$'](scope);

      scope_context['$$SCOPE_METHODS.assign_internal$$'](scope_symbol, scope);

      return scope_context;
    }
  );

// PolymorphicScopeInstance
// ===========================================================================

  register_scope_method(
    'conditional_instantiate_scope',
    /**
     * @param {function} truthy_scope_async_pre_init
     * @param {string} packed_args
     *     - Async and sync phase symbols are separated by a special separator symbol
     */
    function (truthy_scope_async_pre_init, packed_args) {
      var scope_context = this;

      function compute_scope (resolve_callback, determining_value) {
        var async_pre_init;
        var sync_init;
        var instantiation_args;
        var input_output_symbols;

        var truthy_scope_sync_init = Coral.sponges[truthy_sync_init_symbol];
        var falsy_scope_async_pre_init = Coral.sponges[option_symbol_groups[1][0]];
        var falsy_scope_sync_init = Coral.sponges[option_symbol_groups[1][1]];
        var truthy_option_symbol_group_symbols = option_symbol_groups[0].slice(3);
        var falsy_option_symbol_group_symbols = option_symbol_groups[1].slice(2);

        if (determining_value) {
          input_output_symbols = truthy_option_symbol_group_symbols;
          sync_init = truthy_scope_sync_init;
          async_pre_init = truthy_scope_async_pre_init;
        } else {
          input_output_symbols = falsy_option_symbol_group_symbols;
          sync_init = falsy_scope_sync_init;
          async_pre_init = falsy_scope_async_pre_init;
        }

        var scope = scope_context['$$SCOPE_METHODS.create_scope$$'](async_pre_init, sync_init);

        var phase_symbol_groups = input_output_symbols.split('$$SYMBOLS.special.SEPARATOR$$');

        var async_input_output_symbols = phase_symbol_groups[0];
        var sync_input_output_symbols = phase_symbol_groups[1];

        // TODO: Deduplicate this setup code
        scope.state['$$SYMBOLS.scope_special.SCRATCH$$'] = {
          is_polymorphic_scope: true,
          determining_value_boolean: !!determining_value,
          truthy_scope_async_pre_init: truthy_scope_async_pre_init,
          truthy_scope_sync_init: truthy_scope_sync_init,
          falsy_scope_async_pre_init: falsy_scope_async_pre_init,
          falsy_scope_sync_init: falsy_scope_sync_init
        };

        scope['$$SCOPE_METHODS.add_border_passthroughs$$'](async_input_output_symbols, $$SYMBOLS.ranges.ASYNC_BORDER_RANGES$$);
        scope['$$SCOPE_METHODS.add_border_passthroughs$$'](sync_input_output_symbols, $$SYMBOLS.ranges.SYNC_BORDER_RANGES$$);
        scope_context['$$SCOPE_METHODS.add_symbols_forwarding_rules$$'](scope, async_input_output_symbols, $$SYMBOLS.ranges.ASYNC_BORDER_RANGES$$, null, scope_symbol);
        scope_context['$$SCOPE_METHODS.add_symbols_forwarding_rules$$'](scope, sync_input_output_symbols, $$SYMBOLS.ranges.SYNC_BORDER_RANGES$$, null, scope_symbol);

        var wait_for_symbols = determining_value_symbol;
        var raw_argument_symbols = scope_symbol + determining_value_symbol + truthy_option_symbol_group_symbols + '$$SYMBOLS.special.SEPARATOR_2$$' + falsy_option_symbol_group_symbols;

        scope_context['$$SCOPE_METHODS.register_for_update_cycle_with_added_raw_input$$'](
          $$HELPERS.conditional_scope_update$$,
          scope_symbol + wait_for_symbols,
          raw_argument_symbols
        );

        scope.state['$$SYMBOLS.scope_special.SCRATCH$$'].post_update_handler = $$HELPERS.polymorphic_scope_post_update$$;

        scope['$$SYMBOLS.scope_special.ASYNC_PRE_INIT$$']();

        scope_context['$$SCOPE_METHODS.await_scope_async_init$$'](scope);

        resolve_callback(scope);
      }

      var scope_symbol = packed_args[0];
      var determining_value_symbol = packed_args[1];
      var truthy_sync_init_symbol = packed_args[2];

      var option_symbol_groups = packed_args.split('$$SYMBOLS.special.SEPARATOR_2$$');
      var determining_value = scope_context.state[determining_value_symbol];
      if (determining_value instanceof Coral.Unresolved) {
        scope_context['$$SCOPE_METHODS.assign_internal_unresolved$$'](scope_symbol, [determining_value], compute_scope);
      } else {
        compute_scope(function (scope) {
          scope_context['$$SCOPE_METHODS.assign_internal$$'](scope_symbol, scope);
        }, determining_value);
      }
      return scope_context;
    }
  );

  register_scope_method(
    'polymorphic_instantiate_scope',
    /**
     * @param {function} first_condition_async_pre_init
     * @param {string} packed_args
     *   packed_args[0] = Symbol to assign scope to.
     *   packed_args[1] = Determining value symbol
     *
     *   Per option:
     *   - 1 Case value symbol
     *   - 1 Async pre-init function symbol
     *       * Except for the first option, which will have this functio provided as the second argument to this helper.
     *   - 1 Sync init function symbol
     *   - N Parent input and output symbols
     *     * Async and sync phase symbols are separated by a special separator symbol
     *
     *   Options separated by a special separator symbol.
     */
    function (first_option_async_pre_init, packed_args) {
      var scope_context = this;

      function compute_scope (resolve_callback, determining_value) {
        var scratch_data_cases = {};
        var current_case = null;
        var i;

        for (i = 0; i !== option_symbol_groups.length; ++i) {
          var async_pre_init;
          var sync_init;
          var input_output_symbols;
          var case_symbol;

          var option_symbol_group = option_symbol_groups[i];
          case_symbol = option_symbol_group[i === 0 ? 2 : 0];
          var case_value = Coral.sponges[case_symbol];
          if (determining_value === case_value) {
            current_case = case_symbol;
          }

          if (i === 0) {
            async_pre_init = first_option_async_pre_init;
            sync_init = Coral.sponges[option_symbol_group[3]];
            input_output_symbols = option_symbol_group.slice(4);
          } else {
            async_pre_init = Coral.sponges[option_symbol_group[1]];
            sync_init = Coral.sponges[option_symbol_group[2]];
            input_output_symbols = option_symbol_group.slice(3);
          }

          scratch_data_cases[case_symbol] = {
            async_pre_init: async_pre_init,
            sync_init: sync_init,
            input_output_symbols: input_output_symbols
          };
        }

        var current_case_data = scratch_data_cases[current_case];
        var current_case_input_output_symbols = current_case_data.input_output_symbols;
        var current_case_async_pre_init = current_case_data.async_pre_init;
        var current_case_sync_init = current_case_data.sync_init;

        var scope = scope_context['$$SCOPE_METHODS.create_scope$$'](current_case_async_pre_init, current_case_sync_init);
        var phase_symbol_groups = current_case_input_output_symbols.split('$$SYMBOLS.special.SEPARATOR$$');

        // TODO: Look at reducing duplication with conditional instantiate scope
        var async_input_output_symbols = phase_symbol_groups[0];
        scope['$$SCOPE_METHODS.add_border_passthroughs$$'](async_input_output_symbols, $$SYMBOLS.ranges.ASYNC_BORDER_RANGES$$);
        var sync_input_output_symbols = phase_symbol_groups[1];
        scope['$$SCOPE_METHODS.add_border_passthroughs$$'](sync_input_output_symbols, $$SYMBOLS.ranges.SYNC_BORDER_RANGES$$);
        scope_context['$$SCOPE_METHODS.add_symbols_forwarding_rules$$'](scope, async_input_output_symbols, $$SYMBOLS.ranges.ASYNC_BORDER_RANGES$$, null, scope_symbol);
        scope_context['$$SCOPE_METHODS.add_symbols_forwarding_rules$$'](scope, sync_input_output_symbols, $$SYMBOLS.ranges.SYNC_BORDER_RANGES$$, null, scope_symbol);

        scope.state['$$SYMBOLS.scope_special.SCRATCH$$'] = {
          is_polymorphic_scope: true,
          current_case: current_case,
          cases: scratch_data_cases
        };

        scope.state['$$SYMBOLS.scope_special.SCRATCH$$'].post_update_handler = $$HELPERS.polymorphic_scope_post_update$$;

        scope['$$SYMBOLS.scope_special.ASYNC_PRE_INIT$$']();
        scope_context['$$SCOPE_METHODS.await_scope_async_init$$'](scope);

        resolve_callback(scope);
      }

      var scope_symbol = packed_args[0];
      var determining_value_symbol = packed_args[1];

      var option_symbol_groups = packed_args.split('$$SYMBOLS.special.SEPARATOR_2$$');

      var wait_for_symbols = determining_value_symbol;
      var raw_argument_symbols = scope_symbol+determining_value_symbol;

      scope_context['$$SCOPE_METHODS.register_for_update_cycle_with_added_raw_input$$'](
        $$HELPERS.polymorphic_scope_update$$,
        scope_symbol + wait_for_symbols,
        raw_argument_symbols
      );

      var determining_value = scope_context.state[determining_value_symbol];

      if (determining_value instanceof Coral.Unresolved) {
        scope_context['$$SCOPE_METHODS.assign_internal_unresolved$$'](scope_symbol, [determining_value], compute_scope);
      } else {
        compute_scope(function (scope) {
          scope_context['$$SCOPE_METHODS.assign_internal$$'](scope_symbol, scope);
        }, determining_value);
      }
      return scope_context;
    }
  );

// IterateArray
// ===========================================================================

  register_scope_method(
    'array_instantiate_scope',
    /**
     * @param {function} scope_async_pre_init_function
     * @param {string} packed_args
     *   packed_args[0] = Parent symbol where scope array will be placed.
     *   packed_args[1] = Sync init function symbol.
     *   packed_args[2] = Parent symbol where items array is located.
     *   packed_args[3] = Parent symbol where the initial intermediate value is located.
     *   packed_args[4] = Parent symbol where final intermediate value is forwarded to.
     *   packed_args[5] = Global symbol for the identity comparison function.
     *   packed_args[6-N] = Parent input and output symbols.
     *     - Async and sync phase symbols are separated by a special separator symbol
     */
    function (scope_async_pre_init_function, packed_args) {
      var scope_context = this;

      var scope_array_symbol = packed_args[0];
      var sync_init_symbol = packed_args[1];
      var items_array_symbol = packed_args[2];
      var initial_intermediate_symbol = packed_args[3];
      var final_intermediate_symbol = packed_args[4];
      var identity_comparison_function = Coral.sponges[packed_args[5]];
      var input_output_symbols = packed_args.slice(6);
      var input_output_symbol_groups = input_output_symbols.split('$$SYMBOLS.special.SEPARATOR$$');
      var async_inputs = input_output_symbol_groups[0];
      var sync_input_output_symbols = input_output_symbol_groups[1];
      var sync_init_function = Coral.sponges[sync_init_symbol];

      var wait_for_symbols = items_array_symbol;
      var raw_argument_data = {
        identity_comparison: identity_comparison_function,
        // TODO: Do we need this symbol data? It is available in the scratch.
        symbols: scope_array_symbol + items_array_symbol + initial_intermediate_symbol,
        case_data: {
          async_pre_init: scope_async_pre_init_function,
          sync_init: sync_init_function,
          async_input_symbols: async_inputs,
          sync_input_output_symbols: sync_input_output_symbols
        }
      };

      scope_context['$$SCOPE_METHODS.register_for_update_cycle_with_added_raw_input$$']($$HELPERS.array_scope_update$$, scope_array_symbol + wait_for_symbols, raw_argument_data);

      var items = scope_context.state[items_array_symbol];
      if (items instanceof Coral.Unresolved) {
        scope_context['$$SCOPE_METHODS.assign_internal_unresolved$$'](scope_array_symbol, [items], compute_scopes);
      } else {
        compute_scopes(function (scopes) {
          scope_context['$$SCOPE_METHODS.assign_internal$$'](scope_array_symbol, scopes);
        }, items);
      }
      return scope_context;

      function compute_scopes (resolve_callback, resolved_items) {
        var scopes = [];
        var i;
        var j;
        var scope;
        var identity_filtered_items = Coral.identity_deduplicate_array(resolved_items, identity_comparison_function);

        var last_scope;
        for (i = 0; i !== identity_filtered_items.length; ++i) {
          var item = identity_filtered_items[i];

          scope = scope_context['$$SCOPE_METHODS.create_array_scope$$'](
            items_array_symbol,
            resolved_items.indexOf(item),
            scope_async_pre_init_function,
            sync_init_function,
            async_inputs,
            sync_input_output_symbols,
            initial_intermediate_symbol,
            scope_array_symbol,
            last_scope
          );

          scope['$$SYMBOLS.scope_special.ASYNC_PRE_INIT$$']();
          scope_context['$$SCOPE_METHODS.await_scope_async_init$$'](scope);
          last_scope = scope;
          scopes.push(scope);
        }

        var scope_array_instance_update_metadata = scope_context['$$SYMBOLS.scope_special.INSTANCE_UPDATE_METADATA_BY_SYMBOL$$'][scope_array_symbol];
        scope_array_instance_update_metadata.scratch = {
          initial_intermediate_symbol: initial_intermediate_symbol,
          final_intermediate_symbol: final_intermediate_symbol,
          last_scope_array: scopes,
          last_items_array: identity_filtered_items.slice()
        };

        resolve_callback(scopes);
      }
    }
  );

  register_scope_method(
    'polymorphic_array_instantiate_scope',
    /**
     * @param {function} map_array_function
     * @param {string} packed_args
     *   packed_args[0] = Parent symbol where scope array will be placed.
     *   packed_args[1] = Parent symbol where items array is located.
     *   packed_args[2] = Parent symbol where the initial intermediate value is located.
     *   packed_args[3] = Parent symbol where final intermediate value is forwarded to.
     *   packed_args[4] = Identity function global symbol
     *   packed_args[5] = Map function global symbol
     *   packed_args[6-N] = Map function arguments
     *   packed_args[N+1] = Special separator symbol
     *   packed_args[N+2-M] = Symbols for each option separated by a special separator symbol.
     *
     *   Per option arguments:
     *   option_args[0]   = Global case symbol for when to use this option
     *   option_args[1]   = Async init function symbol.
     *   option_args[2]   = Sync init function symbol.
     *   option_args[3-N] = Parent input and output symbols.
     *     - Async and sync phase symbols are separated by a special separator symbol
     */
    function (map_array_function, packed_args) {
      var scope_context = this;

      var scope_array_symbol = packed_args[0];
      var items_symbol = packed_args[1];
      var initial_intermediate_symbol = packed_args[2];
      var final_intermediate_symbol = packed_args[3];
      var identity_comparison_function = Coral.sponges[packed_args[4]];

      var symbol_groups = packed_args.slice(6).split('$$SYMBOLS.special.SEPARATOR_2$$');

      var map_function = Coral.sponges[packed_args[5]];
      var map_function_symbols = symbol_groups[0];
      var map_function_item_parameter_index = map_function_symbols.indexOf('$$SYMBOLS.special.ITEM_VIRTUAL$$');

      var case_symbol_groups = symbol_groups.slice(1);
      var i;
      var option_data_by_case = {};
      var last_items_by_case = {};
      var last_indexes_by_case = {};

      for (i = 0; i !== case_symbol_groups.length; ++i) {
        var case_symbol_group = case_symbol_groups[i];
        var case_input_output_symbol_groups = case_symbol_group.slice(3).split('$$SYMBOLS.special.SEPARATOR$$');

        var intermediate_output_index = case_input_output_symbol_groups[1].length - 1;
        var case_value = Coral.sponges[case_symbol_group[0]];
        option_data_by_case[case_value] = {
          async_pre_init: Coral.sponges[case_symbol_group[1]],
          sync_init: Coral.sponges[case_symbol_group[2]],
          async_input_symbols: case_input_output_symbol_groups[0],
          sync_input_output_symbols: case_input_output_symbol_groups[1]
        };
        last_items_by_case[case_value] = [];
        last_indexes_by_case[case_value] = [];
      }

      // NOTE: We don't wait on map inputs to update, we just immediately execute it with the current values for the map inputs when the items array has updated.
      var wait_for_symbols = items_symbol;

      var raw_argument_data = {
        // We can skip all item nested checks on the scopes if none of them are using item nesteds.
        identity_comparison: identity_comparison_function,
        map_function_func: map_function,
        map_function_input_symbols: map_function_symbols,
        data_by_case: option_data_by_case,
        symbols: scope_array_symbol + items_symbol + initial_intermediate_symbol
      };
      scope_context['$$SCOPE_METHODS.register_for_update_cycle_with_added_raw_input$$']($$HELPERS.polymorphic_array_scope_update$$, scope_array_symbol + wait_for_symbols, raw_argument_data);

      var items = scope_context.state[items_symbol];
      var unresolved_count = items instanceof Coral.Unresolved ? 1 : 0;
      var dependencies = [items];
      for (i = 0; i !== map_function_symbols.length; ++i) {
        var map_function_value = scope_context.state[map_function_symbols[i]];
        if (map_function_value instanceof Coral.Unresolved) {
          unresolved_count++;
        }
        dependencies.push(map_function_value);
      }

      if (unresolved_count) {
        scope_context['$$SCOPE_METHODS.assign_internal_unresolved$$'](scope_array_symbol, dependencies, compute_scopes);
      } else {
        dependencies.unshift(function (scopes) {
          scope_context['$$SCOPE_METHODS.assign_internal$$'](scope_array_symbol, scopes);
        });
        compute_scopes.apply(null, dependencies);
      }

      return scope_context;

      function compute_scopes (resolve_callback, resolved_items) {
        var scopes = [];
        var map_arguments = Array.prototype.slice.call(arguments, 2);
        var i;
        var j;


        var identity_filtered_items = Coral.identity_deduplicate_array(resolved_items, identity_comparison_function);
        var last_scope;

        for (i = 0; i !== identity_filtered_items.length; ++i) {
          var item = identity_filtered_items[i];

          if (map_function_item_parameter_index !== -1) {
            map_arguments[map_function_item_parameter_index] = item;
          }
          var map_result = map_function.apply(null, map_arguments);
          var option_data = option_data_by_case[map_result];

          if (!option_data) {
            console.error("Dynamic element list got map result that it doesn't support", map_result);
          }
          last_items_by_case[map_result].push(item);
          last_indexes_by_case[map_result].push(i);

          var array_scope = scope_context['$$SCOPE_METHODS.create_array_scope$$'](
            items_symbol,
            resolved_items.indexOf(item),
            option_data.async_pre_init,
            option_data.sync_init,
            option_data.async_input_symbols,
            option_data.sync_input_output_symbols,
            initial_intermediate_symbol,
            scope_array_symbol,
            last_scope
          );
          last_scope = array_scope;
          scopes.push(array_scope);
        }

        for (i = 0; i !== scopes.length; ++i) {
          var scope = scopes[i];
          scope['$$SYMBOLS.scope_special.ASYNC_PRE_INIT$$']();
          scope_context['$$SCOPE_METHODS.await_scope_async_init$$'](scope);
        }

        var scope_array_instance_update_metadata = scope_context['$$SYMBOLS.scope_special.INSTANCE_UPDATE_METADATA_BY_SYMBOL$$'][scope_array_symbol];
        scope_array_instance_update_metadata.scratch = {
          initial_intermediate_symbol: initial_intermediate_symbol,
          final_intermediate_symbol: final_intermediate_symbol,
          last_scope_array: scopes,
          last_items_by_case: last_items_by_case,
          last_indexes_by_case: last_indexes_by_case
        };

        resolve_callback(scopes);
      }
    }
  );

  register_scope_method(
    'array_sync_scope_setup',
    /**
     * Synchronously initializes an array of scopes.
     *
     * @param {string} packed_args
     *   packed_args[0] = Parent symbol where scope array is located.
     *   packed_args[1] = Initial intermediate symbol
     *   packed_args[2] = Final intermediate symbol
     */
    function (packed_args) {
      var scope_array_symbol = packed_args[0];
      var scope_array = this.state[scope_array_symbol];
      var instance_symbol_metadata = this['$$SCOPE_METHODS.get_instance_symbol_metadata$$'](scope_array_symbol);
      var scope_symbol_metadata = this['$$SCOPE_METHODS.get_scope_symbol_metadata$$'](scope_array_symbol);

      var initial_intermediate_symbol = instance_symbol_metadata.scratch.initial_intermediate_symbol;
      var final_intermediate_symbol = instance_symbol_metadata.scratch.final_intermediate_symbol;

      scope_symbol_metadata.add_post_update_handler($$HELPERS.array_scope_post_update$$, instance_symbol_metadata.scratch);

      this.state[final_intermediate_symbol] = $$HELPERS.array_sync_scope_setup_raw$$(scope_array, this.state[initial_intermediate_symbol]);

      return this;
    }
  );

// NestedPassthrough
// ===========================================================================

  register_scope_method(
    'nested_compute',
    /**
     * @param {string} packed_args
     *   packed_arguments[0] = The symbol on scope context the result is being assigned to
     *   packed_arguments[1] = The symbol for the source computable
     *   packed_arguments[2] = The global symbol that represents the path to grab from the source computable
     */
    function (packed_args) {
      var scope_context = this;
      var assign_to_symbol = packed_args[0];
      var source_computable_symbol = packed_args[1];
      var field_path_symbol = packed_args[2];
      var field_path = Coral.sponges[field_path_symbol];

      var set_handler_metadata = { symbol: assign_to_symbol, source_computable_symbol: source_computable_symbol, field_path: field_path };
      scope_context['$$SCOPE_METHODS.register_for_update_cycle_with_set_handler$$']($$HELPERS.async_compute_nested_path$$, assign_to_symbol+source_computable_symbol+field_path_symbol, $$HELPERS.nested_set_handler$$, set_handler_metadata);
      var scope_symbol_metadata = scope_context['$$SCOPE_METHODS.get_scope_symbol_metadata$$'](assign_to_symbol);
      scope_symbol_metadata.assign_always_recompute_symbols(source_computable_symbol);

      var source = scope_context.state[source_computable_symbol];
      if (source instanceof Coral.Unresolved) {
        scope_context['$$SCOPE_METHODS.assign_internal_unresolved$$'](assign_to_symbol, [source, field_path], $$HELPERS.async_compute_nested_path$$);
      } else {
        scope_context['$$SCOPE_METHODS.assign_internal$$'](assign_to_symbol, $$HELPERS.get_at_path$$(source, field_path));
      }
      return scope_context;
    }
  );

  register_scope_method(
    'dynamic_nested_compute',
    /**
     * @param {string} packed_args
     *   packed_arguments[0] = The symbol on scope context the result is being assigned to
     *   packed_arguments[1] = The symbol for the source computable
     *   packed_arguments[2] = The symbol for the dynamic path computable
     */
    function (packed_args) {
      var scope_context = this;
      var assign_to_symbol = packed_args[0];
      var source_computable_symbol = packed_args[1];
      var dynamic_field_symbol = packed_args[2];

      var set_handler_metadata = { symbol: assign_to_symbol, source_computable_symbol: source_computable_symbol, dynamic_field_symbol: dynamic_field_symbol };
      scope_context['$$SCOPE_METHODS.register_for_update_cycle_with_set_handler$$']($$HELPERS.async_compute_dynamic_nested_field$$, assign_to_symbol+source_computable_symbol+dynamic_field_symbol, $$HELPERS.dynamic_nested_set_handler$$, set_handler_metadata);
      var scope_symbol_metadata = scope_context['$$SCOPE_METHODS.get_scope_symbol_metadata$$'](assign_to_symbol);
      scope_symbol_metadata.assign_always_recompute_symbols(source_computable_symbol);

      var source = scope_context.state[source_computable_symbol];
      var dynamic_field = scope_context.state[dynamic_field_symbol];
      if (source instanceof Coral.Unresolved || dynamic_field instanceof Coral.Unresolved) {
        scope_context['$$SCOPE_METHODS.assign_internal_unresolved$$'](assign_to_symbol, [source, dynamic_field], $$HELPERS.async_compute_dynamic_nested_field$$);
      } else {
        scope_context['$$SCOPE_METHODS.assign_internal$$'](assign_to_symbol, $$HELPERS.get_at_path$$(source, [dynamic_field]));
      }
      return scope_context;
    }
  );


// InsertInitializedElement
// ===========================================================================

  // TODO: It appears we have some weirdness when using an element as has already been used as element as arg.
  register_scope_method(
    'initialize_element_as_arg',
    function (packed_args) {
      var output_placement_symbol = packed_args[0];
      var element_representation_symbol = packed_args[1];
      var element_representation = this.state[element_representation_symbol];
      var begin_placement_symbol = packed_args[2];

      // Assume that usages of this parameter won't mix element and non-element types, if they pass an element or non-element, it will continue to get an element or non-element value on update.
      if (!Array.isArray(element_representation) && !(element_representation !== null && typeof element_representation === 'object' && typeof element_representation['$$SYMBOLS.scope_special.SYNC_INIT$$'] === 'function')) {
        return this['$$SCOPE_METHODS.create_and_insert_unescaped_string$$'](output_placement_symbol + element_representation_symbol + begin_placement_symbol);
      }

      // TODO: No closures
      var before_func = function (updated_element_representation, scope, symbols) {
        var begin_placement_symbol = symbols[0];
        var end_placement_symbol = symbols[1];

        if (Array.isArray(updated_element_representation)) {
          if (updated_element_representation.length) {
            var first_scope = updated_element_representation[0];
            var first_scope_scratch_data = first_scope.state['$$SYMBOLS.scope_special.SCRATCH$$'];
            var first_scope_is_new = first_scope_scratch_data.previous_intermediate_output_symbol === '$$SYMBOLS.special.PLACEMENT_VIRTUAL$$';
            if (first_scope_is_new) {
              first_scope_scratch_data.previous_scope = scope;
              first_scope_scratch_data.previous_intermediate_output_symbol = begin_placement_symbol;
            }
          }
        } else {
          updated_element_representation['$$SCOPE_METHODS.proxy_element_as_arg_scope_symbol$$'](updated_element_representation.state.begin_placement_symbol, scope, begin_placement_symbol);
        }
      };

      var after_func = function (updated_element_representation, scope, symbols) {
        var begin_placement_symbol = symbols[0];
        var output_placement_symbol = symbols[1];
        var output_placement;

        if (Array.isArray(updated_element_representation)) {
          if (updated_element_representation.length) {
            var last_scope = updated_element_representation[updated_element_representation.length - 1];
            var last_scope_scratch_data = last_scope.state['$$SYMBOLS.scope_special.SCRATCH$$'];
            output_placement = last_scope.state[last_scope_scratch_data.sync_intermediate_output_symbol];
          } else {
            output_placement = scope.state[begin_placement_symbol];
          }
        } else {
          output_placement = updated_element_representation.state[updated_element_representation.state.end_placement_symbol];
        }

        scope.state[output_placement_symbol] = output_placement;
      };

      // A string that will be passed to the post-update handler after the updated value.
      var metadata = begin_placement_symbol + output_placement_symbol;
      var scope_symbol_metadata = this['$$SCOPE_METHODS.get_scope_symbol_metadata$$'](element_representation_symbol);
      scope_symbol_metadata.add_post_update_handler(before_func, metadata);

      if (Array.isArray(element_representation)) {
        var traverse_callback = function (scope, symbol, scope_symbol_metadata, instance_symbol_metadata) {
          return instance_symbol_metadata.scratch;
        };
        var scope_array_scratch_data = this['$$SCOPE_METHODS.traverse_symbol_ancestors$$'](element_representation_symbol, null, traverse_callback);

        scope_array_scratch_data.initial_intermediate_symbol = begin_placement_symbol;
        scope_array_scratch_data.final_intermediate_symbol = output_placement_symbol;
        scope_array_scratch_data.last_scope_array = element_representation;

        scope_symbol_metadata.add_post_update_handler($$HELPERS.array_scope_post_update$$, scope_array_scratch_data);
      } else {
        var post_update_func = element_representation.state['$$SYMBOLS.scope_special.SCRATCH$$'] && element_representation.state['$$SYMBOLS.scope_special.SCRATCH$$'].post_update_handler;
        if (post_update_func) {
          scope_symbol_metadata.add_post_update_handler(post_update_func, element_representation_symbol+metadata);
        }
      }

      scope_symbol_metadata.add_post_update_handler(after_func, metadata);

      var begin_placement = this.state[begin_placement_symbol];

      if (Array.isArray(element_representation)) {
        if (element_representation.length) {
          var first_scope = element_representation[0];

          // TODO: helper for not exposing these low level details.
          var first_scope_scratch_data = first_scope.state['$$SYMBOLS.scope_special.SCRATCH$$'];
          first_scope_scratch_data.previous_scope = this;
          first_scope_scratch_data.previous_intermediate_output_symbol = begin_placement_symbol;
        }

        this.state[output_placement_symbol] = $$HELPERS.array_sync_scope_setup_raw$$(element_representation, begin_placement);
      } else {
        element_representation['$$SCOPE_METHODS.proxy_element_as_arg_scope_symbol$$'](element_representation.state.begin_placement_symbol, this, begin_placement_symbol);
        element_representation['$$SYMBOLS.scope_special.SYNC_INIT$$']();
        var output_placement = element_representation.state[element_representation.state.end_placement_symbol];

        if (element_representation.state['$$SYMBOLS.scope_special.SCRATCH$$'] && element_representation.state['$$SYMBOLS.scope_special.SCRATCH$$'].is_polymorphic_scope) {
          var safety_belt_text_node = $$HELPERS.create_empty_text_node$$();
          $$HELPERS.insert_after_placement$$(safety_belt_text_node, output_placement);
          output_placement = safety_belt_text_node;
          element_representation.state['$$SYMBOLS.scope_special.SCRATCH$$'].safety_belt_text_node = safety_belt_text_node;
        }

        this.state[output_placement_symbol] = output_placement;
      }

      return this;
    }
  );

// CompilationContext
// ===========================================================================

  register_scope_method(
    'load_async_pre_init_compute_function',
    /**
     * Loads the async pre-initialize compute function using our dependency loading capabilities
     *
     * @param {string} shard_name
     * @param {string} packed_args
     *   packed_args[0] = The async pre-init compute body function symbol, which contains the async computations needed for the shard root.
     *   packed_args[1] = The sync initialize function symbol
     * @param {Array.<string>} implied_deps
     */
    function (shard_name, packed_args, implied_deps) {
      var scope_context = this;
      var compute_func_symbol = packed_args[0];
      var sync_init_func_symbol = packed_args[1];

      var async_init_unresolved = scope_context["$$SYMBOLS.scope_special.ASYNC_INIT_RESOLVED$$"];
      var load_shard_unresolved;

      if (async_init_unresolved instanceof Coral.Unresolved) {
        load_shard_unresolved = new Coral.Unresolved(1, [], function (resolve_callback) { resolve_callback(); }, function () {});
        async_init_unresolved.unresolved_count++;
        async_init_unresolved.dependencies.push(load_shard_unresolved);
        load_shard_unresolved.add_dependee(async_init_unresolved);
      } else {
        load_shard_unresolved = new Coral.Unresolved(1, [], function (resolve_callback) {
          resolve_callback();
        }, function () {
          scope_context['$$SYMBOLS.scope_special.ASYNC_INIT_RESOLVED$$'] = null;
          scope_context['$$SYMBOLS.scope_special.IS_ASYNC_INIT_RESOLVED$$'] = true;
        });
        scope_context["$$SYMBOLS.scope_special.ASYNC_INIT_RESOLVED$$"] = load_shard_unresolved;
      }

      function shard_name_to_url (name) {
        var base_url = scope_context.coral_instance.settings.shards.shard_base_url;
        if (!/\/$/.test(base_url)) {
          base_url += '/';
        }

        var shard_file_template = scope_context.coral_instance.settings.shards.shard_file_template || '{{shard_name}}.js';
        return base_url + shard_file_template.replace(/{{(\w+)}}/g, function (match, template_variable) {
          if (template_variable === 'shard_name') {
            return name;
          }
          return scope_context.coral_instance.settings.shards.shard_template_variables[template_variable];
        });
      }
      function template (string) {
      }
      if (implied_deps) {
        implied_deps = implied_deps.map(shard_name_to_url);
      }
      var script_url = shard_name_to_url(shard_name);
      $$HELPERS.load_dependency$$(script_url, script_url, 'shard_javascript', scope_context.coral_instance, function () {
        if (scope_context['$$SYMBOLS.scope_special.IS_ZONE_ENTRY_POINT$$']) {
          scope_context.state._sync_init = Coral.sponges[sync_init_func_symbol];
        } else {
          scope_context["$$SYMBOLS.scope_special.SYNC_INIT$$"] = Coral.sponges[sync_init_func_symbol];
        }

        // TODO: Consider assigning sync init function in the async pre-init function.
        Coral.sponges[compute_func_symbol].call(scope_context);

        load_shard_unresolved.dependency_resolved();
      }, implied_deps);

      return scope_context;
    }
  );

// ScopeCompilationContext
// ===========================================================================

  register_scope_method(
    'inherit_zone',
    function () {
      if (!this['$$SYMBOLS.scope_special.IS_ZONE_ENTRY_POINT$$']) {
        this['$$SYMBOLS.scope_special.ZONE$$'] = this.state['$$SYMBOLS.scope_special.PARENT_SCOPE$$']['$$SYMBOLS.scope_special.ZONE$$'];
      }
      return this;
    }
  );

  register_scope_method(
    'register_element_begin_end_placements',
    function (internal_begin_and_end_placement_symbols) {
      var has_already_been_called = this.state.begin_placement_symbol;
      if (has_already_been_called) return this;
      this.state.begin_placement_symbol = internal_begin_and_end_placement_symbols[0];
      this.state.end_placement_symbol = internal_begin_and_end_placement_symbols[1];
      return this;
    }
  );

  register_scope_method(
    'register_cleanup_instructions',
    function (instructions) {
      this.state['$$SYMBOLS.scope_special.CLEANUP_INSTRUCTIONS$$'] = instructions;
      return this;
    }
  );

  register_scope_method(
    'finalize_scope',
    function () {
      this['$$SYMBOLS.scope_special.IS_INITIALIZED$$'] = true;
      var pending_emits = this.state._pending_emits;
      if (pending_emits) {
        for (var i = 0; i !== pending_emits.length; ++i) {
          pending_emits[i]();
        }
      }

      var init_pending_updates = this.state._init_pending_updates;
      if (init_pending_updates) {
        this['$$SYMBOLS.scope_special.ZONE$$'].add_updates(init_pending_updates);
        this.state._init_pending_updates = undefined;
      }
      return this;
    }
  );

  register_scope_method(
    'async_transfer_values',
    /**
     * @param {string} packed_args A string representing an array of symbols
     *   packed_args[i % 2 === 0] - The symbol where the value will be placed
     *   packed_args[i % 2 === 1] - The symbol where the value will be pulled from
     */
    function (packed_args) {
      // NOTE: Both symbols may already have proxies defined on them, so we do a transfer here.
      for (var i = 1; i < packed_args.length; i += 2) {
        var to_symbol = packed_args[i - 1];
        var from_symbol = packed_args[i];
        var from_value = this.state[from_symbol];

        // TODO: Have compound nested outputs assign directly to output symbols.
        var scope_symbol_metadata = this['$$SCOPE_METHODS.get_scope_symbol_metadata$$'](from_symbol);
        scope_symbol_metadata.add_post_update_handler($$HELPERS.transfer_values_post_update_handler$$, to_symbol);

        if (from_value instanceof Coral.Unresolved) {
          this['$$SCOPE_METHODS.assign_internal_unresolved$$'](to_symbol, [from_value], $$HELPERS.immediately_resolving_compute_callback$$);
        } else {
          this['$$SCOPE_METHODS.assign_internal$$'](to_symbol, from_value);
        }
      }
      return this;
    }
  );

  register_scope_method(
    'register_event_handling',
    function (event_instruction_symbols) {
      /**
       * string -> { dispatch_to_children_symbols: string, own_event_handler_symbols: Array.<string> }
       */
      var scope_context = this;
      var event_instructions = {};
      var event_instruction_sections = event_instruction_symbols.split('$$SYMBOLS.special.SEPARATOR_2$$');
      var i;
      var event_type_group;
      var event_type_symbol;
      var event_type;
      var dispatch_to_children_instructions = event_instruction_sections[0];
      if (dispatch_to_children_instructions.length) {
        var dispatch_to_children_event_type_groups = dispatch_to_children_instructions.split('$$SYMBOLS.special.SEPARATOR_3$$');
        for (i = 0; i !== dispatch_to_children_event_type_groups.length; ++i) {
          event_type_group = dispatch_to_children_event_type_groups[i];
          event_type_symbol = event_type_group[0];
          event_type = Coral.sponges[event_type_symbol];

          event_instructions[event_type] = {
            own_event_handler_symbol_groups: [],
            dispatch_to_children_symbols: event_type_group.slice(1)
          };
        }
      }

      var own_event_handler_instructions = event_instruction_sections[1];
      if (own_event_handler_instructions.length) {
        var event_type_groups = own_event_handler_instructions.split('$$SYMBOLS.special.SEPARATOR_3$$');

        for (i = 0; i !== event_type_groups.length; ++i) {
          event_type_group = event_type_groups[i];
          event_type_symbol = event_type_group[0];
          event_type = Coral.sponges[event_type_symbol];

          var own_event_handler_symbol_groups = event_type_group.slice(1).split('$$SYMBOLS.special.SEPARATOR$$');

          var event_type_instructions = event_instructions[event_type];
          if (event_type_instructions) {
            event_type_instructions.own_event_handler_symbol_groups = own_event_handler_symbol_groups;
          } else {
            event_instructions[event_type] = {
              own_event_handler_symbol_groups: own_event_handler_symbol_groups,
              dispatch_to_children_symbols: []
            };
          }
        }
      }

      scope_context.state['$$SYMBOLS.scope_special.EVENT_INSTRUCTIONS$$'] = event_instructions;

      // TODO: Move the below code out into its own thing that the scope compilation context decides whether to include or not.
      // TODO: Save off event_type_dispatching_function for cleanup later (removeEventListener)
      var is_root_scope = !scope_context.state['$$SYMBOLS.scope_special.PARENT_SCOPE$$'];
      var is_overlay = scope_context.state.overlay;
      var source = scope_context.coral_instance.settings.root_container_node;

      if (is_root_scope || is_overlay) {
        for (var event_instruction_type in event_instructions) {
          /*jshint loopfunc:true*/
          var event_wiring = event_instructions[event_instruction_type];
          var dispatch_to_children_symbols = event_wiring.dispatch_to_children_symbols;
          var own_event_handler_symbols = event_wiring.own_event_handler_symbol_groups;

          if (event_instruction_type === 'keydown') {
            source.addEventListener('keydown', (function () {
              var event_type_dispatching_function = scope_context['$$SCOPE_METHODS.generate_global_event_type_dispatcher$$'](dispatch_to_children_symbols, own_event_handler_symbols, event_instruction_type);
              var key_validation = window.Coral.helpers.key_validation;

              return function (e) {
                var key = e.key;
                var event_target = e.target;
                if ((event_target.isContentEditable || event_target.tagName === 'TEXTAREA') && !key_validation.validate_content_editable_key(key)) return;
                else if (event_target.tagName === 'INPUT' && !key_validation.validate_line_input_key(key)) return;
                else if (!key_validation.validate_general_key(key)) return;

                event_type_dispatching_function(e);
                window.Coral.helpers.key_shortcut_manager.execute_matches();
              };
            })());
          } else {
            // Certain events don't bubble, so we capture instead.
            // * We want to use bubbling when possible because of the possibility of third party javascript on the page that might call event.preventDefault or event.stopPropagation.  We don't want to bypass the third party javascript's handling of events.
            var use_capture = /focus|blur/.test(event_instruction_type);
            var event_type_dispatching_function = scope_context['$$SCOPE_METHODS.generate_global_event_type_dispatcher$$'](dispatch_to_children_symbols, own_event_handler_symbols, event_instruction_type);
            source.addEventListener(event_instruction_type, event_type_dispatching_function, use_capture);
          }
        }
      }
      return scope_context;
    }
  );

  register_scope_method(
    'register_output_symbols',
    function (output_symbols) {
     for (var i = 0; i < output_symbols.length; ++i) {
        this['$$SCOPE_METHODS.get_scope_symbol_metadata$$'](output_symbols[i]).is_scope_output = true;
      }
      return this;
    }
  );

  register_scope_method(
    'initialize_zone',
    /**
     * A helper function to set up zone special behavior that should be called in the async pre-initialize function at the very end.
     *
     * This function assumes _begin_placement_symbol and _end_placement_symbol have been defined on the scope.
     *
     * @param {string} preload
     * @param {string} packed_args
     *   packed_args[0-N] = Flags for the different async and sync parameters for the zone, delimited by a separator character.
     *     - SYMBOLS.special.FLAG - The parameter changing causes re-initialization of the zone
     *     - SYMBOLS.special.IGNORE - The parameter changing does not cause re-initialization of the zone
     */
    function (preload, packed_args) {
      var scope_context = this;
      // Store off the original sync init and replace with a special helper.
      var existing_zone = scope_context['$$SYMBOLS.scope_special.ZONE$$'];
      var is_reinitializing = !!existing_zone;
      var zone;

      if (is_reinitializing) {
        zone = existing_zone;
      } else {
        scope_context.state._preload = preload;

        var sync_start_index = -1;
        for (var i = 0; i < packed_args.length; ++i) {
          var parameter_flag = packed_args[i];
          if (parameter_flag === '$$SYMBOLS.special.SEPARATOR$$') {
            sync_start_index = i + 1;
          } else {
            var is_variant = parameter_flag === '$$SYMBOLS.special.IGNORE$$';
            if (is_variant) {
              continue;
            }

            var character_range;
            var character_range_index;
            if (sync_start_index === -1) {
              character_range = $$SYMBOLS.ranges.ASYNC_BORDER_RANGES$$;
              character_range_index = i;
            } else {
              character_range = $$SYMBOLS.ranges.SYNC_BORDER_RANGES$$;
              character_range_index = i - sync_start_index;
            }

            var parameter_character = $$HELPERS.get_character_in_range$$(character_range, character_range_index);
            var symbol_metadata = scope_context['$$SCOPE_METHODS.get_scope_symbol_metadata$$'](parameter_character);
            symbol_metadata.is_invariant = true;
          }
        }

        zone = new Coral.Zone(scope_context);
        scope_context['$$SYMBOLS.scope_special.ZONE$$'] = zone;
        scope_context['$$SYMBOLS.scope_special.IS_ZONE_ENTRY_POINT$$'] = true;
        scope_context.state._sync_init = scope_context['$$SYMBOLS.scope_special.SYNC_INIT$$'];
        scope_context['$$SYMBOLS.scope_special.SYNC_INIT$$'] = $$HELPERS.zone_intercepted_sync_initialize$$;
      }

      var parent_scope = scope_context.state['$$SYMBOLS.scope_special.PARENT_SCOPE$$'];
      var is_root_zone = !parent_scope;
      // We want the zone to abide by the schedule of the scope controlling it, since child zones are not waited on to fully async initialize before the containing zone is async initialized, it will properly display a preload if it has not finished async initializing before the zone containing it is async initialized and wants its child zones to sync initialize.
      // * It will then on its own sync initialize itself when it has finished async initializing, removing the preload before it sync initializes itself.
      if (!is_root_zone) {
        return scope_context;
      }

      var parent_scope_zone = parent_scope && parent_scope['$$SYMBOLS.scope_special.ZONE$$'];

      var async_init_unresolved = scope_context['$$SYMBOLS.scope_special.ASYNC_INIT_RESOLVED$$'];
      var is_zone_entry_point_async_resolved = scope_context['$$SYMBOLS.scope_special.IS_ASYNC_INIT_RESOLVED$$'];
      var is_ancestor_zone_ready = !parent_scope_zone || !parent_scope_zone.is_initializing();

      var is_parent_scope_async_initialized = !parent_scope || parent_scope['$$SYMBOLS.scope_special.IS_ASYNC_INIT_RESOLVED$$'] === true;

      if (is_zone_entry_point_async_resolved && is_ancestor_zone_ready) {
        // Skip preload, there is nothing we need to wait on to display ourselves immediately.
        scope_context.state._sync_init.bind(scope_context)();
        zone.enter_ready_state();
      } else if (is_parent_scope_async_initialized && is_ancestor_zone_ready && !is_zone_entry_point_async_resolved) {

        if (preload) {
          var preload_fragment = $$HELPERS.create_unescaped_html_fragment$$(preload);
          var preload_end_marker = $$HELPERS.create_empty_text_node$$();
          preload_fragment.appendChild(preload_end_marker);
          $$HELPERS.insert_after_placement$$(preload_fragment, scope_context.state[scope_context.state.begin_placement_symbol]);
          scope_context.state[scope_context.state.end_placement_symbol] = preload_end_marker;
        }

        var wait_till_resolved = new Coral.Unresolved(1,[async_init_unresolved],function(r){r();},function () {
          var begin_placement = scope_context.state[scope_context.state.begin_placement_symbol];
          var end_placement = scope_context.state[scope_context.state.end_placement_symbol];

          // If the begin placement is no longer inserted, an ancestor zone has likely re-initialized itself, so we no longer want to attempt to render.  The ancestor zone will create a new zone if needed, so we do not need to do anything further here.
          if (begin_placement && !begin_placement.parentNode) {
            return;
          }

          if (begin_placement && end_placement) {
            $$HELPERS.delete_between_placements$$(begin_placement, end_placement, true);
          }

          scope_context.state._sync_init.bind(scope_context)();
          zone.enter_ready_state();
        });

        async_init_unresolved.add_dependee(wait_till_resolved);
      }
      return scope_context;
    }
  );

  register_scope_method(
    'mark_scope_data',
    function (scope_data_symbol) {
      this.state.__scope_data_symbol = scope_data_symbol;
      return this;
    }
  );

  register_scope_method(
    'populate_placeholder_unresolveds',
    function (async_internal_count, async_output_count, async_input_count, sync_input_count) {
      var scope_context = this;
      var u = [];
      var i;

      var async_output_index_offset = async_input_count;
      var symbol;
      var placeholder_unresolved;

      var parent_scope = scope_context.state['$$SYMBOLS.scope_special.PARENT_SCOPE$$'];

      // Only run the sync symbol check if this is during an update cycle and this scope was created by something created in a previous update cycle or during initialization.  This is so we can make sure certain special parameter wirings can be safely accessed without risk of blowing up anything and to reduce the need to check a bunch of symbols unnecessarily.
      var created_by_previously_created_scope_during_update_cycle = parent_scope && parent_scope['$$SYMBOLS.scope_special.IS_ASYNC_INIT_RESOLVED$$'] === true;
      if (created_by_previously_created_scope_during_update_cycle) {
        for (i = 0; i !== sync_input_count; ++i) {
          symbol = $$HELPERS.get_character_in_range$$($$SYMBOLS.ranges.SYNC_BORDER_RANGES$$, i);

          var sync_input_possible_unresolved = scope_context.state[symbol];

          if (sync_input_possible_unresolved instanceof Coral.Unresolved) {
            u.push(sync_input_possible_unresolved);
          }
        }

        scope_context['$$SYMBOLS.scope_special.IS_ASYNC_INIT_RESOLVED$$'] = false;
        scope_context['$$SYMBOLS.scope_special.IS_INITIALIZED$$'] = false;
      }

      for (i = 0; i !== async_internal_count; ++i) {
        symbol = $$HELPERS.get_character_in_range$$($$SYMBOLS.ranges.ASYNC_DYNAMIC_INTERNAL_RANGES$$, i);
        placeholder_unresolved = scope_context['$$SCOPE_METHODS.create_placeholder_unresolved$$'](symbol);
        if (placeholder_unresolved instanceof Coral.Unresolved) {
          u.push(placeholder_unresolved);
        }
      }

      for (i = 0; i !== async_input_count; ++i) {
        symbol = $$HELPERS.get_character_in_range$$($$SYMBOLS.ranges.ASYNC_BORDER_RANGES$$, i);
        var current_symbol_value = scope_context.state[symbol];
        if (current_symbol_value instanceof Coral.Unresolved) {
          u.push(current_symbol_value);
        }
      }

      // TODO: This is entirely covered by listening on internal async symbols.  This makes no real sense and likely only coincidentally didn't do something bad before I start exporting async symbols directly.
      for (i = 0; i !== async_output_count; ++i) {
        symbol = $$HELPERS.get_character_in_range$$($$SYMBOLS.ranges.ASYNC_BORDER_RANGES$$, async_output_index_offset + i);
        placeholder_unresolved = scope_context['$$SCOPE_METHODS.create_placeholder_unresolved$$'](symbol);
        if (placeholder_unresolved instanceof Coral.Unresolved) {
          u.push(placeholder_unresolved);
        }
      }

      if (u.length) {
        var async_init_status_unresolved = new Coral.Unresolved(u.length,u,$$HELPERS.immediately_resolving_compute_callback$$,function(){scope_context['$$SYMBOLS.scope_special.ASYNC_INIT_RESOLVED$$']=null;scope_context['$$SYMBOLS.scope_special.IS_ASYNC_INIT_RESOLVED$$']=true;});

        for (i = 0; i !== u.length; ++i) {
          u[i].add_dependee(async_init_status_unresolved);
        }

        scope_context['$$SYMBOLS.scope_special.ASYNC_INIT_RESOLVED$$'] = async_init_status_unresolved;
      } else {
        scope_context['$$SYMBOLS.scope_special.IS_ASYNC_INIT_RESOLVED$$'] = true;
      }
      return scope_context;
    }
  );
};
