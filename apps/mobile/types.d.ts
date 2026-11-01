declare module "@dibs/ui/native/theme.cjs" {
  const theme: {
    colors: Record<string, string>;
    fontFamily: Record<string, string[]>;
    borderRadius: Record<string, string>;
    spacing: Record<string, string>;
    typeStyles: Record<string, Record<string, string>>;
    typeNames: string[];
  };
  export default theme;
}
declare module "*.ttf" {
  const asset: number;
  export default asset;
}
declare module "*.css";
