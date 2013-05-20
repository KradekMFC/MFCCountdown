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

    var tipRegex = /(\w*) has tipped (\w*) (\d*) tokens/;

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
        Socket.removeListener("message", parseTips);
    }

    function cancelCountdown(){
        countDown = emptyCountdown;
        Socket.removeListener("message", parseTips);
    }

    function parseTips(msg){
        if (msg.Type !== MFCMessageType.FCTYPE_CMESG)
            return;

        //tips messages do not come from anybody
        if (msg.Arg1 != 0 || msg.Arg2 != 0 || msg.From != 0 || msg.To != countDown.model.broadcasterId)
            return;

        var tipMsg = msg.Data.msg;

        var match = tipRegex.exec(tipMsg);
        if (match){
            $rootScope.$apply(function(){
                countDown.tips.push({Name: match[1], Amount: match[3]});
            });

            if (currentTotal() < 0)
                completeCountdown();
        }
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
            complete: false
        };

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