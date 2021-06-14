import numeral from "numeral";

interface Options {
  fractionDigits?: number;
  prefix?: string;
  suffix?: string;
}

export default (value: number | string, options: Options | undefined = undefined) => {
  let opts: Options = {
    fractionDigits: 3,
    prefix: "",
    suffix: "",
  };

  if (options) {
    opts = { ...opts, ...options };
  }

  const { fractionDigits, prefix, suffix } = opts;

  let format = "0,0";

  if (fractionDigits) {
    format += "." + "0".repeat(fractionDigits);
  }

  let out = "";

  if (prefix) out += prefix + " ";
  out += numeral(value).format(format);
  // add commas after the decimal point for readability
  for (let i = 0; i < out.length; ++i) {
  	  if (out[i] == '.') {
  	  	  if (i+3 > out.length) {
  	  	  	  break;
  	  	  }
  	  	  for (let j = i+4; j < out.length; j += 4) {
  	  	  	  out = out.slice(0, j) + ',' + out.slice(j);
  	  	  }
  	  }
  }
  if (suffix) out += " " + suffix;

  return out;
};
