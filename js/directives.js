"use strict";

app.directive('alert', function () {
    return {
        restrict:'EA',
        template:"<div class='alert' ng-class='type && \"alert-\" + type'><button ng-show='closeable' type='button' class='close' ng-click='close()'>&times;</button><div ng-transclude></div></div>",
        transclude:true,
        replace:true,
        scope: {
            type: '=',
            close: '&'
        },
        link: function(scope, iElement, iAttrs, controller) {
            scope.closeable = "close" in iAttrs;
        }
    };
});

app.directive('selectOnFocus', function () {
    // Linker function
    return function (scope, element, attrs) {
        element.focus(function () {
            element.select();
        });
    };
});