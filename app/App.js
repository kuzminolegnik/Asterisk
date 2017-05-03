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
                me.logError("Is not loading module " + name )
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
             * Метод отправки JSON объекта.
             * @param {object} data - объект данных
             * @return {boolean}
             */
            WebSocket.prototype.sendData = function (data) {
                try {
                    data = JSON.stringify(data);
                    this.send(data);
                }
                catch (e) {
                    return false
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
                    if (client.readyState === WebSocket.OPEN && client.isAuthorize) {
                        client.sendData({
                            event: "send_data_all",
                            stage: "end",
                            data: data
                        });
                    }
                });
            };

            wss.on('connection', function (clientWss) {

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
                    onconnected(clientWss)
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
            _connectAMI = connectAMI.bind(me);

        _connectWSS({
            onmessage: function (data) {
                _route(data, "wss");
            },
            onconnected: function (wss) {
                wss.sendData({
                    event: "login",
                    stage: "init"
                });
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
            config = me.getConfig("request"),
            path = parameters["path"],
            cookie = parameters["cookie"] || '',
            params = parameters["params"],
            success = parameters["success"],
            failure = parameters["failure"],
            callback = parameters["callback"],
            jar = request.jar(),
            url = config["uri"] + path;

        cookie = request.cookie(cookie);

        jar.setCookie(cookie, url);

        request(
            {
                uri: url,
                method: config["method"],
                jar: jar,
                formData: params
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

        return config.set(key, value);
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