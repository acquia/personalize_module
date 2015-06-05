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
       *   The message to output (already translated).
       * @param code
       *   The message code.
       */
      'log': function(message, code) {
        if (debuggedMessages.indexOf(message) != -1) {
          return;
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

  Drupal.liftWebDebug = (function() {
  
     function getFromCookie ( query )
     {
       var cookie = _cookie;
       var regex = new RegExp('(?:^|;)\\s?' + query + '=(.*?)(?:;|$)','i');
       var match = cookie.match(regex);
       return match && window.decodeURIComponent(match[1]);
     };
     
     _tcwq.push( ["setDebug", true] );
     
     var curSegmentCapture = {};
     var curSegments = [];
     var curSegmentsOverride;
     var curIdentities = [];
     
     $(document).bind("segmentsUpdated", function( event, segments, capture ) {
       curSegmentCapture = capture;
       curSegments = segments;
       if ( curSegmentsOverride ) {
          segments.length = 0;
          $(curSegmentsOverride).each( function(index,overrideSegment) { segments.push(overrideSegment); } );
       } 
       Drupal.personalizeDebug.log( "Segments Returned", "INFO", curSegments); 
     });
     $(document).bind("identitiesAdded", function( event, identities ) {
       // TODO: Check if the person id changed because TC_CONF.userIdentitySourceInTrackingId is true
       $(identities).each( function (index, identity) { curIdentities.push( identity ); } );
     });
    
     return {
       'getPersonId' : function() {
          return getFromCookie("tc_ptid");     
       },
       
       'getTouchId' : function() {
          return getFromCookie("tc_ttid");       
       },
       
       'isThirdPartyPersonId' : function() { 
          return TC_CONF && TC_CONF.thirdPartyCookie == true;
       },
       
       'getCurrentSegments' : function() {
          return curSegments;
       },
       
       'setOverrideSegments' : function( segmentsOverride ) {
          curSegmentsOverride = segmentsOverride;
       },
       
       'getOverrideSegments' : function() {
          return curSegmentsOverride;
       },
       
       'getAdditionalIdentities' : function() {
          return curIdentities;
       },
     
       'openProfile' : function() {
          window.open( Drupal.Settings.lift_user_profiles.apiUrl + '#person:'+this.getPersonId()+','+
            Drupal.Settings.lift_user_profiles.accountName );       
       },
       
       'getAllSegments' : function( callback ) {
          jQuery.ajax( {
            url : Drupal.Settings.lift_user_profiles.apiUrl + '/dashboard/rest/'+
              Drupal.Settings.lift_user_profiles.accountName + '/segments',
            cache : false,
            dataType : 'json',
            success : function( data, text, request ) {
              callback( data ); 
            } 
          });
       },
       
       'evaluateSegment' : function( segmentName, callback ) {
         var personId = this.getPersonId();
         var touchId = this.getTouchId();
         _tcwq.push( ["getApiUrl", function( apiUrl ) { 
           jQuery.ajax( {
             url : apiUrl + "?tcla="+window.encodeURIComponent(Drupal.Settings.lift_user_profiles.accountName)+
               "&tcptid="+window.encodeURIComponent(personId)+
               "&tcttid="+window.encodeURIComponent(touchId)+
               "&evalSegment="+window.encodeURIComponent(segmentName),
             cache : false,
             dataType : "jsonp",
             success : function( data, text, request ) {
               callback( data );
             }
           });
         }]);
       }
     }; 
  })();
})(Drupal.jQuery, Drupal, Drupal.personalizeStorage);
