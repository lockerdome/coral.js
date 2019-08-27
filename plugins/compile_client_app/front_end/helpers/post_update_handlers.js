"use strict";

/* global document,$$HELPERS, Coral */

// TODO: We need some way to only execute a post-update handler once if any of a given set of symbols change.

module.exports = function (register_global_helper) {
  register_global_helper(
    'rewire_previous_scope_metadata',
    function (start_index, end_index, scope_array, scope_context, initial_intermediate_symbol) {
      var last_scope = scope_array[start_index - 1] || scope_context;
      var last_intermediate_output_symbol = last_scope === scope_context ? initial_intermediate_symbol : last_scope.state['$$SYMBOLS.scope_special.SCRATCH$$'].sync_intermediate_output_symbol;

      var finish_index = end_index + 1;

      for (var i = start_index; i !== finish_index; ++i) {
        var scope = scope_array[i];
        if (!scope) {
          continue;
        }

        var scope_scratch_data = scope.state['$$SYMBOLS.scope_special.SCRATCH$$'];

        scope_scratch_data.previous_scope = last_scope;
        scope_scratch_data.previous_intermediate_output_symbol = last_intermediate_output_symbol;

        last_scope = scope;
        last_intermediate_output_symbol = scope_scratch_data.sync_intermediate_output_symbol;
      }
    }
  );

  register_global_helper(
    'polymorphic_scope_post_update',
    /**
     * @param {Object} new_polymorphic_scope
     * @param {Object} scope_context
     * @param {string} symbols
     */
    function (new_polymorphic_scope, scope_context, symbols) {
      var begin_placement = new_polymorphic_scope.state[new_polymorphic_scope.state.begin_placement_symbol];
      var safety_belt_text_node = new_polymorphic_scope.state['$$SYMBOLS.scope_special.SCRATCH$$'].safety_belt_text_node;
      $$HELPERS.delete_between_placements$$(begin_placement, safety_belt_text_node);

      new_polymorphic_scope['$$SYMBOLS.scope_special.SYNC_INIT$$']();
    }
  );

  register_global_helper(
    'remove_scope_index_range',
    function (remove_start_index, remove_end_index, scope_array, scope_context, initial_intermediate_symbol) {
      var remove_start_scope = scope_array[remove_start_index];
      var remove_end_scope = scope_array[remove_end_index];
      var begin_removal_placement = remove_start_scope.state[remove_start_scope.state.begin_placement_symbol];
      var end_removal_placement = remove_end_scope.state[remove_end_scope.state.end_placement_symbol];

      $$HELPERS.delete_between_placements$$(begin_removal_placement, end_removal_placement, true);

      var remove_start_scope_scratch_data = remove_start_scope.state['$$SYMBOLS.scope_special.SCRATCH$$'];
      var scope_before_range = remove_start_scope_scratch_data.previous_scope;
      var scope_after_remove_range = scope_array[remove_end_index + 1];
      if (scope_after_remove_range) {
        var scope_after_remove_range_scratch_data = scope_after_remove_range.state['$$SYMBOLS.scope_special.SCRATCH$$'];
        scope_after_remove_range_scratch_data.previous_scope = scope_before_range;
        scope_after_remove_range_scratch_data.previous_intermediate_output_symbol = scope_before_range === scope_context ? initial_intermediate_symbol : scope_before_range.state.end_placement_symbol;
      }
    }
  );

  register_global_helper(
    'array_scope_post_update',
    /**
     * @param {Array.<Object>} value
     * @param {Object} scope
     * @param {Object} scope_array_scratch_data
     */
    function (value, scope, scope_array_scratch_data) {
      var scope_array = value;
      var final_intermediate_symbol = scope_array_scratch_data.final_intermediate_symbol;
      var initial_intermediate_symbol = scope_array_scratch_data.initial_intermediate_symbol;
      var last_scope_array = scope_array_scratch_data.last_scope_array;
      scope_array_scratch_data.last_scope_array = scope_array;

      var i;
      var j;
      var initial_intermediate_placement = scope.state[initial_intermediate_symbol];
      var last_end_placement = initial_intermediate_placement;
      var original_scope_array_pool = [];

      var removed_scope_indexes = [];
      var removed_scope_index_length = 0;
      for (i = 0; i !== last_scope_array.length; ++i) {
        var last_scope_array_scope = last_scope_array[i];
        var is_removed = true;

        for (j = 0; j !== scope_array.length; ++j) {
          if (last_scope_array_scope === scope_array[j]) {
            is_removed = false;
            break;
          }
        }

        if (is_removed) {
          removed_scope_index_length = removed_scope_indexes.push(i);
        } else {
          original_scope_array_pool.push(last_scope_array_scope);
        }
      }

      var removed_scope_index;
      if (removed_scope_index_length === 1) {
        removed_scope_index = removed_scope_indexes[0];
        $$HELPERS.remove_scope_index_range$$(removed_scope_index, removed_scope_index, last_scope_array, scope, initial_intermediate_symbol);
      } else if (removed_scope_index_length > 1) {
        var removed_scope_range_start_index = removed_scope_indexes[0];
        var last_removed_scope_index = removed_scope_range_start_index;
        for (i = 1; i !== removed_scope_indexes.length; ++i) {
          removed_scope_index = removed_scope_indexes[i];
          if (removed_scope_index !== (last_removed_scope_index + 1)) {
            $$HELPERS.remove_scope_index_range$$(removed_scope_range_start_index, last_removed_scope_index, last_scope_array, scope, initial_intermediate_symbol);
            removed_scope_range_start_index = removed_scope_index;
          }
          last_removed_scope_index = removed_scope_index;
        }

        $$HELPERS.remove_scope_index_range$$(removed_scope_range_start_index, last_removed_scope_index, last_scope_array, scope, initial_intermediate_symbol);
      }

      for (i = 0; i !== scope_array.length; ++i) {
        var updated_scope_array_scope = scope_array[i];
        var scope_array_pool_index = original_scope_array_pool.indexOf(updated_scope_array_scope);
        var is_new_scope = scope_array_pool_index === -1;
        if (is_new_scope) {
          updated_scope_array_scope['$$SCOPE_METHODS.sync_initialize_array_scope$$']();
        } else {
          var move_required = scope_array_pool_index !== 0;
          original_scope_array_pool.splice(scope_array_pool_index, 1);

          if (move_required) {
            var begin_placement = updated_scope_array_scope.state[updated_scope_array_scope.state.begin_placement_symbol];
            var end_placement = updated_scope_array_scope.state[updated_scope_array_scope.state.end_placement_symbol];
            $$HELPERS.move_placement_range$$(begin_placement, end_placement, last_end_placement);

            if (scope_array_pool_index < original_scope_array_pool.length) {
              $$HELPERS.rewire_previous_scope_metadata$$(scope_array_pool_index, scope_array_pool_index, original_scope_array_pool, scope, initial_intermediate_symbol);
            }
          }
        }

        $$HELPERS.rewire_previous_scope_metadata$$(i, i, scope_array, scope, initial_intermediate_symbol);
        last_end_placement = updated_scope_array_scope.state[updated_scope_array_scope.state.end_placement_symbol];
      }
    }
  );

  register_global_helper(
    'generate_dom_element_class_post_update_handler',
    function (initial_attribute_input_value) {
      var last_value_classes = initial_attribute_input_value.split(' ').filter(function (classValue) {
        return !!classValue;
      });

      return function (value, scope, dom_element_symbol) {
        var current_value = $$HELPERS.convert_to_attribute_value$$(value);
        var value_classes = current_value.split(' ').filter(function (classValue) {
          return !!classValue;
        });

        var dom_element = scope.state[dom_element_symbol];
        var current_classes = dom_element.className.split(' ');
        var updated_classes;
        var i;

        if (last_value_classes.length) {
          updated_classes = [];
          for (i = 0; i !== current_classes.length; ++i) {
            var class_name = current_classes[i];
            if (last_value_classes.indexOf(class_name) === -1) {
              updated_classes.push(class_name);
            }
          }
        } else {
          updated_classes = current_classes;
        }

        for (i = 0; i !== value_classes.length; ++i) {
          var value_class = value_classes[i];
          if (updated_classes.indexOf(value_class) === -1) {
            updated_classes.push(value_class);
          }
        }

        dom_element.className = updated_classes.join(' ').trim();

        last_value_classes = value_classes;
      };
    }
  );

  register_global_helper(
    'dom_element_style_post_update_handler',
    /**
     * @param {*} value
     * @param {Object} scope
     * @param {string} symbols
     *   symbols[0] = Symbol where DOM element is located
     *   symbols[1-N] = Input symbols for the style attribute
     */
    function (value, scope, symbols) {
      var dom_element = scope.state[symbols[0]];

      var updated_style_value = '';
      for (var i = 1; i < symbols.length; ++i) {
        var attribute_input_symbol = symbols[i];
        updated_style_value += scope.state[attribute_input_symbol] || '';
      }

      dom_element.style.cssText = updated_style_value;
    }
  );

  register_global_helper(
    'dom_element_complex_attribute_input_post_update_handler',
    /**
     * @param {*} value
     * @param {Object} scope
     * @param {string} symbols
     *   symbols[0] = Symbol where DOM element is located
     *   symbols[1] = Global symbol for the attribute name
     *   symbols[2-N] = Input symbols for attribute
     */
    function (value, scope, symbols) {
      var dom_element = scope.state[symbols[0]];
      var attribute_name = Coral.sponges[symbols[1]];

      var updated_value = '';
      for (var i = 2; i < symbols.length; ++i) {
        var attribute_input_symbol = symbols[i];
        updated_value += $$HELPERS.convert_to_attribute_value$$(scope.state[attribute_input_symbol]);
      }

      dom_element.setAttribute(attribute_name, updated_value);
    }
  );

  // TODO: there are some attributes that require some special handling for different browsers, likely want to support those differently.
  register_global_helper(
    'dom_element_simple_attribute_input_post_update_handler',
    /**
     * @param {string} value
     * @param {Object} scope
     * @param {string} symbols
     *   symbols[0] = Location for dom element
     *   symbols[1] = Global symbol for attribute name
     */
    function (value, scope, symbols) {
      var dom_element = scope.state[symbols[0]];
      var attribute_name = Coral.sponges[symbols[1]];

      if (value == null) {
        dom_element.removeAttribute(attribute_name);
      } else {
        dom_element.setAttribute(attribute_name, $$HELPERS.convert_to_attribute_value$$(value));
      }
    }
  );

  register_global_helper(
    'escaped_dom_variable_post_update_handler',
    function (value, scope, text_node_symbol) {
      var text_node = scope.state[text_node_symbol];
      text_node.textContent = value == null ? '' : value;
    }
  );

  register_global_helper(
    'unescaped_dom_variable_post_update_handler',
    /**
     * @param {*} value
     * @param {Object} scope
     * @param {string} symbols
     *   symbols[0] = Symbol for location of placement that is present before the injected DOM.
     *   symbols[1] = Symbol for text node that exists after the injected DOM.
     */
    function (value, scope, symbols) {
      var before_placement = scope.state[symbols[0]];
      var after_placement = scope.state[symbols[1]];

      $$HELPERS.delete_between_placements$$(before_placement, after_placement);

      var frag = $$HELPERS.create_unescaped_html_fragment$$(value);
      $$HELPERS.insert_after_placement$$(frag,before_placement);
    }
  );

  register_global_helper(
    'transfer_values_post_update_handler',
    function (val, scope, to_symbol) {
      Coral.Observable.scheduler.register_update(scope, to_symbol, val, false, false);
    }
  );
};
