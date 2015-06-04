(function ($, Drupal, Storage) {

  Drupal.personalizeDebug = (function() {

    function generateUUID(){
      var d = new Date().getTime();
      var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x3|0x8)).toString(16);
      });
      return uuid;
    };

    function getSeverity(code) {
      if (code < 3000) {
        return 'info';
      }
      if (code < 4000) {
        return 'warning';
      }
      return 'error';
    };

    var debuggedMessages = [];

    function writeToStorage(data) {
      var key = 'personalize::debug::' + generateUUID();
      Storage.write(key, data, false);
      return key;
    };

    return {
      /**
       * Outputs the passed in message.
       *
       * Checks first whether the same message has previously been output.
       *
       * @param message
       *   The message to output.
       * @param code
       *   THe message code.
       *
       * @todo Make this accept message parameters and use Drupal.t to translate.
       */
      'log': function(message, code) {
        if (debuggedMessages.indexOf(message) == -1) {
          var messageType = getMessageType(code);
          console.log(messageType + ': ' + message + ' [Code ' + code + ']');
          debuggedMessages.push(message);
        }

        var severity = getSeverity(code);
        var data = {
          type: 'log',
          timestamp: new Date().getTime(),
          page: Drupal.settings.basePath + Drupal.settings.pathPrefix + Drupal.settings.visitor_actions.currentPath,
          message: message,
          severity: severity,
          resolution: ''
        };
        // Write to local storage
        var key = writeToStorage(data);

        // Dispatch an event to alert the debugger that new stream data is
        // available.
        $(document).trigger('acquiaLiftDebugEvent', {
          'key': key
        });

        // Save to request tracking for duplicates.
        debuggedMessages.push(message);
      }
    };
  })();
})(Drupal.jQuery, Drupal, Drupal.personalizeStorage);
