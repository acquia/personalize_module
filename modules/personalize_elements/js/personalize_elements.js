(function ($) {

  Drupal.personalize = Drupal.personalize || {};
  Drupal.personalize.executors = Drupal.personalize.executors || {};
  Drupal.personalize.executors.personalizeElements = {
    execute: function($option_set, choice_name, osid, preview) {
      if (typeof preview === 'undefined') { preview = false; }
      var element = Drupal.settings.personalize_elements.elements[osid];
      if (element == undefined) return;
      if (Drupal.personalizeElements.hasOwnProperty(element.variation_type) && typeof Drupal.personalizeElements[element.variation_type].execute === 'function') {
        if (preview && !element.previewable) {
          // If this variation is not previewable in the normal way, we can just reload
          // the page with the selected option.
          var base = Drupal.settings.basePath;
          var path = location.pathname && /^(?:[\/\?\#])*(.*)/.exec(location.pathname)[1] || '';
          var param = Drupal.settings.personalize.optionPreselectParam;
          document.location.href = base + path + '?' + param + '=' + osid + '--' + choice_name;
        }
        else {
          var choices = Drupal.settings.personalize.option_sets[osid].options,  selectedChoice = null, selectedContent = null, isControl = false, choiceIndex = null, choice = null;
          if (choice_name) {
            for (choiceIndex in choices) {
              choice = choices[choiceIndex];
              if (choice.option_id == choice_name) {
                selectedChoice = choice;
                break;
              }
            }
          }
          // This might be a "do nothing" option, either because it is the control option
          // or because it is an option with no content, in which case we treat is as the
          // control option.
          if (choice_name == Drupal.settings.personalize.controlOptionName || !selectedChoice || !selectedChoice.hasOwnProperty('personalize_elements_content')) {
            isControl = true;
          }
          else {
            selectedContent = selectedChoice.personalize_elements_content;
          }
          if ($option_set.length == 0 && element.variation_type != 'runJS') {
            // Only the runJS can do something with an empty Option Set.
            return;
          }
          Drupal.personalizeElements[element.variation_type].execute($option_set, selectedContent, isControl, osid);
          Drupal.personalize.executorCompleted($option_set, choice_name, osid);
        }
      }
    }
  };

  Drupal.personalizeElements = {};

  Drupal.personalizeElements.runJS = {
    execute : function ($selector, selectedContent, isControl, osid) {
      if (!isControl) {
        // The contents of the selectedContent variable were written by someone
        // who was explicitly given permission to write JavaScript to be executed
        // on this site. Mitigating the evil of the eval.
        eval(selectedContent);
      }
    }
  };

  Drupal.personalizeElements.replaceHtml = {
    controlContent : {},
    execute : function($selector, selectedContent, isControl, osid) {
      // We need to keep track of how we've changed the element, if only
      // to support previewing different options.
      if (!this.controlContent.hasOwnProperty(osid)) {
        this.controlContent[osid] = $selector.html();
      }
      if (isControl) {
        $selector.html(this.controlContent[osid]);
      }
      else {
        $selector.html(selectedContent);
      }

    }
  };

  Drupal.personalizeElements.addClass = {
    addedClasses : {},
    execute : function($selector, selectedContent, isControl, osid) {
      // We need to keep track of how we've changed the element, if only
      // to support previewing different options.
      if (!this.addedClasses.hasOwnProperty(osid)) {
        this.addedClasses[osid] = [];
      }
      for (var i in this.addedClasses[osid]) {
        if (this.addedClasses[osid].hasOwnProperty(i)) {
          $selector.removeClass(this.addedClasses[osid].shift());
        }
      }
      if (!isControl) {
        $selector.addClass(selectedContent);
        this.addedClasses[osid].push(selectedContent);
      }
    }
  };

  Drupal.personalizeElements.appendHtml = {
    execute : function($selector, selectedContent, isControl, osid) {
      var id = 'personalize-elements-append-' + osid;
      $('#' + id).remove();
      if (!isControl) {
        $selector.append('<span id="' + id + '">' + selectedContent + '</span>');
      }
    }
  };

  Drupal.personalizeElements.prependHtml = {
    execute : function($selector, selectedContent, isControl, osid) {
      var id = 'personalize-elements-prepend-' + osid;
      $('#' + id).remove();
      if (!isControl) {
        $selector.prepend('<span id="' + id + '">' + selectedContent + '</span>');
      }
    }
  };

})(jQuery);
