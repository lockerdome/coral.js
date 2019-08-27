"use strict";

/* global document,$$HELPERS */

/**
 * A collection of DOM related utilities that are used to support computable creation and updating.
 *
 * No helper in here should take a scope context as a parameter.
 */

module.exports = function (register_global_helper) {
  register_global_helper(
    'create_text_node',
    function (text) {
      return document.createTextNode(text);
    }
  );

  register_global_helper(
    'create_empty_text_node',
    function () {
      return document.createTextNode('');
    }
  );

  register_global_helper(
    'filter_out_text_nodes',
    function (nodes) {
      return nodes.filter(function (node) {
        return node.nodeType !== Node.TEXT_NODE;
      });
    }
  );

  register_global_helper(
    'convert_to_attribute_value',
    function (value) {
      return value === undefined || value === null ? '' : value + '';
    }
  );

  register_global_helper(
    'insert_after_placement',
    function (elem, placement) {
      if (placement.nextSibling) {
        return placement.parentNode.insertBefore(elem,placement.nextSibling);
      } else {
        return placement.parentNode.appendChild(elem);
      }
    }
  );

  register_global_helper(
    'gather_placement_range',
    function (begin_placement, end_placement) {
      var nodes = [];
      var current_node = begin_placement.nextSibling;
      var after_end_placement = end_placement.nextSibling;
      while (current_node !== after_end_placement) {
        nodes.push(current_node);
        current_node = current_node.nextSibling;
      }

      return nodes;
    }
  );

  register_global_helper(
    'is_in_placement_range',
    /**
     * @param {DOMNode} node
     * @param {DOMNode} begin_placement
     * @param {DOMNode} end_placement
     * @returns {boolean} Whether node is after begin_placement, and is either the end_placement or before the end_placement.
     */
    function (node, begin_placement, end_placement) {
      if (!begin_placement || !end_placement) {
        return false;
      }

      // When the begin placement is equal to the end placement, then we know that the placement range is empty and don't need to do any further checks.
      if (begin_placement === end_placement) {
        return false;
      }

      if (node === end_placement) {
        return true;
      }

      var is_after_begin_placement = node.compareDocumentPosition(begin_placement) === Node.DOCUMENT_POSITION_PRECEDING;
      if (!is_after_begin_placement) {
        return false;
      }

      var position_relative_to_end_placement = node.compareDocumentPosition(end_placement);
      var is_before_or_in_end_placement = (position_relative_to_end_placement & 4) === 4 || (position_relative_to_end_placement & 8) === 8;
      return is_before_or_in_end_placement;
    }
  );

  register_global_helper(
    'create_and_insert_inline_html_element',
    function (html, placement) {
      var elem = document.createElement("div");
      elem.innerHTML = html;
      return $$HELPERS.insert_after_placement$$(elem.firstChild, placement);
    }
  );

  register_global_helper(
    'create_and_insert_text',
    function (text, placement) {
      return $$HELPERS.insert_after_placement$$($$HELPERS.create_text_node$$(text == null ? '' : text), placement);
    }
  );

  register_global_helper(
    'escape_html_string',
    function (unsafe) {
      unsafe = unsafe == null ? '' : unsafe + '';
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;")
        .replace(/`/g, "&#x60;");
    }
  );

  register_global_helper(
    'create_unescaped_html_fragment',
    /**
     * @param {string} html A string of HTML to be converted into DOM nodes
     * @returns {DocumentFragment} A document fragment containing the html string converted into DOM nodes
     */
    function (html) {
      var frag = document.createDocumentFragment();
      var parse_node = document.createElement("div");
      parse_node.innerHTML = html;
      while(parse_node.firstChild) {
        frag.appendChild(parse_node.firstChild);
      }

      return frag;
    }
  );

  register_global_helper(
    'move_placement_range',
    /**
     * Moves the content after begin_placement up to and including end_placement to directly after destination_placement.
     *
     * @param {DOMNode} begin_placement
     * @param {DOMNode} end_placement
     * @param {DOMNode} destination_placement
     */
    function (begin_placement, end_placement, destination_placement) {
      var parent_node = begin_placement.parentNode;
      var current_node = begin_placement.nextSibling;
      var after_end_placement = end_placement.nextSibling;
      while (current_node !== after_end_placement) {
        var next_node = current_node.nextSibling;

        $$HELPERS.insert_after_placement$$(current_node, destination_placement);

        destination_placement = current_node;
        current_node = next_node;
      }
    }
  );

  register_global_helper(
    'delete_between_placements',
    /**
     * Removes everything between two given placements.
     * @param {DOMNode} before_placement
     * @param {DOMNode} after_placement
     * @param {boolean} include_after_placement
     */
    function (before_placement, after_placement, include_after_placement) {
      // Deleting the before placement isn't a good idea, so immediately bail if that is the case.
      if (before_placement === after_placement) return;

      var parent_node = before_placement.parentNode;
      var current_node = before_placement.nextSibling;

      var barrier_node = include_after_placement ? after_placement.nextSibling : after_placement;

      while (current_node !== barrier_node) {
        var node_to_remove = current_node;
        current_node = current_node.nextSibling;
        parent_node.removeChild(node_to_remove);
      }
    }
  );
};
