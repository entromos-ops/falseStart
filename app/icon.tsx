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
          background: "linear-gradient(135deg,#f4f5f2,#dbe7e0)"
        }}
      >
        <div
          style={{
            width: 356,
            height: 356,
            borderRadius: 92,
            background: "#202421",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 28,
            boxShadow: "0 34px 80px rgba(32, 36, 33, .28)",
            fontFamily: "Arial",
            fontWeight: 900
          }}
        >
          <div style={{ fontSize: 118, letterSpacing: -8 }}>SG</div>
          <div style={{ display: "flex", gap: 14 }}>
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: item === 1 ? "#8ed7a5" : "#ffffff"
                }}
              />
            ))}
          </div>
        </div>
      </div>
    ),
    size
  );
}
