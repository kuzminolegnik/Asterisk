module.exports = function (app) {
    var Base = app.requireModel("base"),
        /**
         * Форматирование номера телефона клиента, для получения данных о нем.
         * @param {string} value - номер телефона полученный с сервера Asterisk
         * @return {string}
         */
        rendererPhoneNumber = function (value) {
            value = value || '';
            if (value.length == 10 && value[0] !== '+') {
                value = '+7' + value;
            }
            else if (value[0] !== '+') {
                value = '+' + value;
            }
            return value;
        },
        /**
         * Определение типа звонка входящий или исходящий вызов
         * @param {object} data - предварительные данные записи
         * @return {number}
         */
        defaultValueTypeCall = function (data) {
            if (
                (data["context"] && /full/g.test(data["context"])) ||
                (data["calleridnum"] && data["calleridnum"].length <= 5)
            ) {
                return 2;
            }
            return 1;
        },
        /**
         * Определение статуса звонка ожидание, дозврн или разговор с оператором
         * @param {string} value - название события полеченное от сервера Asterisk
         * @return {number}
         */
        rendererStatusId = function (value) {
            var status = String(value).toLowerCase();
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
        };

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
                mapping: "event",
                renderer: rendererStatusId
            },
            {
                name: "status_name",
                mapping: "event",
                renderer: function (value) {
                    var status = rendererStatusId(value);
                    switch (status) {
                        case 1:
                            return 'create_chanel';
                        case 2:
                            return 'connected';
                        case 3:
                            return 'on_connect';
                        case 4:
                            return 'destroy';
                    }
                }
            },
            {
                name: "type_call_id",
                type: 'string',
                defaultValue: defaultValueTypeCall
            },
            {
                name: "type_call",
                type: 'string',
                defaultValue: function (data) {
                    var typeId = defaultValueTypeCall(data);

                    if (typeId == 2) {
                        return 'outbound';
                    }
                    return 'inbound';
                }
            },
            {
                name: "connected_number",
                type: "string",
                mapping: 'connectedlinenum',
                renderer: function (value, data) {
                    if (data["type_call_id"] == 2) {
                        return rendererPhoneNumber(value);
                    }
                    return value;
                }
            },
            {
                name: "connected_name",
                mapping: 'connectedlinename',
                type: "string"
            },
            {
                name: "caller_number",
                type: "string",
                mapping: 'calleridnum',
                renderer: function (value, data) {
                    if (data["type_call_id"] == 1) {
                        return rendererPhoneNumber(value);
                    }
                    return value;
                }
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
            },
            {
                name: "customers",
                type: 'array'
            }
        ]
    });

};