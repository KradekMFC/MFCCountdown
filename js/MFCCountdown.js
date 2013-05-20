"use strict";

var app = angular.module("MFCCountdown",['ui.bootstrap', 'ui.keypress']);

//wrap MFCSocket as an injectable service
app.factory("Socket", function(){
    return MFCSocket;
});

FastClick.attach(document.body);