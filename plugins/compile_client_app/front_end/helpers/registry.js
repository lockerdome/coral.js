"use strict";

/* global $$SYMBOLS, $$HELPERS, document, Coral */

module.exports = function (register_global_helper) {
  register_global_helper(
    'retry_until_success',
    function (input, operation_func, finish_callback, notify_failed_attempt_callback) {
      var backoff = 5;
      var attempts = 0;
      var notified = false;

      attempt();
      function attempt () {
        attempts++;

        operation_func(input, finish_callback, function () {
          if (!notified) {
            notified = true;
            notify_failed_attempt_callback();
          }

          setTimeout(attempt, backoff);
          backoff *= 2;
        });
      }
    }
  );

  register_global_helper(
    'load_javascript_dependency',
    function (url, success, failure) {
      var script = document.createElement('script');
      script.onload = success;
      script.onerror = failure;
      script.src = url;
      document.body.appendChild(script);
    }
  );

  register_global_helper(
    'load_shard_javascript_dependency',
    function (url, success, failure) {
      var script = document.createElement('script');
      script.charset = "utf-8";
      script.onload = success;
      script.onerror = failure;
      script.src = url;
      document.body.appendChild(script);
    }
  );

  register_global_helper(
    'load_css_dependency',
    function (url, success, failure) {
      var css = document.createElement('link');
      css.rel = 'stylesheet';
      css.type = 'text/css';
      css.href = url;
      css.onload = success;
      css.onerror = failure;
      document.body.appendChild(css);
    }
  );

  register_global_helper(
    'load_dependency',
    function load_dependency (dependency_name, dependency_input, dependency_type, coral_instance, loaded_callback, implied_deps) {
      var dependency_registry = coral_instance.settings.dependency_registry;
      if (!dependency_registry) {
        coral_instance.settings.dependency_registry = {};
        dependency_registry = coral_instance.settings.dependency_registry;
      }
      var dependency_state = dependency_registry[dependency_name];
      if (dependency_state === true) {
        loaded_callback();
        return;
      } else if (dependency_state instanceof Coral.Unresolved) {
        var pending_unresolved = new Coral.Unresolved(1, [], function (cb) { cb(); }, loaded_callback);
        dependency_state.add_dependee(pending_unresolved);
        return;
      }
      var dependency_loader = dependency_type === 'javascript' ? $$HELPERS.load_javascript_dependency$$
        : dependency_type === 'shard_javascript' ? $$HELPERS.load_shard_javascript_dependency$$
        : dependency_type === 'css' ? $$HELPERS.load_css_dependency$$
        : null;

      var operation_unresolved = new Coral.Unresolved(1, [], function (cb) { cb(); }, loaded_callback);
      dependency_registry[dependency_name] = operation_unresolved;

      if (implied_deps && implied_deps.length) {
        implied_deps.forEach(function (dep) {
          var already_resolved = dependency_registry[dep] === true;
          if (already_resolved) {
            return;
          }

          var dep_unresolved = new Coral.Unresolved(1, [], function (cb) { cb(); }, function () {
            dependency_registry[dep] = true;
          });
          operation_unresolved.add_dependee(dep_unresolved);
          dependency_registry[dep] = dep_unresolved;
        });
      }

      $$HELPERS.retry_until_success$$(dependency_input, dependency_loader, function () {
        dependency_registry[dependency_name] = true;
        operation_unresolved.dependency_resolved();
      }, function () {
        var event_category = 'DependencyLoadFailure';
        var dependency_host_match = dependency_input.match(/^(https?:)?\/\/(.*?)\//);
        var dependency_host = dependency_host_match && dependency_host_match[2] || dependency_input;
        var action = dependency_host;
        var label = dependency_input;
        $$HELPERS.report_error$$(coral_instance, event_category, action, label);
      });
    }
  );
};
