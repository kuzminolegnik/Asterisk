module.exports = function (app) {
    var Base = app.requireController("base"),
        logData = function () {
            var me = this,
                model = me.getModel();

            model.read({
                success: function (data) {
                    app.logSuccess('/*********** read **********/');
                    console.log(data);
                    app.logSuccess('/***************************/');
                }
            });
        };

    return new Base(
        {
            name: "login",
            model: {
                update: logData,
                create: logData,
                destroy: logData
            },
            wss: {

                onConnection: function (data, wss, event) {
                    var me = this;

                    me.send({
                        client: wss,
                        event: event,
                        stage: "init"
                    });
                },

                onDisconnect: function (data, wss) {
                    var me = this,
                        model = me.getModel(),
                        id = wss.getId();

                    model.destroy({
                        id: id
                    });
                },

                onLogin: function (data, wss, event) {
                    var me = this,
                        model = me.getModel(),
                        sendFailure = function () {
                            me.send({
                                client: wss,
                                event: event,
                                stage: "failure"
                            });
                        };

                    app.request({
                        path: "/php/status_get.php",
                        cookie: data["cookie"],
                        failure: function () {
                            sendFailure();
                        },
                        success: function (data) {
                            try {
                                data = JSON.parse(data);
                            }
                            catch (e) {
                                sendFailure();
                            }

                            if (!data[0]) {
                                sendFailure();
                                return;
                            }

                            model.create({
                                values: data[0],
                                success: function (record) {
                                    wss.setConnection(record);
                                    me.send({
                                        client: wss,
                                        event: event,
                                        stage: "success",
                                        data: record
                                    });
                                }
                            });
                        }
                    });
                }
            }
        }
    );
};