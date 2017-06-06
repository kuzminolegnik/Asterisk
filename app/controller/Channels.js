module.exports = function (app) {
    var Base = app.requireController("base"),
        logData = function () {
            var me = this,
                model = me.getModel();

            model.read({
                success: function (data) {
                    me.send({
                        event: 'channels',
                        data: data
                    });
                }
            });
        };

    return new Base(
        {
            name: "channels",
            model: {
                update: logData,
                create: function (record, rawValue) {
                    var me = this,
                        model = me.getModel(),
                        customerPhone = record['type_call_id'] == 1?
                            record['caller_number']:
                            record['connected_number'];

                    app.systemRequest({
                        procedure: "customers_list",
                        params: {
                            phone: customerPhone
                        },
                        success: function (data) {
                            try {
                                data = JSON.parse(data);
                                if (data instanceof Array) {
                                    rawValue['customers'] = data;
                                    model.update({
                                        values: rawValue,
                                        merge: function (values, oldValues) {
                                            if (!oldValues || !oldValues['status']) {
                                                return values;
                                            }

                                            oldValues['customers'] = data;
                                            return oldValues;
                                        }
                                    });
                                }
                            }
                            catch (e) {

                            }
                        }
                    });
                    logData.apply(me, [])
                },
                destroy: logData
            },
            wss: {

                onChannels: function (data, wss, event) {
                    var me = this,
                        model = me.getModel();

                    model.read({
                        success: function (data) {
                            me.send({
                                client: wss,
                                event: event,
                                data: data
                            });
                        }
                    });
                }

            },
            ami: {

                onCreateChanel: function (data) {
                    var me = this,
                        model = me.getModel();

                    if (data["uniqueid"] == data["linkedid"]) {

                        app.logInfo('/onCreateChanel/');

                        model.create({
                            values: data
                        });
                    }

                },

                onConnected: function (data) {
                    var me = this,
                        model = me.getModel();

                    if (data["uniqueid"] == data["linkedid"]) {

                        app.logInfo('/onConnected/');

                        model.update({
                            values: data
                        });
                    }

                },
                onConnect: function (data) {
                    var me = this,
                        model = me.getModel();

                    if (data["uniqueid"] == data["linkedid"]) {

                        app.logInfo('/onConnect/');

                        model.update({
                            values: data
                        });
                    }

                },
                onDestroyChanel: function (data) {
                    var me = this,
                        model = me.getModel();

                    if (data["uniqueid"] == data["linkedid"]) {

                        app.logInfo('/onDestroyChanel/');

                        model.destroy({
                            values: data
                        });
                    }

                }
            }

        }
    );
};