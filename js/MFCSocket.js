"use strict";

var MFCSocket = (function(){
    //list of websocket chat servers
    var servers = [
      { Name: "xchat100", Type: "rfc6455"},
      { Name: "xchat101", Type: "rfc6455"},
      { Name: "xchat102", Type: "rfc6455"},
      { Name: "xchat103", Type: "rfc6455"},
      { Name: "xchat104", Type: "rfc6455"},
      { Name: "xchat105", Type: "rfc6455"},
      { Name: "xchat106", Type: "rfc6455"},
      { Name: "xchat107", Type: "hybi00"},
      { Name: "xchat108", Type: "rfc6455"},
      { Name: "xchat109", Type: "rfc6455"},
      { Name: "xchat111", Type: "rfc6455"},
      { Name: "xchat112", Type: "rfc6455"},
      { Name: "xchat113", Type: "rfc6455"},
      { Name: "xchat114", Type: "rfc6455"},
      { Name: "xchat115", Type: "rfc6455"},
      { Name: "xchat116", Type: "rfc6455"},
      { Name: "xchat118", Type: "rfc6455"},
      { Name: "xchat119", Type: "rfc6455"},
      { Name: "xchat120", Type: "rfc6455"},
      { Name: "xchat121", Type: "rfc6455"},
      { Name: "xchat122", Type: "rfc6455"},
      { Name: "xchat123", Type: "rfc6455"},
      { Name: "xchat124", Type: "rfc6455"},
      { Name: "xchat125", Type: "rfc6455"},
      { Name: "xchat126", Type: "rfc6455"},
      { Name: "xchat127", Type: "rfc6455"},
      { Name: "xchat20", Type: "rfc6455"},
      { Name: "xchat22", Type: "rfc6455"},
      { Name: "xchat23", Type: "rfc6455"},
      { Name: "xchat24", Type: "rfc6455"},
      { Name: "xchat25", Type: "rfc6455"},
      { Name: "xchat26", Type: "rfc6455"},
      { Name: "xchat27", Type: "rfc6455"},
      { Name: "xchat28", Type: "rfc6455"},
      { Name: "xchat29", Type: "rfc6455"},
      { Name: "xchat39", Type: "rfc6455"},
      { Name: "xchat62", Type: "rfc6455"},
      { Name: "xchat63", Type: "rfc6455"},
      { Name: "xchat64", Type: "rfc6455"},
      { Name: "xchat65", Type: "rfc6455"},
      { Name: "xchat66", Type: "rfc6455"},
      { Name: "xchat67", Type: "rfc6455"},
      { Name: "xchat68", Type: "rfc6455"},
      { Name: "xchat69", Type: "rfc6455"},
      { Name: "xchat70", Type: "rfc6455"},
      { Name: "xchat71", Type: "rfc6455"},
      { Name: "xchat72", Type: "rfc6455"},
      { Name: "xchat73", Type: "rfc6455"},
      { Name: "xchat74", Type: "rfc6455"},
      { Name: "xchat75", Type: "rfc6455"},
      { Name: "xchat76", Type: "rfc6455"},
      { Name: "xchat77", Type: "rfc6455"},
      { Name: "xchat78", Type: "rfc6455"},
      { Name: "xchat79", Type: "rfc6455"},
      { Name: "xchat80", Type: "rfc6455"},
      { Name: "xchat81", Type: "rfc6455"},
      { Name: "xchat83", Type: "rfc6455"},
      { Name: "xchat84", Type: "rfc6455"},
      { Name: "xchat85", Type: "rfc6455"},
      { Name: "xchat86", Type: "rfc6455"},
      { Name: "xchat87", Type: "rfc6455"},
      { Name: "xchat88", Type: "rfc6455"},
      { Name: "xchat89", Type: "rfc6455"},
      { Name: "xchat91", Type: "rfc6455"},
      { Name: "xchat94", Type: "rfc6455"},
      { Name: "xchat95", Type: "rfc6455"},
      { Name: "xchat96", Type: "rfc6455"},
      { Name: "xchat97", Type: "rfc6455"},
      { Name: "xchat98", Type: "rfc6455"},
      { Name: "xchat99", Type: "rfc6455"}
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