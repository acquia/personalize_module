(function ($) {

  Drupal.personalize = Drupal.personalize || {};
  Drupal.personalize.admin = Drupal.personalize.admin || {};

  /**
   * Campaign edit page functionality.
   *
   * Adds add in context link for goals.
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

      // Keep track of if the form has been changed.
      $('#personalize-campaign-wizard').once('personalize-campaign-wizard-dirty', function() {
        $(this).find(':input').change(function(e) {
          $('#personalize-campaign-wizard').data('isDirty', true);
        })
      });

      // Handle checking for changes when using the process bar navigation
      $('#personalize-campaign-wizard-process-bar .personalize-wizard-navigation a').once('personalize-campaign-navigation').click(function(e) {
        var $parentLi = $(this).parents('li');
        if ($parentLi.hasClass('personalize-wizard-navigation-disabled') || $parentLi.hasClass('personalize-wizard-navigation-current')) {
          e.preventDefault();
          e.stopImmediatePropagation();
          return false;
        }
        if ($('#personalize-campaign-wizard').data('isDirty')) {
          // Show a warning.
          if (!window.confirm(Drupal.t('You have unsaved changes.  Are you sure you want to continue?'))) {
            e.preventDefault();
            e.stopImmediatePropagation();
            return false;
          }
        }
      });
    }
  };

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
          Drupal.personalize.admin.openToGoal($goal);
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
      Drupal.personalize.admin.openToGoal($newGoal);
    }
  };

  /**
   * Open and scroll to a specific goal within the goals list.
   *
   * @param $goal
   *   The jQuery instance of the goal.
   */
  Drupal.personalize.admin.openToGoal = function($goal) {
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
