(function ($) {

  Drupal.personalize = Drupal.personalize || {};
  Drupal.personalize.admin = Drupal.personalize.admin || {};

  /**
   * Click handler to toggle editing within a collapsible admin container.
   *
   * The container to toggle is either the target or a parent of the target.
   *
   * @param event
   *   Triggering event.
   */
  Drupal.personalize.admin.toggleClickHandler = function (event) {
    var $container = [];
    if ($(event.target).hasClass('personalize-collapsible')) {
      $container = $(event.target);
    } else {
      $container = $(event.target).parents('.personalize-collapsible');
    }
    if ($container.length == 0) {
      return;
    }
    // Any clicks from links in the title suffix will expand the container.
    if ($(event.target).parents('.personalize-admin-content-title-suffix').length > 0) {
      Drupal.personalize.admin.togglePersonalizeCollapse($container, true);
    } else {
      // Otherwise just toggle.
      Drupal.personalize.admin.togglePersonalizeCollapse($container);
    }
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  /**
   * Toggle the collapse/editing state for a collapsible admin container.
   *
   * @param $container
   *   The jQuery container to toggle.
   * @param open
   *   (Optional) boolean indicating if the container should become open.
   */
  Drupal.personalize.admin.togglePersonalizeCollapse = function ($container, open) {
    var closedText = Drupal.t('edit'),
      openText = Drupal.t('close'),
      label = $container.hasClass('personalize-collapsed') ? openText : closedText;
    if (open === true && !$container.hasClass('personalize-collapsed')) {
      // The container is already open.
      return;
    }
    $container.toggleClass('personalize-collapsed');
    $container.children('personalize-collapse-edit').text(label);
    if ($container.hasClass('personalize-collapsed')) {
      $container.bind('click', Drupal.personalize.admin.toggleClickHandler);
    } else {
      $container.unbind('click', Drupal.personalize.admin.toggleClickHandler);
    }
  };

  /**
   * Campaign edit page functionality.
   *
   * Make personalize admin content containers collapsible.
   * Adds add in context link for goals.
   */
  Drupal.behaviors.personalizeCampaignEdit = {
    attach: function (context, settings) {
      $('.personalize-collapsible', context).once().each(function() {
        var $container = $(this),
            $trigger = $container.children('.personalize-collapse-edit');
        // Title and edit link always toggles editing.
        $trigger.bind('click', Drupal.personalize.admin.toggleClickHandler);
        $('.personalize-admin-content-title', $container).first().bind('click', Drupal.personalize.admin.toggleClickHandler);

        // If it is collapsed, allow click on full div to toggle editing.
        if ($container.hasClass('personalize-collapsed')) {
          $container.bind('click', Drupal.personalize.admin.toggleClickHandler);
        }
      });
      // Add in context link for goals.
      $('.personalize-goal-action', context).once('personalize-goal-action', function() {
        $(this).bind('change', function(e) {
          var val = e.currentTarget.selectedOptions[0].value;
          if (val.indexOf('/admin/structure/visitor_actions/add-in-context') === 0) {
            document.location.href = val;
          }
        })
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
      $('#personalize-agent-form input[type="submit"], #personalize-agent-option-sets-form input[type="submit"]').not('.form-reset, .personalize-add-link, .personalize-delete-context, input[name="toggle_submit"]').once().each(function() {
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
   * Add personalize admin content header sections.
   *
   * This is content that should appear inline with the admin content title.
   * It should be shown regardless of collapsed state of the container.
   */
  Drupal.behaviors.personalizeAdminContentHeader = {
    attach: function (context, settings) {
      $('.personalize-admin-content-header', context).once().each(function() {
        var $container = $(this).parents('.personalize-collapsible');
        $container.find('.personalize-admin-content-title').after('<div class="personalize-admin-content-title-suffix"></div>');
        $('.personalize-admin-content-title-suffix', $container).append($(this));
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
      $('#personalize-agent-option-sets-form .personalize-admin-content-content fieldset').once().each(function() {
        var fieldset = this,
          $summary = $('.fieldset-legend:first .summary', this),
          $summary_text = $('.fieldset-wrapper:first .personalize-summary', this);
        if ($summary_text.length == 0) {
          return;
        }
        if ($summary.length == 0) {
          $summary = $('.fieldset-legend').append('<span class="summary"></span>');
        }
        $summary.html($summary_text.html());
        $summary_text.hide();

        var editText = $('.fieldset-wrapper .personalize-option-set-edit-trigger', fieldset).text(),
          hideText = Drupal.t('hide');
        $('.fieldset-wrapper .personalize-option-set-edit-trigger', fieldset).bind('click', function(e) {
          e.preventDefault();
          $('div.personalize-variation-winner', fieldset).toggleClass('personalize-edit');
          var currentText = $(this).text();
          $(this).text(currentText == editText ? hideText : editText);
        });
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
