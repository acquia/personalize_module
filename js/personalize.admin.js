(function ($) {

  Drupal.personalize = Drupal.personalize || {};
  Drupal.personalize.admin = Drupal.personalize.admin || {};

  /**
   * Campaign edit page functionality.
   *
   * Make personalize admin content containers collapsible.
   * Adds add in context link for goals.
   */
  Drupal.behaviors.personalizeCampaignEdit = {
    attach: function (context, settings) {
      // Add in context link for goals.
      $('.personalize-goal-action', context).once('personalize-goal-action', function() {
        $(this).bind('change', function(e) {
          var val = e.currentTarget.selectedOptions[0].value;
          if (val.indexOf('/admin/structure/visitor_actions/add-in-context') === 0) {
            document.location.href = val;
          }
        })
      });
      $('.personalize-admin-content', context).once(function() {
        // If the fieldset is collapsed, then set this style to be collapsed.
        var $holder = $(this);
        var $fieldset = $holder.children('fieldset');
        if (!$fieldset) {
          return;
        }
        if (!$fieldset.hasClass('collapsible')) {
          return;
        }
        if ($fieldset.hasClass('collapsed')) {
          $holder.addClass('personalize-collapsed');
        }
        // When the fieldset title is clicked, then add toggle the collapsed class.
        $('.fieldset-title.personalize-admin-content-title', $fieldset).on('click', function(e) {
          $holder.toggleClass('personalize-collapsed');
        });
      });
    }
  };

  /**
   * Campaign edit form submission handling.
   *
   * Adds a confirmation prompt to the user when they are about to make changes
   * to a running campaign that will result in pausing the campaign.
   */
  Drupal.behaviors.personalizeCampaignEditFormHandling = {
    attach: function (context, settings) {
      // Add a handler to form submits that trigger campaign status changes.
      $('input.personalize-admin-warn', context).once().each(function() {
        var currentCampaign = Drupal.settings.personalize.activeCampaign;
        if (typeof currentCampaign === 'undefined') {
          return;
        }
        // Overwrite beforeSubmit for each submit button (no cancel).
        Drupal.ajax[this.id].options.beforeSubmit = function(form_values, $element, options) {
          var campaign = Drupal.settings.personalize.campaigns[currentCampaign];
          if (typeof(campaign) === 'undefined') {
            return;
          }
          if (Drupal.settings.personalize.status && Drupal.settings.personalize.status[campaign.status]) {
            var currentStatus = Drupal.settings.personalize.status[campaign.status];
            if (currentStatus === Drupal.t('Running')) {
              if (confirm(Drupal.t('Making these changes will pause the currently running campaign.  Are you sure you want to continue?'))) {
                return true;
              } else {
                return false;
              }
            }
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
   * Add any summary data to administrative fieldsets.
   */
  Drupal.behaviors.personalizeAdminFieldset = {
    attach: function (context, settings) {
      $('#personalize-agent-option-sets-form .fieldset-wrapper fieldset').once().each(function() {
        var fieldset = this,
          $summary_text = $('.fieldset-wrapper:first .personalize-summary', this);
        if ($summary_text.length == 0) {
          return;
        }
        $('a.fieldset-title:first', this).after('<div class="personalize-admin-content-title-suffix">' + $summary_text.html() + '</div>');
        $summary_text.remove();
      });
    }
  };

  /**
   * Scroll to a new goal that has just been added to the admin page.
   */
  Drupal.behaviors.personalizeGoalAdded = {
    attach: function (context, settings) {
      var $newGoal = $('#personalize-agent-goals-form .personalize-goal-add', context).last();
      if ($newGoal.length == 0) {
        return;
      }
      var offset = $newGoal.offset();
      var offsetTop = offset.top + 100; // scroll to just above the new goal
      $('html, body').animate({
        scrollTop: offsetTop
      }, 1000, function() {
        $newGoal.find('select').first().focus();
      });
    }
  };

})(jQuery);
