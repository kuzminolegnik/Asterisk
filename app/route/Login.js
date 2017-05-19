module.exports = function (app) {
    var Base = app.requireRoute("base");

    return new Base({
        name: "login",
        wss: {
            routes: [
                {
                    route: "login",
                    eventEmit: "onLogin"
                },
                {
                    route: "disconnect",
                    eventEmit: "onDisconnect"

                },
                {
                    route: "connection",
                    eventEmit: "onConnection"

                }
            ]
        }
    });

};
