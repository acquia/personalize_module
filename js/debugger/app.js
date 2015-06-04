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
})

.factory('liftDebugger', function(){
        var Lift = Lift || {};

        (function () {

            'use strict';

            Lift.debugger = function (element, options) {

                this.element =
                    this.options =
                        this.triggerActivate =
                            this.triggerExpand =
                                this.triggerClose =
                                    this.isActive =
                                        this.isExpanded =
                                            this.isClosed = null;

                this.init(element, options);

            };

            Lift.debugger.DEFAULTS = {};

            Lift.debugger.prototype.init = function (element, options) {

                this.element = element;
                this.options = options;
                this.triggerActivate = this.getTrigger('activate');
                this.triggerExpand = this.getTrigger('expand');
                this.triggerClose = this.getTrigger('close');
                this.isActive = false;
                this.isExpanded = false;
                this.isClosed = true;

                this.render();

            };

            Lift.debugger.prototype.getTrigger = function (type) {

                var trigger = this.element.getElementsByClassName('debugger__action__' + type)[0],
                    functionId = 'click' + type.charAt().toUpperCase() + type.slice(1);

                trigger.addEventListener('click', this[functionId].bind(this));

                return trigger;

            }

            Lift.debugger.prototype.clickActivate = function (event) {

                this.activate();

            }

            Lift.debugger.prototype.clickExpand = function (event) {

                this.expand();

            }

            Lift.debugger.prototype.clickClose = function (event) {

                this.close();

            }

            Lift.debugger.prototype.setActive = function () {

                this.isExpanded = false;
                this.isClosed = false;
                this.isActive = true;

            };

            Lift.debugger.prototype.setExpanded = function () {

                this.isActive = false;
                this.isClosed = false;
                this.isExpanded = true;

            };

            Lift.debugger.prototype.setClosed = function () {

                this.isActive = false;
                this.isExpanded = false;
                this.isClosed = true;

            };

            Lift.debugger.prototype.activate = function () {

                this.setActive();
                this.render();

            }

            Lift.debugger.prototype.expand = function () {

                this.setExpanded();
                this.render();

            }

            Lift.debugger.prototype.close = function () {

                this.setClosed();
                this.render();

            }

            Lift.debugger.prototype.render = function () {

                if (!this.element.classList.contains('debugger-processed')) {
                    this.element.classList.add('debugger-processed');
                }

                if (this.isClosed) {
                    this.element.classList.remove('is-active');
                    this.element.classList.remove('is-expanded');
                    this.element.classList.add('is-closed');
                }

                if (this.isActive) {
                    this.element.classList.add('is-active');
                    this.element.classList.remove('is-expanded');
                    this.element.classList.remove('is-closed');
                }

                if (this.isExpanded) {
                    this.element.classList.add('is-expanded');
                    this.element.classList.remove('is-active');
                    this.element.classList.remove('is-closed');
                }

            }

        })(Lift);
        return Lift;
    })

.factory('$localstorage', ['$window', function($window) {
    return {
        set: function(key, value) {
            $window.localStorage[key] = value;
        },
        get: function(key, defaultValue) {
            return $window.localStorage[key] || defaultValue;
        },
        setObject: function(key, value) {
            if(value == undefined){
                return;
            }
            var cache = [];
            try {
                $window.localStorage[key] = JSON.stringify(value, function (a, b) {
                    if (typeof b === 'object' && b !== null) {
                        if (cache.indexOf(b) !== -1) {
                            return;
                            // Circular reference found, discard key
                        }
                        // Store value in our collection
                        cache.push(b);
                    }
                    return b;
                });
            } catch (err){
                console.log(err);
                window.localStorage.clear();
            }
            cache = null;
        },
        getObject: function(key) {
            console.log($window.localStorage[key]);
            return JSON.parse($window.localStorage[key] || '{}');
        },
        clear: function(){
            window.localStorage.clear();
        }
    }
}])

app.controller("DebuggerController", function($scope, $timeout, liftwebURl, debuggerFactory, $localstorage, $window, liftDebugger){
    $scope.debugger = "hello world";
    $scope.url = liftwebURl;
    $scope.items = [];

    $(document).bind("acquialiftDebugEvent", function(e, value){
        alert(value.key);
        console.log(value);
        var item = $localstorage.get(value.key);
        $timeout(function(){
            $scope.items.push({value: item});
            console.log($scope.items);
        });


    });

    var debugConsole = new liftDebugger.debugger(document.getElementById('debugger'));

});

