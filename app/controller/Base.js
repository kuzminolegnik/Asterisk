module.exports = function (app) {
    var Base,
        path = require("path");

    Base = function (params) {
        var me = this,
            ami = params["ami"] || {},
            wss = params["wss"] || {};

        me["__amilisteners"] = ami || {};
        me["__wsslisteners"] = wss || {};
        me["__model"] = null;
        me["__name"] = params["name"];
        me["__db"] = app.getDB();
        me["__wss"] = app.getWSS();
        me["__utils"] = app.getUtils();
    };

    Base.prototype.getWSS = function () {
        var me = this;
        return me["__wss"];
    };

    Base.prototype.getModel = function () {
        var me = this,
            model = me["__model"],
            name = me.getName();

        if (!model) {
            model = me["__model"] = app.requireModel(name);
        }

        return model;
    };

    Base.prototype.getName = function () {
        var me = this,
            name = me["__name"],
            filename;

        if (!name) {
            filename = path.normalize(__filename);
            name = me["__name"] = path.basename(
                filename,
                path.extname(filename)
            )
        }

        return name;
    };

    Base.prototype.getAmiListeners = function () {
        var me = this;
        return me["__amilisteners"];
    };

    Base.prototype.getWssListeners = function () {
        var me = this;
        return me["__wsslisteners"];
    };

    Base.prototype.getUtils = function () {
        var me = this;
        return me["__utils"];
    };

    Base.prototype.emitAmiEvent = function (key) {
        var me = this,
            listeners = me.getAmiListeners(),
            parameters = (Array.prototype.slice.apply(arguments, [])).splice(1),
            event = listeners[key];

        if (typeof event == "function") {
            event.apply(me, parameters);
        }
    };

    Base.prototype.emitWssEvent = function (key) {
        var me = this,
            listeners = me.getWssListeners(),
            parameters = (Array.prototype.slice.apply(arguments, [])).splice(1),
            event = listeners[key];

        if (typeof event == "function") {
            event.apply(me, parameters);
        }
    };

    return Base;
};