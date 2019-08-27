"use strict";

/* global global */

// Polyfill in promise support if needed.
require('es6-promise/auto');

function Coral (coralElem, coralParametersAndValues, coralSettings) {
  this.settings = coralSettings || {};
  this.settings.root_container_node = coralElem;
  Coral.sponges.coral_start(coralElem, coralParametersAndValues, coralSettings, this);
}

global.Coral = Coral;

global.Coral.sponges = {};

global.Coral.Unresolved = require('./unresolved');
global.Coral.Zone = require('./zone');

global.Coral.CoralEvent = require('./event');
global.Coral.Observable = require('./observables/observable');
require('./bind_element');

global.Coral.DomeElement = require('./dome_element');
global.Coral.DomeConditionalElement = require('./dome_conditional_element');
global.Coral.DomeElementCollection = require('./dome_element_collection');
global.Coral.DomeRichElement = require('./dome_rich_element');

global.Coral.generate_dependency_tags = require('./generate_dependency_tags');

global.Coral.deepClone = require('../../../../lib/deep_clone');

global.Coral.get_at_path = require('../../../../lib/get_at_path');
global.Coral.identity_deduplicate_array = require('../../../../lib/identity_deduplicate_array');


var key_validation = require('../../../../lib/key_validation');
var key_shortcut_manager = require('./key_shortcut_manager')(key_validation);
global.Coral.helpers = {
  key_validation: key_validation,
  key_shortcut_manager: key_shortcut_manager
};

var scope_constructors = require('./scope_constructors');
global.Coral.Scope = scope_constructors.scope;
global.Coral.ScopeSymbolMetadata = scope_constructors.scope_symbol_metadata;
global.Coral.InstanceSymbolMetadata = scope_constructors.instance_symbol_metadata;
global.Coral.ForwardRule = scope_constructors.forward_rule;
