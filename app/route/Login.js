module.exports = function (app) {
    var Base = app.requireRoute("base");

    return new Base({
        name: "login",
        wss: {
            routes: [
                {
                    route: "login",
                    eventEmit: "onLogin"
                }
            ]
        }
    });

};
