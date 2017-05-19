module.exports = function (app) {
    var Controller;

    /**
     *
     * @param params
     * @constructor
     */
    Controller = function (params) {
        var me = this,
            modelListeners = params["model"] || {},
            ami = params["ami"] || {},
            wss = params["wss"] || {},
            name = params["name"],
            model;

        me["__modellisteners"] = modelListeners || {};
        me["__amilisteners"] = ami || {};
        me["__wsslisteners"] = wss || {};
        me["__name"] = name;
        me["__db"] = app.getDB();
        me["__wss"] = app.getWSS();
        me["__utils"] = app.getUtils();

        model = me["__model"] = app.requireModel(params["name"]);
        model.setListeners(modelListeners);
        model.setController(me);
    };

    Controller.prototype.getWSS = function () {
        var me = this;
        return me["__wss"];
    };

    Controller.prototype.getModel = function () {
        var me = this;

        return me["__model"];
    };

    Controller.prototype.getName = function () {
        var me = this;

        return me["__name"];
    };

    Controller.prototype.getModelListeners = function () {
        var me = this;
        return me["__modellisteners"];
    };

    Controller.prototype.getAmiListeners = function () {
        var me = this;
        return me["__amilisteners"];
    };

    Controller.prototype.getWssListeners = function () {
        var me = this;
        return me["__wsslisteners"];
    };

    Controller.prototype.getUtils = function () {
        var me = this;
        return me["__utils"];
    };

    Controller.prototype.emitAmiEvent = function (key) {
        var me = this,
            listeners = me.getAmiListeners(),
            parameters = (Array.prototype.slice.apply(arguments, [])).splice(1),
            event = listeners[key];

        if (typeof event == "function") {
            event.apply(me, parameters);
        }
    };

    Controller.prototype.emitWssEvent = function (key) {
        var me = this,
            listeners = me.getWssListeners(),
            parameters = (Array.prototype.slice.apply(arguments, [])).splice(1),
            event = listeners[key];

        if (typeof event == "function") {
            event.apply(me, parameters);
        }
    };

    Controller.prototype.send = function (parameters) {
        var me = this,
            data = parameters['data'],
            client = parameters['client'],
            isChecked = parameters['isChecked'];

        parameters['module'] = me.getName();

        if (client) {
            delete parameters['client'];
            client.sendData(parameters);
        }
        else {
            app.sendData(parameters);
        }

    };

    return Controller;
};