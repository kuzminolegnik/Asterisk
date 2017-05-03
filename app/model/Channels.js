module.exports = function (app) {
    var Base = app.requireModel("base");

    return new Base({
        name: "channel",
        keyProperty: "id",
        fields: [
            {
                name: "id",
                mapping: "linkedid",
                type: "string"
            },
            {
                name: "status",
                type: "int",
                renderer: function (value, renderData, data) {
                    var status = String(data["event"]).toLowerCase();
                    switch (status) {
                        case 'newchannel':
                            return 1;
                        case 'newconnectedline':
                            return 2;
                        case 'bridgeenter':
                            return 3;
                        case 'bridgeleave':
                        case 'hanguprequest':
                        case 'hangup':
                            return 4;
                    }
                }
            },
            {
                name: "status_name",
                type: "string",
                renderer: function (value, renderData, data) {
                    var status = String(data["event"]).toLowerCase();
                    switch (status) {
                        case 'newchannel':
                            return 'create_chanel';
                        case 'newconnectedline':
                            return 'connected';
                        case 'bridgeenter':
                            return 'on_connect';
                        case 'bridgeleave':
                        case 'hanguprequest':
                        case 'hangup':
                            return 'destroy';
                    }
                }
            },
            {
                name: "type_call",
                type: 'string',
                defaultValue: function (data) {
                    if (/full/g.test(data["context"]) || data["calleridnum"].length <= 5) {
                        return 'outbound';
                    }
                    return 'inbound';
                }
            },
            {
                name: "connected_number",
                mapping: 'connectedlinenum',
                type: "string"
            },
            {
                name: "connected_name",
                mapping: 'connectedlinename',
                type: "string"
            },
            {
                name: "caller_number",
                mapping: 'calleridnum',
                type: "string"
            },
            {
                name: "caller_name",
                mapping: 'calleridname',
                type: "string"
            },
            {
                name: "start_date",
                defaultValue: function () {
                    return new Date();
                },
                type: "date"
            },
            {
                name: "update_date",
                renderer: function () {
                    return new Date();
                },
                type: "date"
            }
        ]
    });

};