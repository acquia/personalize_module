(function ($) {

Drupal.personalize = Drupal.personalize || {};
Drupal.personalize.agents = Drupal.personalize.agents || {};
Drupal.personalize.agents.test_agent = {
  'getDecisionsForPoint': function(name, visitor_context, choices, decision_point, callback) {
    var j, decisions = {};
    for (j in choices) {
      if (choices.hasOwnProperty(j)) {
        decisions[j] = choices[j][0];
      }
    }
    callback(decisions);
  },
  'sendGoalToAgent': function(agent_name, goal_name, value) {
    if (window.console) {
      console.log('Sending goal ' + goal_name + ' to agent ' + agent_name + ' with value ' + value);
    }
  }
};

})(jQuery);
