"use strict";

app.factory("Model", function($rootScope, $q, Socket){
    var LOCAL_STORAGE_ID = "mfccModel",
        modelString = localStorage[LOCAL_STORAGE_ID];

    var model = modelString ? JSON.parse(modelString) : {
        name: undefined,
        broadcasterId: undefined
    };

    $rootScope.$watch(function(){ return model;}, function(){
        localStorage[LOCAL_STORAGE_ID] = JSON.stringify(model);
    });

    function modelLookupByName(modelName) {
        var deferred =  $q.defer();

        function scanUserLookup(msg) {
            //only process userlookups
            if (msg.Type !== MFCMessageType.FCTYPE_USERNAMELOOKUP)
                return;

            //we have a userlookup message, remove the listener
            Socket.removeListener("message", scanUserLookup);

            //check if the model was found
            if (1 == msg.Arg2){
                $rootScope.$apply(function(){
                    deferred.reject("Could not find {0}.".format(modelName));
                });
                return;
            }

            //model was found, check the video state
            if (MFCVideoState.FCVIDEO_TX_IDLE == msg.Data.vs || MFCVideoState.FCVIDEO_RX_IDLE == msg.Data.vs){
                //model is in public, resolve positively
                $rootScope.$apply(function(){
                    model = {
                        name: modelName,
                        broadcasterId: 100000000 + parseInt(msg.From, 10)
                    };
                    deferred.resolve(model);
                });
                return;
            }

            //model was not in public
            $rootScope.$apply(function(){
                deferred.reject("{0} is not in public chat.".format(modelName));
            });

        };

        Socket.listen("message", scanUserLookup);

        Socket.send(new MFCMessage({
            Type: MFCMessageType.FCTYPE_USERNAMELOOKUP,
            From: 0,
            To: 0,
            Arg1: 20,
            Arg2: 0,
            Data: modelName
        }));

        return deferred.promise;
    }

    return {
        getModel: function() {return model;},
        lookupModel: modelLookupByName
    }
});