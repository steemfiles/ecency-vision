"use strict";
exports.__esModule = true;
var axios_1 = require("axios");
var fs = require("fs");
axios_1["default"]
    .post(process.env["SEARCH_API_ADDR"] + "search", {
    q: "esteem",
    sort: "newest"
}, { headers: { Authorization: process.env["SEARCH_API_SECRET"] } })
    .then(function (response) {
    console.log(response.data);
})["catch"](function (e) {
    console.log(e);
});
