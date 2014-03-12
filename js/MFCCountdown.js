"use strict";

var app = angular.module("MFCCountdown",['ui.bootstrap', 'ui.keypress', 'firebase']);

app.value('fbURL', 'https://tipbot.firebaseio.com/mfccountdown/users');

app.run(function($rootScope){
    function uniqueid(){
        // always start with a letter (for DOM friendlyness)
        var idstr=String.fromCharCode(Math.floor((Math.random()*25)+65));
        do {
            // between numbers and characters (48 is 0 and 90 is Z (42-48 = 90)
            var ascicode=Math.floor((Math.random()*42)+48);
            if (ascicode<58 || ascicode>64){
                // exclude all chars between : (58) and @ (64)
                idstr+=String.fromCharCode(ascicode);
            }
        } while (idstr.length<32);

        return (idstr);
    }

    if (!localStorage["mfccUserId"])
        localStorage["mfccUserId"] = uniqueid();

    $rootScope.userId = localStorage["mfccUserId"];
});


app.factory('FBCountdowns', function($firebase, $rootScope) {
  var fbUrl = 'https://tipbot.firebaseio.com/mfccountdown/users/' + $rootScope.userId;

  return $firebase(new Firebase(fbUrl));
});

//wrap MFCSocket as an injectable service
app.factory("Socket", function(){
    return MFCSocket;
});

FastClick.attach(document.body);