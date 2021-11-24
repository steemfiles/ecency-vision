import axios, { AxiosResponse, Method } from "axios";
const fs = require("fs");
axios
  .post(
    process.env["SEARCH_API_ADDR"] + "search",
    {
      q: "esteem",
      sort: "newest",
    },
    { headers: { Authorization: process.env["SEARCH_API_SECRET"] as string } }
  )
  .then(function (response) {
    console.log(response.data);
  })
  .catch((e) => {
    console.log(e);
  });
