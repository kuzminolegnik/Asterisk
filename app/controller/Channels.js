module.exports = function (app) {
    var Base = app.requireController("base");

    return new Base(
        {
            name: "channels",
            wss: {
                onChannels: function () {
                    console.log("onChannels")
                }
            },
            ami: {

                onCreateChanel: function (data) {
                    var me = this,
                        model = me.getModel();

                    if (data["uniqueid"] == data["linkedid"]) {

                        app.logInfo('/onCreateChanel/');

                        model.create({
                            values: data,
                            success: function () {
                                model.read({
                                    success: function (data) {
                                        app.logSuccess('/*********** read **********/')
                                        // app.sendData(data);
                                        console.log(data)
                                        app.logSuccess('/***************************/')

                                    }
                                });
                            }
                        });
                    }

                },

                onConnected: function (data) {
                    var me = this,
                        model = me.getModel();

                    if (data["uniqueid"] == data["linkedid"]) {

                        app.logInfo('/onConnected/');

                        model.update({
                            values: data,
                            success: function () {
                                model.read({
                                    success: function (data) {
                                        app.logSuccess('/*********** read **********/')
                                        // app.sendData(data);
                                        console.log(data)
                                        app.logSuccess('/***************************/')
                                    }
                                });
                            }
                        });
                    }

                },
                onConnect: function (data) {
                    var me = this,
                        model = me.getModel();

                    if (data["uniqueid"] == data["linkedid"]) {

                        app.logInfo('/onConnect/');

                        model.update({
                                values: data, success: function () {
                                    model.read({
                                        success: function (data) {
                                            app.logSuccess('/*********** read **********/')
                                            // app.sendData(data);
                                            console.log(data)
                                            app.logSuccess('/***************************/')
                                        }
                                    });
                                }
                            }
                        );
                    }

                },
                onDestroyChanel: function (data) {
                    var me = this,
                        model = me.getModel(),
                        id;

                    if (data["uniqueid"] == data["linkedid"]) {

                        app.logInfo('/onDestroyChanel/');

                        id = model.createId(data);

                        model.destroy({
                            id: id,
                            success: function () {
                                model.read({
                                    success: function (data) {
                                        app.logSuccess('/*********** read **********/')
                                        // app.sendData(data);
                                        console.log(data)
                                        app.logSuccess('/***************************/')
                                    }
                                });
                            }
                        });
                    }

                }
            }

        }
    );
};