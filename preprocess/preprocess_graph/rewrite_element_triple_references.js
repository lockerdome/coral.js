"use strict";

// TODO: Refactor out rewrite view conditional code and some of the source manipulation code below into a nice series of utils for manipulating the old source.

/**
 * Rewrites TripleVariable nodes that are used for local elements and dynamic element lists to instead directly use the element or dynamic element list.
 *
 * It takes the TripleVariable's input placement and wires it into the element/dynamic element list and then wires the element/dynamic element list's output into anything that took the output of the TripleVariable previously, removing the TripleVariable from the dependency graph as a result.
 *
 * @param {Object} element_hash
 */
function rewrite_element_triple_references (element_hash) {
  // TODO: Terminology in here is messy, sometimes the word "ref" is used to describe a name and sometimes the reference object, "ref_name" should be used when just the name is used.
  for (var element_name in element_hash) {
    var element = element_hash[element_name];

    var element_local_refs = element.localRefs;
    var element_local_refs_hash = element.localRefsHash;

    var element_local_ref_names_to_remove = {};

    var i;
    var element_local_ref;
    for (i = 0; i < element_local_refs.length; i++) {
      element_local_ref = element_local_refs[i];
      if (element_local_ref.type !== 'viewNodes') continue;

      var local_ref_value = element_local_ref.value;
      if (local_ref_value.type !== 'TripleVariable') continue;

      var triple_source_ref = element_local_refs_hash[first_part(local_ref_value.args.value)];

      if (!triple_source_ref) {
        throw new Error(element.name+": Unable to find triple variable named "+local_ref_value.name);
      }

      if (triple_source_ref.type !== 'elements' && triple_source_ref.type !== 'dynamicElementLists') {
        continue;
      }

      var triple_reference_name = element_local_ref.name;

      var triple = element_local_ref.value;
      var triple_input_placement_ref = triple.args.placement;

      var triple_source = triple_source_ref.value;
      var triple_source_ref_type = triple_source_ref.type;

      if (triple_source_ref_type === 'elements') {
        if (triple_source.args.__placement) {
          throw new Error(element_name + " has {{{" + triple_source_ref.name + "}}} placed more than once in the view, please only insert it once in the view");
        }
        triple_source.args.__placement = triple_input_placement_ref;
      } else if (triple_source_ref_type === 'dynamicElementLists') {
        // TODO: Adds the placement parameter to all of the triple options. In reality, what will happen here is that it won't pass the same placement to every option on creation, but will treat it as the beginning placement and know how to pass that placement through. Yeah, not totally happy with this, but it works.
        for (var triple_source_option_name in triple_source.options) {
          var triple_source_option = triple_source.options[triple_source_option_name];
          if (triple_source_option.args.__placement) {
            throw new Error(element_name + " has {{{" + triple_source_ref.name + "}}} placed more than once in the view, please only insert it once in the view");
          }

          triple_source_option.args.__placement = triple_input_placement_ref;
        }
      }

      // Update usages of the original triple reference name with the after placement output reference for the scope.
      var element_placement_output_reference = triple_source_ref.name + '.after';

      for (var j = 0; j < element_local_refs.length; j++) {
        var local_ref_to_check = element_local_refs[j];
        if (local_ref_to_check.type !== 'viewNodes') {
          continue;
        }

        var local_ref_to_check_value = local_ref_to_check.value;
        for (var view_node_arg_name in local_ref_to_check_value.args) {
          var view_node_arg_value = local_ref_to_check_value.args[view_node_arg_name];
          if (view_node_arg_value === triple_reference_name) {
            local_ref_to_check_value.args[view_node_arg_name] = element_placement_output_reference;
            break;
          }
        }
      }

      // Update outputs that are referencing the view ref we are planning to remove.
      for (var output in element.outputs) {
        if (element.outputs[output] === triple_reference_name) {
          element.outputs[output] = element_placement_output_reference;
        }
      }

      element_local_ref_names_to_remove[triple_reference_name] = true;
    }

    if (!Object.keys(element_local_ref_names_to_remove).length) {
      continue;
    }

    // Remove triple references that we have replaced usages of.
    var updated_element_local_refs = [];
    var updated_element_local_refs_hash = {};

    for (i = 0; i < element_local_refs.length; i++) {
      element_local_ref = element_local_refs[i];
      var element_local_ref_name = element_local_ref.name;
      if (!element_local_ref_names_to_remove[element_local_ref_name]) {
        updated_element_local_refs.push(element_local_ref);
        updated_element_local_refs_hash[element_local_ref_name] = element_local_ref;
      }
    }

    element.localRefs = updated_element_local_refs;
    element.localRefsHash = updated_element_local_refs_hash;
  }
}

function first_part(field_string) {
  var part = field_string.split('.')[0].split('[')[0];
  return part;
}

module.exports = rewrite_element_triple_references;
