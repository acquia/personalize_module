(function ($) {

Drupal.personalize_target = (function() {

  var decision_points = {}, initialized = false;

  function init() {
    var settings = Drupal.settings.personalize.option_sets;
    for (var i in settings) {
      if (settings.hasOwnProperty(i)) {
        var option_set = settings[i];
        var decision_point = option_set.decision_point;
        var decision_name = option_set.decision_name;
        for (var j in option_set.options) {
          if (option_set.options.hasOwnProperty(j) && option_set.options[j].hasOwnProperty('fixed_targeting')) {
            decision_points[decision_point] = decision_points[decision_point] || {};
            decision_points[decision_point][decision_name] = decision_points[decision_point][decision_name] || {
              'mapped_features' : {}
            };
            // Loop through all features specified for an option and add them to the
            // features map for this decision.
            for (var k in option_set.options[j].fixed_targeting) {
              if (option_set.options[j].fixed_targeting.hasOwnProperty(k)) {
                var feature_name = option_set.options[j].fixed_targeting[k];
                decision_points[decision_point][decision_name].mapped_features[feature_name] = option_set.options[j].option_id;
              }
            }
          }
        }
      }
    }
  }

  function convertContextToFeatureString(visitor_context) {
    var feature_strings = [];
    for (var i in visitor_context) {
      if (visitor_context.hasOwnProperty(i)) {
        feature_strings.push(i + '::' + visitor_context[i]);
      }
    }
    return feature_strings;
  }

  return {
    'getDecision': function(name, visitor_context, choices, decision_point, fallbacks, callback) {
      if (!initialized) {
        init();
      }
      var decisions = {};
      var feature_strings = convertContextToFeatureString(visitor_context);
      for (var j in choices) {
        if (choices.hasOwnProperty(j)) {
          // Initialize the decision to the fallback option.
          var fallbackIndex = fallbacks.hasOwnProperty(j) ? fallbacks[j] : 0;
          decisions[j] = choices[j][fallbackIndex];
          if (decision_points.hasOwnProperty(decision_point) && decision_points[decision_point].hasOwnProperty(j)) {
            // See if any of the visitor context features has an option mapped to it.
            for (var i in feature_strings) {
              if (feature_strings.hasOwnProperty(i) && decision_points[decision_point][j].mapped_features.hasOwnProperty(feature_strings[i])) {
                decisions[j] = decision_points[decision_point][j].mapped_features[feature_strings[i]];
                break; // No need to look at any other feature strings.
              }
            }
          }
        }
      }
      callback(decisions);
    }
  }
})();

Drupal.personalize = Drupal.personalize || {};
Drupal.personalize.agents = Drupal.personalize.agents || {};
Drupal.personalize.agents.personalize_target = {
  'getDecisionsForPoint': function(agent_name, visitor_context, choices, decision_point, fallbacks, callback) {
    Drupal.personalize_target.getDecision(agent_name, visitor_context, choices, decision_point, fallbacks, callback);
  },
  'sendGoalToAgent': function(agent_name, goal_name, value) {
    if (window.console) {
      console.log('Sending goal ' + goal_name + ' to agent ' + agent_name + ' with value ' + value);
    }
  }
};

})(jQuery);
