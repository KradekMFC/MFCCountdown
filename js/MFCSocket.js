"use strict";

var MFCSocket = (function(){
    //list of websocket chat servers
    var servers = [
        { Name: "xchat11", Type: "hybi00" },
        { Name: "xchat12", Type: "hybi00" },
        { Name: "xchat20", Type: "hybi00" },
        { Name: "xchat7", Type: "rfc6455" },
        { Name: "xchat8", Type: "rfc6455" },
        { Name: "xchat9", Type: "rfc6455" },
        { Name: "xchat10", Type: "rfc6455" }
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