"use strict";

/* global $$HELPERS,$$SYMBOLS */

var inherits = require('inherits');
var EventEmitter = require('events').EventEmitter;

inherits(Observable, EventEmitter);

var updated_zones = [];

/**
 * TODO: Get rid of this living on Observable to make it clear Observables are not tied to the scheduler.
 */
Observable.scheduler = {
  _frozen: false,
  run: function () {
    if (this._frozen) return;

    // TODO: There should not be multiple things calling into this function during a single run
    for (var i = 0; i < updated_zones.length; ++i) {
      var updated_zone = updated_zones[i];
      updated_zone.run_update_cycle();
    }
    updated_zones = [];
  },
  freeze: function () {
    this._frozen = true;
  },
  in_transaction: function (cb) {
    if (this._frozen) {
      cb();
      return;
    }
    this._frozen = true;
    cb();
    this._frozen = false;

    this.run();
  },
  // initialization_start_tick must be provided if the update registered is asynchronously computed.
  register_update: function (scope, symbol, value, is_compute_update, is_forced, initialization_start_tick, set_source_scope, set_source_symbol) {
    var zone = scope['$$SYMBOLS.scope_special.ZONE$$'];
    if (updated_zones.indexOf(zone) === -1) {
      updated_zones.push(zone);
    }

    // TODO: I'm not convinced this is the correct way to do this
    zone.add_updates([{ scope: scope, symbol: symbol, value: value, is_compute_update: is_compute_update, forced: is_forced, initialization_start_tick: initialization_start_tick, set_source_scope: set_source_scope, set_source_symbol: set_source_symbol }]);
  }
};

Observable.inTransaction = function (transaction_callback) {
  Observable.scheduler.in_transaction(transaction_callback);
};

function Observable(initialValue) {
  this.setMaxListeners(0);
  this.pending = arguments.length === 0;
  this.value = initialValue;
}

Observable.is = function isObervable(entity) {
  return entity instanceof Observable;
};

Observable.unpack = function unpack(entity) {
  return Observable.is(entity) ? entity.get() : entity;
};

Observable.getByPath = function (val, path) {
  if (Observable.is(val)) {
    return val.byPath(path.split('.'));
  } else {
    return $$HELPERS.get_at_path$$(val, path.split('.'));
  }
};

Observable.prototype.get = function () {
  return this.value;
};

Observable.prototype.toString = function () {
  return this.value != null && this.value.toString() || '';
};

Observable.prototype.byPath = function (path) {
  var parent = this;
  var child = parent.pending ? new Observable()
    : new Observable($$HELPERS.get_at_path$$(parent.get(), path));

  parent.on('change', change);

  var _force = false;
  function change() {
    child._set($$HELPERS.get_at_path$$(parent.get(), path), _force);
    _force = false;
  }

  child.on('_set', function () {
    child.before();
    child.update();
    child.after();
  });

  child._set = child.set;
  child.set = function (val, force) {
    if (this.value === val && !this.pending && !force) return;
    _force = true;
    parent.set($$HELPERS.set_at_path$$(parent.get(), path, val), true);
  };
  return child;
};

Observable.prototype.set = function (val, force) {
  var oldVal = this.value;
  val = Observable.unpack(val);
  if (oldVal === val && !this.pending && !force) return;
  this.value = val;
  this.pending = false;

  this.emit('_set', val, force);
  this.emit('_afterSet', val, force);
};

Observable.prototype.before = function () {
  this.emit('beforeChange', this.value);
};

Observable.prototype.update = function () {
  this.emit('change', this.value);
};

Observable.prototype.after = function () {
  this.emit('afterChange', this.value);
};

Observable.prototype.destroy = function () {
  this.removeAllListeners();
};

Observable.bind = function bind(a, b) {
  if (!(Observable.is(a) && Observable.is(b))) return;
  a.on('beforeChange', updateB);
  b.on('beforeChange', updateA);
  updateB(a.get());
  function updateB(val) {
    b.set(val);
  }
  function updateA(val) {
    a.set(val);
  }
};

Observable.uniBind = function bind(a, b) {
  if (!(Observable.is(a) && Observable.is(b))) return;
  a.on('beforeChange', updateB);
  updateB(a.get());
  function updateB(val) {
    b.set(val);
  }
};

module.exports = Observable;

