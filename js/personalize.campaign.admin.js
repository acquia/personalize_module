(function ($) {

  Drupal.personalize = Drupal.personalize || {};
  Drupal.personalize.admin = Drupal.personalize.admin || {};
  Drupal.personalize.admin.campaign = Drupal.personalize.admin.campaign || {};

  /**
   * Campaign wizard page functionality.
   */
  Drupal.behaviors.personalizeCampaignEdit = {
    attach: function (context, settings) {
      // Add in context link for goals.
      $('.personalize-goal-action', context).once('personalize-goal-action', function() {
        $(this).bind('change', function(e) {
          var val = e.currentTarget.selectedOptions[0].value;
          if (val.indexOf(Drupal.settings.basePath + 'admin/structure/visitor_actions/add-in-context') === 0) {
            document.location.href = val;
          }
        })
      });
    }
  };

  // @todo: Investigate whether to add in JS prompts when changing
  // information on a running campaign that would cause the campaign to be
  // paused.

  /**
   * Handle show/hide of optional admin information.
   */
  Drupal.behaviors.personalizeAdminOptional = {
    attach: function (context, settings) {
      $('.personalize-admin-optional', context).once().each(function() {
        var closedText = Drupal.t('Info'),
          openedText = Drupal.t('Hide info'),
          $optional = $(this);
        // The optional content will be nested within parent text.
        $optional.before('<a href="#" class="personalize-admin-optional-trigger">' + closedText + '</a>');
        $('.personalize-admin-optional-trigger',$optional.parent()).click(function(e) {
          $optional.slideToggle();
          if ($(this).text() == closedText) {
            $(this).text(openedText);
          } else {
            $(this).text(closedText);
          }
          return false;
        });
        $optional.hide();
      });
    }
  };

  /**
   * Scroll to a specific goal that has been requested in the url query.
   *
   * Goal would be passed as ?goal=x where x is the goal id.
   */
  Drupal.behaviors.personalizeGoalSpecified = {
    attach: function (context, settings) {
      $('body').once(function() {
        // Get the query parameter for a passed in goal id.
        var match = RegExp('[?&]goal=([^&]*)').exec(window.location.search);
        var goalId = match && decodeURIComponent(match[1].replace(/\+/g, ' '));
        var $goal = $('#personalize-goal-' + goalId);
        if ($goal.length > 0) {
          Drupal.personalize.admin.campaign.openToGoal($goal);
        }
      });
    }
  }

  /**
   * Scroll to a new goal that has just been added to the admin page.
   */
  Drupal.behaviors.personalizeGoalAdded = {
    attach: function (context, settings) {
      var $newGoal = $('#personalize-agent-goals-form .personalize-goal-add', context).last();
      if ($newGoal.length == 0) {
        return;
      }
      Drupal.personalize.admin.campaign.openToGoal($newGoal);
    }
  };

  /**
   * Open and scroll to a specific goal within the goals list.
   *
   * @param $goal
   *   The jQuery instance of the goal.
   */
  Drupal.personalize.admin.campaign.openToGoal = function($goal) {
    var $fieldset = $('#personalize-goals').parents('fieldset');
    // Open the goals form if it is collapsed.
    if ($fieldset.hasClass('collapsed')) {
      Drupal.toggleFieldset($fieldset);
      $fieldset.parent('.personalize-admin-content').removeClass('personalize-collapsed');
    }
    // Now open the selected goal.
    if ($goal.hasClass('collapsed')) {
      Drupal.toggleFieldset($goal);
    }
    // Now get the location of the requested goal section and scroll to it.
    var offset = $goal.offset();
    var offsetTop = offset.top + 100; // scroll to just above the new goal
    $('html, body').animate({
      scrollTop: offsetTop
    }, 1000, function() {
      $goal.find('select').first().focus();
    });
  }

})(jQuery);
