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
    // Ignore any clicks from the links in the title suffix.
    if ($(event.target).parents('.personalize-admin-content-title-suffix').length > 0) {
      return;
    }
    if ($(event.target).hasClass('personalize-collapsible')) {
      $container = $(event.target);
    } else {
      $container = $(event.target).parents('.personalize-collapsible');
    }
    if ($container.length == 0) {
      return;
    }
    Drupal.personalize.admin.togglePersonalizeCollapse($container);
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  /**
   * Toggle the collapse/editing state for a collapsible admin container.
   *
   * @param $container
   *   The jQuery container to toggle.
   */
  Drupal.personalize.admin.togglePersonalizeCollapse = function ($container) {
    var closedText = Drupal.t('edit'),
      openText = Drupal.t('close'),
      label = $container.hasClass('personalize-collapsed') ? openText : closedText;
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

})(jQuery);
