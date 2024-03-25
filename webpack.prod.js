const path = require("path");
const { merge } = require("webpack-merge");
const webpackConfig = require("./webpack.config");

const path = require("path");
const Dotenv = require("dotenv-webpack");

module.exports = merge(webpackConfig, {
    mode: "production",
    output: {
        path: path.join(__dirname, "/dist"),
        filename: "bundle.js",
    },
    plugins: [new Dotenv({ path: path.resolve(__dirname, ".env.production") })],
});
