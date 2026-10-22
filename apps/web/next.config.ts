import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@dibs/shared", "@dibs/ui", "@dibs/email"],
};

export default config;
