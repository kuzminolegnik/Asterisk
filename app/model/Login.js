module.exports = function (app) {
    var Base = app.requireModel("base");

    return new Base({
        name: "login",
        keyProperty: "id",
        fields: [
            {
                name: "id",
                mapping: "hash_id",
                type: "string"
            },
            {
                name: "name",
                type: "string"
            },
            {
                name: "login",
                type: "string"
            },
            {
                name: "surname",
                type: "string"
            },
            {
                name: "token",
                type: "string"
            },
            {
                name: "access_modules",
                mapping: "subprograms_access",
                renderer: function (value) {
                    var result = ['login'];
                    if (value && value['customers_list']) {
                        result.push('channels')
                    }
                    return result;
                }
            },
            {
                name: "date",
                type: "date"
            }
        ]
    });

};