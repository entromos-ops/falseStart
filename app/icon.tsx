import { ImageResponse } from "next/og";

export const dynamic = "force-static";

export const size = {
  width: 512,
  height: 512
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
          borderRadius: 112,
          background: "#f5f0e7"
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 348,
            height: 348,
            borderRadius: "174px 174px 174px 72px",
            background: "#315a45",
            transform: "rotate(-4deg)",
            boxShadow: "0 28px 70px rgba(36, 51, 42, .22)"
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 124,
            left: 251,
            width: 22,
            height: 210,
            borderRadius: 20,
            background: "#f8e9c8",
            transform: "rotate(3deg)"
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 128,
            left: 155,
            width: 116,
            height: 72,
            transform: "rotate(22deg)",
            borderRadius: "90px 8px 90px 8px",
            background: "#f8e9c8"
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 112,
            right: 146,
            width: 112,
            height: 69,
            transform: "rotate(-18deg)",
            borderRadius: "8px 90px 8px 90px",
            background: "#f8e9c8"
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 102,
            right: 105,
            width: 62,
            height: 62,
            borderRadius: 31,
            background: "#c78a32"
          }}
        />
      </div>
    ),
    size
  );
}
