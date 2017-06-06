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
            else if (value.length == 11 && value[0] !== '+' && value[0] == '8') {
                value = '+7' + value.substr(1);
            }
            else if (value[0] !== '+') {
                value = '+' + value;
            }
            return value;
        },

        /**
         * Определение типа звонка входящий или исходящий вызов
         * @param {object} rawData - предварительные данные записи
         * @return {number}
         */
        defaultValueTypeCall = function (rawData) {
            if (
                (rawData["context"] && /full/g.test(rawData["context"])) ||
                (rawData["calleridnum"] && rawData["calleridnum"].length <= 5)
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
                case 'dialbegin':
                    return 2;
                case 'bridgeenter':
                    return 3;
                case 'bridgeleave':
                case 'hanguprequest':
                case 'hangup':
                    return 4;
            }
        },

        /**
         * Определение телефона компаниии
         * @param {*} value
         * @param {Object} data
         */
        rendererCompanyPhone = function (value, data) {
            var phone = value;

            if (phone) {
                return phone;
            }

            if (data["status"] == 1 && data["type_call_id"] == 1) {
                phone = data['caller_extended']
            }

            return phone;
        },

        /**
         * Определение статуса звонка исходя из параметров клента
         * @param {object} data - предварительные данные записи
         * @return {number}
         */
        rendererStatusCall = function (data) {
            var customers = data['customers'],
                status = -1;
            if (!customers) {
                return status;
            }
            customers.forEach(function (customer) {
                if (customer['vip'] > status) {
                    status = customer['vip'];
                }
            });
            return status;
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
                renderer: function (value, data) {
                    return rendererStatusId(data['event']);
                }
            },
            {
                name: "status_name",
                renderer: function (value, data) {
                    var status = rendererStatusId(data['event']);
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
                name: 'event',
                mapping: "event"
            },
            {
                name: "type_call_id",
                type: 'string',
                defaultValue: defaultValueTypeCall
            },
            {
                name: "type_call",
                type: 'string',
                defaultValue: function (rawData) {
                    var typeId = defaultValueTypeCall(rawData);

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
                        return rendererPhoneNumber(data['caller_extended']);
                    }
                    return value;
                }
            },
            {
                name: "company_number",
                dependent: true,
                renderer: function (value, data) {
                    return rendererCompanyPhone(value, data);
                }
            },
            {
                name: "company_name",
                dependent: true,
                renderer: function (value, data) {
                    var phone = rendererCompanyPhone(value, data),
                        companyName = {
                            "4995004463": "TT",
                            "35722314160": "TTCY",
                            "442080682796": "FOG",
                            "8005553056": "FOG"
                        };

                    if (phone == 'unknown') {
                        return 'unknown';
                    }

                    if (value) {
                        return value;
                    }

                    return companyName[phone] || null;
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
                name: "caller_extended",
                mapping: 'exten'
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
                name: "status_customer",
                renderer: function (value, data) {
                    var status = rendererStatusCall(data),
                        title = 'none';

                    switch (status) {
                        case 0:
                            title = "Standard";
                            break;
                        case 1:
                            title = "Vip";
                            break;
                        case 2:
                            title = "Platinum";
                            break;
                    }

                    return title;
                }
            },
            {
                name: "status_customer_id",
                renderer: function (value, data) {
                    return rendererStatusCall(data);
                }
            },
            {
                name: "customers",
                type: 'array'
            }
        ]
    });

};