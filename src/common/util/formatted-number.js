"use strict";
var __assign =
  (this && this.__assign) ||
  function () {
    __assign =
      Object.assign ||
      function (t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (var p in s)
            if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
      };
    return __assign.apply(this, arguments);
  };
exports.__esModule = true;
function count0s(s) {
  var counter = 0;
  for (var _i = 0, s_1 = s; _i < s_1.length; _i++) {
    var c = s_1[_i];
    if (c == "0") ++counter;
  }
  return counter;
}
function max(a, b) {
  if (a > b) return a;
  return b;
}
exports["default"] = function (value, options) {
  if (options === void 0) {
    options = undefined;
  }
  var debugLog = false;
  var addNegativeSignFlag = false;
  var opts = {
    maximumFractionDigits: 3,
    fractionDigits: 3,
    prefix: "",
    suffix: "",
  };
  if (options) {
    opts = __assign(__assign({}, opts), options);
  }
  if (debugLog)
    console.log({ value: value, fractionDigits: opts.fractionDigits });
  var prefix = opts.prefix,
    suffix = opts.suffix;
  var mandatoryFractionDigits = opts.fractionDigits || 0;
  var maximumFractionDigits =
    opts.maximumFractionDigits || opts.fractionDigits || 0;
  if (debugLog) {
    console.log({
      maximumFractionDigits: maximumFractionDigits,
      mandatoryFractionDigits: mandatoryFractionDigits,
      value: value,
    });
  }
  var out = "";
  if (typeof value == "number") {
    // builtin format is buggy when using numbers smaller than 1e-6.
    if (isNaN(value)) {
      return "NaN";
    }
    var digitsTry = max(maximumFractionDigits, mandatoryFractionDigits);
    var unity = Math.pow(10, digitsTry);
    if (value < 0) {
      addNegativeSignFlag = true;
    }
    var satoshis = Math.round(unity * value) * (addNegativeSignFlag ? -1 : 1);
    if (satoshis == 0) {
      addNegativeSignFlag = false;
    }
    if (debugLog) console.log({ satoshis: satoshis, out: out });
    while (
      satoshis != 0 &&
      (out.length < maximumFractionDigits ||
        out.length < mandatoryFractionDigits)
    ) {
      out = (satoshis % 10) + out;
      satoshis /= 10;
      satoshis = Math.floor(satoshis);
      if (debugLog) console.log({ satoshis: satoshis, out: out });
    }
    if (satoshis == 0) {
      while (out.length < digitsTry) out = "0" + out;
      if (debugLog) console.log({ satoshis: satoshis, out: out });
    }
    // out.length==opts.fracitionDigits
    if (out !== "") {
      out = "." + out;
      if (debugLog) console.log({ satoshis: satoshis, out: out });
    }
    if (satoshis == 0) {
      out = "0" + out;
      if (debugLog) console.log({ satoshis: satoshis, out: out });
    }
    while (satoshis) {
      out = (satoshis % 10) + out;
      satoshis /= 10;
      satoshis = Math.floor(satoshis);
      if (debugLog) console.log({ satoshis: satoshis, out: out });
    }
  } else {
    if (value === "NaN") {
      return value;
    }
    value = value.replace(",", "");
    var m = value.match(RegExp(/-?\d+(\.\d+)?/));
    out = m ? m[0] : "NaN";
    if (out === "NaN") {
      if (debugLog) console.log("Value passed in was:", { value: value });
    }
    if (out.charAt(0) == "-") {
      addNegativeSignFlag = true;
      out = out.slice(1);
    }
  }
  // add commas before and after the decimal point for readability
  var decimal_location = out.length;
  for (var i = 0; i < out.length; ++i) {
    if (out[i] == ".") {
      decimal_location = i;
    }
  }
  if (debugLog) {
    console.log(out);
  }
  if (decimal_location + 3 <= out.length) {
    for (var j = decimal_location + 4; j < out.length; j += 4) {
      out = out.slice(0, j) + "," + out.slice(j);
    }
  }
  for (var j = decimal_location - 3; j >= 0; j -= 3) {
    if (j && out[j - 1] != ",") {
      out = out.slice(0, j) + "," + out.slice(j);
      ++decimal_location;
    }
  }
  if (debugLog) {
    console.log(out);
  }
  while (
    decimal_location < out.length &&
    count0s(out.slice(decimal_location)) > mandatoryFractionDigits &&
    ",0".indexOf(out.charAt(out.length - 1)) != -1
  ) {
    out = out.slice(0, out.length - 1);
  }
  if (debugLog) {
    console.log(out);
  }
  if (out.charAt(out.length - 1) === ",") {
    out = out.slice(0, out.length - 1);
  }
  if (out.charAt(out.length - 1) === ".") {
    out = out.slice(0, out.length - 1);
  }
  if (addNegativeSignFlag) {
    out = "-" + out;
  }
  if (prefix) out = prefix + " " + out;
  if (suffix) out += " " + suffix;
  if (debugLog) console.log({ out: out });
  return out;
};
