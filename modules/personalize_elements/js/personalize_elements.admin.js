(function ($) {

  Drupal.personalizeElements = Drupal.personalizeElements || {};
  /**
   * Handles setting the initial value for option labels as element content is entered.
   *
   * This is to allow a default option label that has meaning and rather than
   * forcing the user to adjust this for each content variation.
   */
  Drupal.behaviors.personalizeElementsOptionLabel = {
    attach: function(context, settings) {
      var maxOptionLabelLength = 20;

      Drupal.personalizeElements.changedOptionLabels = Drupal.personalizeElements.changedOptionLabels || [];

      // Update the appropriate option label when an element is selected so long
      // as the user has not yet changed the label.
      $('.personalize-elements-add-content', context).keyup(function(e) {
        var $optionLabel = $(this).parents('.personalize-elements-option-content-element').prev('.personalize-elements-option-label-element').find('.personalize-elements-add-option-label');
        if (Drupal.personalizeElements.changedOptionLabels.indexOf($optionLabel.attr('id')) >= 0) {
          // The user has already changed the label.
          return;
        }
        // Limit the text used as the label.
        var newLabel = $(this).val();
        var truncateLength = Math.min(maxOptionLabelLength, newLabel.length);
        $optionLabel.val(newLabel.substring(0, truncateLength));
      });

      // Once the user updates the option label it should no longer be changed
      // automatically.
      $('#personalize-elements-form .personalize-elements-add-option-label', context).change(function(e) {
        Drupal.personalizeElements.changedOptionLabels.push($(this).attr('id'));
      });
    }
  }

})(jQuery);
