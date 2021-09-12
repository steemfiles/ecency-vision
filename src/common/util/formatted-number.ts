import numeral from "numeral";
interface Options {
  fractionDigits?: number;
  prefix?: string;
  suffix?: string;
}
export default (
  value: number | string,
  options: Options | undefined = undefined
) => {
  let debugLog = false;
  let addNegativeSignFlag: boolean = false;
  let opts: Options = {
    fractionDigits: 3,
    prefix: "",
    suffix: "",
  };
  if (options) {
    opts = { ...opts, ...options };
  }
  if (value < 0) {
    debugLog = true;
  }
  if (debugLog) console.log({ value, fractionDigits: opts.fractionDigits });
  const { prefix, suffix } = opts;
  const fractionDigits = opts.fractionDigits || 0;
  let out: string = "";
  if (typeof value == "number") {
    // builtin format is buggy when using numbers smaller than 1e-6.
    if (isNaN(value)) {
      return "NaN";
    }
    const unity = Math.pow(10, fractionDigits);
    if (value < 0) {
      addNegativeSignFlag = true;
    }
    let satoshis: number =
      Math.round(unity * value) * (addNegativeSignFlag ? -1 : 1);
    if (satoshis == 0) {
      addNegativeSignFlag = false;
    }
    if (debugLog) console.log({ satoshis, out });
    while (satoshis != 0 && out.length < fractionDigits) {
      out = (satoshis % 10) + out;
      satoshis /= 10;
      satoshis = Math.floor(satoshis);
      if (debugLog) console.log({ satoshis, out });
    }
    if (satoshis == 0) {
      while (out.length < fractionDigits) out = "0" + out;
      if (debugLog) console.log({ satoshis, out });
    }
    // out.length==opts.fracitionDigits
    if (out !== "") {
      out = "." + out;
      if (debugLog) console.log({ satoshis, out });
    }
    if (satoshis == 0) {
      out = "0" + out;
      if (debugLog) console.log({ satoshis, out });
    }

    while (satoshis) {
      out = (satoshis % 10) + out;
      satoshis /= 10;
      satoshis = Math.floor(satoshis);
      if (debugLog) console.log({ satoshis, out });
    }
  } else {
    if (value === "NaN") {
      return value;
    }
    value = value.replace(",", "");
    const m = value.match(RegExp(/-?\d+(\.\d+)?/));
    out = m ? m[0] : "NaN";
    if (out === "NaN") {
      if (debugLog) console.log("Value passed in was:", { value });
    }
    if (out.charAt(0) == "-") {
      addNegativeSignFlag = true;
      out = out.slice(1);
    }
  }
  // add commas before and after the decimal point for readability
  let decimal_location: number = out.length;
  for (let i = 0; i < out.length; ++i) {
    if (out[i] == ".") {
      decimal_location = i;
    }
  }
  if (decimal_location + 3 <= out.length) {
    for (let j = decimal_location + 4; j < out.length; j += 4) {
      out = out.slice(0, j) + "," + out.slice(j);
    }
  }
  for (let j = decimal_location - 3; j >= 0; j -= 3) {
    if (j && out[j - 1] != ",") {
      out = out.slice(0, j) + "," + out.slice(j);
      ++decimal_location;
    }
  }
  while (
    decimal_location < out.length &&
    ",0".indexOf(out.charAt(out.length - 1)) != -1
  ) {
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
  if (debugLog) console.log({ out });
  return out;
};
