module.exports = function (app) {
    var Base = app.requireController("base");

    return new Base(
        {
            name: "login",
            wss: {
                onLogin: function (data, wss) {
                    var me = this,
                        model = me.getModel();

                    app.request({
                        path: "/php/status_get.php",
                        cookie: data["cookie"],
                        failure: function () {
                            wss.sendData({
                                event: "login",
                                stage: "failure"
                            });
                        },
                        success: function (data) {
                            try {
                                data = JSON.parse(data);

                                if (!data[0]) {
                                    wss.sendData({
                                        event: "login",
                                        stage: "failure"
                                    });
                                }

                                model.create({
                                    values: data[0],
                                    success: function (record) {
                                        wss.sendData({
                                            event: "login",
                                            stage: "success",
                                            data: record
                                        });

                                        model.read({
                                            success: function (data) {
                                                app.logInfo('/login/');
                                                app.logSuccess('/*********** read **********/')
                                                console.log(data)
                                                app.logSuccess('/***************************/')
                                            }
                                        });
                                    }
                                });
                            }
                            catch (e) {
                                wss.sendData({
                                    event: "login",
                                    stage: "failure"
                                });
                            }
                        }
                    });
                }
            }
        }
    );
};