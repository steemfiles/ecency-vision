import numeral from "numeral";
interface Options {
  maximumFractionDigits?: number;
  fractionDigits?: number;
  prefix?: string;
  suffix?: string;
}
function count0s(s: string) {
  let counter = 0;
  for (const c of s) {
    if (c == "0") ++counter;
  }
  return counter;
}

function max(a: number, b: number) {
  if (a > b) return a;
  return b;
}

export default (
  value: number | string,
  options: Options | undefined = undefined
) => {
  const debugLog = false;
  let addNegativeSignFlag: boolean = false;
  let opts: Options = {
    maximumFractionDigits: 3,
    fractionDigits: 3,
    prefix: "",
    suffix: "",
  };
  if (options) {
    opts = { ...opts, ...options };
  }
  if (debugLog) console.log({ value, fractionDigits: opts.fractionDigits });
  const { prefix, suffix } = opts;
  const mandatoryFractionDigits = opts.fractionDigits || 0;
  const maximumFractionDigits: number =
    opts.maximumFractionDigits || opts.fractionDigits || 0;
  if (debugLog) {
    console.log({ maximumFractionDigits, mandatoryFractionDigits, value });
  }
  let out: string = "";
  if (typeof value == "number") {
    // builtin format is buggy when using numbers smaller than 1e-6.
    if (isNaN(value)) {
      return "NaN";
    }
    const digitsTry = max(maximumFractionDigits, mandatoryFractionDigits);
    const unity = Math.pow(10, digitsTry);
    if (value < 0) {
      addNegativeSignFlag = true;
    }
    let satoshis: number =
      Math.round(unity * value) * (addNegativeSignFlag ? -1 : 1);
    if (satoshis == 0) {
      addNegativeSignFlag = false;
    }
    if (debugLog) console.log({ satoshis, out });
    while (
      satoshis != 0 &&
      (out.length < maximumFractionDigits ||
        out.length < mandatoryFractionDigits)
    ) {
      out = (satoshis % 10) + out;
      satoshis /= 10;
      satoshis = Math.floor(satoshis);
      if (debugLog) console.log({ satoshis, out });
    }
    if (satoshis == 0) {
      while (out.length < digitsTry) out = "0" + out;
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
  if (debugLog) {
    console.log(out);
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
  if (debugLog) console.log({ out });
  return out;
};
