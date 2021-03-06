"use strict";

app.factory("Countdown", function($rootScope, Socket){
    var LOCAL_STORAGE_ID = "mfccCountdown",
        countDownString = localStorage[LOCAL_STORAGE_ID];

    var emptyCountdown = {
        model: undefined,
        tips:[],
        amt: 0,
        complete: true
    };

    var countDown = countDownString ? JSON.parse(countDownString) : emptyCountdown;

    $rootScope.$watch(function(){ return countDown;}, function(){
        localStorage[LOCAL_STORAGE_ID] = JSON.stringify(countDown);
    }, true);

    var uniqueUserId = $rootScope.userId;

    var tipRegex = /(\w*) has tipped (\w*) (\d*) tokens?(.*)/;

    //start up the countdown listener if there is an active
    //countdown that isn't complete
    if (undefined != countDown.complete && !countDown.complete)
        listenForTips();

    function currentTotal(){
        return countDown.tips.reduce(function(total, tip){
            return total - tip.Amount;
        }, countDown.amt);
    }

    function completeCountdown() {
        countDown.complete = true;
        // FBCountdowns.$child(countDown.fb_id).$update({complete: true, completed: new Date().getTime()});
        Socket.removeListener("message", parseTips);
    }

    function cancelCountdown(){
        countDown = emptyCountdown;
        Socket.removeListener("message", parseTips);
    }

    function parseTips(msg) {
        if (msg.Type !== MFCMessageType.FCTYPE_TOKENINC)
            return;

        if (!msg.Data)
            return;

        //make sure the tip is for the currently selected model
        if (msg.Data.ch != countDown.model.broadcasterId)
            return;

        //tips messages do not come from anybody
//        if (msg.Arg1 != 0 || msg.Arg2 != 0 || msg.From != 0 || msg.To != countDown.model.broadcasterId)
//            return;

//        var tipMsg = msg.Data.msg;
//
//        var match = tipRegex.exec(tipMsg);
//        if (match){
//            var tipNote = "";
//            if (match.length == 5 && match[4] != ".")
//                tipNote = match[4].substring(3, match[4].length - 1);

            var tip = {
                Name: msg.Data.u[2],
                Amount: msg.Data.tokens,
                TipNote: msg.Data.msg,
                When: new Date()
            };

            $rootScope.$apply(function(){
                countDown.tips.push(tip);
            });

            // FBCountdowns.$child(countDown.fb_id).$update({currentTotal: currentTotal()});

            if (currentTotal() <= 0)
                completeCountdown();
        //}
    }

    function listenForTips(){
        if (!Socket.loggedIn()){
            setTimeout(listenForTips, 500);
            return;
        }

        Socket.listen("message", parseTips);
        Socket.send(new MFCMessage({
            Type: MFCMessageType.FCTYPE_JOINCHAN,
            From: Socket.getSessionId(),
            To: 0,
            Arg1: countDown.model.broadcasterId,
            Arg2: MFCChatOpt.FCCHAN_JOIN
        }));


    }

    function startCountdown(model, amount){
        countDown = {
            amt: amount,
            model: model,
            tips: [],
            complete: false,
            created: new Date().getTime()
        };

        // FBCountdowns.$add(countDown).then(function(ref){
        //     countDown.fb_id = ref.name();
        // });

        listenForTips();
    }

    function removeTip(tip){
        countDown.tips.splice(countDown.tips.indexOf(tip), 1);
        if (currentTotal() < countDown.amt)
            countDown.complete = false;
    }

    return {
        start: startCountdown,
        cancel: cancelCountdown,
        resume: listenForTips,
        active: function(){
            return !countDown.complete;
        },
        current: currentTotal,
        tips: function(){
            return countDown.tips;
        },
        amount: function(){
            return countDown.amt;
        },
        removeTip: removeTip
    }

});