module.exports = function (app) {
    var Base = app.requireRoute("base");

    return new Base({
        name: "channels",
        wss: {
            routes: [
                {
                    route: "channels",
                    eventEmit: "onChannels"
                }
            ]
        },
        ami: {
            routes: [
                {
                    route: "newchannel",
                    eventEmit: "onCreateChanel"
                },
                {
                    route: "newconnectedline",
                    eventEmit: "onConnected"
                },
                {
                    route: "bridgeenter",
                    eventEmit: "onConnect"
                },
                {
                    route: [
                        "bridgeleave",
                        "hanguprequest",
                        "hangup"
                    ],
                    eventEmit: "onDestroyChanel"
                }
            ]
        }
        // routes: [
        //     {
        //         route: "newchannel",
        //         eventEmit: "onCreateChanel"
        //     },
        //     {
        //         route: "newconnectedline",
        //         eventEmit: "onConnected"
        //     },
        //     {
        //         route: "bridgeenter",
        //         eventEmit: "onConnect"
        //     },
        //     {
        //         route: [
        //             "bridgeleave",
        //             "hanguprequest",
        //             "hangup"
        //         ],
        //         eventEmit: "onDestroyChanel"
        //     }
        //     // "newchannel",
        //     // "newconnectedline",
        //     // "dialend",
        //     // "bridgeenter",
        //     // "hangup",
        //     // "hanguprequest",
        //     // "bridgeleave"
        // ]
    });

};
