(function ($, Drupal) {

  Drupal.personalizeDebug = (function() {

    /**
     * JavaScript regarding the message box that is used for administrative
     * messages.
     */

    /**
     * Creates a message box if one is not present.
     *
     * @return
     *   The jQuery message box.
     */
    function createMessageBox() {
      var $messageBox = getMessageBox();
      if ($messageBox.length == 0) {
        $messageBox = $('<div id="personalize-debug-message-box"><div class="close">' + Drupal.t('Close') + '</div><div class="messages"></div></div>');
        $('.region-page-top').append($messageBox);
        $messageBox.find('.close').bind('click', closeMessageBox);
        // Don't close the message box if you click on it (other than close).
        $messageBox.bind('click', function(e) {
          e.stopPropagation();
        });
      }
      return $messageBox;
    }

    /**
     * Close the message box.
     *
     * @param e
     *   (optional) The event that triggered the close.
     */
    function closeMessageBox(e) {
      var $messageBox = getMessageBox();
      $messageBox.animate({ height:0, opacity:0 }, "slow", function() {
        $(this).addClass('element-hidden');
        // Take off the height/opacity styles - only used for animation.
        $(this).removeAttr('style');
      });
      if (e && e.stopPropagation) {
        e.stopPropagation();
      }
      //$(document).off('click', closeMessageBox);
    }

    /**
     * Helper function to retrieve the message box from the DOM if it exists.
     *
     * @returns jQuery match for message box selector
     */
    function getMessageBox() {
      return $('#personalize-debug-message-box');
    }

    /**
     * Shows the requested message within a message box.
     *
     * @param message
     *   The message to show.
     * @param type
     *   The type of message, e.g. 'ok', 'warn', 'error'
     */
    function showMessageBox(message, type) {
      var $messageBox = createMessageBox();
      var $newMessage = $('<p class="message ' + type + '"></p>');
      $newMessage.html(message);
      $messageBox.find('.messages').append($newMessage);
      // Measure the final height while the box is still hidden.
      var fullHeight = $messageBox.outerHeight();
      // Reset the properties to animate so that it starts hidden.
      //$messageBox.css('height', '0px');
      //$messageBox.css('opacity', '0');
      //$messageBox.removeClass('element-hidden');
      // Animate the box height and opacity to draw attention.
      $messageBox.animate({height: fullHeight + 'px', opacity: 1}, 'slow');

      // Close the message box by clicking anywhere on the page.
      $(document).bind('click', closeMessageBox);

    }

    return {
      'log': function(message, type) {
        showMessageBox(message, type);
      }
    };
  })();

})(Drupal.jQuery, Drupal);
