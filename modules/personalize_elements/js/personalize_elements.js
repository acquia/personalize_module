(function ($) {

  Drupal.personalize = Drupal.personalize || {};
  Drupal.personalize.executors = Drupal.personalize.executors || {};
  Drupal.personalize.executors.personalizeElements = {
    execute: function($option_set, choice_name, osid) {
      var element = Drupal.settings.personalize_elements.elements[osid];
      if (element == undefined) return;
      if (Drupal.personalizeElements.hasOwnProperty(element.variation_type) && typeof Drupal.personalizeElements[element.variation_type].execute === 'function') {
        var choices = Drupal.settings.personalize.option_sets[osid].options,  choiceNames = Drupal.settings.personalize.option_sets[osid].option_names, choiceIndex = choiceNames.indexOf(choice_name);
        var selectedContent = choices[choiceIndex]['personalize_elements_content'];
        Drupal.personalizeElements[element.variation_type].execute($option_set, selectedContent);
        Drupal.personalize.executorCompleted($option_set, choice_name, osid);
      }
    }
  };

  Drupal.personalizeElements = {};

  Drupal.personalizeElements.replaceText = {
    execute : function($selector, selectedContent) {
      $selector.text(selectedContent);
    }
  };

  Drupal.personalizeElements.addClass = {
    addedClasses : [],
    execute : function($selector, selectedContent) {
      for (var i in this.addedClasses) {
        if (this.addedClasses.hasOwnProperty(i)) {
          $selector.removeClass(this.addedClasses.shift(i));
        }
      }
      $selector.addClass(selectedContent);
      this.addedClasses.push(selectedContent);
    }
  };

  Drupal.personalizeElements.appendHtml = {
    execute : function($selector, selectedContent) {
      var id = 'personalize-elements-append';
      $('#' + id).remove();
      $selector.append('<div id="' + id + '">' + selectedContent + '</div>');
    }
  };

  Drupal.personalizeElements.prependHtml = {
    execute : function($selector, selectedContent) {
      var id = 'personalize-elements-prepend';
      $('#' + id).remove();
      $selector.prepend('<div id="' + id + '">' + selectedContent + '</div>');
    }
  };

})(jQuery);
