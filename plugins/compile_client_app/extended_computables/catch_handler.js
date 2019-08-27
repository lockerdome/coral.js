"use strict";

var CatchHandler = require('../../../ir/computables/catch_handler');

/**
 * @override
 */
CatchHandler.prototype.is_needed_for_async_pre_initialize_phase = function () {
  return true;
};

/**
 * The catch handler metadata needs to be wired up in the async phase, but the inputs to it are only needed in the sync phase.
 * The handling in here ensures that the catch handler inputs aren't unnecessarily forced into the async phase.
 * @override
*/
CatchHandler.prototype.get_client_side_input_metadata = function (index) {
  return {
    is_needed_for_async_pre_initialize_phase: false,
    is_needed_for_sync_initialize_phase: true,
    is_needed_for_update_cycle: false
  };
};
