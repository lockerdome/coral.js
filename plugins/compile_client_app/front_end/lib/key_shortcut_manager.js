"use strict";

var deepClone = require('../../../../lib/deep_clone');

module.exports = function (key_validation) {
  var key_map = {};
  var last_key_press;

  document.addEventListener('keydown', function (e) {
    var last_key_pressed = e.key;
    if (!last_key_pressed || last_key_pressed === 'Shift') return;
    key_map[last_key_pressed] = true;
    last_key_press = last_key_pressed;
  }, true);

  document.addEventListener('keyup', function (e) {
    var last_key_pressed = e.key;
    if (!last_key_pressed || last_key_pressed === 'Shift') return;
    if (last_key_pressed.length === 1) {
      delete key_map[last_key_pressed.toUpperCase()];
      delete key_map[last_key_pressed.toLowerCase()];
    } else {
      delete key_map[last_key_pressed];
    }
  }, true);

  // We clear key board shortcut state onfocus once so when a user switches between tabs and windows, no key presses are left in the key_map.
  window.addEventListener('focus', function () {
    clear_state();
    key_map = {};
  });

  var current_key_sequence = [];
  var key_sequences_array = [];
  var clear_state_timeout;
  var has_metakeys_not_shift = key_validation.has_metakeys_not_shift;

  function sequence_match (current_key_sequence, key_sequence_array) {
    var best_match_length = 0;
    for (var i = 0; i !== current_key_sequence.length; ++i) {
      var sub_array = current_key_sequence.slice(i, current_key_sequence.length);
      for (var j = 0; j !== sub_array.length; ++j) {
        if (!match_single(sub_array[j], key_sequence_array[j])) break;
      }
      if (j === sub_array.length && j > best_match_length) {
        best_match_length = j;
        if (key_sequence_array.length === j) break;
      }
      else if (best_match_length !== 0) break;
    }
    return best_match_length;
  }

  function match_single (current_key_combo, key_hash) {
    var key_hash_length = Object.keys(key_hash).length;
    var needs_perfect_match = has_metakeys_not_shift(key_hash) || has_metakeys_not_shift(current_key_combo.concurrently_pressed);
    var same_length = key_hash_length === Object.keys(current_key_combo.concurrently_pressed).length;

    if (!needs_perfect_match && key_hash_length === 1) return key_hash[current_key_combo.last_key_press];
    else {
      if (needs_perfect_match && !same_length) return false;
      for (var k in key_hash) {
        if (!current_key_combo.concurrently_pressed[k]) return false;
      }
      return true;
    }
  }

  function clear_state () {
    current_key_sequence = [];
    key_sequences_array = [];
    if (clear_state_timeout) {
      clearTimeout(clear_state_timeout);
      clear_state_timeout = null;
    }
  }

  return {
    // TODO Rather than pushing to an array, we could make a trie
    queue_key_sequence_check: function (key_sequence, callback) {
      key_sequences_array.push({
        key_sequence: key_sequence,
        callback: callback
      });
    },

    execute_matches: function () {
      if (key_sequences_array.length === 0) return;
      if (clear_state_timeout) {
        clearTimeout(clear_state_timeout);
        clear_state_timeout = null;
      }
      clear_state_timeout = setTimeout(function () { clear_state(); }, 750);

      var longest_match = 0;
      var best_complete_match = null;

      current_key_sequence.push({
        concurrently_pressed: deepClone(key_map),
        last_key_press: last_key_press
      });
      var current_sequence_length = current_key_sequence.length;

      for (var i = key_sequences_array.length - 1; i >= 0; --i) {
        var key_sequence_data = key_sequences_array[i];
        var key_sequence_array = key_sequence_data.key_sequence;
        var match_length = sequence_match(current_key_sequence, key_sequence_array);
        if (match_length === key_sequence_array.length) {
          if (!best_complete_match) {
            best_complete_match = key_sequence_data;
          } else {
            best_complete_match = (key_sequence_array.length >= best_complete_match.key_sequence.length) ? key_sequence_data : best_complete_match;
          }
        }
        if (match_length > longest_match) longest_match = match_length;
      }
      key_sequences_array = [];

      if (best_complete_match) {
        best_complete_match.callback();
        clear_state();
      } else {
        current_key_sequence = current_key_sequence.slice(current_sequence_length - longest_match, current_sequence_length);
      }
    },

    clear_state: clear_state
  };
};
