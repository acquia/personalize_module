(function ($) {

  Drupal.personalizeBlocks = Drupal.personalizeBlocks || {};
  /**
   * Handles setting the initial value for option labels as blocks are selected.
   *
   * This is to allow a default option label that has meaning and rather than
   * forcing the user to adjust this for each block selected.
   */
  Drupal.behaviors.personalizeBlockOptionLabel = {
    attach: function(context, settings) {
      Drupal.personalizeBlocks.changedOptionLabels = Drupal.personalizeBlocks.changedOptionLabels || [];

      // Update the appropriate option label when a block is selected so long
      // as the user has not yet changed the label.
      $('.personalize-blocks-add-block-select', context).once().change(function(e) {
        var $optionLabel = $(this).parents('tr').find('.personalize-blocks-add-option-label');
        if (Drupal.personalizeBlocks.changedOptionLabels.indexOf($optionLabel.attr('id')) >= 0) {
          // The user has already changed the label.
          return;
        }
        // Text is displayed in the format "Friendly (module:machine)".
        var blockRe = /\s\(([a-zA-Z]|\d)+:([a-zA-Z]|\d)+\)$/;
        $optionLabel.val($(this).find('option:selected').text().replace(blockRe, ''));
      });

      // Once the user updates the option label it should no longer be changed
      // automatically.
      $('.personalize-blocks-add-option-label', context).once().change(function(e) {
        Drupal.personalizeBlocks.changedOptionLabels.push($(this).attr('id'));
      });
    }
  }

})(jQuery);
