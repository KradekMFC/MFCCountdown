"use strict";

var app = angular.module("MFCCountdown",['ui.bootstrap', 'ui.keypress', 'firebase']);

app.value('fbURL', 'https://tipbot.firebaseio.com/mfccountdowns/countdowns');

app.factory('FBCountdowns', function($firebase, fbURL) {
  return $firebase(new Firebase(fbURL));
});

//wrap MFCSocket as an injectable service
app.factory("Socket", function(){
    return MFCSocket;
});

FastClick.attach(document.body);