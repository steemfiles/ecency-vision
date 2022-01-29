import React from "react";

export function AAds(props: {}) {
  const addsid = process.env.ADDS_ID;

  return (
    <div style={{ height: "90px", backgroundColor: "transparent" }}>
      <iframe
        data-aa={addsid}
        src={"//ad.a-ads.com/" + addsid + "?size=728x90"}
        style={{
          width: "728px",
          height: "90px",
          border: "0px",
          padding: 0,
          overflow: "hidden",
          backgroundColor: "transparent",
        }}
      />
    </div>
  );
}

export default AAds;
