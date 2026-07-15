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
          background: "#f6f3ed"
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 364,
            height: 364,
            borderRadius: 108,
            background: "#26756b",
            boxShadow: "0 30px 72px rgba(24, 51, 47, .22)"
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 116,
            left: 126,
            width: 226,
            height: 280,
            display: "flex",
            flexDirection: "column",
            gap: 25,
            padding: "58px 37px",
            borderRadius: 30,
            background: "#ffffff"
          }}
        >
          <div style={{ width: 151, height: 15, borderRadius: 8, background: "#a8cdc7" }} />
          <div style={{ width: 122, height: 15, borderRadius: 8, background: "#a8cdc7" }} />
          <div style={{ width: 142, height: 15, borderRadius: 8, background: "#a8cdc7" }} />
        </div>
        <div
          style={{
            position: "absolute",
            right: 94,
            bottom: 89,
            width: 126,
            height: 126,
            border: "9px solid #f6f3ed",
            borderRadius: 63,
            background: "#b9633d"
          }}
        />
        <div style={{ position: "absolute", right: 136, bottom: 109, width: 45, height: 38, borderRadius: "50% 50% 44% 44%", background: "#ffffff" }} />
        <div style={{ position: "absolute", right: 166, bottom: 151, width: 20, height: 25, borderRadius: 12, transform: "rotate(-25deg)", background: "#ffffff" }} />
        <div style={{ position: "absolute", right: 139, bottom: 162, width: 20, height: 25, borderRadius: 12, background: "#ffffff" }} />
        <div style={{ position: "absolute", right: 112, bottom: 151, width: 20, height: 25, borderRadius: 12, transform: "rotate(25deg)", background: "#ffffff" }} />
      </div>
    ),
    size
  );
}
