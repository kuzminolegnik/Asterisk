module.exports = function (app) {
    var Base,

        /**
         * Формтирование данных перед сохранением.
         * @private
         * @param {object} data - объект форматируемых данных
         * @param {boolean} isCreate - признак изменения существующей записи.
         *                           Если стоит true то подстановка значений по умолчанию не происходит.
         * @return {object}
         */
        rendererRawData = function (data, isCreate) {
            var me = this,
                fields = me.getFields(),
                utils = me.getUtils(),
                result = {},
                mapping, renderer, type, name, defaultValue, value, isDependent;

            fields.forEach(function (field) {
                name = field["name"];
                type = field["type"];
                renderer = field["renderer"];
                isDependent = field["dependent"];
                mapping = field["mapping"] || name;
                defaultValue = field["defaultValue"];

                value = data[mapping];

                if (typeof type == "string" && value !== undefined && !isDependent) {
                    type = type.toLowerCase();
                    if (type == 'string') {
                        if (typeof value != "string") {
                            if (typeof value == "number") {
                                value = value.toString();
                            }
                            else {
                                value = null;
                            }
                        }
                    }
                    else if (type == 'date') {
                        if (!(value instanceof Date)) {
                            value = utils.Date.create({values: value});
                            if ('Invalid Date' == value) {
                                value = null;
                            }
                        }
                    }
                    else if (type == 'number') {
                        value = parseFloat(value);
                        if (isNaN(value)) {
                            value = null;
                        }
                    }
                    else if (type == 'int' || type == "integer") {
                        value = parseInt(value);
                        if (isNaN(value)) {
                            value = null;
                        }
                    }
                    else if (type == 'object') {
                        if (Object.prototype.toString.call(value) !== "[object Object]") {
                            value = {};
                        }
                    }
                    else if (type == 'array') {
                        if (Object.prototype.toString.call(value) !== "[object Array]") {
                            value = [];
                        }
                    }
                }

                if ((value === undefined || value === null) && isCreate === true) {
                    if (typeof defaultValue == "function") {
                        value = defaultValue.apply(me, [data]);
                    }
                    else {
                        value = defaultValue;
                    }
                }

                if (value !== undefined) {
                    result[name] = value;
                }
            });

            if (isCreate === true) {
                result = rendererData.apply(me, [result])
            }

            return result;
        },

        /**
         * Пост обработка записи. Данная обработка происходит после формирования запси.
         * @param {object} data - объект форматируемых данных
         * @return {*}
         */
        rendererData = function (data) {
            var me = this,
                fields = me.getFields(),
                utils = me.getUtils(),
                clone = utils.Object.clone(data),
                renderer, name;

            fields.forEach(function (field) {
                name = field["name"];
                renderer = field["renderer"];

                if (typeof renderer == "function") {
                    data[name] = renderer.apply(me, [clone[name], clone]);
                }
            });

            return data;
        },


        /**
         * Получение клуча из отфармотированных данных {@link rendererRawData}.
         * @private
         * @param {object} data - отформатированные данные.
         * @param {boolean} isRenderer - указывает на необходимость форматирования ключа.
         *                              Для отмены форматирования ключа нужно передать false
         * @return {string|undefined}
         */
        getKey = function (data, isRenderer) {
            var me = this,
                keyProperty = me.getKeyProperty(),
                key = data[keyProperty];

            if (key === undefined) {
                return;
            }

            if (isRenderer === false) {
                return key;
            }

            return rendererKey.apply(me, [key]);
        },

        /**
         * Формирования ключа, под которым будет сохранена запись
         * @private
         * @param {string|number} key - ключ для сохранения данных.
         * @return {string|null}
         */
        rendererKey = function (key) {
            var me = this,
                name = me.getName(),
                utils = me.getUtils();

            if (!key) {
                return null;
            }

            return name + "_" + utils.String.encodeBase64(key);
        },

        /**
         * Возвращает контекст вызова событий.
         * Если не был установлен контролер {@link Base.setController}, то в качестве контекста используется модель.
         * @return {Object|Base}
         */
        getContext = function () {
            var me = this,
                controller = me.getController();

            return controller || me;
        };

    /**
     * Создание модели. Модель предназначена для предварительного форматирования и хранения данных.
     * @param {object} params - параметры модели
     * @param {string} params.name - внутренне название модели. Используется для создание ключей. [name_id]
     * @param {string} params.keyProperty - поле значение которого будет участвовать в создание клуча для хранения записей модели.
     * @param {Array} params.fields - массив полей, кторое используются для форматирования данных перед сохранением или изменением записи.
     * @param {string} params.fields[].name - название поля
     * @param {string} params.fields[].type - тип сохраняемых данных. Если указан то будет произведено принудительное преведение к типу.
     * @param {function} params.fields[].renderer - функция форматирование данных. Вызывается после формирования всех данных.
     * @param {*} params.fields[].defaultValue - значение по умолчанию подставляется только при создание записи.
     * @constructor
     */
    Base = function (params) {
        var me = this;

        me["__name"] = params["name"] || "";
        me["__listeners"] = {};
        me["__controller"] = null;
        me["__keyProperty"] = params["keyProperty"] || "id";
        me["__db"] = app.getDB();
        me["__utils"] = app.getUtils();
        me["__fields"] = params["fields"] || [];
    };

    /**
     * Возвращает контроллер установленный с помощью {@link Base.setController},
     * который будет использоваться при вызове событий модели в качестве контекста.
     * @return {object}
     */
    Base.prototype.getController = function () {
        var me = this;
        return me["__controller"];
    };

    /**
     * Устанавливает контроллер, который будет использоваться при вызове событий модели в качестве контекста.
     * @return {object}
     */
    Base.prototype.setController = function (value) {
        var me = this;
        return me["__controller"] = value;
    };
    /**
     * Возвращает объект событий.
     * @return {object}
     */
    Base.prototype.getListeners = function () {
        var me = this;
        return me["__listeners"];
    };

    /**
     * Устанавливает объект событий модели.
     * @return {object}
     */
    Base.prototype.setListeners = function (value) {
        var me = this;
        return me["__listeners"] = value;
    };

    /**
     * Возвращает массив полей форматирования модели.
     * @return {Array}
     */
    Base.prototype.getFields = function () {
        var me = this;
        return me["__fields"];
    };

    /**
     * Создает id идентичный id, который был сгенерирован при создание модели.
     * @param {object} values - объект данных из которых будет формироваться id записи,
     * исходя из настроект модели.
     * @return {string|undefined}
     */
    Base.prototype.createId = function (values) {
        var me = this;

        return getKey.apply(me, [
            rendererRawData.apply(me, [values, true]),
            false
        ]);
    };

    /**
     * Возвращает поле из которого будет формироваться уникальных ключ.
     * @return {string}
     */
    Base.prototype.getKeyProperty = function () {
        var me = this;
        return me["__keyProperty"];
    };

    /**
     * Возвращает утилиту для работы с данными.{@link App.getUtils}
     * @return {object}
     */
    Base.prototype.getUtils = function () {
        var me = this;
        return me["__utils"];
    };

    /**
     * Возвращает объект для работы с DB. Объект создается после успешного создания базой данных.{@link App.getDB}
     * @return {object}
     */
    Base.prototype.getDB = function () {
        var me = this;
        return me["__db"];
    };

    /**
     * Возвращает внутреннее название модели. Название используется при формирование ключей для хранения данных.
     * @return {string}
     */
    Base.prototype.getName = function () {
        var me = this;
        return me["__name"];
    };

    /**
     * Создание записи.
     * @param {object} parameters - объект со входящими параметрами
     * @param {object} parameters.values - данные для создания записи
     * @param {function} parameters.success - функция обратного вызова исполняется в случае успешного выполнения операции
     * @param {function} parameters.failure - функция обратного вызова исполняется в случае не успешного выполнения операции
     * @param {boolean} parameters.isRenderer - флаг обработки входящих данных. для обработки используется метод {@link rendererRawData}
     */
    Base.prototype.create = function (parameters) {
        var me = this,
            rawValues = parameters.values,
            success = parameters.success,
            failure = parameters.failure,
            isRenderer = parameters.isRenderer,
            db = me.getDB(),
            listeners = me.getListeners(),
            context = getContext.apply(me, []),
            onBeforeCreate = listeners['beforecreate'],
            onCreate = listeners['create'],
            onUpdate = listeners['update'],
            key, result, values;

        if (isRenderer !== false) {
            values = rendererRawData.apply(me, [rawValues, true]);
        }
        else {
            values = rawValues;
        }

        key = getKey.apply(me, [values]);

        if (key === undefined) {
            app.logError("can't create record is key undefined");
            return;
        }


        if (typeof onBeforeCreate == 'function') {
            result = onBeforeCreate.apply(context, [values, rawValues]);
            if (result === false) {
                return;
            }
            if (Object.prototype.toString.call(result) === "[object Object]") {
                values = result;
            }
        }

        db.put(key, values, function (error) {

            if (isRenderer === false) {
                if (typeof onUpdate == 'function') {
                    onUpdate.apply(context, [values, rawValues, error]);
                }
            }
            else {
                if (typeof onCreate == 'function') {
                    onCreate.apply(context, [values, rawValues, error]);
                }
            }

            if (error) {
                app.logError("can't create record is key: " + key);
                if (typeof failure == "function") {
                    failure(error);
                }
                return;
            }

            if (typeof success == "function") {
                success(values, key);
            }

        });
    };

    /**
     * Чтение всех записей модели.
     * @param {object} parameters - объект со входящими параметрами
     * @param {function} parameters.success - функция обратного вызова исполняется в случае успешного выполнения операции.
     * @param {function} parameters.failure - функция обратного вызова исполняется в случае не успешного выполнения операции.
     */
    Base.prototype.read = function (parameters) {
        var me = this,
            success = parameters.success,
            failure = parameters.failure,
            name = me.getName(),
            db = me.getDB(),
            result = [], stream;

        stream = db.createReadStream(
            {
                keys: false,
                values: true,
                gte: name,
                lte: name + "\uffff"
            }
        );
        stream.on('data', function (data) {
            result.push(data);
        });
        stream.on('error', function (error) {
            if (typeof failure == "function") {
                failure(error);
            }
        });
        stream.on('end', function () {
            if (typeof success == "function") {
                success(result);
            }
        });
    };

    /**
     * Изменение записи.
     * @param {object} parameters - объект со входящими параметрами
     * @param {object} parameters.values - данные для изменения записи
     * @param {function} parameters.success - функция обратного вызова исполняется в случае успешного выполнения операции
     * @param {function} parameters.failure - функция обратного вызова исполняется в случае не успешного выполнения операции
     */
    Base.prototype.update = function (parameters) {
        var me = this,
            values = parameters.values,
            merge = parameters.merge,
            success = parameters.success,
            failure = parameters.failure,
            utils = me.getUtils(),
            listeners = me.getListeners(),
            context = getContext.apply(me, []),
            onBeforeUpdate = listeners['beforeupdate'],
            key, result;

        values = rendererRawData.apply(me, [values]);
        key = getKey.apply(me, [values, false]);

        if (key === undefined) {
            app.logError("can't update record is key undefined");
            return;
        }

        if (typeof onBeforeUpdate == 'function') {
            result = onBeforeUpdate.apply(context [values]);
            if (result === false) {
                return;
            }
            if (Object.prototype.toString.call(result) === "[object Object]") {
                values = result;
            }
        }

        me.getById({
            id: key,
            success: function (oldValues) {
                if (typeof merge == 'function') {
                    values = merge.apply(context, [values, oldValues])
                }
                else {
                    values = utils.Object.merge(oldValues, values);
                }

                //TODO [OLEG] Тут дыра получается что не всегда прилетают одинаковые данные
                values = rendererData.apply(me, [values]);

                me.create({
                    values: values,
                    success: success,
                    failure: failure,
                    isRenderer: false
                });
            },
            failure: function (error) {
                if (error['notFound']) {
                    app.logError("record is not found " + key);
                    me.create({
                        values: values,
                        success: success,
                        failure: failure
                    });
                }
            }
        });
    };

    /**
     * Удаление записи.
     * @param {object} parameters - объект со входящими параметрами
     * @param {string|number} parameters.id - идентификатор сохраненной записи.
     * @param {function} parameters.success - функция обратного вызова исполняется в случае успешного выполнения операции.
     * @param {function} parameters.failure - функция обратного вызова исполняется в случае не успешного выполнения операции.
     */
    Base.prototype.destroy = function (parameters) {
        var me = this,
            id = parameters.id,
            values = parameters.values,
            success = parameters.success,
            failure = parameters.failure,
            listeners = me.getListeners(),
            context = getContext.apply(me, []),
            onBeforeDestroy = listeners['beforedestroy'],
            onDestroy = listeners['destroy'],
            db = me.getDB(),
            result, key;

        if (id) {
            key = rendererKey.apply(me, [id]);
        }
        else if (values) {
            key = rendererKey.apply(me, [
                me.createId(values)
            ]);
        }

        if (key === undefined) {
            app.logError("can't destroy record is key undefined");
            return;
        }

        if (typeof onBeforeDestroy == 'function') {
            result = onBeforeDestroy.apply(context, [key]);
            if (result === false) {
                return;
            }
        }

        db.del(key, function (error) {

            if (typeof onDestroy == 'function') {
                onDestroy.apply(context, [key, error]);
            }

            if (error) {
                if (error.notFound) {
                    if (typeof failure == "function") {
                        failure();
                    }
                    return;
                }
                app.logError("can't destroy record is key: " + key);
                if (typeof failure == "function") {
                    failure(error);
                }
                return;
            }
            if (typeof success == "function") {
                success();
            }
        });
    };

    /**
     * Возвращает запись по id.
     * @param {object} parameters - объект со входящими параметрами
     * @param {string|number} parameters.id - идентификатор сохраненной записи.
     * @param {function} parameters.success - функция обратного вызова исполняется в случае успешного выполнения операции.
     * @param {function} parameters.failure - функция обратного вызова исполняется в случае не успешного выполнения операции.
     */
    Base.prototype.getById = function (parameters) {
        var me = this,
            key = parameters.id,
            success = parameters.success,
            failure = parameters.failure,
            db = me.getDB();

        if (key === undefined) {
            app.logError("can't get by record is key undefined");
            return;
        }

        key = rendererKey.apply(me, [key]);

        db.get(key, function (error, values) {
            if (error) {
                if (typeof failure == "function") {
                    failure(error);
                }
                return;
            }
            if (typeof success == "function") {
                success(values);
            }
        });
    };

    return Base;
};