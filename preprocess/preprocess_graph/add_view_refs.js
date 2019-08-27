"use strict";

var INPUT_PLACEMENT_REF_NAME = '__placement';

// TODO: Don't expose original view IR, reduce coupling to old code where possible.

// TODO: Figure out a good way to handle preserving whitespace with a scope instance that is only a DOM variable.

// TODO: better not to mess with the element definition, instead we should take the element definition and build a new abstraction based on it.  For now, this works.
/**
 * @param {Object} element_definition
 * @returns {string} After reference for the element
 */
function add_view_refs(element_definition) {
  add_ref_handler({ type: 'params', value: { name: INPUT_PLACEMENT_REF_NAME, type: 'placement' }, name: INPUT_PLACEMENT_REF_NAME }, true);
  // TODO: put in add_ref_handler
  element_definition.params.unshift({ name: INPUT_PLACEMENT_REF_NAME, type: 'placement' });

  var view_template = element_definition.template_ast;
  var child_nodes = view_template.children;
  var current_placement_ref_name = INPUT_PLACEMENT_REF_NAME;

  // Ensure that elements with empty views play nicely with other elements, I don't want end placements that have been removed in the parent scope context.
  if (!child_nodes.length) {
    var safety_belt_view_ref_name = '__safety_belt_passthrough';
    add_ref_handler({
      type: 'viewNodes',
      name: safety_belt_view_ref_name,
      value: {
        type: 'Text',
        value: '',
        args: { placement: INPUT_PLACEMENT_REF_NAME }
      }
    });
    return safety_belt_view_ref_name;
  }

  var child_node_refs = iterate_child_nodes(current_placement_ref_name, child_nodes, add_ref_handler, element_definition);
  return child_node_refs[child_node_refs.length - 1];

  function add_ref_handler (ref, prepend) {
    var ref_name = ref.name;
    if (prepend) {
      element_definition.localRefs.unshift(ref);
      var updatedLocalRefsHash = {};
      updatedLocalRefsHash[ref_name] = ref;
      for (var name in element_definition.localRefsHash) {
        updatedLocalRefsHash[name] = element_definition.localRefsHash[name];
      }
      element_definition.localRefsHash = updatedLocalRefsHash;
    } else {
      element_definition.localRefs.push(ref);
      element_definition.localRefsHash[ref_name] = ref;
    }
  }
}

var unique_id = 0;

// TODO: There's a pretty nice traverse function in domeplates/traverse, I should have just used that, oops...
/**
 * @param {Object} view_node
 * @param {string} node_placement_ref_name
 * @param {function} add_ref_handler
 */
function traverse_view_node(view_node, node_placement_ref_name, add_ref_handler, element_definition) {
  if (view_node.type === 'InnerTextStatic' && !view_node.value.value.trim()) {
    return node_placement_ref_name;
  }

  var args = (function () {
    var args = { placement: node_placement_ref_name };
    if (view_node.type === 'Tag') {
      var attribute_index = 0;
      view_node.attributes.forEach(function (attribute) {
        var attribute_parts = Array.isArray(attribute.value) ? attribute.value : [attribute.value];

        attribute_parts.forEach(function (attr_part) {
          if (attr_part.type === 'Variable') {
            args['attribute_'+attribute_index] = attr_part.name;
            attribute_index++;
          }
        });
      });
    } else if (view_node.type === 'Variable' || view_node.type === 'TripleVariable') {
      args.value = view_node.name;
    }
    return args;
  })();

  var base_node_ref_name;
  if (view_node.type === 'InnerText' || view_node.type === 'Event') {
    base_node_ref_name = node_placement_ref_name;
  } else {
    base_node_ref_name = '_view_node_'+(unique_id++);
    view_node.args = args;
    add_ref_handler({
      type: 'viewNodes',
      name: base_node_ref_name,
      value: view_node
    });
  }

  var child_nodes = (function() {
    if (view_node.type !== 'Event' && view_node.type !== 'Tag' && view_node.type !== 'InnerText' && view_node.type !== 'InnerTextStatic' && view_node.type !== 'IfStatement' && view_node.type !== 'ElseIfStatement' && view_node.type !== 'ElseStatement') {
      return [];
    }
    var child_nodes = view_node.children || view_node.value;

    return Array.isArray(child_nodes) ? child_nodes : [];
  })();

  if (child_nodes.length) {
    var current_placement_ref_name = base_node_ref_name + (view_node.type === 'Tag' ? '.inner' : '');

    var child_node_refs = iterate_child_nodes(current_placement_ref_name, child_nodes, add_ref_handler, element_definition, view_node);

    current_placement_ref_name = child_node_refs[child_node_refs.length - 1];

    // InnerText is just a silly wrapper that can have things next to it in the AST, so this just treats the last child's ref name as its ref name, so if something wants to get placed after this 'InnerText' node, it is placed after the 'InnerText' node's last child.
    if (view_node.type === 'InnerText' || view_node.type === 'Event') {
      base_node_ref_name = current_placement_ref_name;
    }
  }

  return base_node_ref_name + (view_node.type === 'Tag' ? '.after' : '');
}

function iterate_child_nodes (current_placement_ref_name, child_nodes, add_ref_handler, element_definition, parent_view_node) {
  var child_ref_names = [current_placement_ref_name];
  var last_child_node;
  var i;
  var child_node;
  var preserve_whitespace_text_node = false;

  for (i = 0; i !== child_nodes.length; ++i) {
    child_node = child_nodes[i];

    if (child_node.type === 'Variable') {
      preserve_whitespace_text_node = true;
      break;
    }
  }

  for (i = 0; i !== child_nodes.length; ++i) {
    child_node = child_nodes[i];

    if (!preserve_whitespace_text_node && child_node.type === 'Text' && child_node.value.trim() === '') {
      last_child_node = child_node;
      continue;
    }

    if (child_node.type === 'Text' && child_node.value.trim() === '&nbsp;') {
      child_node.value = ' ';
    }

    current_placement_ref_name = traverse_view_node(child_node, current_placement_ref_name, add_ref_handler, element_definition);
    last_child_node = child_node;

    child_ref_names.push(current_placement_ref_name);
  }
  return child_ref_names;
}

module.exports = add_view_refs;
