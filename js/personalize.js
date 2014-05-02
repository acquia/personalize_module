(function ($) {
  var cookieName = 'drupal-personalize';

  /**
   * Provides client side page personalization based on a user's context.
   */
  Drupal.personalize = Drupal.personalize || {};

  var sessionID = false;

  /**
   * Initializes the session ID to be used for decision and goal requests.
   *
   * The session ID can be used by decision agents to keep track of visitors
   * across requests. It may be generated by the decision agent itself and
   * stored in a cookie, or, for logged in users, it is a hash of the user
   * ID.
   */
  Drupal.personalize.initializeSessionID = function() {
    if (sessionID) {
      return sessionID;
    }
    // Populate the session id from the cookie, if present.
    var storedId = $.cookie(cookieName);
    if (storedId) {
      sessionID = storedId;
    }
    else if (Drupal.settings.personalize.sessionID) {
      sessionID = Drupal.settings.personalize.sessionID;
    }
    return sessionID;
  };

  /**
   * Saves the passed in ID as the SessionID variable to be used for all
   * future decision and goal requests.
   */
  Drupal.personalize.saveSessionID = function(session_id) {
    sessionID = session_id;
    $.cookie(cookieName, session_id);
  };


  var agents = {}, adminMode = false, processedDecisions = {}, processedOptionSets = [];


  /**
   * Looks for personalized elements and calls the corresponding decision agent
   * for each one.
   */
  Drupal.behaviors.personalize = {
    attach: function (context, settings) {

      // Assure that at least the personalize key is available on settings.
      settings.personalize = settings.personalize || {};

      adminMode = settings.personalize.hasOwnProperty('adminMode');

      if (!sessionID) {
        Drupal.personalize.initializeSessionID();
      }

      // Clear out any expired local storage.
      Drupal.personalize.localStorage.maintain('Drupal.personalize:');

      // First process MVTs if there are any.
      processMVTs(settings);

      // Only Option Sets that weren't part of an MVT will now be processed.
      processOptionSets(settings);

      // Once MVTs and other Option Sets have been processed, we're ready to fire
      // off requests for decisions.
      triggerDecisions(settings);

      if (!adminMode) {
        // Dispatch any goals that were triggered server-side.
        Drupal.personalize.sendGoals(settings);
      }

      // Add an action listener for client-side goals.
      addActionListener(settings);
    }
  };

  /**
   * Sends any goals that have been set server-side.
   */
  Drupal.personalize.sendGoals = function(settings) {
    if (settings.personalize.goals_attained) {
      for (var agent_name in settings.personalize.goals_attained) {
        if (settings.personalize.goals_attained.hasOwnProperty(agent_name)) {
          var agent = settings.personalize.agent_map[agent_name];
          if (!Drupal.personalize.agents.hasOwnProperty(agent.type)) {
            // @todo How best to handle errors like this?
            continue;
          }
          for (var i in settings.personalize.goals_attained[agent_name]) {
            if (settings.personalize.goals_attained[agent_name].hasOwnProperty(i) && !settings.personalize.goals_attained[agent_name][i].processed) {
              Drupal.personalize.agents[agent.type].sendGoalToAgent(agent_name, settings.personalize.goals_attained[agent_name][i].name, settings.personalize.goals_attained[agent_name][i].value);
              settings.personalize.goals_attained[agent_name][i].processed = 1;
            }
          }
        }
      }
    }
  };

  Drupal.personalize.executors = Drupal.personalize.executors || {};
  /**
   * Executor that Looks for options inside a script tag and pulls out the
   * chosen one.
   */
  Drupal.personalize.executors.show = {
    'execute': function ($option_set, choice_name, osid) {
      var $option_source = $('script[type="text/template"]', $option_set);
      var element = $option_source.get(0);
      var json = element.innerText;
      if (json === undefined || json.length == 0) {
        json = element.text;
      }
      var choices = jQuery.parseJSON(json);
      var winner = '';

      if (choices == null || choices === false || !choices.hasOwnProperty(choice_name)) {
        // Invalid JSON in the template.  Just show the noscript option.
        winner = $(element).prev('noscript').html();
      }
      else {
        winner = choices[choice_name]['html'];
      }

      // Remove any previously existing options.
      $option_set
        // empty() is necessary to remove text nodes as well as elements.
        .empty()
        .append($option_source);
      // Append the selected option.
      $option_set.append(winner);

      Drupal.personalize.executorCompleted($option_set, choice_name, osid);
      // Lots of Drupal modules expect context to be document on the first pass.
      var bread = document; // context.
      var circus = Drupal.settings; // settings.
      Drupal.attachBehaviors(bread, circus);
    }
  };

  Drupal.personalize.executorCompleted = function($option_set, option_name, osid) {
    // Trigger an event to let others respond to the option change.
    $(document).trigger('personalizeOptionChange', [$option_set, option_name, osid]);
  };

  /**
   * Executor that executes a callback function to retrieve the chosen
   * option set to display.
   */
  Drupal.personalize.executors.callback = {
  'execute': function($option_set, choice_name, osid) {
    // Set up such that Drupal ajax handling can be utilized without a trigger.
    var custom_settings = {};
    custom_settings.url = '/personalize/option_set/' + osid + '/' + choice_name + '/ajax';
    custom_settings.event = 'onload';
    custom_settings.keypress = false;
    custom_settings.prevent = false;
    var callback_action = new Drupal.ajax(null, $option_set, custom_settings);

    try {
        $.ajax(callback_action.options);
      }
      catch (err) {
        // If we can't process the result dynamically, then show the
        // default option selected within the noscript block.
        // NOTE: jQuery returns escaped HTML when calling the html property
        // on a noscript tag.
        var defaultHtml = $option_set.next('noscript').text();
        $option_set.html(defaultHtml);
        $option_set.next('noscript').remove();
        return false;
      }
    }
  }

  Drupal.personalize.agents = Drupal.personalize.agents || {};
  /**
   * Provides a default agent.
   */
  Drupal.personalize.agents.default_agent = {
    'getDecisionsForPoint': function(name, visitor_context, choices, decision_point, callback) {
      var j, decisions = {};
      for (j in choices) {
        if (choices.hasOwnProperty(j)) {
          decisions[j] = choices[j][0];
        }
        callback(decisions);
      }
    },
    'sendGoalToAgent': function(agent_name, goal_name, value) {

    },
    'featureToContext': function(featureString) {
      var contextArray = featureString.split('::');
      return {
        'key': contextArray[0],
        'value': contextArray[1]
      }
    }
  };

  /**
   * Returns an object with key/value pairs for the enabled visitor contexts.
   */
  function getVisitorContext(agent_name, agent_type, enabled_context) {
    var i, j, new_values, visitor_context = Drupal.personalize.visitor_context, context_values = {};
    for (i in enabled_context) {
      if (enabled_context.hasOwnProperty(i) && visitor_context.hasOwnProperty(i) && typeof visitor_context[i].getContext === 'function') {
        new_values = visitor_context[i].getContext(enabled_context[i]);
        for (j in new_values) {
          context_values[j] = new_values[j];
        }
      }
    }
    return Drupal.personalize.evaluateContexts(agent_name, agent_type, context_values);
  }


  var fixed_targeting_rules = null;
  Drupal.personalize.evaluateContexts = function (agentName, agentType, visitorContext) {
    if (!Drupal.personalize.agents.hasOwnProperty(agentType) || typeof Drupal.personalize.agents[agentType].featureToContext !== 'function') {
      return;
    }
    // If we haven't already gone through all the explicit targeting rules, we need to
    // do that first to find the rule for each feature string.
    if (fixed_targeting_rules === null) {
      fixed_targeting_rules = {};
      var settings = Drupal.settings.personalize.option_sets;
      for (var i in settings) {
        if (settings.hasOwnProperty(i)) {
          var option_set = settings[i];
          var agent = option_set.agent;
          for (var j in option_set.options) {
            if (option_set.options.hasOwnProperty(j) && option_set.options[j].hasOwnProperty('fixed_targeting')) {
              fixed_targeting_rules[agent] = fixed_targeting_rules[agent] || {};
              // Loop through all features specified for an option and grab the rule
              // associated with it.
              for (var k in option_set.options[j].fixed_targeting) {
                if (option_set.options[j].fixed_targeting.hasOwnProperty(k)) {
                  var feature_name = option_set.options[j].fixed_targeting[k];
                  if (option_set.options[j].hasOwnProperty('fixed_targeting_rules') && option_set.options[j].fixed_targeting_rules.hasOwnProperty(feature_name)) {
                    fixed_targeting_rules[agent][feature_name] = option_set.options[j].fixed_targeting_rules[feature_name];
                  }
                }
              }
            }
          }
        }
      }
    }
    // The new visitor context object will hold an array of values for each
    // key, rather than just a single value. This is because in addition to
    // having a string representing key and actual value, for each rule that
    // is satisfied we'll also need a string indicating that that rule is
    // satisfied. For example, if we have a targeting rule that says show this
    // option if the visitor's "interests" field contains "submarines", and the
    // value of this field for the current visitor is "ships and submarines",
    // then our visitor context for key "interests" should be ["ships and submarines",
    // "sc-submarines"], where sc- is just the prefix added to codify "string
    // contains".
    var newVisitorContext = {};
    for (var contextKey in visitorContext) {
      if (visitorContext.hasOwnProperty(contextKey)) {
        newVisitorContext[contextKey] = [visitorContext[contextKey]];
      }
    }
    // Use the rules to set values on the visitor context which can then be used
    // for explicit targeting. It is up to the agent how exactly the explicit
    // targeting is done.
    if (fixed_targeting_rules.hasOwnProperty(agentName)) {
      var featureRules = fixed_targeting_rules[agentName];
      for (var featureName in featureRules) {
        if (featureRules.hasOwnProperty(featureName)) {
          var key = featureRules[featureName].context;
          if (visitorContext.hasOwnProperty(key)) {
            // Evaluate the rule and if it returns true, we set the feature string
            // on the visitor context.
            var operator = featureRules[featureName].operator;
            var match = featureRules[featureName].match;
            if (Drupal.personalize.targetingOperators.hasOwnProperty(operator)) {
              if (Drupal.personalize.targetingOperators[operator](visitorContext[key], match)) {
                // The feature string was created by the agent responsible for consuming
                // it, so only that agent knows how to split it up into its key and
                // value components.
                var context = Drupal.personalize.agents[agentType].featureToContext(featureName);
                // Now add the value that reflects this matched rule.
                newVisitorContext[key].push(context.value);
              }
            }
          }
        }
      }
    }
    return newVisitorContext;
  };

  /**
   * Defines the various operations that can be performed to evaluate
   * explicit targeting rules.
   */
  Drupal.personalize.targetingOperators = {
    'contains': function(actualValue, matchValue) {
      return actualValue.indexOf(matchValue) !== -1;
    },
    'starts': function(actualValue, matchValue) {
      return actualValue.indexOf(matchValue) === 0;
    },
    'ends': function(actualValue, matchValue) {
      return actualValue.indexOf(matchValue, actualValue.length - matchValue.length) !== -1;
    },
    'numgt': function(actualValue, matchValue) {
      return actualValue > matchValue;
    },
    'numlt': function(actualValue, matchValue) {
      return actualValue < matchValue;
    }
  };

  /**
   * User Context object.
   *
   * This object holds the context for the active user which will be used
   * as the basis of personalization. Agents may add additional information
   * to this object as they work with it, or other code may place context
   * within this object which can be used later by agents or used
   * on subsequent page loads.
   */
  Drupal.personalize.visitor_context = Drupal.personalize.visitor_context || {};
  Drupal.personalize.visitor_context.user_profile_context = {
    'getContext': function(enabled) {
      if (!Drupal.settings.hasOwnProperty('personalize_user_profile_context')) {
        return [];
      }
      var i, context_values = {};
      for (i in enabled) {
        if (enabled.hasOwnProperty(i) && Drupal.settings.personalize_user_profile_context.hasOwnProperty(i)) {
          context_values[i] = Drupal.settings.personalize_user_profile_context[i];
        }
      }
      return context_values;
    }
  };

  /**
   * Reads a visitor context item from localStorage.
   *
   * @param key
   *   The name of the context item to retrieve.
   * @returns {*}
   *   The value of the specified context item or null if not found or
   *   if not configured to store visitor context in localStorage.
   */
  Drupal.personalize.visitor_context_read = function(key) {
    if (!Drupal.settings.personalize.cacheVisitorContext) {
      return null;
    }

    var full_key = 'Drupal.personalize:visitor_context:' + key;
    return Drupal.personalize.localStorage.read(full_key);
  };

  /**
   * Writes a visitor context item to localStorage.
   *
   * Checks if the site is configured to allow storing of visitor
   * context items in localStorage and does nothing if not.
   *
   * @param key
   *   The name of the context item to store.
   * @param value
   *   The value of the context item to store.
   */
  Drupal.personalize.visitor_context_write = function(key, value) {
    if (!Drupal.settings.personalize.cacheVisitorContext) {
      return;
    }
    var full_key = 'Drupal.personalize:visitor_context:' + key;
    Drupal.personalize.localStorage.write(full_key, value);
  };

  /**
   * Processes all multivariate tests on the page.
   *
   * @param settings
   *   A Drupal settings object.
   */
  function processMVTs(settings) {
    var i, mvt_name, mvt, agent_info, option_set;
    if (settings.personalize.hasOwnProperty('mvt')) {
      for (mvt_name in settings.personalize.mvt) {
        if (settings.personalize.mvt.hasOwnProperty(mvt_name)) {
          // Extract agent and decision info from the mvt settings.
          mvt = settings.personalize.mvt[mvt_name];
          agent_info = Drupal.settings.personalize.agent_map[mvt.agent];
          for (i in mvt.option_sets) {
            if (mvt.option_sets.hasOwnProperty(i)) {
              option_set = mvt.option_sets[i];
              option_set.decision_point = mvt_name;
              option_set.agent = mvt.agent;
              option_set.agent_info = agent_info;
              processOptionSet(option_set);
            }
          }
        }
      }
    }
  }

  /**
   * Processes all Option Sets on the page.
   *
   * @param settings
   *   A Drupal settings object.
   */
  function processOptionSets(settings) {
    var i, osid, mvt, agent_info, option_set;
    if (settings.personalize.hasOwnProperty('option_sets')) {
      for (osid in settings.personalize.option_sets) {
        if (settings.personalize.option_sets.hasOwnProperty(osid)) {
          // Extract agent and decision info from the option set settings.
          option_set = settings.personalize.option_sets[osid];
          option_set.agent_info = Drupal.settings.personalize.agent_map[option_set.agent];
          processOptionSet(option_set)
        }
      }
    }
  }

  function readDecisionsfromStorage(agent_name, point) {
    if (!sessionID || !Drupal.settings.personalize.agent_map[agent_name].cache_decisions) {
      return null;
    }
    var key = 'Drupal.personalize:' + agent_name + ':' + sessionID + ':' + point;
    return Drupal.personalize.localStorage.read(key);
  }

  function writeDecisionsToStorage(agent_name, point, decisions) {
    if (!sessionID || !Drupal.settings.personalize.agent_map[agent_name].cache_decisions) {
      return;
    }
    var key = 'Drupal.personalize:' + agent_name + ':' + sessionID + ':' + point;
    Drupal.personalize.localStorage.write(key, decisions);
  }

  /**
   * Triggers all decisions needing to be made for the current page.
   */
  function triggerDecisions(settings) {
    var agent_name, agent, point, decisions, callback;

    // Given a set of callbacks and a selected option for each decision
    // made, calls the callbacks for each decision, passing them the
    // selected option.
    function callCallbacksWithSelection(callbacks, selection) {
      for (var i in selection) {
        if (selection.hasOwnProperty(i) && callbacks.hasOwnProperty(i)) {
          for (var j = 0; j < callbacks[i].length; j++) {
            callbacks[i][j].call(undefined, selection[i]);
          }
          // If the option set is shareable, push the decision to the
          // URL.
          if (optionSetIsStateful(i)) {
            var state = {};
            state[i] = selection[i];
            $.bbq.pushState(state);
          }
        }
      }
    }

    // Checks the choice for each decision against the valid set of choices
    // for that decision. Returns false if any of the decisions has an invalid
    // choice.
    function decisionsAreValid(decisionsToCheck, validDecisions) {
      var i;
      for (i in decisionsToCheck) {
        if (decisionsToCheck.hasOwnProperty(i)) {
          if (!validDecisions.hasOwnProperty(i) || validDecisions[i].indexOf(decisionsToCheck[i]) == -1) {
            return false;
          }
        }
      }
      return true;
    }

    // Loop through all agents and ask them for decisions.
    for (agent_name in agents) {
      if (agents.hasOwnProperty(agent_name)) {
        // Keep track of the decisions we process per agent.
        processedDecisions[agent_name] = processedDecisions[agent_name] || {};
        agent = agents[agent_name];
        for (point in agent.decisionPoints) {
          if (agent.decisionPoints.hasOwnProperty(point)) {
            // Only continue if this decision point hasn't previously been processed.
            if (!processedDecisions[agent_name][point]) {
              processedDecisions[agent_name][point] = 1;
              // Only talk to the agent if the decision hasn't already been
              // made and cached locally.
              decisions = readDecisionsfromStorage(agent_name, point);
              // Decisions from localStorage need to be checked against the known valid
              // set of choices because they may be stale (e.g. if an option has been
              // removed after being stored in a user's localStorage).
              if (!decisionsAreValid(decisions, agent.decisionPoints[point].choices)) {
                decisions = null;
              }
              if (decisions != null) {
                callCallbacksWithSelection(agent.decisionPoints[point].callbacks, decisions);
              }
              else {
                callback = (function(inner_agent_name, inner_agent, inner_point) {
                  return function(selection) {
                    // Save to local storage.
                    writeDecisionsToStorage(inner_agent_name, inner_point, selection)
                    // Call the per-option-set callbacks.
                    callCallbacksWithSelection(inner_agent.decisionPoints[inner_point].callbacks, selection);
                  };
                })(agent_name, agent, point);
                var decisionAgent = Drupal.personalize.agents[agent.agentType];
                if (!decisionAgent || typeof decisionAgent.getDecisionsForPoint !== 'function') {
                  // If for some reason we can't find the agent responsible for this decision,
                  // just use the fallbacks.
                  var fallbacks = agent.decisionPoints[point].fallbacks;
                  decisions = {};
                  for (var key in fallbacks) {
                    if (fallbacks.hasOwnProperty(key) && agent.decisionPoints[point].choices.hasOwnProperty(key)) {
                      decisions[key] = agent.decisionPoints[point].choices[key][fallbacks[key]];
                    }
                  }
                  callCallbacksWithSelection(agent.decisionPoints[point].callbacks, decisions);
                  return;
                }
                decisionAgent.getDecisionsForPoint(agent_name, agent.visitorContext, agent.decisionPoints[point].choices, point, agent.decisionPoints[point].fallbacks, callback);
              }
            }
          }
        }
      }
    }
  }

  /**
   * Returns whether the specified option set is stateful.
   *
   * Stateful option sets cause the chosen option to be reflected in the
   * url. This way, if the url is shared with a friend, the friend will
   * see the same option for that option set.
   *
   * @param osid
   *   The option set ID
   *
   * @return boolean
   *   true if the option set is stateful, false otherwise.
   */
  function optionSetIsStateful(osid) {
    if (!Drupal.settings.personalize.option_sets.hasOwnProperty(osid)) {
      return false;
    }
    var stateful = Drupal.settings.personalize.option_sets[osid].stateful;
    return stateful == "1";
  }

  /**
   * Returns the preselected option for the given option set, if one
   * has been set.
   *
   * @param osid
   *   The option set ID
   * @returns string
   *   The selection for the option set or false if none exists.
   */
  function getPreselection(osid) {
    if (optionSetIsStateful(osid) && (selection = $.bbq.getState(osid, true))) {
      return selection;
    }
    if (Drupal.settings.personalize.preselected && Drupal.settings.personalize.preselected.hasOwnProperty(osid)) {
      return Drupal.settings.personalize.preselected[osid];
    }
    return false;
  }

  /**
   * Private function that parses information from the passed in
   * option set and builds up the decision tree for the relevant
   * agent.
   *
   * @param option_set
   *   An object representing an option sett.
   */
  function processOptionSet(option_set) {
    // Bail if this option set has already been processeed.
    for (var i in processedOptionSets) {
      if (option_set.osid == processedOptionSets[i]) {
        return;
      }
    }

    var executor = option_set.executor == undefined ? 'show' : option_set.executor,
      osid = option_set.osid,
      agent_name = option_set.agent,
      agent_info = option_set.agent_info,
      // If we have an empty or undefined decision name, use the osid.
      decision_name = option_set.decision_name == undefined || option_set.decision_name == '' ? osid : option_set.decision_name,
      // If we have an empty or undefined decision point, use the decision name.
      decision_point = option_set.decision_point == undefined || option_set.decision_point == '' ? decision_name : option_set.decision_point,
      choices = option_set.option_names,
      $option_set = $(option_set.selector);
    // Mark this Option Set as processed so it doesn't get processed again.
    processedOptionSets.push(option_set.osid);

    var chosenOption = null, fallbackIndex = 0;
    if (option_set.hasOwnProperty('winner') && option_set.winner !== null) {
      fallbackIndex = option_set.winner;
    }
    // If we have a pre-selected decision for this option set, just
    // use that.
    if (selection = getPreselection(osid)) {
      chosenOption = selection;
    }
    // If we're in admin mode or the campaign is paused, just show the first option,
    // or, if available, the "winner" option.
    else if (adminMode || !agent_info.active) {
      chosenOption = choices[fallbackIndex];
    }
    // If we now have a chosen option, just call the executor and be done.
    if (chosenOption !== null) {
      // We need the check for $option_set.length because the Option Set isn't
      // necessarily in the DOM - it could be part of an MVT where not all Option
      // Sets are present on the page.
      if ($option_set.length > 0 && Drupal.personalize.executors.hasOwnProperty(executor)) {
        Drupal.personalize.executors[executor].execute($option_set, chosenOption, osid);
      }
      // Either way, no further processing should take place.
      return;
    }

    if (!agent_info) {
      return;
    }
    var agent_type = agent_info.type;
    if (agent_type == undefined) {
      agent_type = 'default_agent';
    }

    var visitor_context = getVisitorContext(agent_name, agent_type, agent_info.enabled_contexts);

    // Build up the agent data, organized into decision points and decisions.
    agents[agent_name] = agents[agent_name] || {
      agentType: agent_type,
      visitorContext: visitor_context,
      decisionPoints: {}
    };
    agents[agent_name].decisionPoints[decision_point] =
       agents[agent_name].decisionPoints[decision_point] || { choices: {}, callbacks: {}, fallbacks: {}};

    if (!agents[agent_name].decisionPoints[decision_point].choices[decision_name]) {
      // The choices for a given decision are the same regardless of the number of
      // different option sets using it.
      agents[agent_name].decisionPoints[decision_point].choices[decision_name] = choices;
    }
    if (!agents[agent_name].decisionPoints[decision_point].fallbacks[decision_name]) {
      // The fallback for a given decision also has to be the same for each option
      // set using it.
      agents[agent_name].decisionPoints[decision_point].fallbacks[decision_name] = fallbackIndex;
    }

    agents[agent_name].decisionPoints[decision_point].callbacks[decision_name] =
      agents[agent_name].decisionPoints[decision_point].callbacks[decision_name] || [];
    // Add a callback for this option set to the decision point.
    if ($option_set.length > 0) {
      agents[agent_name].decisionPoints[decision_point].callbacks[decision_name].push(function(decision) {
        Drupal.personalize.executors[executor].execute($option_set, decision, osid);
        // Fire an event so other code can respond to the decision.
        $(document).trigger('personalizeDecision', [$option_set, decision, osid]);
      });
    }
    else {
      // If it's a phantom Option Set, i.e. one that hasn't actually been rendered on
      // the page, just pass an empty callback function.
      agents[agent_name].decisionPoints[decision_point].callbacks[decision_name].push(function(decision) {});
    }
  }

  // Keeps track of processed listeners so we don't subscribe them more than once.
  var processedListeners = {};

  /**
   * Add an action listener for client-side goal events.
   */
  function addActionListener(settings) {
    if (Drupal.hasOwnProperty('visitorActions') && !adminMode) {
      var events = {}, new_events = 0;
      for (var eventName in settings.personalize.actionListeners) {
        if (settings.personalize.actionListeners.hasOwnProperty(eventName) && !processedListeners.hasOwnProperty(eventName)) {
          processedListeners[eventName] = 1;
          events[eventName] = settings.personalize.actionListeners[eventName];
          new_events++;
        }
      }
      if (new_events > 0) {
        var callback = function(eventName, jsEvent) {
          if (events.hasOwnProperty(eventName)) {
            var goals = events[eventName];
            for (var i in goals) {
              if (goals.hasOwnProperty(i)) {
                var agent = settings.personalize.agent_map[goals[i].agent];
                if (agent !== undefined) {
                  Drupal.personalize.agents[agent.type].sendGoalToAgent(goals[i].agent, eventName, goals[i].value, jsEvent);
                }
              }
            }
          }
        };
        Drupal.visitorActions.publisher.subscribe(callback);
      }
    }
  }

/**
 * Returns an object for reading from and writing to localStorage.
 */
Drupal.personalize.localStorage = (function() {
  var supportsHtmlLocalStorage;
  var wasMaintained = false;

  function supportsLocalStorage() {
    if (supportsHtmlLocalStorage != undefined) {
      return supportsHtmlLocalStorage;
    }
    try {
      supportsHtmlLocalStorage = 'localStorage' in window && window['localStorage'] !== null;
    } catch (e) {
      supportsHtmlLocalStorage = false;
    }
    return supportsHtmlLocalStorage;
  };

  return {
    read: function(key) {
      if (!supportsLocalStorage()) { return null; }
      var store = localStorage;
      var stored = store.getItem(key);
      if (stored) {
        var record = JSON.parse(stored);
        if (record.val) {
          return record.val;
        }
      }
      return null;
    },
    write: function(key, value) {
      if (!supportsLocalStorage()) { return; }
      var store = localStorage;
      var record = {ts:new Date().getTime(), val:value};
      store.setItem(key, JSON.stringify(record));
    },
    maintain: function(str) {
      if (!supportsLocalStorage()) { return; }
      if (wasMaintained) { return; }
      var store = localStorage;
      // Cache expiration stored in minutes.
      var cachingMaxAge = Drupal.settings.personalize.cacheExpiration * 60 * 1000;
      for (var i = 0; i < store.length; i++) {
        var key = store.key(i);
        if (key.indexOf(str) == 0) {
          var stored = store.getItem(key);
          if (stored) {
            var record = JSON.parse(stored);
            if (record.ts && (record.ts + cachingMaxAge) < new Date().getTime()) {
              store.removeItem(key);
            }
          }
        }
      }
      wasMaintained = true;
    }
  };

})();

})(jQuery);
