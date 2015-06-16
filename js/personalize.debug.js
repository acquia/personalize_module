/**
 * Provides basic debugger information about personalization decisions and
 * goals.
 *
 * Dispatches "personalizeDebugEvent" from the document object when a debug
 * message is available.  Dispatches with the following data:
 * - code:  A code indicating the actual message
 * - message: An error message
 */

(function ($, Drupal) {

  Drupal.personalizeDebug = (function() {

    var debuggedMessages = [];

    return {
      /**
       * Outputs the passed in message.
       *
       * Checks first whether the same message has previously been output.
       *
       * @param message
       *   The message to output.
       * @param code
       *   The message code.
       */
      'log': function(message, code) {
        if (debuggedMessages.indexOf(message) == -1) {
          var messageType = getMessageType(code);
          console.log(messageType + ': ' + message + ' [Code ' + code + ']');
          debuggedMessages.push(message);
        }
        if (console && console.log) {
          console.log(code + ': ' + message);
        }
        $(document).trigger('personalizeDebugEvent', {
          'code': code,
          'message': message
        });

        // Save to request tracking for duplicates.
        debuggedMessages.push(message);

      }
    };
  })();
})(Drupal.jQuery, Drupal);
