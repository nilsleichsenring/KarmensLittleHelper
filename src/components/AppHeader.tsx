import { Box, Group, Image } from "@mantine/core";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";

import logo from "../assets/logo/little-helper-logo.png";

type AppHeaderProps = {
  homePath?: string;
  left?: ReactNode;
  right?: ReactNode;
};

export default function AppHeader({
  homePath = "/",
  left,
  right,
}: AppHeaderProps) {
  return (
    <Box
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Brand accent */}
      <Box
        style={{
          height: 4,
          background: "#228be6",
        }}
      />

      {/* Header content */}
      <Box
        style={{
          background: "#ffffff",
          borderBottom: "1px solid #e9ecef",
          height: 88,
          display: "flex",
          alignItems: "center",
        }}
      >
        <Group
          px="lg"
          align="center"
          style={{
            width: "100%",
          }}
        >
          {/* Left slot */}
          <Box style={{ flex: 1 }}>
            {left}
          </Box>

          {/* Center logo */}
          <Box style={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <Link to={homePath}>
              <Image
                src={logo}
                alt="Little Helper"
                height={72}
                fit="contain"
              />
            </Link>
          </Box>

          {/* Right slot */}
          <Box style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
            {right}
          </Box>
        </Group>
      </Box>
    </Box>
  );
}
