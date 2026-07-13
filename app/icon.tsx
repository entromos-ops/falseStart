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
          background: "linear-gradient(145deg, #f4d58b 0%, #d38b5d 100%)"
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 380,
            height: 380,
            borderRadius: 190,
            background: "#315a46",
            boxShadow: "0 28px 70px rgba(36, 51, 42, .28)"
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 96,
            width: 220,
            height: 150,
            borderRadius: "24px 24px 40px 40px",
            background: "#fff8e7"
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 226,
            width: 264,
            height: 138,
            transform: "rotate(45deg)",
            borderRadius: 22,
            background: "#bd6048"
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 96,
            width: 54,
            height: 102,
            borderRadius: "26px 26px 0 0",
            background: "#315a46"
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 84,
            right: 82,
            width: 74,
            height: 74,
            borderRadius: 37,
            background: "#f7c55d"
          }}
        />
      </div>
    ),
    size
  );
}
