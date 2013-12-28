'user strict';

app.factory("Socket", function($rootScope, $http){
    var socket;
    var loggedIn = false;

    //handle user persistence
    var LOCAL_STORAGE_ID = "ttChatUser",
        chatUserString = localStorage[LOCAL_STORAGE_ID];

    var chatUser = chatUserString ? JSON.parse(chatUserString) : {
        userName: "guest",
        passCode: "guest"
    };

    $rootScope.$watch(function(){ return chatUser; }, function(){
        localStorage[LOCAL_STORAGE_ID] = JSON.stringify(chatUser);
        _login();
    },true);

    function _login(){
        console.log("logging in");
        socket = new MFCSocket(chatUser.userName, chatUser.passCode);
        socket.listen("message", _onLogin);
    }

    function _loginAsUser(name, password){
        if (undefined !== socket) {
            loggedIn = false;
            socket.logout();
        }
        var data = {
            username: name,
            password:password
        };
        return $http.post("http://mfcauthtoken.azurewebsites.net", data)
            .then(function(code){
                if (undefined !== code.data.error)
                    throw new Error("Could not get the passCode.  Need to handle this error.");

                chatUser = {
                    userName: name,
                    passCode: code.data.passcode
                };

                _login();
            });
    }

    function _loginAsGuest(){
        if (undefined !== socket) {
            loggedIn = false;
            socket.logout();
        }
        chatUser = {
            userName: "guest",
            passCode: "guest"
        };
        _login();
    }

    function _onLogin(msg){
        if (MFCMessageType.FCTYPE_LOGIN == msg.Type){
            socket.removeListener("message", _onLogin);
            $rootScope.$apply(function(){
                loggedIn = true;
            });
        }
    }

    return {
        loginAsUser: _loginAsUser,
        loginAsGuest: _loginAsGuest,
        getChatUser: function(){
            return chatUser.userName;
        },
        listen: function(msg, listener){
            if (socket)
                socket.listen(msg, listener);
        },
        removeListener: function(msg, listener){
            if (socket)
                socket.removeListener(msg, listener);
        },
        send: function(msg){
            socket.send(msg);
        },
        getSessionId: function(){
            return socket.getSessionId();
        },
        loggedIn: function(){
            return loggedIn;
        }

    }
});
