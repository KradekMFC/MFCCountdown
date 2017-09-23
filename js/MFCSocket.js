"use strict";

var MFCSocket = (function(){
    //list of websocket chat servers
    var servers = [
      {"xchat100": "rfc6455"},
      {"xchat101": "rfc6455"},
      {"xchat102": "rfc6455"},
      {"xchat103": "rfc6455"},
      {"xchat104": "rfc6455"},
      {"xchat105": "rfc6455"},
      {"xchat106": "rfc6455"},
      {"xchat107": "hybi00"},
      {"xchat108": "rfc6455"},
      {"xchat109": "rfc6455"},
      {"xchat111": "rfc6455"},
      {"xchat112": "rfc6455"},
      {"xchat113": "rfc6455"},
      {"xchat114": "rfc6455"},
      {"xchat115": "rfc6455"},
      {"xchat116": "rfc6455"},
      {"xchat118": "rfc6455"},
      {"xchat119": "rfc6455"},
      {"xchat120": "rfc6455"},
      {"xchat121": "rfc6455"},
      {"xchat122": "rfc6455"},
      {"xchat123": "rfc6455"},
      {"xchat124": "rfc6455"},
      {"xchat125": "rfc6455"},
      {"xchat126": "rfc6455"},
      {"xchat127": "rfc6455"},
      {"xchat20": "rfc6455"},
      {"xchat22": "rfc6455"},
      {"xchat23": "rfc6455"},
      {"xchat24": "rfc6455"},
      {"xchat25": "rfc6455"},
      {"xchat26": "rfc6455"},
      {"xchat27": "rfc6455"},
      {"xchat28": "rfc6455"},
      {"xchat29": "rfc6455"},
      {"xchat39": "rfc6455"},
      {"xchat62": "rfc6455"},
      {"xchat63": "rfc6455"},
      {"xchat64": "rfc6455"},
      {"xchat65": "rfc6455"},
      {"xchat66": "rfc6455"},
      {"xchat67": "rfc6455"},
      {"xchat68": "rfc6455"},
      {"xchat69": "rfc6455"},
      {"xchat70": "rfc6455"},
      {"xchat71": "rfc6455"},
      {"xchat72": "rfc6455"},
      {"xchat73": "rfc6455"},
      {"xchat74": "rfc6455"},
      {"xchat75": "rfc6455"},
      {"xchat76": "rfc6455"},
      {"xchat77": "rfc6455"},
      {"xchat78": "rfc6455"},
      {"xchat79": "rfc6455"},
      {"xchat80": "rfc6455"},
      {"xchat81": "rfc6455"},
      {"xchat83": "rfc6455"},
      {"xchat84": "rfc6455"},
      {"xchat85": "rfc6455"},
      {"xchat86": "rfc6455"},
      {"xchat87": "rfc6455"},
      {"xchat88": "rfc6455"},
      {"xchat89": "rfc6455"},
      {"xchat91": "rfc6455"},
      {"xchat94": "rfc6455"},
      {"xchat95": "rfc6455"},
      {"xchat96": "rfc6455"},
      {"xchat97": "rfc6455"},
      {"xchat98": "rfc6455"},
      {"xchat99": "rfc6455"}
    ];
    //choose a random server
    var server = servers[Math.floor(Math.random() * servers.length)];
    var serverUrl = "ws://{0}.myfreecams.com:8080/fcsl".format(server.Name);

    //private variables
    var sessionId = null;
    var userName = null;
    var loggedIn = false;

    //extremely basic event system
    var listeners = [];
    function listen(evt, callback){
        var validEvents = ["message", "error", "close"];

        if (!(validEvents.indexOf(evt) >= 0))
            throw new Error("{0} is not a valid event.".format(evt));

        //dont add the same callback twice
        var matches = listeners.filter(function(listener){
            return (listener.Event == evt) && (listener.Callback == callback);
        });
        if (matches.length > 0)
            return;

        listeners.push({Event: evt, Callback: callback});
    }
    function fire(evt, data){
        listeners.filter(function(listener){
            return listener.Event === evt;
        }).forEach(function(listener){
                listener.Callback(data);
            });
    }
    function removeListener(evt, listener){
        var found;

        for (var i=0; i < listeners.length; i++){
            if (listeners[i].Event === evt && listeners[i].Callback === listener){
                found = i;
                break;
            }
        }

        if (null !== found)
            listeners.splice(found, 1);
    }

    //socket event handlers
    function onSocketClosed(msg){
        fire("close", msg);
    }
    function onSocketOpened(){
        socket.send("hello fcserver\n\0");
        //login as a guest
        socket.send(new MFCMessage({Type:MFCMessageType.FCTYPE_LOGIN, From:0, To:0, Arg1:"20071025",Arg2:0,Data:"guest:guest"}).asMFCMessage());
        //set up a ping to the server so it doesn't
        //drop connection on us
        setInterval(function(){
            socket.send(new MFCMessage({Type:MFCMessageType.FCTYPE_NULL, From:0, To:0, Arg1:0, Arg2:0}).asMFCMessage());
        }, 15000);
    }
    function onSocketError(err){
        fire("error", err);
    }
    var queued;
    function onSocketMessage(msg){
        var serverMessage = msg.data;
        //queued = serverMessage.replace(/\r\n/g, ""); //strip out any inserted carriage returns
        queued = serverMessage;
        while (queued.length > 12){
            var dataLength = parseInt(queued.substring(0,4),10);

            if (queued.length < dataLength + 4)
                return; //wait for more data

            var data = queued.substring(4, dataLength + 4);

            if (data.length !== dataLength)
                break; //malformed message

            onMFCMessage(data);

            queued = queued.substring(dataLength + 4);
        }

        queued = "";
    }

    //send message
    var sendMessageQueue = [];
    function sendMessage(msg){
        //if there is a msg and its not an MFCMessage, leave
        if ((undefined !== msg) && !(msg instanceof MFCMessage))
            throw new Error("msg is not an instance of MFCMessage");

        //indicate a problem if the socket is closed
        if (socket.readyState === 3 || socket.readyState === 2) //closed, closing
            throw new Error("Attempt to send message while socket was closing or closed.");

        //queue the message
        if (msg)
            sendMessageQueue.push(msg);

        //if the socket is open process the queue
        if (socket.readyState === 1 && null !== sessionId){
            var currentMsg = sendMessageQueue.pop();
            while (undefined !== currentMsg){
                socket.send(currentMsg.asMFCMessage());
                currentMsg = sendMessageQueue.pop();
            }
        }
        else {
            //otherwise, try again later
            setTimeout(sendMessage, 100);
        }
    }

    //internal message handler
    function onMFCMessage(msg){
        var parsedMsg = new MFCMessage(msg);

        //capture the sessionid and assigned username
        if (MFCMessageType.FCTYPE_LOGIN == parsedMsg.Type) {
            sessionId = parsedMsg.To;
            userName = parsedMsg.Data;
            loggedIn = true;
        }

        fire("message", parsedMsg);
    }

    //try to create a socket
    var socket;
    try
    {
        socket = new WebSocket(serverUrl);
    }
    catch(e)
    {
        alert("This browser does not implement WebSockets.");
        return;
    }

    socket.onopen =  onSocketOpened;
    socket.onmessage = onSocketMessage;
    socket.onerror = onSocketError;
    socket.onclose = onSocketClosed;

    return {
        getSessionId: function() {
            return sessionId;
        },
        listen: listen,
        removeListener: removeListener,
        send: sendMessage,
        loggedIn: function(){
            return loggedIn;
        }
    }

})();