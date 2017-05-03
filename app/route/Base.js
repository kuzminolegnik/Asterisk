module.exports = function (app) {
    var path = require("path"),
        Base;

    Base = function (params) {
        var me = this,
            ami = params["ami"] || {},
            wss = params["wss"] || {};

        me["__name"] = params["name"] || "";
        me["__amiroutes"] = ami["routes"] || [];
        me["__wssroutes"] = wss["routes"] || [];

        me["__controller"] = app.requireController(me["__name"]);
    };

    Base.prototype.getName = function () {
        var me = this;

        return me["__name"]
    };

    Base.prototype.getAmiRoutes = function () {
        var me = this;

        return me["__amiroutes"]
    };

    Base.prototype.getWssRoutes = function () {
        var me = this;

        return me["__wssroutes"]
    };

    Base.prototype.getRoutes = function () {
        var me = this;

        return me["__amiroutes"]
    };

    Base.prototype.checked = function (event, type) {
        event = typeof event == "string" ? event.toLowerCase(): "";

        var me = this,
            checkString = function (stringRoute, stringCheck) {
                return stringRoute.toLowerCase() === stringCheck;
            }, i, length, route, eventEmit,
            eventsEmit = [], routes = [];

        if (type == "ami") {
            routes = me.getAmiRoutes();
        }
        else if (type == "wss") {
            routes = me.getWssRoutes();
        }

        routes.forEach(function (part) {
            route = part["route"];
            eventEmit = part["eventEmit"];

            if (route instanceof RegExp) {
                if (route.test(event)) {
                    eventsEmit.push(eventEmit)
                }
            }
            else if (route instanceof Array) {
                length = route.length;
                for (i = 0; i < length; i++) {
                    if (checkString(route[i], event)) {
                        eventsEmit.push(eventEmit);
                        break;
                    }
                }
            }
            else if (typeof event == "string") {
                if (checkString(route, event)) {
                    eventsEmit.push(eventEmit);
                }
            }
        });

        return eventsEmit;
    };

    Base.prototype.getController = function () {
        return this["__controller"];
    };

    Base.prototype.run = function (event, data, type) {
        var me = this,
            controller = me.getController(),
            eventsEmit = me.checked(event, type);

        eventsEmit.forEach(function (eventEmit) {
            if (type == "ami") {
                controller.emitAmiEvent(eventEmit, data, event);
            }
            else if (type == "wss") {
                controller.emitWssEvent(eventEmit, data["data"], data["__wss"], data["stage"], data, event);
            }
        });

    };

    return Base;
};