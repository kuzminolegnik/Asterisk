module.exports = function () {
    var path = require("path"),
        chalk = require('chalk'),
        sugar = require('sugar'),
        request = require('request'),
        loadBlocks = {}, App,

        /**
         * Загрузка блока и кеширование загруженного блока.
         * @private
         * @param {string} keyPath - ключ раположения пути к подгружаемого блока
         * @param {string} name - название подгружаемого блока
         * @returns {object}
         */
        loadBlock = function (keyPath, name) {
            var me = this;
            try {
                var pathBlock = path.join(me.getConfig(keyPath), name),
                    params = Array.prototype.slice.apply(arguments, []),
                    block = loadBlocks[pathBlock],
                    Block;

                if (!block) {
                    Block = require(pathBlock);
                    params = params.slice(1);
                    params.unshift(me);
                    block = Block.apply(Block, params);
                    loadBlocks[pathBlock] = block;
                }

                return block;
            }
            catch (e) {
                me.logError("Is not loading module " + name)
            }
        },

        /**
         * Функция распределения событий.
         * @private
         * @param {object} data - параметры события
         * @param {string} type - тип события wss/ami
         */
        route = function (data, type) {
            var me = this,
                event = data["event"],
                routes = me.getModules();

            routes.forEach(function (route) {
                if (event) {
                    route.run(event, data, type);
                }
            });
        },

        /**
         * Создания соединения с WSS сервером.
         * @private
         * @param {object} parameters - объект параметров
         * @param {function} parameters.success - функция вызов которой происходит после успешного соединения с WSS сервером
         * @param {function} parameters.onmessage - событие обработки данных полученных от пользователя
         * @param {function} parameters.failure - функция вызов которой происходит после неудачного соединения с WSS сервером
         * @param {function} parameters.onconnected - события соединения пользователя с WSS сервером
         */
        connectWSS = function (parameters) {
            var me = this,
                success = parameters.success,
                onmessage = parameters.onmessage,
                onclose = parameters.onclose,
                failure = parameters.failure,
                onconnected = parameters.onconnected,
                WebSocket = require('ws'),
                wss;

            wss = me["__wss"] = new WebSocket.Server(
                me.getConfig("wss"),
                function (error) {
                    if (error) {
                        me.logError("Error in case of create the WSS server");
                        if (typeof failure == "function") {
                            failure(error);
                        }
                        return;
                    }
                    me.logSuccess("There was a successful create the WSS server");
                    if (typeof success == "function") {
                        success();
                    }
                }
            );

            /**
             * Возвращает id сессии.
             * @return {string|null}
             */
            WebSocket.prototype.getId = function () {
                var me = this,
                    connection = me.getConnection();

                if (!connection) {
                    return null;
                }

                return connection['id'];
            };

            /**
             * Возвращает массив достыпных модулей
             * @return {Array|null}
             */
            WebSocket.prototype.getAccess = function () {
                var me = this,
                    connection = me.getConnection();

                if (!connection) {
                    return null;
                }

                return connection['access_modules'];
            };

            /**
             * Устанавливает параметры сессии пользователя
             * @param {object} value - параметры сессии.
             * @return {object}
             */
            WebSocket.prototype.setConnection = function (value) {
                var me = this;

                return me['__dataconnect'] = value;
            };

            /**
             * Возвращает параметры сессии пользователя
             * @return {object}
             */
            WebSocket.prototype.getConnection = function () {
                var me = this;

                return me['__dataconnect'];
            };

            /**
             * Метод отправки JSON объекта.
             * @param {object} data - объект данных
             * @return {boolean}
             */
            WebSocket.prototype.sendData = function (data) {
                var me = this,
                    module = data["module"],
                    access = me.getAccess();

                if (access.indexOf(module) == -1) {
                    return false;
                }
                try {
                    data = JSON.stringify(data);
                    this.send(data);
                    return true;
                }
                catch (e) {
                    return false;
                }
            };

            /**
             * Передача сообщения всем подключенных пользователям.
             * Для отправки сообщения используется метод {@link WebSocket.sendData}
             * @param {object} data - объект данных
             * @return {boolean}
             */
            wss.sendDataAll = function (data) {
                if (!wss.clients) {
                    return false
                }
                wss.clients.forEach(function (client) {
                    if (client.readyState === WebSocket.OPEN) {
                        client.sendData(data);
                    }
                });
            };

            wss.on('connection', function (clientWss) {

                clientWss.setConnection({
                    access_modules: 'login'
                });

                clientWss.on('close', function () {
                    if (typeof onclose == 'function') {
                        onclose({
                            event: "disconnect",
                            data: {},
                            __wss: clientWss
                        }, clientWss)
                    }
                });

                clientWss.on('message', function (response) {
                    try {
                        response = JSON.parse(response);
                        if (typeof onmessage == 'function') {
                            response["__wss"] = clientWss;
                            onmessage(response, clientWss)
                        }
                    }
                    catch (e) {
                        me.logError("Invalid response data")
                    }
                });

                if (typeof onconnected == 'function') {

                    onconnected({
                        event: "connection",
                        data: {},
                        __wss: clientWss
                    }, clientWss)
                }

                me.logInfo("There was a successful connected client to the WSS server " + clientWss["upgradeReq"]["headers"]["origin"]);
            });
        },

        /**
         * Создания соединения с баозой данных сервером.
         * @private
         * @param {object} parameters
         * @param {function} parameters.success - функция вызов которой происходит после успешного соединения с базой данных
         * @param {function} parameters.failure - функция вызов которой происходит после неудачного соединения с базой данных
         */
        connectDB = function (parameters) {
            //noinspection NpmUsedModulesInstalled
            var me = this,
                success = parameters.success,
                failure = parameters.failure,
                LevelUp = require("levelup");

            LevelUp(
                me.getConfig("db.path"),
                {
                    valueEncoding: "json"
                },
                function (error, db) {
                    if (error) {
                        me.logError("Error in case of connection to the Database");
                        if (typeof failure == "function") {
                            failure(error)
                        }
                        return;
                    }

                    me["__db"] = db;
                    me.logSuccess("There was a successful connection to the Database");
                    if (typeof success == "function") {
                        success(db);
                    }
                }
            );
        },

        /**
         * Создания соединения с Asterisk сервером.
         * @private
         * @param {object} parameters - объект паоаметров
         * @param {function} parameters.success - функция вызов которой происходит после успешного соединения с Asterisk сервером
         * @param {function} parameters.failure - функция вызов которой происходит после неудачного соединения с Asterisk сервером
         */
        connectAMI = function (parameters) {
            var me = this,
                onevent = parameters.onevent,
                failure = parameters.failure,
                Connect = require('asterisk-ami'),
                ami = new Connect(me.getConfig("ami"));

            me["__ami"] = ami;

            ami.connect(
                function () {
                    ami.on('ami_data', function (data) {
                        if (typeof onevent == "function") {
                            onevent(data);
                        }
                    });

                    ami.on('ami_socket_error', function (error) {
                        me.logError("Error in case of ami socket error");
                        if (typeof failure == "function") {
                            failure(error)
                        }
                    });
                    ami.on('ami_socket_timeout', function (error) {
                        me.logError("Error in case of ami socket timeout");
                        if (typeof failure == "function") {
                            failure(error)
                        }
                    });
                    ami.on('ami_socket_end', function (error) {
                        me.logError("Error in case of ami socket end");
                        if (typeof failure == "function") {
                            failure(error)
                        }
                    });
                    ami.on('ami_socket_close', function (error) {
                        me.logError("Error in case of ami socket close");
                        if (typeof failure == "function") {
                            failure(error)
                        }
                    });
                    ami.on('ami_socket_drain', function (error) {
                        me.logError("Error in case of ami socket drain");
                        if (typeof failure == "function") {
                            failure(error)
                        }
                    });
                }
            );
        },

        /**
         * Регестрация пользователя системы в CRM.
         * @private
         * @param {function} parameters.success - функция вызов которой происходит после успешного соединения с CRM сервером
         * @param {function} parameters.failure - функция вызов которой происходит после неудачного соединения с CRM сервером
         */
        connectSystem = function (parameters) {
            var me = this,
                success = parameters.success,
                failure = parameters.failure,
                params = me.getConfig('crm.authorization'),
                user;

            me.request({
                path: "/php/login.php",
                params: params,
                success: function (data) {
                    try {
                        data = JSON.parse(data);
                    }
                    catch (e) {
                        data = {};
                        me.logError("Can't login system user");
                        if (typeof failure == "function") {
                            failure();
                        }
                    }
                    if (data instanceof Array && data[0]) {
                        user = data[0];
                        me.setConfig('system_user_token', user['token']);
                        if (typeof success == "function") {
                            success(user);
                        }
                        return;
                    }
                    me.logError("Can't login system user: " + data['error']);
                    if (typeof failure == "function") {
                        failure();
                    }
                },
                failure: function () {
                    me.logError("Can't login system user");
                    if (typeof failure == "function") {
                        failure();
                    }
                }
            });
        };

    App = function (config) {
        var me = this;

        me["__config"] = config;
        me["__modules"] = null;
        me["__store"] = {};
    };

    /**
     * Функция инициализации приложения.
     * Подключени к базе данных {@link connectDB},
     * серверу Asterisk {@link connectAMI} и создание WSS {@link connectWSS} сервера.
     * Распределение событий WSS и Asterisk {@link route}.
     */
    App.prototype.init = function () {
        var me = this,
            _route = route.bind(me),
            _connectWSS = connectWSS.bind(me),
            _connectDB = connectDB.bind(me),
            _connectAMI = connectAMI.bind(me),
            _connectSystem = connectSystem.bind(me);

        _connectSystem({
            success: function () {
                _connectWSS({
                    onclose: function (data) {
                        _route(data, "wss");
                    },
                    onmessage: function (data) {
                        _route(data, "wss");
                    },
                    onconnected: function (data) {
                        _route(data, "wss");
                    },
                    success: function () {
                        _connectDB({
                            success: function () {
                                _connectAMI({
                                    onevent: function (data) {
                                        _route(data, "ami");
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    };

    /**
     * Функция получения данных с CRM.
     * @param {object} parameters - объект паоаметров
     * @param {string} parameters.path - путь для получения данных
     * @param {object} parameters.params - параметры запроса
     * @param {function} parameters.success - функция вызывается в случае успешно выполненого запроса
     * @param {function} parameters.failure - функция вызывается в случае неудачно выполненого запроса
     * @param {function} parameters.callback - функция обратного вызова
     */
    App.prototype.request = function (parameters) {
        var me = this,
            request = me.getRequest(),
            config = me.getConfig("crm.request"),
            pathUrl = parameters["path"],
            cookie = parameters["cookie"] || '',
            params = parameters["params"],
            headers = parameters["headers"],
            success = parameters["success"],
            failure = parameters["failure"],
            callback = parameters["callback"],
            jar = request.jar(),
            url = config["uri"] + pathUrl;

        cookie = request.cookie(cookie);

        jar.setCookie(cookie, url);

        me.logSuccess('Send url: ' + url);

        request(
            {
                uri: url,
                method: config["method"],
                jar: jar,
                formData: params,
                headers: headers
            },
            function (error, response, body) {
                if (typeof callback == "function") {
                    callback(response, error, body)
                }
                if (error) {
                    if (typeof failure == "function") {
                        failure(error, response)
                    }
                }
                if (typeof success == "function") {
                    success(body, response)
                }
            }
        )
    };

    /**
     * Функция запроса для получения данных из CRM системы.
     * @param parameters - параметры запроса.
     * @param parameters.procedure - процедура (префикс адресной строки).
     * @param parameters.params - параметры запроса.
     */
    App.prototype.systemRequest = function (parameters) {
        var me = this,
            dbPrefix = me.getConfig('crm.request.db_prefix_path'),
            procedure = parameters['procedure'],
            systemToken = me.getConfig('system_user_token');

        if (!systemToken) {
            me.logError('system_user_token is not found');
        }

        parameters['path'] = dbPrefix + procedure;
        parameters['headers'] = {
            Authorization: 'Basic ' + systemToken
        };

        me.request(parameters);
    };

    /**
     * Функция возвращает модуль request - предназначен для получения данных со староних ресурсов.
     * @return {object}
     */
    App.prototype.getRequest = function () {
        return request;
    };

    /**
     * Возвращает утилиту для работы с данными.
     * Используется модуль sugar
     * @return {object}
     */
    App.prototype.getUtils = function () {
        return sugar;
    };

    /**
     * Возвращает объект для работы с AMI. Объект создается после успешного соединения с сервером Asterisk
     * @return {object}
     */
    App.prototype.getAmi = function () {
        var me = this;

        return me["__ami"];
    };

    /**
     * Возвращает объект для работы с WSS сервером. Объект создается после успешного создания WSS сервера
     * @return {object}
     */
    App.prototype.getWSS = function () {
        var me = this;

        return me["__wss"];
    };

    /**
     * Оправка данных всем пользователям.
     * Для отправки сообщения используется метод {@link wss.sendDataAll}
     * @param {object} data - обект данных для отправки данных пользователю.
     * @param {string} data.event - название событяи.
     * @param {string} data.stage - этап обработки события.
     */
    App.prototype.sendData = function (data) {
        var me = this,
            wss = me.getWSS();

        wss.sendDataAll(data);
    };

    /**
     * Возвращает объект для работы с DB. Объект создается после успешного создания базой данных.
     * Используется база данных levelDB.
     * @return {object}
     */
    App.prototype.getDB = function () {
        var me = this;

        return me["__db"];
    };

    /**
     * Возвращает массив включенных модулей.
     * Количество достцпных модулей определяется с помощью дерективы файла конфигурации 'modules'
     * @return {Array}
     */
    App.prototype.getModules = function () {
        var me = this,
            moduleNames = me.getConfig("modules"),
            modules = me["__modules"];

        if (modules) {
            return modules;
        }

        modules = [];

        moduleNames.forEach(function (name) {
            modules.push(me.requireRoute(name));
        });

        me["__modules"] = modules;

        return modules;
    };

    /**
     * Сохранение значения в файл конфигурации.
     * @param {string} key - ключ под котором будет сохранено значение.
     * @param {*} value - сохраняемое значение.
     */
    App.prototype.setConfig = function (key, value) {
        var me = this,
            config = me["__config"];

        return config[key] = value;
    };

    /**
     * Возвращает ранее сохраненное значение.
     * Для работы используется модуль 'config'.
     * @param {string} key - ключ под которым было сохранено значение.
     * @return {*}
     */
    App.prototype.getConfig = function (key) {
        var me = this,
            config = me["__config"];

        return config.get(key);
    };

    /**
     * Подгружает котролер - предназначен для обработки событий.
     * Расположение подгружаемого файла зависит от дерективы файла конфигурации 'path.controller'
     * @param {string} name - название подгружаемого контролера.
     * @return {Object}
     */
    App.prototype.requireController = function (name) {
        var me = this;
        loadBlock = loadBlock.bind(me);
        me.logInfo("Load Controller: " + name);
        return loadBlock("absolute_path.controller", name);
    };

    /**
     * Подгружает модели - предназначена для хранения данных.
     * Расположение подгружаемого файла зависит от дерективы файла конфигурации 'path.model'
     * @param {string} name - название подгружаемого контролера.
     * @return {Object}
     */
    App.prototype.requireModel = function (name) {
        var me = this;
        loadBlock = loadBlock.bind(me);
        me.logInfo("Load Model: " + name);
        return loadBlock("absolute_path.model", name);
    };

    /**
     * Подгружает ротинг - предназначен для распределения события.
     * Расположение подгружаемого файла зависит от дерективы файла конфигурации 'path.route'
     * @param {string} name - название подгружаемого контролера.
     * @return {Object}
     */
    App.prototype.requireRoute = function (name) {
        var me = this;
        loadBlock = loadBlock.bind(me);
        me.logInfo("Load Route: " + name);
        return loadBlock("absolute_path.route", name);
    };

    /**
     * Вывод текстовых сообщений в виде ошибок (SDTOUT)
     */
    App.prototype.logError = function () {
        var parameters = Array.prototype.slice.apply(arguments, []);

        console.log(chalk.bold.red(parameters.join(" ")));
    };

    /**
     * Вывод текстовых сообщений в виде положительного результата (SDTOUT)
     */
    App.prototype.logSuccess = function (value) {
        var me = this,
            parameters = Array.prototype.slice.apply(arguments, []);
        if (me.getConfig("debug")) {
            console.log(chalk.bold.green(parameters.join(" ")));
        }
    };

    /**
     * Вывод текстовых сообщений в виде информационного сообщения (SDTOUT)
     */
    App.prototype.logInfo = function (value) {
        var me = this,
            parameters = Array.prototype.slice.apply(arguments, []);
        if (me.getConfig("debug")) {
            console.log(chalk.bold.blue(parameters.join(" ")));
        }
    };

    return App;
}();