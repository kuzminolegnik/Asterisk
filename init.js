var path = require("path"),
    config = require("config"),
    pathParts = config.get("path"),
    root = config.get("path.root"),
    key, App, app;

config["absolute_path"] = {};
for (key in pathParts) if (pathParts.hasOwnProperty(key)) {
    if (key === 'root') {
        config["absolute_path"][key] = path.normalize(path.join(__dirname, pathParts[key]));
    }
    else {
        config["absolute_path"][key] = path.normalize(path.join(__dirname, root, pathParts[key]));
    }
}

App = require(path.join(config.get("absolute_path.root"), "App"));
app = new App(config);
app.init();