var app = angular.module("debuggerModule", []);
app.constant('liftwebURl', "");
app.factory('debuggerFactory', function($http, liftwebURl){
    var factory = {};

    factory.ajax = function(){
        $http({
            url: liftwebURl,
            method: "POST",
            data: ""
        }).success(function(data, status){
            console.log(data);
        }).error(function(data, status){
            console.log(data);
        });
    };

    return factory;
});

app.controller("DebuggerController", function($scope, $timeout, liftwebURl, debuggerFactory){
    $scope.debugger = "hello world";
    $scope.url = liftwebURl;
});



