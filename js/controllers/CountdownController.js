app.controller("CountdownCtrl", function CountdownCtrl($scope, Model, Countdown, Socket){
    //set the model to a stored model if there is one
    var model = Model.getModel();
    if (model && model.name != undefined) {
        $scope.modelName = model.name;
        $scope.model = model;
        lookupModel();
    }

    //select model modal stuff
    $scope.showSelectModel = false;
    $scope.selectModel = function() {
        $scope.alerts = [];
        lookupModel();
        Countdown.cancel();
    };

    function lookupModel(){
        Model.lookupModel($scope.modelName).then(function(model){
            $scope.model = model;
            updateCountdownDisplay();
        }, function(reason){
            addAlert("error", reason);
        });
        $scope.showSelectModel = false;
    }

    //countdown tracking
    $scope.showCountdownModal = false;

    $scope.setCountdown = function(){
        if ($scope.formCountdown.$invalid)
            return;
        $scope.alerts = [];
        $scope.showCountdownModal = false;
        Countdown.start(Model.getModel(), $scope.countDownAmount);
        updateCountdownDisplay();

    };

    function updateCountdownDisplay(){
        if (Countdown.active() && Countdown.current() > 0)
            $scope.countDownDisplayText = Countdown.current();
        else
        if (Countdown.amount() > 0)
            $scope.countDownDisplayText = "Complete!";
        else
            $scope.countDownDisplayText = "";
    }


    $scope.$watch(function(){return Countdown.tips();}, function(tips){
        $scope.tips = tips;

        updateCountdownDisplay();
    }, true);


    //This is probably not the best way to do this,
    //calculating the sum every single tip, but its
    //working for now.
    $scope.runningTotal = function(index){
        var t = $scope.tips.slice(0, index + 1).reduce(function(total, tip){
            return total + parseInt(tip.Amount,10);
        },0);
        return Countdown.amount() - t;
    };

    $scope.removeTip = function(tip){
        Countdown.removeTip(tip);
    };


    //alert stuff
    $scope.alerts = [];
    function addAlert(type, msg) {
        $scope.alerts.push({type: type, msg: msg});
    };
    $scope.closeAlert = function(index) {
        $scope.alerts.splice(index, 1);
    };

    Socket.listen("close", function(msg){
        addAlert("error", msg);
        console.log(msg);
    });

    Socket.listen("error", function(err){
        addAlert("error", err);
        console.log(err);
    });
});