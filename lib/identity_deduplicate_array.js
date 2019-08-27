"use strict";

function identity_deduplicate_array (items, identity_comparison_function) {
  var identity_filtered_items = [];
  for (var i = 0; i < items.length; ++i) {
    var duplicate_identity_exists = false;
    var item = items[i];

    // TODO: Consider removing this special casing
    if (item == null) {
      identity_filtered_items.push(item);
      continue;
    }

    for (var j = i - 1; j !== -1; --j) {
      if (identity_comparison_function(item, items[j])) {
        duplicate_identity_exists = true;
        break;
      }
    }

    if (duplicate_identity_exists) {
      continue;
    }

    identity_filtered_items.push(item);
  }

  return identity_filtered_items;
}
module.exports = identity_deduplicate_array;
