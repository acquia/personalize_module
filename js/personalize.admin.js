(function ($) {

  Drupal.personalize = Drupal.personalize || {};
  Drupal.personalize.admin = Drupal.personalize.admin || {};

  /**
   * Make personalize admin content containers collapsible.
   */
  Drupal.behaviors.personalizeCollapse = {
    attach: function (context, settings) {
      $('.personalize-collapsible', context).once().each(function() {
        var container = $(this),
            trigger = container.children('.personalize-collapse-edit'),
            closedText = trigger.text(),
            openText = Drupal.t('close');

        trigger.click(function ( event ) {
          event.preventDefault();
          var label = container.hasClass('personalize-collapsed') ? openText : closedText;
          container.toggleClass('personalize-collapsed');
          $(this).text(label);
        });
      });
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
    attach: function(context, settings) {
      $('.personalize-admin-content-header', context).once().each(function() {
        var $container = $(this).parents('.personalize-collapsible');
        $container.find('.personalize-admin-content-title').after('<div class="personalize-admin-content-title-suffix"></div>');
        $('.personalize-admin-content-title-suffix', $container).append($(this));
      });
    }
  }

  /**
   * Retrieves the requested form from the behavior context.
   *
   * The form could be
   * part of the context or could be the context itself.
   *
   * @param formId
   *   The id attribute of the form to retrieve.  This can be the base form
   *   id if the actual id has additional information at the end.
   * @param context
   *   The Drupal behavior attach content.
   *
   * @returns {*|HTMLElement}
   *   The jQuery form element.
   */
  Drupal.personalize.getFormFromContext = function (formId, context) {
    var $form = $('#' + formId, context);
    if ($form.length === 0) {
      if ($(context).is('#' + formId)) {
        return $(context);
      }
    }
    return $form;
  }

  Drupal.personalize.addCollapsedContent = function (content, context) {
    var wrappedContent = content.map(function(currentValue) {
      return '<div class="personalize-admin-content-collapsed-wrapper">' + currentValue + '</div>';
    });

    var $collapsedDiv = $('.personalize-admin-content-collapsed', context);
    if ($collapsedDiv.length > 0) {
      $collapsedDiv.html(wrappedContent.join(''));
    } else {
      $('.personalize-admin-content-content', context).before('<div class="personalize-admin-content-collapsed">' + wrappedContent.join('') + '</div>');
    }
  }

  /**
   * Handle secondary collapsed display for the content variation form.
   */
  Drupal.behaviors.personalizeContentVariationSecondaryTitle = {
    attach: function (context, settings) {
      var $optionSetsForm = Drupal.personalize.getFormFromContext('personalize-agent-option-sets-form', context);

      if ($optionSetsForm.length === 0) {
        return;
      }

      // Get all the content variant titles
      var collapsedContent = [];
      $('.personalize-admin-content-content > fieldset', $optionSetsForm).each(function() {
        var includeContent = '';
        includeContent += $(this).find('.fieldset-title:first').text();
        if (includeContent.length > 0) {
          collapsedContent.push(includeContent);
        }
      });
      Drupal.personalize.addCollapsedContent(collapsedContent, $optionSetsForm);
    }
  }

  /**
   * Handle secondary collapsed display for the goals form.
   */
  Drupal.behaviors.personalizeGoalsSecondaryTitle = {
    attach: function(context, settings) {
      var $goalsForm = Drupal.personalize.getFormFromContext('personalize-agent-goals-form', context);
      if ($goalsForm.length === 0) {
        return;
      }

      // Get all the content variant tiles.
      var collapsedContent = [];
      $('#personalize-goals .personalize-goal', $goalsForm).each(function() {
        var includeContent = '';
        var actionName = '';
        var $selectedOption = $(this).find('select.personalize-goal-action option:selected');

        if ($selectedOption.length > 0 && $selectedOption.val().length > 0) {
          actionName = $selectedOption.text();
          if (actionName.length) {
            includeContent += '<h2 class="personalize-admin-content-title">' + actionName + '</h2>';
          }
          if (includeContent.length > 0) {
            collapsedContent.push(includeContent);
          }
        }
      });
      Drupal.personalize.addCollapsedContent(collapsedContent, $goalsForm);
    }
  }

  /**
   * Handle secondary collapsed display for MVT form.
   */
  Drupal.behaviors.personalizeMVTSecondaryTitle = {
    attach: function(context, settings) {
      var $mvtForm = Drupal.personalize.getFormFromContext('personalize-agent-mvt-form', context);
      if ($mvtForm.length === 0) {
        return;
      }

      var collapsedContent = [];
      var editString = Drupal.t('edit');
      var editRegex = new RegExp(' - ' + editString + '$');
      $('.personalize-admin-content-content .personalize-admin-content', $mvtForm).each(function() {
        var title = $(this).find('.personalize-admin-content-title').text();
        includeContent = '<h2 class="personalize-admin-content-title">' + title.replace(editRegex,'') + '</h2>';
        collapsedContent.push(includeContent);
      });
      Drupal.personalize.addCollapsedContent(collapsedContent, $mvtForm);
    }
  }

  /**
   * Handle show/hide of optional admin information.
   */
  Drupal.behaviors.personalizeAdminOptional = {
    attach: function(context, settings) {
      $('.personalize-admin-optional', context).once().each(function() {
        var closedText = Drupal.t('Info');
        var openedText = Drupal.t('Hide info');
        var $optional = $(this);
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
  }

})(jQuery);
